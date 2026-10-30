from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class OperationalRecordCreate(BaseModel):
    record_type: str = Field(pattern="^(invoice|service_ticket|dispatch_record|load_record|customer_account)$")
    external_reference: str = Field(min_length=1, max_length=100)
    customer_reference: str = Field(min_length=1, max_length=100)
    service_date: datetime | None = None
    amount: float | None = None
    quantity: float | None = None
    unit: str | None = None
    rate: float | None = None
    status: str = Field(default="completed")
    source_document_id: str | None = None
    normalized_data: dict[str, Any] | None = None

class OperationalRecordResponse(BaseModel):
    id: str
    organization_id: str
    record_type: str
    external_reference: str
    customer_reference: str
    service_date: datetime | None = None
    amount: float | None = None
    quantity: float | None = None
    unit: str | None = None
    rate: float | None = None
    status: str
    source_document_id: str | None = None
    normalized_data: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RowValidationError(BaseModel):
    row_number: int
    field: str
    message: str
    raw_value: str | None = None

class BatchImportPreview(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    detected_columns: list[str]
    inferred_mapping: dict[str, str]
    sample_records: list[dict[str, Any]]
    validation_errors: list[RowValidationError]
    duplicates_detected: int

class BatchImportCommitRequest(BaseModel):
    record_type: str
    records: list[OperationalRecordCreate]
    source_document_id: str | None = None

class BatchImportResult(BaseModel):
    imported_count: int
    skipped_duplicates_count: int
    failed_count: int
    imported_record_ids: list[str]
    error_details: list[str] = []

class DatabaseConnectionTestRequest(BaseModel):
    system_type: str = Field(..., description="postgres, mysql, mssql, softpak, wasteworks, quickbooks")
    host: str = Field("localhost")
    port: int = Field(5432)
    database_name: str = Field("operations_db")
    username: str = Field("ops_user")
    password: str = Field("")
    use_ssl: bool = Field(False)

class DatabaseConnectionTestResponse(BaseModel):
    success: bool
    message: str
    system_type: str
    available_tables: list[str]

class DatabaseTablePreviewRequest(BaseModel):
    system_type: str
    table_name: str

class DatabaseTablePreviewResponse(BaseModel):
    table_name: str
    columns: list[str]
    sample_rows: list[dict[str, Any]]
    inferred_mapping: dict[str, str]

class DatabaseImportRequest(BaseModel):
    system_type: str
    table_name: str
    record_type: str = "service_ticket"
    column_mapping: dict[str, str]
    rows: list[dict[str, Any]]

