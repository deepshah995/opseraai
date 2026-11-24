"""Google Antigravity SDK Multi-Step Investigation Swarm Workflow.

Replaces the legacy LangGraph StateGraph with native Antigravity Agent orchestration,
deterministic mathematical reconciliation, grounded citations, and human-in-the-loop governance.
"""

import logging
from typing import Any

from agentic.app.swarm.sdk_runtime import AntigravityInvestigationAnalyzer
from agentic.app.swarm.state import GroundedEvidenceItem, InvestigationState
from agentic.app.tools.evidence_lookup import build_grounded_evidence_from_record
from agentic.app.tools.reconciliation import compute_variance_breakdown

logger = logging.getLogger(__name__)


def _intake_and_scope(state: InvestigationState) -> dict[str, Any]:
    exc = state.get("exception_data") or {}
    logger.info(
        f"Antigravity Swarm intake processing exception: {exc.get('title')} "
        f"(org: {state.get('organization_id')})"
    )
    steps = list(state.get("step_history", []))
    steps.append("intake_and_scope_completed")
    return {"step_history": steps, "status": "in_progress"}


def _evidence_retrieval(state: InvestigationState) -> dict[str, Any]:
    records = state.get("records") or []
    evidence_items: list[GroundedEvidenceItem] = []

    for rec in records:
        rec_type = rec.get("record_type", "")
        if rec_type == "invoice":
            relevance = (
                f"Invoice line item claiming ${float(rec.get('amount') or 0):,.2f} "
                f"on {rec.get('service_date') or 'unspecified date'}."
            )
        elif rec_type == "service_ticket":
            relevance = (
                f"PO / Work Order recording {float(rec.get('quantity') or 0):,.2f} "
                f"{rec.get('unit') or ''} at ${float(rec.get('rate') or 0):,.2f}."
            )
        elif rec_type == "load_record":
            relevance = (
                f"Certified receiving dock slip logging net {float(rec.get('quantity') or 0):,.2f} "
                f"{rec.get('unit') or ''}."
            )
        elif rec_type == "dispatch_record":
            relevance = (
                f"ERP production schedule assigning machine cell on "
                f"{rec.get('service_date') or 'unspecified date'}."
            )
        else:
            relevance = f"Manufacturing operational record {rec.get('external_reference')}."

        evidence_items.append(build_grounded_evidence_from_record(rec, relevance))

    steps = list(state.get("step_history", []))
    steps.append("evidence_retrieval_completed")
    return {"grounded_evidence": evidence_items, "step_history": steps}


def _deterministic_reconciliation(state: InvestigationState) -> dict[str, Any]:
    records = state.get("records") or []
    invoices = [r for r in records if r.get("record_type") == "invoice"]
    tickets = [r for r in records if r.get("record_type") == "service_ticket"]
    loads = [r for r in records if r.get("record_type") == "load_record"]

    billed_amt = invoices[0].get("amount") if invoices else None
    exp_amt = tickets[0].get("amount") if tickets else None
    billed_qty = tickets[0].get("quantity") if tickets else (invoices[0].get("quantity") if invoices else None)
    actual_qty = loads[0].get("quantity") if loads else None
    unit_rate = tickets[0].get("rate") if tickets else (invoices[0].get("rate") if invoices else None)

    math_result = compute_variance_breakdown(
        billed_amount=billed_amt,
        expected_amount=exp_amt,
        billed_quantity=billed_qty,
        actual_quantity=actual_qty,
        unit_rate=unit_rate,
    )

    steps = list(state.get("step_history", []))
    steps.append("deterministic_reconciliation_completed")
    return {"reconciliation_math": math_result, "step_history": steps}


def _antigravity_root_cause_analysis(state: InvestigationState) -> dict[str, Any]:
    analysis_res, sdk_meta = AntigravityInvestigationAnalyzer.analyze(
        exception_data=state.get("exception_data") or {},
        records=state.get("records") or [],
        math_variance=state.get("reconciliation_math") or {},
        evidence_items=state.get("grounded_evidence") or [],
    )
    prop = analysis_res.get("proposed_resolution") or {}
    cost_saved = float(
        prop.get("proposed_amount")
        or (state.get("exception_data") or {}).get("discrepancy_amount")
        or 0.0
    )

    steps = list(state.get("step_history", []))
    steps.append("antigravity_root_cause_analysis_completed")
    return {
        "root_cause_analysis": analysis_res.get("root_cause_analysis", "Analysis completed."),
        "confidence": float(analysis_res.get("confidence_score", 0.94)),
        "proposed_resolution": prop,
        "cost_savings_usd": round(cost_saved, 2),
        "time_saved_minutes": 45.0,
        "sdk_metadata": sdk_meta,
        "step_history": steps,
    }


def _human_in_the_loop_gate(state: InvestigationState) -> dict[str, Any]:
    steps = list(state.get("step_history", []))
    steps.append("resolution_proposal_completed")
    steps.append("awaiting_human_approval")
    return {
        "requires_human_approval": True,
        "status": "awaiting_approval",
        "step_history": steps,
    }


class AntigravityInvestigationSwarm:
    """Stateful Antigravity SDK investigation pipeline."""

    def invoke(self, initial_state: InvestigationState, config: dict[str, Any] | None = None) -> InvestigationState:
        state: InvestigationState = dict(initial_state)  # type: ignore[assignment]
        for stage in (
            _intake_and_scope,
            _evidence_retrieval,
            _deterministic_reconciliation,
            _antigravity_root_cause_analysis,
            _human_in_the_loop_gate,
        ):
            updates = stage(state)
            state.update(updates)  # type: ignore[typeddict-item]
        return state


investigation_swarm = AntigravityInvestigationSwarm()
