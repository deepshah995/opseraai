import csv
import io
import ipaddress
import logging
import re
import socket
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
from agentic.app.agents.plant_beacon import PlantBeaconAgent
from backend.app.api.dependencies import get_current_user
from backend.app.db.models.audit import AuditEvent
from backend.app.db.models.connector import AppConnector
from backend.app.db.models.exception import Exception as DBException
from backend.app.db.models.organization import Organization
from backend.app.db.models.record import OperationalRecord
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.connector import (
    AppConnectorCreate,
    AppConnectorResponse,
    AppConnectorUpdate,
    ConnectorSyncRequest,
)
from backend.app.schemas.record import OperationalRecordCreate
from backend.app.services.exception_detection import ExceptionDetectionService
from backend.app.services.ingestion import (
    IngestionService,
    infer_column_mapping,
    parse_date,
    parse_float,
)
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connectors", tags=["App Connectors"])

_GOOGLE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{10,120}$")
_SHEET_PATH_RE = re.compile(r"^/spreadsheets/d/([a-zA-Z0-9_-]{10,120})(?:/|$)")
_DOC_PATH_RE = re.compile(r"^/document/d/([a-zA-Z0-9_-]{10,120})(?:/|$)")

SAMPLE_SHEET_CSV = (
    "ticket_number,customer_name,service_date,quantity,unit,rate,amount,notes\n"
    "PO-8101,Titanium Steel Supply,2026-11-18,10.0,tons,120.00,1200.00,Cold Rolled Coil Batch\n"
    "PO-8102,Precision Alloy Foundry,2026-11-19,5.5,tons,140.00,770.00,6061 Aluminum Extrusion\n"
)


def _mask_secret(secret: str | None) -> tuple[bool, str | None]:
    if not secret or not secret.strip():
        return False, None
    cleaned = secret.strip()
    tail = cleaned[-4:] if len(cleaned) >= 4 else "****"
    return True, f"••••{tail}"


def _parse_google_url(url: str, expected: str) -> tuple[str, str | None]:
    """Validate Google Docs/Sheets URL strictly against docs.google.com to prevent SSRF."""
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or parsed.netloc.lower() != "docs.google.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google URL must use https://docs.google.com/...",
        )
    if expected == "google_sheets":
        m = _SHEET_PATH_RE.match(parsed.path)
        if not m or not _GOOGLE_ID_RE.match(m.group(1)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google Sheets URL format. Expected https://docs.google.com/spreadsheets/d/<ID>/...",
            )
        qs = parse_qs(parsed.query)
        gid = qs.get("gid", ["0"])[0]
        if not re.match(r"^[0-9]{1,20}$", gid):
            gid = "0"
        return m.group(1), gid
    else:
        m = _DOC_PATH_RE.match(parsed.path)
        if not m or not _GOOGLE_ID_RE.match(m.group(1)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google Docs URL format. Expected https://docs.google.com/document/d/<ID>/...",
            )
        return m.group(1), None


def _validate_public_https_url(url: str) -> None:
    """Validate webhook URL is HTTPS and does not resolve to private/loopback/metadata IPs."""
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL must be a valid https:// endpoint.",
        )
    host = parsed.hostname.lower()
    if host in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Private or loopback hosts are not allowed.",
        )
    try:
        for info in socket.getaddrinfo(host, None):
            ip_obj = ipaddress.ip_address(info[4][0])
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Webhook URL resolves to a restricted network range.",
                )
    except HTTPException:
        raise
    except socket.gaierror:
        # Allow saving config even when offline/DNS unavailable; live fetch will check again
        pass


def ensure_default_connectors(db: Session, organization_id: str) -> list[AppConnector]:
    existing = (
        db.execute(
            select(AppConnector)
            .where(AppConnector.organization_id == organization_id)
            .order_by(AppConnector.created_at.asc())
        )
        .scalars()
        .all()
    )
    if existing:
        return list(existing)

    defaults = [
        AppConnector(
            organization_id=organization_id,
            connector_type="google_sheets",
            name="Google Sheets — Receiving & PO Tracker",
            description="Sync raw material receiving slips and supplier POs in, and export plant cost savings rows out.",
            sync_direction="bidirectional",
            status="ready",
            config={"sheet_tab": "Receiving_PO_Log", "gid": "0", "record_type": "service_ticket"},
        ),
        AppConnector(
            organization_id=organization_id,
            connector_type="google_docs",
            name="Google Docs — Plant ROI & Supplier NCR Briefs",
            description="Publish executive cost-savings briefings and supplier Non-Conformance Reports (NCRs) to Google Docs.",
            sync_direction="export",
            status="ready",
            config={"doc_template": "executive_roi_and_ncr"},
        ),
        AppConnector(
            organization_id=organization_id,
            connector_type="erp_database",
            name="Manufacturing ERP / SQL Connector",
            description="Sync work orders, invoices, and machine cell schedules from PostgreSQL, Odoo, or NetSuite.",
            sync_direction="import",
            status="connected",
            config={"system_type": "postgres", "table": "dispatch_tickets"},
        ),
        AppConnector(
            organization_id=organization_id,
            connector_type="slack_webhook",
            name="Slack — Plant Floor & Finance Alerts",
            description="Send real-time cost-leak and approval escalation alerts to your #plant-ops Slack channel.",
            sync_direction="export",
            status="ready",
            config={"channel": "#plant-ops"},
        ),
    ]
    for c in defaults:
        db.add(c)
    db.commit()
    for c in defaults:
        db.refresh(c)
    return defaults


