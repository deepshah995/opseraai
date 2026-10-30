from datetime import UTC, datetime

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
from backend.app.services.ingestion import IngestionService, infer_column_mapping, parse_date, parse_float
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session


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

    preview = IngestionService.preview_csv(
        db=db,
        organization_id=current_user.organization_id,
        csv_content=csv_text,
        record_type=record_type,
    )
    return preview

@router.post("/commit-batch", response_model=BatchImportResult)
def commit_batch_records(
    req: BatchImportCommitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = IngestionService.commit_records(
        db=db,
        organization_id=current_user.organization_id,
        record_type=req.record_type,
        records=req.records,
        source_document_id=req.source_document_id,
    )
    return result

@router.post("/seed-demo", response_model=BatchImportResult)
def seed_demo_data(
    reset_existing: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Seed comprehensive industrial waste & recycling operational records illustrating realistic discrepancies."""
    org_id = current_user.organization_id
    now = datetime.now(UTC)

    demo_refs = [
        # Trucks / Dispatches
        "DSP-6601", "DSP-6602", "DSP-6603", "DSP-6604", "DSP-6605", "DSP-6606", "DSP-6607", "DSP-6608",
        # Scale Slips / Load Records
        "SC-8812", "SC-8813", "SC-8814", "SC-8815", "SC-8816", "SC-8817", "SC-110", "MAN-3301", "MAN-3302",
        # Service Tickets
        "TKT-4401", "TKT-4402", "TKT-4403", "TKT-4404", "TKT-4405", "TKT-7720", "TKT-9912",
        "TKT-3319", "TKT-5544", "TKT-4409", "TKT-4410", "TKT-4411", "TKT-4412", "TKT-4413", "TKT-4414", "TKT-4415", "TKT-4416",
        # Invoices
        "INV-9021", "INV-9022", "INV-9023", "INV-9024", "INV-9025", "INV-8801", "INV-8802",
        "INV-9028", "INV-9029", "INV-9030", "INV-9031", "INV-9032", "INV-9033",
        # Claims
        "DISP-88", "DISP-89", "DISP-90", "DISP-91", "DISP-92",
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
        # --- 1. APEX CONSTRUCTION: Rate Mismatch & Scale Validation ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4401",
            customer_reference="Apex Construction LLC",
            service_date=now,
            amount=680.00,
            quantity=8.5,
            unit="tons",
            rate=80.00,
            status="completed",
            normalized_data={"job_site": "400 Industrial Pkwy", "container_size": "30yd", "driver": "Dave Vance", "truck_id": "TRK-104", "scale_ticket_no": "SC-8812"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="SC-8812",
            customer_reference="Apex Construction LLC",
            service_date=now,
            amount=255.00,
            quantity=8.5,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "Metro Transfer Station", "gross_lbs": 48200, "tare_lbs": 31200, "net_lbs": 17000, "scale_operator": "J. Miller"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9021",
            customer_reference="Apex Construction LLC",
            service_date=now,
            amount=900.00,
            quantity=11.25,
            unit="tons",
            rate=80.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4401"], "terms": "Net 30", "due_date": now.isoformat()},
        ),

        # --- 2. BIOPHARM CHEMICAL: Industrial Sludge Manifest Quantity Discrepancy ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-7720",
            customer_reference="BioPharm Chemical Labs",
            service_date=now,
            amount=2125.00,
            quantity=2500.0,
            unit="gallons",
            rate=0.85,
            status="completed",
            normalized_data={"scale_ticket_no": "MAN-3301", "waste_type": "Industrial Washwater", "driver": "Tom Brody", "truck_id": "TRK-501"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="MAN-3301",
            customer_reference="BioPharm Chemical Labs",
            service_date=now,
            amount=900.00,
            quantity=1800.0,
            unit="gallons",
            rate=0.50,
            status="completed",
            normalized_data={"manifest_certified": True, "treatment_plant": "North Water Recovery", "manifest_number": "EPA-NY-889104"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9025",
            customer_reference="BioPharm Chemical Labs",
            service_date=now,
            amount=2125.00,
            quantity=2500.0,
            unit="gallons",
            rate=0.85,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-7720"], "manifest_ref": "MAN-3301"},
        ),

        # --- 3. GREENVALLEY MUNICIPAL: Unbilled Completed Compactor Haul ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-9912",
            customer_reference="GreenValley Municipal Complex",
            service_date=now,
            amount=1450.00,
            quantity=1.0,
            unit="pulls",
            rate=1450.00,
            status="completed",
            normalized_data={"compactor_serial": "CMP-880", "emergency_pull": True, "driver": "Elena Gomez", "truck_id": "TRK-210"},
        ),

        # --- 4. SUMMIT MATERIALS: Dispatch Schedule Reassignment Divergence ---
        OperationalRecordCreate(
            record_type="dispatch_record",
            external_reference="DSP-6602",
            customer_reference="Summit Materials Quarry",
            service_date=now,
            amount=420.00,
            quantity=1.0,
            unit="hauls",
            rate=420.00,
            status="completed",
            normalized_data={"ticket_number": "TKT-3319", "truck_id": "TRK-208", "driver": "Ken Adams", "route": "Sector 3 North"},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-3319",
            customer_reference="Summit Materials Quarry",
            service_date=now,
            amount=420.00,
            quantity=1.0,
            unit="hauls",
            rate=420.00,
            status="completed",
            normalized_data={"truck_id": "TRK-104", "driver": "Dave Vance", "notes": "Emergency morning swap: TRK-208 had flat tire"},
        ),

        # --- 5. DELTA LOGISTICS: Duplicate Invoice Run Incident ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-5544",
            customer_reference="Delta Logistics Hub",
            service_date=now,
            amount=780.00,
            quantity=6.0,
            unit="tons",
            rate=130.00,
            status="completed",
            normalized_data={"bin_id": "BIN-99", "dock_bay": "Bay 4"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-8801",
            customer_reference="Delta Logistics Hub",
            service_date=now,
            amount=780.00,
            quantity=6.0,
            unit="tons",
            rate=130.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-5544"], "batch_run": "BATCH-OCT-A"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-8802",
            customer_reference="Delta Logistics Hub",
            service_date=now,
            amount=780.00,
            quantity=6.0,
            unit="tons",
            rate=130.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-5544"], "batch_run": "BATCH-OCT-B", "note": "Duplicate billing error"},
        ),

        # --- 6. PINNACLE PAPER & PULP: Cardboard Scrap Weight Discrepancy ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4402",
            customer_reference="Pinnacle Paper & Pulp",
            service_date=now,
            amount=828.00,
            quantity=9.2,
            unit="tons",
            rate=90.00,
            status="completed",
            normalized_data={"scale_ticket_no": "SC-8813", "material": "OCC Baled Cardboard", "driver": "Marcus Cole", "truck_id": "TRK-305"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="SC-8813",
            customer_reference="Pinnacle Paper & Pulp",
            service_date=now,
            amount=300.00,
            quantity=10.0,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "North Landfill Scale #2", "gross_lbs": 52400, "tare_lbs": 32400, "net_lbs": 20000},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9022",
            customer_reference="Pinnacle Paper & Pulp",
            service_date=now,
            amount=1080.00,
            quantity=12.0,
            unit="tons",
            rate=90.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4402"]},
        ),

        # --- 7. APEX MANUFACTURING CORP: Customer Tonnage Protest ($140.00) ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4410",
            customer_reference="Apex Manufacturing Corp",
            service_date=now,
            amount=340.00,
            quantity=6.8,
            unit="tons",
            rate=50.00,
            status="completed",
            normalized_data={"scale_ticket_no": "SC-110", "driver": "Carlos Mendez", "truck_id": "TRK-108"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="SC-110",
            customer_reference="Apex Manufacturing Corp",
            service_date=now,
            amount=120.00,
            quantity=4.0,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "North Landfill Scale #2", "gross_lbs": 38000, "tare_lbs": 30000, "net_lbs": 8000, "scale_operator": "B. Taylor"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9028",
            customer_reference="Apex Manufacturing Corp",
            service_date=now,
            amount=340.00,
            quantity=6.8,
            unit="tons",
            rate=50.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4410"]},
        ),
        OperationalRecordCreate(
            record_type="customer_account",
            external_reference="DISP-88",
            customer_reference="Apex Manufacturing Corp",
            service_date=now,
            amount=140.00,
            status="pending",
            normalized_data={"claim": "Customer states bin was half empty; billed for 6.8 tons but certified scale slip SC-110 recorded 4.0 tons.", "disputed_invoice": "INV-9028"},
        ),

        # --- 8. HORIZON METAL WORKS: High-Value Verified Clean Stream ---
        OperationalRecordCreate(
            record_type="dispatch_record",
            external_reference="DSP-6601",
            customer_reference="Horizon Metal Works",
            service_date=now,
            amount=1232.50,
            quantity=14.5,
            unit="tons",
            rate=85.00,
            status="completed",
            normalized_data={"truck_id": "TRK-102", "driver": "Carlos Mendez", "ticket_number": "TKT-4405"},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4405",
            customer_reference="Horizon Metal Works",
            service_date=now,
            amount=1232.50,
            quantity=14.5,
            unit="tons",
            rate=85.00,
            status="completed",
            normalized_data={"truck_id": "TRK-102", "container_size": "40yd", "material": "Heavy Ferrous Scrap"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9024",
            customer_reference="Horizon Metal Works",
            service_date=now,
            amount=1232.50,
            quantity=14.5,
            unit="tons",
            rate=85.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4405"]},
        ),

        # --- 9. CRESTVIEW FOUNDRY: Large Verified Foundry Run ---
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4403",
            customer_reference="Crestview Foundry",
            service_date=now,
            amount=1440.00,
            quantity=18.0,
            unit="tons",
            rate=80.00,
            status="completed",
            normalized_data={"driver": "Marcus Cole", "truck_id": "TRK-201", "furnace_slag": True},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9023",
            customer_reference="Crestview Foundry",
            service_date=now,
            amount=1440.00,
            quantity=18.0,
            unit="tons",
            rate=80.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4403"]},
        ),

        # --- 10. VANGUARD HEAVY INDUSTRIES: Industrial Demolition Haul ---
        OperationalRecordCreate(
            record_type="dispatch_record",
            external_reference="DSP-6605",
            customer_reference="Vanguard Heavy Industries",
            service_date=now,
            amount=1230.00,
            quantity=16.4,
            unit="tons",
            rate=75.00,
            status="completed",
            normalized_data={"truck_id": "TRK-402", "driver": "Sam Jenkins", "ticket_number": "TKT-4412"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="SC-8815",
            customer_reference="Vanguard Heavy Industries",
            service_date=now,
            amount=492.00,
            quantity=16.4,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "Metro Transfer Station", "gross_lbs": 64800, "tare_lbs": 32000, "net_lbs": 32800},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4412",
            customer_reference="Vanguard Heavy Industries",
            service_date=now,
            amount=1230.00,
            quantity=16.4,
            unit="tons",
            rate=75.00,
            status="completed",
            normalized_data={"scale_ticket_no": "SC-8815", "truck_id": "TRK-402"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9029",
            customer_reference="Vanguard Heavy Industries",
            service_date=now,
            amount=1230.00,
            quantity=16.4,
            unit="tons",
            rate=75.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4412"]},
        ),

        # --- 11. PACIFIC COLD STORAGE: Organics & Compost Stream ---
        OperationalRecordCreate(
            record_type="dispatch_record",
            external_reference="DSP-6608",
            customer_reference="Pacific Cold Storage",
            service_date=now,
            amount=331.50,
            quantity=5.1,
            unit="tons",
            rate=65.00,
            status="completed",
            normalized_data={"truck_id": "TRK-108", "driver": "Carlos Mendez", "ticket_number": "TKT-4413"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="SC-8816",
            customer_reference="Pacific Cold Storage",
            service_date=now,
            amount=127.50,
            quantity=5.1,
            unit="tons",
            rate=25.00,
            status="completed",
            normalized_data={"facility": "Valley Composting Depot", "gross_lbs": 41200, "tare_lbs": 31000, "net_lbs": 10200},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4413",
            customer_reference="Pacific Cold Storage",
            service_date=now,
            amount=331.50,
            quantity=5.1,
            unit="tons",
            rate=65.00,
            status="completed",
            normalized_data={"scale_ticket_no": "SC-8816", "truck_id": "TRK-108"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9030",
            customer_reference="Pacific Cold Storage",
            service_date=now,
            amount=331.50,
            quantity=5.1,
            unit="tons",
            rate=65.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4413"]},
        ),

        # --- 12. METRO TRANSIT AUTHORITY: Municipal Maintenance Yard ---
        OperationalRecordCreate(
            record_type="dispatch_record",
            external_reference="DSP-6606",
            customer_reference="Metro Transit Authority",
            service_date=now,
            amount=574.00,
            quantity=8.2,
            unit="tons",
            rate=70.00,
            status="completed",
            normalized_data={"truck_id": "TRK-210", "driver": "Elena Gomez", "ticket_number": "TKT-4414"},
        ),
        OperationalRecordCreate(
            record_type="load_record",
            external_reference="SC-8817",
            customer_reference="Metro Transit Authority",
            service_date=now,
            amount=246.00,
            quantity=8.2,
            unit="tons",
            rate=30.00,
            status="completed",
            normalized_data={"facility": "North Landfill Scale #1", "gross_lbs": 49600, "tare_lbs": 33200, "net_lbs": 16400},
        ),
        OperationalRecordCreate(
            record_type="service_ticket",
            external_reference="TKT-4414",
            customer_reference="Metro Transit Authority",
            service_date=now,
            amount=574.00,
            quantity=8.2,
            unit="tons",
            rate=70.00,
            status="completed",
            normalized_data={"scale_ticket_no": "SC-8817", "truck_id": "TRK-210"},
        ),
        OperationalRecordCreate(
            record_type="invoice",
            external_reference="INV-9031",
            customer_reference="Metro Transit Authority",
            service_date=now,
            amount=574.00,
            quantity=8.2,
            unit="tons",
            rate=70.00,
            status="billed",
            normalized_data={"ticket_numbers": ["TKT-4414"]},
        ),

        # --- 13. ADDITIONAL DISPUTE CLAIMS FOR AGENTS TO RESOLVE ---
        OperationalRecordCreate(
            record_type="customer_account",
            external_reference="DISP-89",
            customer_reference="Summit Construction Ltd",
            service_date=now,
            amount=275.00,
            status="pending",
            normalized_data={"claim": "Customer alleges missed haul on Oct 14th; driver signed ticket TKT-4411 confirms completed pickup.", "disputed_invoice": "INV-9021"},
        ),
        OperationalRecordCreate(
            record_type="customer_account",
            external_reference="DISP-90",
            customer_reference="Delta Logistics Hub",
            service_date=now,
            amount=780.00,
            status="pending",
            normalized_data={"claim": "Customer protesting duplicate invoice INV-8802 for single service ticket TKT-5544.", "disputed_invoice": "INV-8802"},
        ),
    ]

    result = IngestionService.commit_records(
        db=db,
        organization_id=org_id,
        record_type="mixed",
        records=demo_records,
    )

    # Automatically trigger detection pipeline so exceptions are ready immediately
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
            {"ticket_id": "TKT-5510", "customer_name": "Horizon Metal Works", "ticket_date": "2026-10-22", "weight_tons": 14.5, "unit_rate": 85.0, "total_amount": 1232.5, "driver_name": "Carlos Mendez", "truck_num": "TRK-108", "status": "completed"},
            {"ticket_id": "TKT-5511", "customer_name": "Pinnacle Paper & Pulp", "ticket_date": "2026-10-23", "weight_tons": 9.2, "unit_rate": 90.0, "total_amount": 828.0, "driver_name": "Dave Vance", "truck_num": "TRK-104", "status": "completed"},
            {"ticket_id": "TKT-5512", "customer_name": "Crestview Foundry", "ticket_date": "2026-10-24", "weight_tons": 18.0, "unit_rate": 80.0, "total_amount": 1440.0, "driver_name": "Marcus Cole", "truck_num": "TRK-201", "status": "completed"},
            {"ticket_id": "TKT-5513", "customer_name": "Apex Construction LLC", "ticket_date": "2026-10-25", "weight_tons": 10.0, "unit_rate": 80.0, "total_amount": 800.0, "driver_name": "Dave Vance", "truck_num": "TRK-104", "status": "completed"},
        ],
    },
    "customer_billing": {
        "columns": ["invoice_number", "client_name", "billing_date", "billed_quantity", "rate_applied", "total_billed", "ticket_ref", "status"],
        "rows": [
            {"invoice_number": "INV-7810", "client_name": "Horizon Metal Works", "billing_date": "2026-10-23", "billed_quantity": 14.5, "rate_applied": 85.0, "total_billed": 1232.5, "ticket_ref": "TKT-5510", "status": "billed"},
            {"invoice_number": "INV-7811", "client_name": "Pinnacle Paper & Pulp", "billing_date": "2026-10-24", "billed_quantity": 12.0, "rate_applied": 90.0, "total_billed": 1080.0, "ticket_ref": "TKT-5511", "status": "billed"},
            {"invoice_number": "INV-7812", "client_name": "Crestview Foundry", "billing_date": "2026-10-25", "billed_quantity": 18.0, "rate_applied": 80.0, "total_billed": 1440.0, "ticket_ref": "TKT-5512", "status": "billed"},
        ],
    },
    "disposal_manifests": {
        "columns": ["manifest_number", "generator_name", "shipment_date", "net_weight_tons", "tipping_fee_rate", "total_tipping_cost", "disposal_facility"],
        "rows": [
            {"manifest_number": "MAN-6201", "generator_name": "Horizon Metal Works", "shipment_date": "2026-10-22", "net_weight_tons": 14.5, "tipping_fee_rate": 32.0, "total_tipping_cost": 464.0, "disposal_facility": "Metro Transfer Station"},
            {"manifest_number": "MAN-6202", "generator_name": "Pinnacle Paper & Pulp", "shipment_date": "2026-10-23", "net_weight_tons": 9.2, "tipping_fee_rate": 32.0, "total_tipping_cost": 294.4, "disposal_facility": "Metro Transfer Station"},
        ],
    },
}

@router.post("/db/test-connection", response_model=DatabaseConnectionTestResponse)
def test_db_connection(
    req: DatabaseConnectionTestRequest,
    current_user: User = Depends(get_current_user),
):
    """Test connection to customer's external database or waste operations ERP."""
    system_label = req.system_type.capitalize()
    return DatabaseConnectionTestResponse(
        success=True,
        message=f"Successfully connected to {system_label} database at {req.host}:{req.port}/{req.database_name}. Retrieved accessible operational tables.",
        system_type=req.system_type,
        available_tables=list(MOCK_DB_TABLES.keys()),
    )

@router.post("/db/preview-table", response_model=DatabaseTablePreviewResponse)
def preview_db_table(
    req: DatabaseTablePreviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Fetch sample rows and automatically infer column mapping to the Opsera AI template."""
    table_data = MOCK_DB_TABLES.get(req.table_name)
    if not table_data:
        # Default fallback structure
        table_data = MOCK_DB_TABLES["dispatch_tickets"]

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
    """Import records from external DB table while validating against the required template format."""
    # Ensure mandatory template fields are mapped
    mapped_target_fields = set(req.column_mapping.values())
    if "external_reference" not in mapped_target_fields:
        raise HTTPException(
            status_code=400,
            detail="Template format error: Missing Ticket / Invoice identifier ('external_reference'). Every imported row needs a unique reference ID.",
        )
    if "customer_reference" not in mapped_target_fields:
        raise HTTPException(
            status_code=400,
            detail="Template format error: Missing Customer reference ('customer_reference'). Every row needs an assigned customer name.",
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

    result = IngestionService.commit_records(
        db=db,
        organization_id=current_user.organization_id,
        record_type=req.record_type,
        records=records_to_create,
    )
    return result

