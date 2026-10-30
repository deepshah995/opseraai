from backend.app.core.security import create_access_token, hash_password
from backend.app.db.models import Exception as DBException
from backend.app.db.models import OperationalRecord, Organization, User


def test_tenant_data_isolation(client, db_session):
    # Setup Tenant B
    org_b = Organization(id="tenant-b-org", name="Tenant B Recycling")
    db_session.add(org_b)
    user_b = User(
        id="user-b",
        organization_id=org_b.id,
        email="ops@tenantb.com",
        hashed_password=hash_password("TenantBPass123!"),
        display_name="Tenant B Ops",
        role="operations_manager",
    )
    db_session.add(user_b)

    # Add record to Tenant B
    rec_b = OperationalRecord(
        organization_id=org_b.id,
        record_type="invoice",
        external_reference="INV-TENANT-B-999",
        customer_reference="Confidential Client B",
        amount=50000.0,
    )
    db_session.add(rec_b)

    # Add exception to Tenant B
    exc_b = DBException(
        organization_id=org_b.id,
        exception_type="rate_mismatch",
        title="Tenant B Discrepancy",
        description="Confidential audit item",
        discrepancy_amount=2500.0,
    )
    db_session.add(exc_b)
    db_session.commit()

    # User A auth token
    user_a = db_session.query(User).filter_by(id="test-user-1").first()
    token_a = create_access_token(
        subject=user_a.id,
        organization_id=user_a.organization_id,
        role=user_a.role,
    )
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. User A lists records: must NOT see Tenant B records
    res_records = client.get("/api/records", headers=headers_a)
    assert res_records.status_code == 200
    refs = [r["external_reference"] for r in res_records.json()]
    assert "INV-TENANT-B-999" not in refs

    # 2. User A lists exceptions: must NOT see Tenant B exception
    res_exc = client.get("/api/exceptions", headers=headers_a)
    assert res_exc.status_code == 200
    exc_titles = [e["title"] for e in res_exc.json()]
    assert "Tenant B Discrepancy" not in exc_titles

    # 3. User A attempts to directly access Tenant B exception by ID -> must 404
    res_direct = client.get(f"/api/exceptions/{exc_b.id}", headers=headers_a)
    assert res_direct.status_code == 404
