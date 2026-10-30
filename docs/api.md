# REST API Reference

The Operations Agent exposes REST APIs versioned under `/api`.

Interactive Swagger UI documentation is available at `http://localhost:8000/docs`.

---

## Authentication

### `POST /api/auth/login`
Authenticates a user and issues a Bearer JWT.
```json
{
  "email": "manager@apexwaste.com",
  "password": "OperationsPass123!"
}
```

### `GET /api/auth/me`
Returns the currently authenticated user and organization.

---

## Operational Records

### `GET /api/records`
Lists operational records for the tenant.
- Query params: `record_type`, `customer`, `search`, `limit`, `offset`.

### `POST /api/records/preview-csv`
Uploads a CSV file (multipart/form-data) and returns inferred column mappings, sample records, and row-level validation errors before committing.

### `POST /api/records/commit-batch`
Commits a batch of validated operational records.

### `POST /api/records/seed-demo`
Populates realistic industrial services records (roll-off dumpster hauls, scale weight tickets, invoices, and dispatch logs).

---

## Exceptions

### `GET /api/exceptions`
Lists detected operational discrepancies with filters for `status`, `severity`, and `exception_type`.

### `POST /api/exceptions/detect`
Executes the deterministic cross-record reconciliation engine and flags discrepancies.

### `GET /api/exceptions/stats`
Returns summary metrics (counts by severity, status, total at-risk dollar discrepancy).

---

## Investigations & Approvals

### `POST /api/investigations/trigger`
Triggers stateful LangGraph investigation for a given `exception_id`.

### `GET /api/investigations/{id}`
Retrieves complete investigation details with side-by-side records, root cause findings, and grounded evidence items.

### `POST /api/approvals/{id}/review`
Processes a human manager's review decision (`approved`, `rejected`, `revision_requested`) with optional reviewer notes.
```json
{
  "decision": "approved",
  "reviewer_comment": "Approved credit memo issuance."
}
```

---

## Audit & Analytics

### `GET /api/analytics/summary`
Returns high-level KPI dashboard metrics.

### `GET /api/audit`
Returns chronological audit events for the tenant.