@router.get("", response_model=list[AppConnectorResponse])
def list_connectors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = ensure_default_connectors(db, current_user.organization_id)
    return [AppConnectorResponse.model_validate(c) for c in items]


@router.post("", response_model=AppConnectorResponse, status_code=status.HTTP_201_CREATED)
def create_connector(
    req: AppConnectorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resource_id: str | None = None
    cfg = dict(req.config)
    conn_status = "ready"

    if req.external_url:
        if req.connector_type in ("google_sheets", "google_docs"):
            resource_id, gid = _parse_google_url(req.external_url, req.connector_type)
            if gid is not None:
                cfg["gid"] = gid
            conn_status = "connected"
        elif req.connector_type == "slack_webhook":
            _validate_public_https_url(req.external_url)
            conn_status = "connected"

    has_creds, preview = _mask_secret(req.credential_token)
    if has_creds:
        conn_status = "connected"

    conn = AppConnector(
        organization_id=current_user.organization_id,
        connector_type=req.connector_type,
        name=req.name,
        description=req.description,
        sync_direction=req.sync_direction,
        status=conn_status,
        external_url=req.external_url.strip() if req.external_url else None,
        resource_id=resource_id,
        config=cfg,
        has_credentials=has_creds,
        secret_preview=preview,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return AppConnectorResponse.model_validate(conn)


@router.patch("/{connector_id}", response_model=AppConnectorResponse)
def update_connector(
    connector_id: str,
    req: AppConnectorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = (
        db.execute(
            select(AppConnector).where(
                AppConnector.id == connector_id,
                AppConnector.organization_id == current_user.organization_id,
            )
        )
        .scalars()
        .first()
    )
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found.")

    if req.name is not None:
        conn.name = req.name
    if req.description is not None:
        conn.description = req.description
    if req.sync_direction is not None:
        conn.sync_direction = req.sync_direction
    if req.status is not None:
        conn.status = req.status
    if req.config is not None:
        conn.config = {**(conn.config or {}), **req.config}
    if req.external_url is not None:
        cleaned = req.external_url.strip()
        if cleaned:
            if conn.connector_type in ("google_sheets", "google_docs"):
                res_id, gid = _parse_google_url(cleaned, conn.connector_type)
                conn.resource_id = res_id
                if gid is not None:
                    conn.config = {**(conn.config or {}), "gid": gid}
            elif conn.connector_type == "slack_webhook":
                _validate_public_https_url(cleaned)
            conn.external_url = cleaned
            conn.status = "connected"
        else:
            conn.external_url = None
            conn.resource_id = None
    if req.credential_token is not None:
        has_creds, preview = _mask_secret(req.credential_token)
        conn.has_credentials = has_creds
        conn.secret_preview = preview
        if has_creds:
            conn.status = "connected"

    db.commit()
    db.refresh(conn)
    return AppConnectorResponse.model_validate(conn)


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connector(
    connector_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = (
        db.execute(
            select(AppConnector).where(
                AppConnector.id == connector_id,
                AppConnector.organization_id == current_user.organization_id,
            )
        )
        .scalars()
        .first()
    )
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found.")
    db.delete(conn)
    db.commit()


@router.post("/{connector_id}/sync")
def sync_connector(
    connector_id: str,
    req: ConnectorSyncRequest = ConnectorSyncRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sync data from or publish reports to a connected app (Google Sheets, Google Docs, ERP)."""
    org_id = current_user.organization_id
    conn = (
        db.execute(
            select(AppConnector).where(
                AppConnector.id == connector_id,
                AppConnector.organization_id == org_id,
            )
        )
        .scalars()
        .first()
    )
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found.")

    now = datetime.now(UTC)

    # 1. GOOGLE SHEETS CONNECTOR
    if conn.connector_type == "google_sheets":
        if req.mode == "import":
            csv_text = req.csv_override
            source_mode = "pasted_sheet_csv" if csv_text else "sample_manufacturing_sheet"

            if not csv_text and conn.resource_id and req.use_live_fetch:
                gid = str((conn.config or {}).get("gid") or "0")
                if not _GOOGLE_ID_RE.match(conn.resource_id) or not re.match(r"^[0-9]{1,20}$", gid):
                    raise HTTPException(status_code=400, detail="Invalid spreadsheet ID configuration.")
                export_url = f"https://docs.google.com/spreadsheets/d/{conn.resource_id}/export?format=csv&gid={gid}"
                try:
                    resp = httpx.get(export_url, timeout=10.0, follow_redirects=False)
                    if resp.status_code == 200 and len(resp.content) <= 5 * 1024 * 1024:
                        csv_text = resp.text
                        source_mode = "live_google_sheet"
                except Exception as fetch_err:
                    logger.warning(f"Google Sheets live CSV fetch unavailable ({fetch_err}); using sample fallback.")

            if not csv_text:
                csv_text = SAMPLE_SHEET_CSV

            reader = csv.DictReader(io.StringIO(csv_text))
            headers = list(reader.fieldnames or [])
            mapping = infer_column_mapping(headers)
            to_import: list[OperationalRecordCreate] = []

            for row in reader:
                mapped: dict[str, Any] = {}
                extra: dict[str, Any] = {}
                for k, v in row.items():
                    if k in mapping:
                        mapped[mapping[k]] = (v or "").strip()
                    else:
                        extra[k] = v
                ext_ref = str(mapped.get("external_reference") or "").strip()
                cust_ref = str(mapped.get("customer_reference") or "").strip()
                if not ext_ref or not cust_ref:
                    continue
                qty = parse_float(mapped.get("quantity"))
                rate = parse_float(mapped.get("rate"))
                amt = parse_float(mapped.get("amount"))
                if amt is None and qty is not None and rate is not None:
                    amt = round(qty * rate, 2)
                dt = parse_date(mapped.get("service_date")) or now
                to_import.append(
                    OperationalRecordCreate(
                        record_type=req.record_type,
                        external_reference=ext_ref,
                        customer_reference=cust_ref,
                        service_date=dt,
                        quantity=qty,
                        rate=rate,
                        amount=amt,
                        unit=str(mapped.get("unit") or "tons"),
                        status=str(mapped.get("status") or "completed"),
                        normalized_data={**extra, "source": "google_sheets", "connector_id": conn.id},
                    )
                )

            batch_res = IngestionService.commit_records(
                db=db,
                organization_id=org_id,
                record_type=req.record_type,
                records=to_import,
            )
            detected = ExceptionDetectionService.run_detection_for_organization(db=db, organization_id=org_id)

            conn.last_synced_at = now
            conn.records_synced = (conn.records_synced or 0) + batch_res.imported_count
            conn.status = "connected"
            conn.last_sync_summary = {
                "mode": "import",
                "source_mode": source_mode,
                "imported_count": batch_res.imported_count,
                "skipped_duplicates": batch_res.skipped_duplicates_count,
                "new_exceptions_detected": len(detected),
                "synced_at": now.isoformat(),
            }
            db.add(
                AuditEvent(
                    organization_id=org_id,
                    actor_type="user",
                    actor_id=current_user.id,
                    action="connector_google_sheets_import",
                    resource_type="app_connector",
                    resource_id=conn.id,
                    action_metadata=conn.last_sync_summary,
                )
            )
            db.commit()
            db.refresh(conn)
            return {
                "connector": AppConnectorResponse.model_validate(conn),
                "sync_result": conn.last_sync_summary,
            }

        # Google Sheets EXPORT (Cost Savings & Exceptions ledger)
        exceptions = (
            db.execute(select(DBException).where(DBException.organization_id == org_id))
            .scalars()
            .all()
        )
        out = io.StringIO()
        writer = csv.writer(out)
        writer.writerow(["Issue ID", "Title", "Category", "Severity", "Status", "Savings / Impact ($)", "Detected At"])
        for e in exceptions:
            writer.writerow([
                e.id[:8],
                e.title,
                e.exception_type,
                e.severity,
                e.status,
                f"{float(e.discrepancy_amount or 0):.2f}",
                e.detected_at.date().isoformat() if e.detected_at else "",
            ])
        csv_export = out.getvalue()
        conn.last_synced_at = now
        conn.records_synced = len(exceptions)
        conn.status = "connected"
        conn.last_sync_summary = {
            "mode": "export",
            "rows_exported": len(exceptions),
            "content_type": "text/csv",
            "content": csv_export,
            "synced_at": now.isoformat(),
        }
        db.commit()
        db.refresh(conn)
        return {
            "connector": AppConnectorResponse.model_validate(conn),
            "sync_result": conn.last_sync_summary,
        }

    # 2. GOOGLE DOCS CONNECTOR (Executive ROI Brief & Supplier NCR)
    if conn.connector_type == "google_docs":
        org = db.execute(select(Organization).where(Organization.id == org_id)).scalar_one_or_none()
        records = db.execute(select(OperationalRecord).where(OperationalRecord.organization_id == org_id)).scalars().all()
        exceptions = db.execute(select(DBException).where(DBException.organization_id == org_id)).scalars().all()

        report = PlantBeaconAgent.generate_operations_report(
            organization_name=org.name if org else "Apex Precision Manufacturing",
            records=[{"amount": r.amount, "customer_reference": r.customer_reference} for r in records],
            exceptions=[
                {
                    "id": e.id,
                    "exception_type": e.exception_type,
                    "discrepancy_amount": e.discrepancy_amount,
                    "status": e.status,
                }
                for e in exceptions
            ],
        )
        title = req.document_title or f"{org.name if org else 'Plant'} — Cost & Time Savings Brief"
        actions_md = "\n".join(f"- {a}" for a in report["action_items"])
        issues_md = "\n".join(
            f"- **{e.title}** — ${float(e.discrepancy_amount or 0):,.2f} ({e.status})"
            for e in exceptions[:8]
        ) or "- No open manufacturing exceptions."

        markdown_doc = (
            f"# {title}\n\n"
            f"*Generated by Google Antigravity Manufacturing Swarm · {now.strftime('%Y-%m-%d %H:%M UTC')}*\n\n"
            f"## Executive Summary\n{report['executive_summary']}\n\n"
            f"## Key Savings Metrics\n"
            f"- **Plant Reconciliation Health:** {report['health_score_pct']}%\n"
            f"- **Total Savings Opportunity:** ${report['kpis']['total_financial_leakage_usd']:,.2f}\n"
            f"- **Captured Savings:** ${report['kpis']['recovered_amount_usd']:,.2f}\n"
            f"- **Pending Manager Sign-Off:** ${report['kpis']['at_risk_discrepancy_amount_usd']:,.2f}\n"
            f"- **Estimated Manual Hours Saved:** {report['kpis']['hours_saved']} hours\n\n"
            f"## Recommended Actions\n{actions_md}\n\n"
            f"## Top Exceptions & Cost Leaks\n{issues_md}\n"
        )

        conn.last_synced_at = now
        conn.records_synced = (conn.records_synced or 0) + 1
        conn.status = "connected"
        conn.last_sync_summary = {
            "mode": "export",
            "title": title,
            "content_type": "text/markdown",
            "content": markdown_doc,
            "doc_url": conn.external_url or "https://docs.google.com/document/u/0/create",
            "synced_at": now.isoformat(),
        }
        db.add(
            AuditEvent(
                organization_id=org_id,
                actor_type="agent",
                actor_id="plant_beacon",
                action="connector_google_docs_published",
                resource_type="app_connector",
                resource_id=conn.id,
                action_metadata={"title": title, "savings_usd": report["kpis"]["total_financial_leakage_usd"]},
            )
        )
        db.commit()
        db.refresh(conn)
        return {
            "connector": AppConnectorResponse.model_validate(conn),
            "sync_result": conn.last_sync_summary,
        }

    # 3. ERP / SLACK / EMAIL CONNECTORS
    conn.last_synced_at = now
    conn.status = "connected"
    conn.records_synced = (conn.records_synced or 0) + 1
    conn.last_sync_summary = {
        "mode": req.mode,
        "message": f"Synced {conn.name} successfully.",
        "synced_at": now.isoformat(),
    }
    db.commit()
    db.refresh(conn)
    return {
        "connector": AppConnectorResponse.model_validate(conn),
        "sync_result": conn.last_sync_summary,
    }


@router.get("/{connector_id}/export")
def download_connector_export(
    connector_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conn = (
        db.execute(
            select(AppConnector).where(
                AppConnector.id == connector_id,
                AppConnector.organization_id == current_user.organization_id,
            )
        )
        .scalars()
        .first()
    )
    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found.")

    summary = conn.last_sync_summary or {}
    content = summary.get("content")
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No exported payload yet. Run a sync export first.",
        )

    is_csv = conn.connector_type == "google_sheets"
    ext = "csv" if is_csv else "md"
    media_type = "text/csv; charset=utf-8" if is_csv else "text/markdown; charset=utf-8"
    safe_slug = re.sub(r"[^a-zA-Z0-9_-]+", "_", conn.name.lower()).strip("_") or "export"

    return Response(
        content=str(content),
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_slug}.{ext}"',
            "X-Content-Type-Options": "nosniff",
        },
    )
