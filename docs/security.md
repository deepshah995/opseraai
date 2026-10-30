# Security & Tenant Isolation Architecture

## 1. Multi-Tenant Data Isolation

- **Mandatory Tenant Scoping**: Every database entity (`operational_records`, `exceptions`, `investigations`, `evidence_items`, `approvals`, `audit_events`, `source_documents`) contains a non-nullable foreign key to `organizations.id`.
- **Query-Level Enforcement**: Every database query, repository lookup, and agent tool explicitly filters by `organization_id`. Cross-tenant record references are rejected with HTTP 404.
- **Automated Verification**: The test suite includes [`test_tenant_isolation.py`](file:///Users/deepshah/Desktop/Projects/Operations%20Agent/backend/tests/test_tenant_isolation.py) confirming that authenticated sessions cannot inspect or alter records belonging to other tenants.

---

## 2. Authentication & Authorization (RBAC)

- **Password Storage**: Passwords hashed with PBKDF2-HMAC-SHA256 (100,000 iterations) using per-user cryptographic salts. Constant-time verification (`hmac.compare_digest`) prevents timing attacks.
- **JWT Session Tokens**: Signed with `HS256`, explicitly rejecting `none` algorithm. Validated with explicit expiration (`exp`) and tenant identity (`org_id`).
- **Role-Based Access Control**:
  - `admin`: Tenant configuration, user management, tolerance settings.
  - `operations_manager`: Exception triage, running investigations, approving financial resolutions.
  - `reviewer`: Reviewing exception evidence, leaving comments.

---

## 3. Storage & Path Traversal Protections (CWE-22)

- User-provided filenames are sanitized via `os.path.basename` and stripped of traversal characters (`../`, `..\`).
- Storage paths are resolved to canonical realpaths and verified against base storage boundaries using trailing-separator prefix verification (`base_prefix = real_base + os.sep`).
- Uploads are validated against magic byte headers:
  - PDF: `%PDF-`
  - CSV: Text validation rejecting embedded binary null bytes.
- Size limit strictly capped at 10 MB per document.

---

## 4. Grounding & Zero-Hallucination Guarantees

- **No Autonomous Action**: The LangGraph agent cannot issue refunds, generate credits, or alter dispatch schedules autonomously in the MVP. It acts as an intelligence assistant staging proposed actions for human review.
- **Strict Evidence Requirement**: Every evidence item linked to an investigation must resolve to an actual `operational_records` or `source_documents` row.
- **Deterministic Math**: Financial variance and percentage discrepancies are calculated in Python, not estimated by LLM token generation.

---

## 5. HTTP Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy: frame-ancestors 'self';`
- CORS allowlist restricted to authorized origins.
