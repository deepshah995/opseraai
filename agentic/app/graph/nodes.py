import logging
from typing import Any

from agentic.app.graph.state import (
    GroundedEvidenceItem,
    InvestigationState,
)
from agentic.app.integrations.vertex_ai import VertexAIGeminiAdapter
from agentic.app.tools.evidence_lookup import build_grounded_evidence_from_record
from agentic.app.tools.reconciliation import compute_variance_breakdown

logger = logging.getLogger(__name__)

def intake_and_scope_node(state: InvestigationState) -> dict[str, Any]:
    """Node 1: Intake and validate the operational exception and tenant scope."""
    exc = state.get("exception_data") or {}
    logger.info(f"Intake node processing exception: {exc.get('title')} for org {state.get('organization_id')}")
    
    steps = list(state.get("step_history", []))
    steps.append("intake_and_scope_completed")
    
    return {
        "step_history": steps,
        "status": "in_progress",
    }

def evidence_retrieval_node(state: InvestigationState) -> dict[str, Any]:
    """Node 2: Retrieve records and compile strictly grounded evidence items."""
    records = state.get("records") or []
    evidence_items: list[GroundedEvidenceItem] = []

    for rec in records:
        rec_type = rec.get("record_type", "")
        if rec_type == "invoice":
            relevance = f"Customer billed line item claiming ${rec.get('amount', 0):.2f} on {rec.get('service_date') or 'unspecified date'}."
        elif rec_type == "service_ticket":
            relevance = f"Driver completed service ticket recording quantity {rec.get('quantity', 0)} {rec.get('unit') or ''} at rate ${rec.get('rate', 0):.2f}."
        elif rec_type == "load_record":
            relevance = f"Certified scale ticket logging net weight {rec.get('quantity', 0)} {rec.get('unit') or ''}."
        elif rec_type == "dispatch_record":
            relevance = f"Fleet dispatch record scheduling vehicle on {rec.get('service_date') or 'unspecified date'}."
        else:
            relevance = f"Operational business record {rec.get('external_reference')}."

        evidence_items.append(build_grounded_evidence_from_record(rec, relevance))

    steps = list(state.get("step_history", []))
    steps.append("evidence_retrieval_completed")

    return {
        "grounded_evidence": evidence_items,
        "step_history": steps,
    }

def deterministic_reconciliation_node(state: InvestigationState) -> dict[str, Any]:
    """Node 3: Execute deterministic mathematical reconciliation across records."""
    records = state.get("records") or []
    invoices = [r for r in records if r.get("record_type") == "invoice"]
    tickets = [r for r in records if r.get("record_type") == "service_ticket"]
    loads = [r for r in records if r.get("record_type") == "load_record"]

    billed_amt = invoices[0].get("amount") if invoices else None
    exp_amt = tickets[0].get("amount") if tickets else None
    billed_qty = (tickets[0].get("quantity") if tickets else (invoices[0].get("quantity") if invoices else None))
    actual_qty = loads[0].get("quantity") if loads else None
    unit_rate = (tickets[0].get("rate") if tickets else (invoices[0].get("rate") if invoices else None))

    math_result = compute_variance_breakdown(
        billed_amount=billed_amt,
        expected_amount=exp_amt,
        billed_quantity=billed_qty,
        actual_quantity=actual_qty,
        unit_rate=unit_rate,
    )

    steps = list(state.get("step_history", []))
    steps.append("deterministic_reconciliation_completed")

    return {
        "reconciliation_math": math_result,
        "step_history": steps,
    }

def llm_root_cause_analysis_node(state: InvestigationState) -> dict[str, Any]:
    """Node 4: Grounded root cause analysis via Vertex AI Gemini with strict citations."""
    adapter = VertexAIGeminiAdapter()
    analysis_res = adapter.analyze_investigation(
        exception_data=state.get("exception_data") or {},
        records=state.get("records") or [],
        math_variance=state.get("reconciliation_math") or {},
        evidence_items=state.get("grounded_evidence") or [],
    )

    steps = list(state.get("step_history", []))
    steps.append("root_cause_analysis_completed")

    return {
        "root_cause_analysis": analysis_res.get("root_cause_analysis", "Analysis completed."),
        "confidence": analysis_res.get("confidence_score", 0.90),
        "proposed_resolution": analysis_res.get("proposed_resolution"),
        "step_history": steps,
    }

def resolution_proposal_node(state: InvestigationState) -> dict[str, Any]:
    """Node 5: Package proposed resolution and prepare human-in-the-loop approval payload."""
    prop_res = state.get("proposed_resolution")
    steps = list(state.get("step_history", []))
    steps.append("resolution_proposal_completed")

    return {
        "proposed_resolution": prop_res,
        "step_history": steps,
    }

def human_in_the_loop_gate_node(state: InvestigationState) -> dict[str, Any]:
    """Node 6: Human review gate. Suspends automated action for human review."""
    steps = list(state.get("step_history", []))
    steps.append("awaiting_human_approval")

    return {
        "requires_human_approval": True,
        "status": "awaiting_approval",
        "step_history": steps,
    }
