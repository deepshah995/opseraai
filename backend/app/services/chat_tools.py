"""
Read-only, tenant-scoped database tools for the conversational agent chat.

Security model:
- The LLM never writes SQL. It may only call the vetted functions below.
- Every query is hard-scoped to the authenticated user's organization_id,
  which is bound server-side (never taken from LLM/tool arguments).
- All filters go through SQLAlchemy parameter binding; LIKE wildcards in user
  input are escaped; result sizes are clamped.
- Tools are strictly read-only (SELECT only, no commits).
"""

from __future__ import annotations

import functools
import logging
from datetime import datetime
from typing import Any

from backend.app.db.models.approval import Approval
from backend.app.db.models.audit import AuditEvent
from backend.app.db.models.connector import AppConnector
from backend.app.db.models.document import SourceDocument
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.investigation import Investigation
from backend.app.db.models.record import OperationalRecord
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

MAX_ROWS = 25
DEFAULT_ROWS = 10


def _clamp(limit: int | None) -> int:
    try:
        value = int(limit) if limit is not None else DEFAULT_ROWS
    except (TypeError, ValueError):
        value = DEFAULT_ROWS
    return max(1, min(value, MAX_ROWS))


def _like(term: str) -> str:
    """Escape LIKE wildcards in user-supplied text and wrap for a contains-match."""
    escaped = term.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.strip())
    except ValueError:
        return None


def _record_row(r: OperationalRecord) -> dict[str, Any]:
    return {
        "id": r.id,
        "record_type": r.record_type,
        "external_reference": r.external_reference,
        "customer": r.customer_reference,
        "service_date": _iso(r.service_date),
        "amount": r.amount,
        "quantity": r.quantity,
        "unit": r.unit,
        "rate": r.rate,
        "status": r.status,
    }


def _exception_row(e: DBException) -> dict[str, Any]:
    return {
        "id": e.id,
        "type": e.exception_type,
        "title": e.title,
        "severity": e.severity,
        "status": e.status,
        "discrepancy_amount": e.discrepancy_amount,
        "confidence": e.confidence,
        "detected_at": _iso(e.detected_at),
        "resolved_at": _iso(e.resolved_at),
    }


