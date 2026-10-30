from typing import Any

from agentic.app.graph.state import GroundedEvidenceItem


def build_grounded_evidence_from_record(
    record: dict[str, Any],
    relevance_explanation: str,
) -> GroundedEvidenceItem:
    """Construct a validated evidence citation referencing an actual operational record."""
    rec_type = record.get("record_type", "record").replace("_", " ").title()
    ref = record.get("external_reference", "UNKNOWN")
    evidence_ref = f"{rec_type} #{ref}"
    
    # Extract only verified real facts from the record
    excerpt = {
        "external_reference": ref,
        "customer": record.get("customer_reference"),
        "service_date": record.get("service_date"),
        "amount": record.get("amount"),
        "quantity": record.get("quantity"),
        "unit": record.get("unit"),
        "rate": record.get("rate"),
        "status": record.get("status"),
    }
    
    return {
        "source_type": "record",
        "source_record_id": record.get("id"),
        "source_document_id": record.get("source_document_id"),
        "evidence_reference": evidence_ref,
        "excerpt": excerpt,
        "relevance_explanation": relevance_explanation,
    }
