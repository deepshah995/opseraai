import logging
from typing import Any

from backend.app.db.models.audit import AuditEvent
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.record import OperationalRecord
from backend.app.domain.exceptions.rules import (
    DetectedExceptionData,
    ReconciliationRules,
    calculate_severity,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class ExceptionDetectionService:
    @classmethod
    def run_detection_for_organization(cls, db: Session, organization_id: str) -> list[DBException]:
        """
        Run the complete deterministic exception detection pipeline for a tenant.
        Strictly isolated by organization_id.
        """
        # Fetch all operational records for the organization
        records = db.execute(
            select(OperationalRecord).where(OperationalRecord.organization_id == organization_id)
        ).scalars().all()

        invoices = [r for r in records if r.record_type == "invoice"]
        tickets = [r for r in records if r.record_type == "service_ticket"]
        dispatches = [r for r in records if r.record_type == "dispatch_record"]
        loads = [r for r in records if r.record_type == "load_record"]

        detected_exceptions: list[DetectedExceptionData] = []

        # 1. Check Rate & Amount Mismatches between Invoices and Tickets
        # Group by customer and check matching references
        for inv in invoices:
            inv_dict = cls._record_to_dict(inv)
            # Find tickets referenced in normalized_data or by matching customer/date
            referenced_tickets = []
            inv_meta = inv.normalized_data or {}
            ticket_ref_list = inv_meta.get("ticket_numbers") or []
            
            for tkt in tickets:
                if tkt.external_reference in ticket_ref_list or (
                    tkt.customer_reference == inv.customer_reference
                    and tkt.service_date and inv.service_date
                    and abs((tkt.service_date - inv.service_date).days) <= 1
                ):
                    referenced_tickets.append(tkt)

            for tkt in referenced_tickets:
                tkt_dict = cls._record_to_dict(tkt)
                res = ReconciliationRules.check_rate_amount_mismatch(inv_dict, tkt_dict)
                if res:
                    detected_exceptions.append(res)

        # 2. Check Quantity / Weight Mismatch between Tickets and Scale / Load Records
        for tkt in tickets:
            tkt_dict = cls._record_to_dict(tkt)
            tkt_meta = tkt.normalized_data or {}
            scale_ref = tkt_meta.get("scale_ticket_no") or tkt_meta.get("scale_ticket")

            matching_loads = []
            for ld in loads:
                if (scale_ref and ld.external_reference == scale_ref) or (
                    ld.customer_reference == tkt.customer_reference
                    and ld.service_date and tkt.service_date
                    and abs((ld.service_date - tkt.service_date).days) <= 1
                ):
                    matching_loads.append(ld)

            for ld in matching_loads:
                ld_dict = cls._record_to_dict(ld)
                res = ReconciliationRules.check_quantity_weight_mismatch(tkt_dict, ld_dict)
                if res:
                    detected_exceptions.append(res)

        # 3. Check Dispatch vs Ticket discrepancies
        for disp in dispatches:
            disp_dict = cls._record_to_dict(disp)
            disp_meta = disp.normalized_data or {}
            tkt_ref = disp_meta.get("ticket_number") or disp_meta.get("ticket_id")

            matching_tkts = []
            for tkt in tickets:
                if (tkt_ref and tkt.external_reference == tkt_ref) or (
                    tkt.customer_reference == disp.customer_reference
                    and tkt.service_date and disp.service_date
                    and abs((tkt.service_date - disp.service_date).days) == 0
                ):
                    matching_tkts.append(tkt)

            for tkt in matching_tkts:
                tkt_dict = cls._record_to_dict(tkt)
                res = ReconciliationRules.check_dispatch_ticket_discrepancy(disp_dict, tkt_dict)
                if res:
                    detected_exceptions.append(res)

        # 4. Check Unbilled Completed Jobs
        # Service tickets with status 'completed' that have no invoice referencing them
        billed_ticket_refs = set()
        for inv in invoices:
            meta = inv.normalized_data or {}
            for t_ref in meta.get("ticket_numbers", []):
                billed_ticket_refs.add(t_ref)
            if meta.get("ticket_number"):
                billed_ticket_refs.add(meta.get("ticket_number"))

        for tkt in tickets:
            if tkt.status in ("completed", "delivered", "picked_up"):
                if tkt.external_reference not in billed_ticket_refs and tkt.amount:
                    # Check if there is any invoice with matching customer around or after this service date
                    matching_inv = any(
                        inv.customer_reference == tkt.customer_reference
                        and inv.service_date and tkt.service_date
                        and inv.service_date >= tkt.service_date
                        for inv in invoices
                    )
                    # If not explicitly billed or customer invoice missing this line
                    if not matching_inv or tkt.external_reference not in billed_ticket_refs:
                        title = f"Unbilled Completed Service Ticket: {tkt.external_reference} ({tkt.customer_reference})"
                        desc = (
                            f"Ticket {tkt.external_reference} for customer {tkt.customer_reference} "
                            f"is marked completed with recorded amount ${tkt.amount:.2f}, "
                            f"but has not been included on any customer invoice."
                        )
                        detected_exceptions.append(DetectedExceptionData(
                            exception_type="unbilled_job",
                            title=title,
                            description=desc,
                            severity=calculate_severity(tkt.amount, "unbilled_job"),
                            discrepancy_amount=tkt.amount,
                            related_record_ids=[tkt.id],
                            confidence=0.96,
                            metadata={"ticket_id": tkt.id, "amount": tkt.amount},
                        ))

        # 5. Check Duplicate Billing
        # Multiple invoices claiming the same ticket external reference
        ticket_to_invoices: dict[str, list[OperationalRecord]] = {}
        for inv in invoices:
            meta = inv.normalized_data or {}
            for t_ref in meta.get("ticket_numbers", []):
                ticket_to_invoices.setdefault(t_ref, []).append(inv)
            if meta.get("ticket_number"):
                ticket_to_invoices.setdefault(meta["ticket_number"], []).append(inv)

        for t_ref, inv_list in ticket_to_invoices.items():
            if len(inv_list) > 1:
                inv_refs = [i.external_reference for i in inv_list]
                dupe_amount = sum(i.amount or 0.0 for i in inv_list[1:])
                title = f"Duplicate Billing Detected for Ticket {t_ref}"
                desc = (
                    f"Service Ticket {t_ref} was billed on multiple invoices: {', '.join(inv_refs)}. "
                    f"Potential duplicate charge: ${dupe_amount:.2f}."
                )
                detected_exceptions.append(DetectedExceptionData(
                    exception_type="duplicate_billing",
                    title=title,
                    description=desc,
                    severity="critical",
                    discrepancy_amount=dupe_amount,
                    related_record_ids=[i.id for i in inv_list],
                    confidence=0.99,
                    metadata={"ticket_ref": t_ref, "invoices": inv_refs},
                ))

        # Persist newly detected exceptions, avoiding duplicates
        persisted_exceptions: list[DBException] = []
        for exc_data in detected_exceptions:
            # Check if an open or active exception already exists with the exact same related records and type
            existing = db.execute(
                select(DBException).where(
                    DBException.organization_id == organization_id,
                    DBException.exception_type == exc_data.exception_type,
                    DBException.status.in_(["open", "investigating", "awaiting_approval"]),
                    DBException.title == exc_data.title,
                )
            ).scalars().first()

            if not existing:
                db_exc = DBException(
                    organization_id=organization_id,
                    exception_type=exc_data.exception_type,
                    title=exc_data.title,
                    description=exc_data.description,
                    severity=exc_data.severity,
                    status="open",
                    confidence=exc_data.confidence,
                    related_record_ids=exc_data.related_record_ids,
                    discrepancy_amount=exc_data.discrepancy_amount,
                )
                db.add(db_exc)
                db.flush()

                # Record audit event
                audit = AuditEvent(
                    organization_id=organization_id,
                    actor_type="system",
                    actor_id="rule_engine_v1",
                    action="exception_detected",
                    resource_type="exception",
                    resource_id=db_exc.id,
                    action_metadata={
                        "exception_type": db_exc.exception_type,
                        "discrepancy_amount": db_exc.discrepancy_amount,
                        "severity": db_exc.severity,
                    },
                )
                db.add(audit)
                persisted_exceptions.append(db_exc)

        db.commit()
        return persisted_exceptions

    @staticmethod
    def _record_to_dict(rec: OperationalRecord) -> dict[str, Any]:
        return {
            "id": rec.id,
            "record_type": rec.record_type,
            "external_reference": rec.external_reference,
            "customer_reference": rec.customer_reference,
            "service_date": rec.service_date,
            "amount": rec.amount,
            "quantity": rec.quantity,
            "unit": rec.unit,
            "rate": rec.rate,
            "status": rec.status,
            "normalized_data": rec.normalized_data or {},
        }
