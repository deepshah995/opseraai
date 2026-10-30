import logging
from datetime import UTC, datetime

from agentic.app.graph.state import InvestigationState
from agentic.app.graph.workflow import investigation_graph
from backend.app.db.models.agent_run import AgentRun
from backend.app.db.models.approval import Approval
from backend.app.db.models.audit import AuditEvent
from backend.app.db.models.evidence import Evidence
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.investigation import Investigation
from backend.app.db.models.record import OperationalRecord
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class InvestigationService:
    @classmethod
    def trigger_investigation(
        cls,
        db: Session,
        organization_id: str,
        exception_id: str,
        user_notes: str | None = None,
    ) -> Investigation:
        """
        Execute an end-to-end stateful investigation for an operational exception.
        Guarantees strict tenant isolation by organization_id.
        """
        # 1. Fetch Exception
        exc = db.execute(
            select(DBException).where(
                DBException.id == exception_id,
                DBException.organization_id == organization_id,
            )
        ).scalar_one_or_none()

        if not exc:
            raise ValueError(f"Exception {exception_id} not found in organization.")

        # Update exception status
        exc.status = "investigating"
        db.commit()

        # 2. Fetch Related Operational Records
        records_db = []
        if exc.related_record_ids:
            records_db = db.execute(
                select(OperationalRecord).where(
                    OperationalRecord.organization_id == organization_id,
                    OperationalRecord.id.in_(exc.related_record_ids),
                )
            ).scalars().all()

        records_payload = [
            {
                "id": r.id,
                "record_type": r.record_type,
                "external_reference": r.external_reference,
                "customer_reference": r.customer_reference,
                "service_date": r.service_date.isoformat() if r.service_date else None,
                "amount": r.amount,
                "quantity": r.quantity,
                "unit": r.unit,
                "rate": r.rate,
                "status": r.status,
                "source_document_id": r.source_document_id,
                "normalized_data": r.normalized_data or {},
            }
            for r in records_db
        ]

        # 3. Create Investigation Record
        inv = Investigation(
            organization_id=organization_id,
            exception_id=exception_id,
            status="in_progress",
            workflow_version="v1.0",
            input_snapshot={
                "exception": {
                    "id": exc.id,
                    "title": exc.title,
                    "exception_type": exc.exception_type,
                    "discrepancy_amount": exc.discrepancy_amount,
                    "severity": exc.severity,
                },
                "user_notes": user_notes,
                "record_count": len(records_payload),
            },
            started_at=datetime.now(UTC),
        )
        db.add(inv)
        db.flush()

        agent_run = AgentRun(
            organization_id=organization_id,
            investigation_id=inv.id,
            status="running",
            attempt_number=1,
            workflow_version="v1.0",
            model_identifier="gemini-1.5-pro",
            started_at=datetime.now(UTC),
        )
        db.add(agent_run)
        db.commit()

        # 4. Invoke LangGraph Workflow
        initial_state: InvestigationState = {
            "organization_id": organization_id,
            "exception_id": exception_id,
            "exception_data": {
                "id": exc.id,
                "exception_type": exc.exception_type,
                "title": exc.title,
                "description": exc.description,
                "discrepancy_amount": exc.discrepancy_amount,
                "severity": exc.severity,
                "related_record_ids": exc.related_record_ids,
            },
            "records": records_payload,
            "documents": [],
            "reconciliation_math": {},
            "grounded_evidence": [],
            "root_cause_analysis": "",
            "proposed_resolution": None,
            "confidence": 0.0,
            "requires_human_approval": False,
            "status": "queued",
            "step_history": [],
            "error": None,
        }

        try:
            thread_config = {"configurable": {"thread_id": f"inv_{inv.id}"}}
            final_state = investigation_graph.invoke(initial_state, config=thread_config)

            # 5. Persist Investigation Results & Grounded Evidence
            inv.status = "awaiting_review"
            inv.findings = final_state.get("root_cause_analysis")
            inv.confidence = final_state.get("confidence", 0.95)
            inv.proposed_resolution = final_state.get("proposed_resolution")
            inv.completed_at = datetime.now(UTC)

            # Format evidence summary
            evidence_summary_lines = []
            for ev_item in final_state.get("grounded_evidence", []):
                db_ev = Evidence(
                    organization_id=organization_id,
                    investigation_id=inv.id,
                    source_type=ev_item.get("source_type", "record"),
                    source_record_id=ev_item.get("source_record_id"),
                    source_document_id=ev_item.get("source_document_id"),
                    evidence_reference=ev_item.get("evidence_reference", ""),
                    excerpt=ev_item.get("excerpt"),
                    relevance_explanation=ev_item.get("relevance_explanation", ""),
                )
                db.add(db_ev)
                evidence_summary_lines.append(f"- {ev_item.get('evidence_reference')}: {ev_item.get('relevance_explanation')}")

            inv.evidence_summary = "\n".join(evidence_summary_lines)

            # 6. Create Pending Approval Record for Human-in-the-Loop review
            approval = Approval(
                organization_id=organization_id,
                exception_id=exc.id,
                investigation_id=inv.id,
                decision="pending",
                proposed_action_snapshot=final_state.get("proposed_resolution"),
            )
            db.add(approval)

            # Update exception status
            exc.status = "awaiting_approval"
            agent_run.status = "completed"
            agent_run.finished_at = datetime.now(UTC)

            # Record audit event
            audit = AuditEvent(
                organization_id=organization_id,
                actor_type="agent",
                actor_id="langgraph_gemini_v1",
                action="investigation_completed",
                resource_type="investigation",
                resource_id=inv.id,
                action_metadata={
                    "exception_id": exc.id,
                    "confidence": inv.confidence,
                    "action_recommended": (final_state.get("proposed_resolution") or {}).get("recommended_action"),
                },
            )
            db.add(audit)
            db.commit()
            db.refresh(inv)
            return inv

        except Exception as e:
            logger.error(f"Investigation execution failed for {inv.id}: {e}", exc_info=True)
            inv.status = "failed"
            inv.error_details = str(e)
            agent_run.status = "failed"
            agent_run.error_category = "workflow_execution_error"
            agent_run.finished_at = datetime.now(UTC)
            exc.status = "open"
            db.commit()
            db.refresh(inv)
            return inv

    @classmethod
    def review_approval(
        cls,
        db: Session,
        organization_id: str,
        approval_id: str,
        reviewer_id: str,
        decision: str,  # approved, rejected, revision_requested
        reviewer_comment: str | None = None,
    ) -> Approval:
        """Process human reviewer decision on agent recommendation."""
        approval = db.execute(
            select(Approval).where(
                Approval.id == approval_id,
                Approval.organization_id == organization_id,
            )
        ).scalar_one_or_none()

        if not approval:
            raise ValueError(f"Approval {approval_id} not found.")

        approval.decision = decision
        approval.reviewed_by = reviewer_id
        approval.reviewer_comment = reviewer_comment
        approval.reviewed_at = datetime.now(UTC)

        # Update parent exception status
        exc = db.execute(
            select(DBException).where(DBException.id == approval.exception_id)
        ).scalar_one_or_none()

        if exc:
            if decision == "approved":
                exc.status = "resolved"
                exc.resolved_at = datetime.now(UTC)
            elif decision == "rejected":
                exc.status = "dismissed"
                exc.resolved_at = datetime.now(UTC)
            elif decision == "revision_requested":
                exc.status = "open"

        # Record audit event
        audit = AuditEvent(
            organization_id=organization_id,
            actor_type="user",
            actor_id=reviewer_id,
            action=f"approval_{decision}",
            resource_type="approval",
            resource_id=approval.id,
            action_metadata={
                "exception_id": approval.exception_id,
                "investigation_id": approval.investigation_id,
                "comment": reviewer_comment,
            },
        )
        db.add(audit)
        db.commit()
        db.refresh(approval)
        return approval
