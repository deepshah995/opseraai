import csv
import io
from datetime import datetime
from typing import Any

from backend.app.db.models.record import OperationalRecord
from backend.app.schemas.record import (
    BatchImportPreview,
    BatchImportResult,
    OperationalRecordCreate,
    RowValidationError,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

COLUMN_SYNONYMS = {
    "external_reference": [
        "external_reference", "ticket_number", "ticket_no", "ticket_id", "ticket",
        "invoice_number", "invoice_no", "invoice_id", "inv_num", "dispatch_id",
        "scale_ticket", "scale_ticket_no", "manifest_no", "load_id", "reference",
    ],
    "customer_reference": [
        "customer_reference", "customer_name", "customer_id", "customer", "account",
        "account_name", "account_no", "client", "client_name", "client_id",
    ],
    "service_date": [
        "service_date", "date", "job_date", "ticket_date", "dispatch_date",
        "pickup_date", "delivery_date", "scale_date",
    ],
    "amount": [
        "amount", "total", "line_total", "total_amount", "extended_price", "charge", "net_amount",
    ],
    "quantity": [
        "quantity", "qty", "tons", "weight_tons", "net_weight_tons", "yards",
        "gallons", "hours", "pulls", "loads", "units",
    ],
    "unit": [
        "unit", "uom", "unit_of_measure", "measurement", "metric",
    ],
    "rate": [
        "rate", "unit_price", "price_per_ton", "price", "haul_rate", "rate_per_yard", "hourly_rate",
    ],
    "status": [
        "status", "job_status", "ticket_status", "state", "dispatch_status",
    ],
}

def infer_column_mapping(headers: list[str]) -> dict[str, str]:
    """Infer internal field mapping from CSV header names."""
    mapping: dict[str, str] = {}
    normalized_headers = {h.strip().lower().replace(" ", "_").replace("-", "_"): h for h in headers}

    for canonical_field, synonyms in COLUMN_SYNONYMS.items():
        for synonym in synonyms:
            if synonym in normalized_headers:
                raw_header = normalized_headers[synonym]
                mapping[raw_header] = canonical_field
                break
    return mapping

def parse_date(value: str | None) -> datetime | None:
    if not value or not value.strip():
        return None
    val = value.strip()
    date_formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ]
    for fmt in date_formats:
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    # Try ISO fromisoformat
    try:
        return datetime.fromisoformat(val)
    except Exception:
        return None

def parse_float(value: str | None) -> float | None:
    if not value or not value.strip():
        return None
    clean = value.strip().replace("$", "").replace(",", "")
    try:
        return float(clean)
    except ValueError:
        return None

