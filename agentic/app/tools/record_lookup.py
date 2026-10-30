from typing import Any

from backend.app.db.models.record import OperationalRecord
from sqlalchemy import select
from sqlalchemy.orm import Session


def fetch_records_by_ids(
    db: Session,
    organization_id: str,
    record_ids: list[str],
) -> list[dict[str, Any]]:
    """
    Fetch operational records strictly scoped to organization_id.
    Prevents cross-tenant data leakage.
    """
    if not record_ids:
        return []

    stmt = select(OperationalRecord).where(
        OperationalRecord.organization_id == organization_id,
        OperationalRecord.id.in_(record_ids),
    )
    results = db.execute(stmt).scalars().all()
    return [
        {
            "id": r.id,
            "organization_id": r.organization_id,
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
        for r in results
    ]
