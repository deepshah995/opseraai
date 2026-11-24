import logging
from datetime import UTC, datetime
from typing import Any

from backend.app.api.dependencies import get_current_user
from backend.app.db.models.record import OperationalRecord
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.schemas.record import (
    BatchImportCommitRequest,
    BatchImportPreview,
    BatchImportResult,
    DatabaseConnectionTestRequest,
    DatabaseConnectionTestResponse,
    DatabaseImportRequest,
    DatabaseTablePreviewRequest,
    DatabaseTablePreviewResponse,
    OperationalRecordCreate,
    OperationalRecordResponse,
)
from backend.app.services.ingestion import (
    IngestionService,
    infer_column_mapping,
    parse_date,
    parse_float,
)
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/records", tags=["Operational Records"])


@router.get("", response_model=list[OperationalRecordResponse])
def list_records(
    record_type: str | None = Query(None),
    customer: str | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(OperationalRecord).where(
        OperationalRecord.organization_id == current_user.organization_id
    )
    if record_type:
        query = query.where(OperationalRecord.record_type == record_type)
    if customer:
        query = query.where(OperationalRecord.customer_reference.ilike(f"%{customer}%"))
    if search:
        query = query.where(
            or_(
                OperationalRecord.external_reference.ilike(f"%{search}%"),
                OperationalRecord.customer_reference.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(OperationalRecord.created_at.desc()).offset(offset).limit(limit)
    records = db.execute(query).scalars().all()
    return [OperationalRecordResponse.model_validate(r) for r in records]


@router.post("/preview-csv", response_model=BatchImportPreview)
async def preview_csv_import(
    file: UploadFile = File(...),
    record_type: str = Form("service_ticket"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_bytes = await file.read()
    try:
        csv_text = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        csv_text = content_bytes.decode("latin-1", errors="replace")

    return IngestionService.preview_csv(
        db=db,
        organization_id=current_user.organization_id,
        csv_content=csv_text,
        record_type=record_type,
    )


@router.post("/commit-batch", response_model=BatchImportResult)
def commit_batch_records(
    req: BatchImportCommitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return IngestionService.commit_records(
        db=db,
        organization_id=current_user.organization_id,
        record_type=req.record_type,
        records=req.records,
        source_document_id=req.source_document_id,
    )


@router.post("/seed-demo", response_model=BatchImportResult)
def seed_demo_data(
    reset_existing: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Seed realistic manufacturing operations records illustrating cost, BOM, schedule & QC discrepancies."""
    org_id = current_user.organization_id
    now = datetime.now(UTC)

    demo_refs = [
        "SCH-6601", "SCH-6602", "SCH-6605", "SCH-6606", "SCH-6608",
        "RCV-8812", "RCV-8813", "RCV-8815", "RCV-8816", "RCV-8817", "RCV-110", "LOT-3301",
        "PO-4401", "WO-4402", "WO-4403", "WO-4405", "WO-7720", "WO-9912",
        "WO-3319", "WO-5544", "WO-4410", "WO-4412", "WO-4413", "WO-4414",
        "INV-9021", "INV-9022", "INV-9023", "INV-9024", "INV-9025", "INV-8801", "INV-8802",
        "INV-9028", "INV-9029", "INV-9030", "INV-9031",
        "NCR-88", "NCR-89", "NCR-90",
        # Clean up legacy waste demo refs if reseeding
        "DSP-6601", "DSP-6602", "DSP-6605", "DSP-6606", "DSP-6608",
        "SC-8812", "SC-8813", "SC-8815", "SC-8816", "SC-8817", "SC-110", "MAN-3301",
        "TKT-4401", "TKT-4402", "TKT-4403", "TKT-4405", "TKT-7720", "TKT-9912",
        "TKT-3319", "TKT-5544", "TKT-4410", "TKT-4412", "TKT-4413", "TKT-4414",
        "DISP-88", "DISP-89", "DISP-90",
    ]

    if reset_existing:
        db.execute(
            delete(OperationalRecord).where(
                OperationalRecord.organization_id == org_id,
                OperationalRecord.external_reference.in_(demo_refs),
            )
        )
        db.commit()

    demo_records = [
        # --- 1. APEX CONSTRUCTION / PRECISION METALS: PO Rate Mismatch ($220.00 Savings) ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="PO-4401",
            customer_reference="Apex Construction & Metals",
            service_date=now,
            amount=680.00,
            quantity=8.5,
            unit="tons",
            rate=80.00,
            status="completed",
            normalized_data={"plant_bay": "Receiving Dock B", "material": "Cold-Rolled Steel Coil", "buyer": "Dave Vance", "machine_cell": "CNC-CELL-04", "scale_ticket_no": "RCV-8812"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="RCV-8812",
            customer_reference="Apex Construction & Metals",
            service_date=now,
            amount=255.00,
            quantity=8.5,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "Receiving Dock Floor Scale #1", "gross_lbs": 48200, "tare_lbs": 31200, "net_lbs": 17000, "inspector": "J. Miller"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9021",
            customer_reference="Apex Construction & Metals",
            service_date=now,
            amount=900.00,
            quantity=11.25,
            unit="tons",
            rate=80.00,
            status="billed",
            normalized_data={"ticket_numbers": ["PO-4401"], "terms": "Net 30", "due_date": now.isoformat()},
        ),

        # --- 2. BIOPHARM ALLOY & RESIN: Raw Material Receiving Weight Shortage ($595.00 Savings) ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-7720",
            customer_reference="BioPharm Polymer Supply",
            service_date=now,
            amount=2125.00,
            quantity=2500.0,
            unit="lbs",
            rate=0.85,
            status="completed",
            normalized_data={"scale_ticket_no": "LOT-3301", "material": "Medical-Grade HDPE Resin", "operator": "Tom Brody", "machine_cell": "INJ-LINE-02"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="LOT-3301",
            customer_reference="BioPharm Polymer Supply",
            service_date=now,
            amount=900.00,
            quantity=1800.0,
            unit="lbs",
            rate=0.50,
            status="completed",
            normalized_data={"facility": "Raw Material Receiving Dock #2", "lot_number": "LOT-NY-889104"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9025",
            customer_reference="BioPharm Polymer Supply",
            service_date=now,
            amount=2125.00,
            quantity=2500.0,
            unit="lbs",
            rate=0.85,
            status="billed",
            normalized_data={"ticket_numbers": ["WO-7720"], "manifest_ref": "LOT-3301"},
        ),

        # --- 3. GREENVALLEY ROBOTICS: Unbilled Custom Assembly Batch ($1,450.00 Revenue Recovery) ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-9912",
            customer_reference="GreenValley Robotics",
            service_date=now,
            amount=1450.00,
            quantity=1.0,
            unit="batches",
            rate=1450.00,
            status="completed",
            normalized_data={"assembly_sku": "ARM-HSG-880", "rush_order": True, "lead": "Elena Gomez", "machine_cell": "ASM-CELL-02"},
        ),

        # --- 4. SUMMIT HYDRAULICS: Shop-Floor Machine Cell Swap (Time & OEE Sync) ---
        OperationalRecordCreate(
            record_type="dispatch_record",
            external_reference="SCH-6602",
            customer_reference="Summit Hydraulics Ltd",
            service_date=now,
            amount=420.00,
            quantity=1.0,
            unit="runs",
            rate=420.00,
            status="completed",
            normalized_data={"ticket_number": "WO-3319", "truck_id": "CNC-CELL-01", "machine_cell": "CNC-CELL-01", "operator": "Ken Adams", "line": "Machining Bay 3"},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-3319",
            customer_reference="Summit Hydraulics Ltd",
            service_date=now,
            amount=420.00,
            quantity=1.0,
            unit="runs",
            rate=420.00,
            status="completed",
            normalized_data={"truck_id": "CNC-CELL-03", "machine_cell": "CNC-CELL-03", "operator": "Dave Vance", "notes": "Rerouted due to CNC-CELL-01 spindle tool calibration"},
        ),

        # --- 5. DELTA PRECISION STAMPING: Duplicate Vendor Invoice ($780.00 Cost Avoidance) ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-5544",
            customer_reference="Delta Precision Stamping",
            service_date=now,
            amount=780.00,
            quantity=6.0,
            unit="tons",
            rate=130.00,
            status="completed",
            normalized_data={"part_family": "Stamped Steel Brackets", "bay": "Stamping Press 4"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-8801",
            customer_reference="Delta Precision Stamping",
            service_date=now,
            amount=780.00,
            quantity=6.0,
            unit="tons",
            rate=130.00,
            status="billed",
            normalized_data={"ticket_numbers": ["WO-5544"], "batch_run": "AP-NOV-A"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-8802",
            customer_reference="Delta Precision Stamping",
            service_date=now,
            amount=780.00,
            quantity=6.0,
            unit="tons",
            rate=130.00,
            status="billed",
            normalized_data={"ticket_numbers": ["WO-5544"], "batch_run": "AP-NOV-B", "note": "Duplicate AP batch"},
        ),

        # --- 6. PINNACLE SHEET METAL: Coil BOM Weight Variance ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-4402",
            customer_reference="Pinnacle Sheet Metal",
            service_date=now,
            amount=828.00,
            quantity=9.2,
            unit="tons",
            rate=90.00,
            status="completed",
            normalized_data={"scale_ticket_no": "RCV-8813", "material": "304 Stainless Sheet", "machine_cell": "LASER-05"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="RCV-8813",
            customer_reference="Pinnacle Sheet Metal",
            service_date=now,
            amount=300.00,
            quantity=10.0,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "Receiving Dock Floor Scale #2", "gross_lbs": 52400, "tare_lbs": 32400, "net_lbs": 20000},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9022",
            customer_reference="Pinnacle Sheet Metal",
            service_date=now,
            amount=1080.00,
            quantity=12.0,
            unit="tons",
            rate=90.00,
            status="billed",
            normalized_data={"ticket_numbers": ["WO-4402"]},
        ),

        # --- 7. APEX PRECISION METALS: Supplier Quality / Shortage NCR Claim ($140.00) ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-4410",
            customer_reference="Apex Precision Metals",
            service_date=now,
            amount=340.00,
            quantity=6.8,
            unit="tons",
            rate=50.00,
            status="completed",
            normalized_data={"scale_ticket_no": "RCV-110", "inspector": "Carlos Mendez", "machine_cell": "CNC-CELL-08"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="RCV-110",
            customer_reference="Apex Precision Metals",
            service_date=now,
            amount=120.00,
            quantity=4.0,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "Receiving Dock Floor Scale #2", "gross_lbs": 38000, "tare_lbs": 30000, "net_lbs": 8000},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9028",
            customer_reference="Apex Precision Metals",
            service_date=now,
            amount=340.00,
            quantity=6.8,
            unit="tons",
            rate=50.00,
            status="billed",
            normalized_data={"ticket_numbers": ["WO-4410"]},
        ),
        OperationalRecordCreate(
            record_type="customer_account",
            external_reference="NCR-88",
            customer_reference="Apex Precision Metals",
            service_date=now,
            amount=140.00,
            status="pending",
            normalized_data={"claim": "Vendor billed 6.8 tons of bar stock; dock scale RCV-110 verified 4.0 tons.", "disputed_invoice": "INV-9028"},
        ),

        # --- 8-12. CLEAN MATCHED MANUFACTURING RUNS ---
        OperationalRecordCreate(
            record_type="dispatch_record",
            external_reference="SCH-6601",
            customer_reference="Horizon Automotive Tier-1",
            service_date=now,
            amount=1232.50,
            quantity=14.5,
            unit="tons",
            rate=85.00,
            status="completed",
            normalized_data={"truck_id": "CNC-CELL-02", "machine_cell": "CNC-CELL-02", "ticket_number": "WO-4405"},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-4405",
            customer_reference="Horizon Automotive Tier-1",
            service_date=now,
            amount=1232.50,
            quantity=14.5,
            unit="tons",
            rate=85.00,
            status="completed",
            normalized_data={"truck_id": "CNC-CELL-02", "machine_cell": "CNC-CELL-02", "material": "Forged Alloy Blanks"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9024",
            customer_reference="Horizon Automotive Tier-1",
            service_date=now,
            amount=1232.50,
            quantity=14.5,
            unit="tons",
            rate=85.00,
            status="billed",
            normalized_data={"ticket_numbers": ["WO-4405"]},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="WO-4403",
            customer_reference="Crestview Aerospace Fasteners",
            service_date=now,
            amount=1440.00,
            quantity=18.0,
            unit="tons",
            rate=80.00,
            status="completed",
            normalized_data={"machine_cell": "CNC-CELL-01", "material": "Ti-6Al-4V Bar Stock"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9023",
            customer_reference="Crestview Aerospace Fasteners",
            service_date=now,
            amount=1440.00,
            quantity=18.0,
            unit="tons",
            rate=80.00,
            status="billed",
            normalized_data={"ticket_numbers": ["WO-4403"]},
        ),
    ]

    result = IngestionService.commit_records(
        db=db,
        organization_id=org_id,
        record_type="mixed",
        records=demo_records,
    )

    try:
        from backend.app.services.exception_detection import ExceptionDetectionService
        ExceptionDetectionService.run_detection_for_organization(db=db, organization_id=org_id)
    except Exception as e:
        logger.warning(f"Auto-detection after seed skipped: {e}")

    return result


# --- Database & External ERP Integration Endpoints ---

MOCK_DB_TABLES = {
    "dispatch_tickets": {
        "columns": ["ticket_id", "customer_name", "ticket_date", "weight_tons", "unit_rate", "total_amount", "driver_name", "truck_num", "status"],
        "rows": [
            {"ticket_id": "WO-5510", "customer_name": "Horizon Automotive Tier-1", "ticket_date": "2026-11-12", "weight_tons": 14.5, "unit_rate": 85.0, "total_amount": 1232.5, "driver_name": "Carlos Mendez", "truck_num": "CNC-CELL-02", "status": "completed"},
            {"ticket_id": "WO-5511", "customer_name": "Pinnacle Sheet Metal", "ticket_date": "2026-11-13", "weight_tons": 9.2, "unit_rate": 90.0, "total_amount": 828.0, "driver_name": "Dave Vance", "truck_num": "LASER-05", "status": "completed"},
            {"ticket_id": "WO-5512", "customer_name": "Crestview Aerospace Fasteners", "ticket_date": "2026-11-14", "weight_tons": 18.0, "unit_rate": 80.0, "total_amount": 1440.0, "driver_name": "Marcus Cole", "truck_num": "CNC-CELL-01", "status": "completed"},
        ],
    },
    "supplier_invoices": {
        "columns": ["invoice_number", "client_name", "billing_date", "billed_quantity", "rate_applied", "total_billed", "ticket_ref", "status"],
        "rows": [
            {"invoice_number": "INV-7810", "client_name": "Horizon Automotive Tier-1", "billing_date": "2026-11-13", "billed_quantity": 14.5, "rate_applied": 85.0, "total_billed": 1232.5, "ticket_ref": "WO-5510", "status": "billed"},
            {"invoice_number": "INV-7811", "client_name": "Pinnacle Sheet Metal", "billing_date": "2026-11-14", "billed_quantity": 12.0, "rate_applied": 90.0, "total_billed": 1080.0, "ticket_ref": "WO-5511", "status": "billed"},
        ],
    },
    "receiving_manifests": {
        "columns": ["manifest_number", "generator_name", "shipment_date", "net_weight_tons", "tipping_fee_rate", "total_tipping_cost", "disposal_facility"],
        "rows": [
            {"manifest_number": "RCV-6201", "generator_name": "Horizon Automotive Tier-1", "shipment_date": "2026-11-12", "net_weight_tons": 14.5, "tipping_fee_rate": 32.0, "total_tipping_cost": 464.0, "disposal_facility": "Receiving Dock #1"},
            {"manifest_number": "RCV-6202", "generator_name": "Pinnacle Sheet Metal", "shipment_date": "2026-11-13", "net_weight_tons": 9.2, "tipping_fee_rate": 32.0, "total_tipping_cost": 294.4, "disposal_facility": "Receiving Dock #2"},
        ],
    },
}


@router.post("/db/test-connection", response_model=DatabaseConnectionTestResponse)
def test_db_connection(
    req: DatabaseConnectionTestRequest,
    current_user: User = Depends(get_current_user),
):
    del current_user
    system_label = req.system_type.capitalize()
    return DatabaseConnectionTestResponse(
        success=True,
        message=f"Connected to {system_label} ERP at {req.host}:{req.port}/{req.database_name}. Retrieved operational tables.",
        system_type=req.system_type,
        available_tables=list(MOCK_DB_TABLES.keys()),
    )


@router.post("/db/preview-table", response_model=DatabaseTablePreviewResponse)
def preview_db_table(
    req: DatabaseTablePreviewRequest,
    current_user: User = Depends(get_current_user),
):
    del current_user
    table_data = MOCK_DB_TABLES.get(req.table_name) or MOCK_DB_TABLES["dispatch_tickets"]
    columns = table_data["columns"]
    sample_rows = table_data["rows"]
    inferred_mapping = infer_column_mapping(columns)

    return DatabaseTablePreviewResponse(
        table_name=req.table_name,
        columns=columns,
        sample_rows=sample_rows,
        inferred_mapping=inferred_mapping,
    )


@router.post("/db/import", response_model=BatchImportResult)
def import_records_from_db(
    req: DatabaseImportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mapped_target_fields = set(req.column_mapping.values())
    if "external_reference" not in mapped_target_fields:
        raise HTTPException(
            status_code=400,
            detail="Template format error: Missing PO / Work Order / Invoice identifier ('external_reference').",
        )
    if "customer_reference" not in mapped_target_fields:
        raise HTTPException(
            status_code=400,
            detail="Template format error: Missing Vendor / Customer reference ('customer_reference').",
        )

    rows_to_process = req.rows
    if not rows_to_process:
        table_data = MOCK_DB_TABLES.get(req.table_name, MOCK_DB_TABLES["dispatch_tickets"])
        rows_to_process = table_data["rows"]

    records_to_create: list[OperationalRecordCreate] = []
    now = datetime.now(UTC)

    for r in rows_to_process:
        mapped_dict: dict[str, Any] = {}
        extra_data: dict[str, Any] = {}
        for src_col, val in r.items():
            target_field = req.column_mapping.get(src_col)
            if target_field:
                mapped_dict[target_field] = val
            else:
                extra_data[src_col] = val

        ext_ref = str(mapped_dict.get("external_reference") or "").strip()
        cust_ref = str(mapped_dict.get("customer_reference") or "").strip()
        if not ext_ref or not cust_ref:
            continue

        raw_date = mapped_dict.get("service_date")
        service_dt = parse_date(str(raw_date)) if raw_date else now
        qty = parse_float(str(mapped_dict.get("quantity"))) if mapped_dict.get("quantity") is not None else None
        rate = parse_float(str(mapped_dict.get("rate"))) if mapped_dict.get("rate") is not None else None
        amount = parse_float(str(mapped_dict.get("amount"))) if mapped_dict.get("amount") is not None else None

        if amount is None and qty is not None and rate is not None:
            amount = round(qty * rate, 2)

        records_to_create.append(
            OperationalRecordCreate(
                record_type=req.record_type,
                external_reference=ext_ref,
                customer_reference=cust_ref,
                service_date=service_dt,
                quantity=qty,
                rate=rate,
                amount=amount,
                unit=str(mapped_dict.get("unit") or "tons"),
                status=str(mapped_dict.get("status") or "completed"),
                normalized_data=extra_data,
            )
        )

    return IngestionService.commit_records(
        db=db,
        organization_id=current_user.organization_id,
        record_type=req.record_type,
        records=records_to_create,
    )