class IngestionService:
    @staticmethod
    def preview_csv(
        db: Session,
        organization_id: str,
        csv_content: str,
        record_type: str,
    ) -> BatchImportPreview:
        f = io.StringIO(csv_content)
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            return BatchImportPreview(
                total_rows=0,
                valid_rows_count=0,
                invalid_rows_count=0,
                detected_columns=[],
                inferred_mapping={},
                sample_records=[],
                validation_errors=[RowValidationError(row_number=0, field="file", message="CSV file is empty")],
                duplicates_detected=0,
            )

        inferred_mapping = infer_column_mapping(headers)
        f.seek(0)
        dict_reader = csv.DictReader(f)

        total_rows = 0
        valid_rows = 0
        errors: list[RowValidationError] = []
        sample_records: list[dict[str, Any]] = []
        incoming_refs: list[str] = []

        for row_idx, row in enumerate(dict_reader, start=2):
            total_rows += 1
            row_errors: list[RowValidationError] = []

            # Map raw fields to canonical fields
            mapped_data: dict[str, Any] = {}
            for raw_col, val in row.items():
                if raw_col in inferred_mapping:
                    mapped_data[inferred_mapping[raw_col]] = val.strip() if val else None
                else:
                    mapped_data[raw_col] = val

            # Check required canonical fields
            ext_ref = mapped_data.get("external_reference")
            if not ext_ref:
                row_errors.append(RowValidationError(
                    row_number=row_idx,
                    field="external_reference",
                    message="Missing external reference identifier",
                    raw_value=str(row),
                ))
            else:
                incoming_refs.append(ext_ref)

            cust_ref = mapped_data.get("customer_reference")
            if not cust_ref:
                row_errors.append(RowValidationError(
                    row_number=row_idx,
                    field="customer_reference",
                    message="Missing customer reference identifier",
                ))

            # Validate date if provided
            if mapped_data.get("service_date"):
                parsed_dt = parse_date(mapped_data["service_date"])
                if parsed_dt is None:
                    row_errors.append(RowValidationError(
                        row_number=row_idx,
                        field="service_date",
                        message=f"Invalid date format '{mapped_data['service_date']}'",
                        raw_value=mapped_data["service_date"],
                    ))
                else:
                    mapped_data["service_date"] = parsed_dt.isoformat()

            # Validate numeric amounts if provided
            if mapped_data.get("amount"):
                amt = parse_float(mapped_data["amount"])
                if amt is None:
                    row_errors.append(RowValidationError(
                        row_number=row_idx,
                        field="amount",
                        message=f"Invalid numeric amount '{mapped_data['amount']}'",
                        raw_value=mapped_data["amount"],
                    ))
                else:
                    mapped_data["amount"] = amt

            if mapped_data.get("quantity"):
                qty = parse_float(mapped_data["quantity"])
                if qty is None:
                    row_errors.append(RowValidationError(
                        row_number=row_idx,
                        field="quantity",
                        message=f"Invalid numeric quantity '{mapped_data['quantity']}'",
                        raw_value=mapped_data["quantity"],
                    ))
                else:
                    mapped_data["quantity"] = qty

            if mapped_data.get("rate"):
                rate_val = parse_float(mapped_data["rate"])
                if rate_val is None:
                    row_errors.append(RowValidationError(
                        row_number=row_idx,
                        field="rate",
                        message=f"Invalid numeric rate '{mapped_data['rate']}'",
                        raw_value=mapped_data["rate"],
                    ))
                else:
                    mapped_data["rate"] = rate_val

            if row_errors:
                errors.extend(row_errors)
            else:
                valid_rows += 1

            if len(sample_records) < 5:
                sample_records.append(mapped_data)

        # Check for duplicates in DB for this organization
        duplicate_count = 0
        if incoming_refs:
            existing = db.execute(
                select(OperationalRecord.external_reference)
                .where(
                    OperationalRecord.organization_id == organization_id,
                    OperationalRecord.record_type == record_type,
                    OperationalRecord.external_reference.in_(incoming_refs),
                )
            ).scalars().all()
            duplicate_count = len(existing)

        return BatchImportPreview(
            total_rows=total_rows,
            valid_rows_count=valid_rows,
            invalid_rows_count=total_rows - valid_rows,
            detected_columns=headers,
            inferred_mapping=inferred_mapping,
            sample_records=sample_records,
            validation_errors=errors,
            duplicates_detected=duplicate_count,
        )

    @staticmethod
    def commit_records(
        db: Session,
        organization_id: str,
        record_type: str,
        records: list[OperationalRecordCreate],
        source_document_id: str | None = None,
    ) -> BatchImportResult:
        imported_ids: list[str] = []
        skipped_dupes = 0
        failed_count = 0
        error_details: list[str] = []

        # Find existing external references for idempotency
        refs = [r.external_reference for r in records]
        existing_refs = set(
            db.execute(
                select(OperationalRecord.external_reference)
                .where(
                    OperationalRecord.organization_id == organization_id,
                    OperationalRecord.external_reference.in_(refs),
                )
            ).scalars().all()
        )

        for rec_in in records:
            if rec_in.external_reference in existing_refs:
                skipped_dupes += 1
                continue

            try:
                effective_type = rec_in.record_type if rec_in.record_type and rec_in.record_type != "mixed" else record_type
                db_record = OperationalRecord(
                    organization_id=organization_id,
                    record_type=effective_type,
                    external_reference=rec_in.external_reference,
                    customer_reference=rec_in.customer_reference,
                    service_date=rec_in.service_date,
                    amount=rec_in.amount,
                    quantity=rec_in.quantity,
                    unit=rec_in.unit,
                    rate=rec_in.rate,
                    status=rec_in.status,
                    source_document_id=source_document_id or rec_in.source_document_id,
                    normalized_data=rec_in.normalized_data or {},
                )
                db.add(db_record)
                db.flush()
                imported_ids.append(db_record.id)
                existing_refs.add(rec_in.external_reference)
            except Exception as e:
                failed_count += 1
                error_details.append(f"Failed to import ref {rec_in.external_reference}: {e!s}")

        db.commit()
        return BatchImportResult(
            imported_count=len(imported_ids),
            skipped_duplicates_count=skipped_dupes,
            failed_count=failed_count,
            imported_record_ids=imported_ids,
            error_details=error_details,
        )