class OperationsDataTools:
    """Holds a DB session + org id and exposes safe read-only query methods."""

    def __init__(self, db: Session, organization_id: str):
        self.db = db
        self.org_id = organization_id

    # ------------------------------------------------------------------ #
    # Tool implementations
    # ------------------------------------------------------------------ #
    def get_operations_summary(self) -> dict[str, Any]:
        """High-level KPIs: record counts, exception breakdowns, money at risk, pending approvals."""
        org = self.org_id
        records_by_type = dict(
            self.db.execute(
                select(OperationalRecord.record_type, func.count())
                .where(OperationalRecord.organization_id == org)
                .group_by(OperationalRecord.record_type)
            ).all()
        )
        exc_by_status = dict(
            self.db.execute(
                select(DBException.status, func.count())
                .where(DBException.organization_id == org)
                .group_by(DBException.status)
            ).all()
        )
        exc_by_type = dict(
            self.db.execute(
                select(DBException.exception_type, func.count())
                .where(DBException.organization_id == org)
                .group_by(DBException.exception_type)
            ).all()
        )
        exc_by_severity = dict(
            self.db.execute(
                select(DBException.severity, func.count())
                .where(DBException.organization_id == org, DBException.status != "resolved")
                .group_by(DBException.severity)
            ).all()
        )
        unresolved_amount = self.db.execute(
            select(func.coalesce(func.sum(DBException.discrepancy_amount), 0.0)).where(
                DBException.organization_id == org,
                DBException.status != "resolved",
            )
        ).scalar_one()
        recovered_amount = self.db.execute(
            select(func.coalesce(func.sum(DBException.discrepancy_amount), 0.0)).where(
                DBException.organization_id == org,
                DBException.status == "resolved",
            )
        ).scalar_one()
        invoiced_total = self.db.execute(
            select(func.coalesce(func.sum(OperationalRecord.amount), 0.0)).where(
                OperationalRecord.organization_id == org,
                OperationalRecord.record_type == "invoice",
            )
        ).scalar_one()
        pending_approvals = self.db.execute(
            select(func.count()).select_from(Approval).where(
                Approval.organization_id == org, Approval.decision == "pending"
            )
        ).scalar_one()
        document_count = self.db.execute(
            select(func.count()).select_from(SourceDocument).where(SourceDocument.organization_id == org)
        ).scalar_one()

        return {
            "records_by_type": records_by_type,
            "total_records": sum(records_by_type.values()),
            "exceptions_by_status": exc_by_status,
            "exceptions_by_type": exc_by_type,
            "unresolved_exceptions_by_severity": exc_by_severity,
            "total_exceptions": sum(exc_by_status.values()),
            "unresolved_discrepancy_amount_usd": round(float(unresolved_amount or 0), 2),
            "resolved_discrepancy_amount_usd": round(float(recovered_amount or 0), 2),
            "total_invoiced_amount_usd": round(float(invoiced_total or 0), 2),
            "pending_approvals": pending_approvals,
            "uploaded_documents": document_count,
        }

    def search_exceptions(
        self,
        status: str | None = None,
        exception_type: str | None = None,
        severity: str | None = None,
        min_amount: float | None = None,
        text: str | None = None,
        sort_by: str = "amount",
        limit: int | None = DEFAULT_ROWS,
    ) -> dict[str, Any]:
        """Find exceptions by status/type/severity/amount/free text."""
        stmt = select(DBException).where(DBException.organization_id == self.org_id)
        if status:
            if status.lower() in ("unresolved", "active", "not_resolved"):
                stmt = stmt.where(DBException.status != "resolved")
            else:
                stmt = stmt.where(DBException.status == status.lower())
        if exception_type:
            stmt = stmt.where(DBException.exception_type == exception_type.lower())
        if severity:
            stmt = stmt.where(DBException.severity == severity.lower())
        if min_amount is not None:
            stmt = stmt.where(DBException.discrepancy_amount >= float(min_amount))
        if text:
            pattern = _like(text)
            stmt = stmt.where(
                or_(
                    DBException.title.ilike(pattern, escape="\\"),
                    DBException.description.ilike(pattern, escape="\\"),
                )
            )
        if sort_by == "recent":
            stmt = stmt.order_by(DBException.detected_at.desc())
        else:
            stmt = stmt.order_by(DBException.discrepancy_amount.desc().nullslast())

        rows = self.db.execute(stmt.limit(_clamp(limit))).scalars().all()
        return {"count": len(rows), "exceptions": [_exception_row(e) for e in rows]}

    def get_exception_details(self, exception_id: str) -> dict[str, Any]:
        """Full detail for one exception, incl. related records and latest investigation."""
        exc = self.db.execute(
            select(DBException).where(
                DBException.organization_id == self.org_id,
                DBException.id == exception_id.strip(),
            )
        ).scalar_one_or_none()
        if not exc:
            return {"error": f"No exception found with id '{exception_id}'."}

        related: list[dict[str, Any]] = []
        if exc.related_record_ids:
            recs = self.db.execute(
                select(OperationalRecord).where(
                    OperationalRecord.organization_id == self.org_id,
                    OperationalRecord.id.in_(list(exc.related_record_ids)[:MAX_ROWS]),
                )
            ).scalars().all()
            related = [_record_row(r) for r in recs]

        inv = self.db.execute(
            select(Investigation)
            .where(Investigation.organization_id == self.org_id, Investigation.exception_id == exc.id)
            .order_by(Investigation.started_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        detail = _exception_row(exc)
        detail["description"] = exc.description
        detail["related_records"] = related
        detail["latest_investigation"] = (
            {
                "status": inv.status,
                "findings": (inv.findings or "")[:1500],
                "proposed_resolution": inv.proposed_resolution,
                "confidence": inv.confidence,
            }
            if inv
            else None
        )
        return detail

    def search_records(
        self,
        record_type: str | None = None,
        customer: str | None = None,
        reference: str | None = None,
        status: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int | None = DEFAULT_ROWS,
    ) -> dict[str, Any]:
        """Find operational records (invoices, tickets, dispatch, loads, accounts)."""
        stmt = select(OperationalRecord).where(OperationalRecord.organization_id == self.org_id)
        if record_type:
            stmt = stmt.where(OperationalRecord.record_type == record_type.lower())
        if customer:
            stmt = stmt.where(OperationalRecord.customer_reference.ilike(_like(customer), escape="\\"))
        if reference:
            stmt = stmt.where(OperationalRecord.external_reference.ilike(_like(reference), escape="\\"))
        if status:
            stmt = stmt.where(OperationalRecord.status == status.lower())
        start, end = _parse_date(date_from), _parse_date(date_to)
        if start:
            stmt = stmt.where(OperationalRecord.service_date >= start)
        if end:
            stmt = stmt.where(OperationalRecord.service_date <= end)

        rows = self.db.execute(
            stmt.order_by(OperationalRecord.service_date.desc().nullslast()).limit(_clamp(limit))
        ).scalars().all()
        return {"count": len(rows), "records": [_record_row(r) for r in rows]}

    def get_customer_overview(self, customer: str) -> dict[str, Any]:
        """Totals and open issues for a customer (partial name match)."""
        pattern = _like(customer)
        recs = self.db.execute(
            select(OperationalRecord).where(
                OperationalRecord.organization_id == self.org_id,
                OperationalRecord.customer_reference.ilike(pattern, escape="\\"),
            )
        ).scalars().all()
        if not recs:
            return {"error": f"No customer matching '{customer}' was found."}

        names = sorted({r.customer_reference for r in recs})
        rec_ids = {r.id for r in recs}
        by_type: dict[str, int] = {}
        for r in recs:
            by_type[r.record_type] = by_type.get(r.record_type, 0) + 1
        invoiced = sum((r.amount or 0) for r in recs if r.record_type == "invoice")

        org_exceptions = self.db.execute(
            select(DBException).where(DBException.organization_id == self.org_id)
        ).scalars().all()
        linked = [e for e in org_exceptions if rec_ids.intersection(e.related_record_ids or [])]

        return {
            "matched_customers": names,
            "records_by_type": by_type,
            "total_invoiced_usd": round(invoiced, 2),
            "exceptions": [_exception_row(e) for e in linked[:MAX_ROWS]],
            "open_exception_count": len([e for e in linked if e.status != "resolved"]),
            "recent_records": [_record_row(r) for r in sorted(
                recs, key=lambda x: x.service_date or datetime.min, reverse=True
            )[:5]],
        }

    def list_pending_approvals(self, limit: int | None = DEFAULT_ROWS) -> dict[str, Any]:
        """Approvals waiting on a human decision, with their exception context."""
        rows = self.db.execute(
            select(Approval, DBException)
            .join(DBException, DBException.id == Approval.exception_id)
            .where(Approval.organization_id == self.org_id, Approval.decision == "pending")
            .order_by(Approval.created_at.desc())
            .limit(_clamp(limit))
        ).all()
        return {
            "count": len(rows),
            "approvals": [
                {
                    "approval_id": a.id,
                    "requested_at": _iso(a.created_at),
                    "exception": _exception_row(e),
                    "proposed_action": a.proposed_action_snapshot,
                }
                for a, e in rows
            ],
        }

    def search_documents(self, text: str | None = None, limit: int | None = DEFAULT_ROWS) -> dict[str, Any]:
        """Search uploaded source documents by filename or extracted text."""
        stmt = select(SourceDocument).where(SourceDocument.organization_id == self.org_id)
        if text:
            pattern = _like(text)
            stmt = stmt.where(
                or_(
                    SourceDocument.original_filename.ilike(pattern, escape="\\"),
                    SourceDocument.extracted_text.ilike(pattern, escape="\\"),
                )
            )
        rows = self.db.execute(stmt.limit(_clamp(limit))).scalars().all()
        return {
            "count": len(rows),
            "documents": [
                {
                    "id": d.id,
                    "filename": d.original_filename,
                    "document_type": d.document_type,
                    "processing_status": d.processing_status,
                    "excerpt": (d.extracted_text or "")[:400],
                }
                for d in rows
            ],
        }

    def recent_activity(self, limit: int | None = DEFAULT_ROWS) -> dict[str, Any]:
        """Most recent audit trail events (who/what did what)."""
        rows = self.db.execute(
            select(AuditEvent)
            .where(AuditEvent.organization_id == self.org_id)
            .order_by(AuditEvent.created_at.desc())
            .limit(_clamp(limit))
        ).scalars().all()
        return {
            "count": len(rows),
            "events": [
                {
                    "at": _iso(ev.created_at),
                    "actor_type": ev.actor_type,
                    "actor": ev.actor_id,
                    "action": ev.action,
                    "resource_type": ev.resource_type,
                    "resource_id": ev.resource_id,
                }
                for ev in rows
            ],
        }

    def list_connected_apps(self) -> dict[str, Any]:
        """List configured external app connectors (Google Sheets, Google Docs, ERP, Slack) for this plant."""
        rows = (
            self.db.execute(
                select(AppConnector)
                .where(AppConnector.organization_id == self.org_id)
                .order_by(AppConnector.created_at.desc())
                .limit(MAX_ROWS)
            )
            .scalars()
            .all()
        )
        return {
            "count": len(rows),
            "connectors": [
                {
                    "id": c.id,
                    "name": c.name,
                    "connector_type": c.connector_type,
                    "sync_direction": c.sync_direction,
                    "status": c.status,
                    "records_synced": c.records_synced,
                    "last_synced_at": c.last_synced_at.isoformat() if c.last_synced_at else None,
                }
                for c in rows
            ],
        }

    def get_savings_and_roi_summary(self) -> dict[str, Any]:
        """Get manufacturing cost-savings and time-savings metrics across resolved and open discrepancies."""
        summary = self.get_operations_summary()
        total_cases = int(summary["total_exceptions"])
        resolved_cases = int(summary["exceptions_by_status"].get("resolved", 0))
        open_cases = int(summary["exceptions_by_status"].get("open", 0))
        # Deterministic industry baseline: ~18 min saved per automated audit case, 32 min per resolved case
        estimated_hours_saved = round(((total_cases * 18) + (resolved_cases * 14)) / 60.0, 1)
        return {
            "cost_savings_identified_usd": summary["unresolved_discrepancy_amount_usd"],
            "cost_savings_captured_usd": summary["resolved_discrepancy_amount_usd"],
            "total_savings_opportunity_usd": round(
                summary["unresolved_discrepancy_amount_usd"] + summary["resolved_discrepancy_amount_usd"],
                2,
            ),
            "estimated_hours_saved_mtd": estimated_hours_saved,
            "open_exceptions": open_cases,
            "resolved_exceptions": resolved_cases,
            "pending_approvals": summary["pending_approvals"],
        }

    # ------------------------------------------------------------------ #
    # Google Antigravity SDK tool adapters
    # ------------------------------------------------------------------ #
    def as_antigravity_tools(self) -> list[Any]:
        """Expose tenant-scoped read-only callables for Google Antigravity SDK agents."""

        def _safe(fn):
            @functools.wraps(fn)  # preserves signature & docstring for Antigravity SDK schema extraction
            def runner(*args, **kwargs):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:  # keep the chat alive on bad args
                    logger.warning(f"Chat DB tool {fn.__name__} failed: {e}")
                    self.db.rollback()
                    return {"error": f"Query failed: {e!s}"}

            return runner

        def get_operations_summary() -> dict:
            """Get overall plant KPIs: record counts, exception counts, open cost savings, captured savings, and pending approvals."""
            return self.get_operations_summary()

        def search_exceptions(
            status: str | None = None,
            exception_type: str | None = None,
            severity: str | None = None,
            min_amount: float | None = None,
            text: str | None = None,
            sort_by: str = "amount",
            limit: int = DEFAULT_ROWS,
        ) -> dict:
            """Search operational exceptions (cost leaks and discrepancies).
            status: open | investigating | awaiting_approval | approved | resolved | unresolved.
            exception_type: quantity_mismatch | rate_mismatch | unbilled_job | duplicate_billing | dispatch_discrepancy.
            severity: low | medium | high | critical. min_amount: minimum discrepancy in USD.
            text: free-text match on title/description. sort_by: amount | recent. limit: max 25."""
            return self.search_exceptions(status, exception_type, severity, min_amount, text, sort_by, limit)

        def get_exception_details(exception_id: str) -> dict:
            """Get full details for one exception by id, including related manufacturing records and latest investigation."""
            return self.get_exception_details(exception_id)

        def search_records(
            record_type: str | None = None,
            customer: str | None = None,
            reference: str | None = None,
            status: str | None = None,
            date_from: str | None = None,
            date_to: str | None = None,
            limit: int = DEFAULT_ROWS,
        ) -> dict:
            """Search manufacturing records (POs, receiving slips, work orders, invoices, accounts).
            record_type: invoice | service_ticket | dispatch_record | load_record | customer_account.
            customer: partial customer/supplier name. reference: partial PO/WO/invoice reference.
            status: completed | pending | billed | cancelled. date_from/date_to: ISO dates (YYYY-MM-DD). limit: max 25."""
            return self.search_records(record_type, customer, reference, status, date_from, date_to, limit)

        def get_customer_overview(customer: str) -> dict:
            """Get a customer or supplier's record counts, total invoiced, linked exceptions and recent records."""
            return self.get_customer_overview(customer)

        def list_pending_approvals(limit: int = DEFAULT_ROWS) -> dict:
            """List approvals awaiting a manager decision with the related discrepancy and proposed action."""
            return self.list_pending_approvals(limit)

        def search_documents(text: str | None = None, limit: int = DEFAULT_ROWS) -> dict:
            """Search uploaded source documents (PDFs, CSVs, receiving manifests) by filename or extracted text."""
            return self.search_documents(text, limit)

        def recent_activity(limit: int = DEFAULT_ROWS) -> dict:
            """Get the most recent audit-trail events (actions taken by users, swarm agents, and workflows)."""
            return self.recent_activity(limit)

        def list_connected_apps() -> dict:
            """List connected Google Sheets, Google Docs, ERP, and Slack integrations for this organization."""
            return self.list_connected_apps()

        def get_savings_and_roi_summary() -> dict:
            """Get plant cost savings ($) and time savings (hours saved MTD) from automated swarm detection."""
            return self.get_savings_and_roi_summary()

        fns = [
            get_operations_summary,
            get_savings_and_roi_summary,
            search_exceptions,
            get_exception_details,
            search_records,
            get_customer_overview,
            list_pending_approvals,
            search_documents,
            recent_activity,
            list_connected_apps,
        ]
        return [_safe(f) for f in fns]
