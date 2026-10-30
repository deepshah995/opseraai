import json
from fastapi.testclient import TestClient
from backend.main import app

def run_verification():
    print("=" * 70)
    print("  AI OPERATIONS EXCEPTION AGENT - FULL END-TO-END EXECUTION FLOW")
    print("=" * 70)

    client = TestClient(app)

    # 1. Health check
    res = client.get("/healthz")
    print("\n[Step 1] Health check:")
    print(" ", res.status_code, res.json())
    assert res.status_code == 200

    # 2. Login
    res_login = client.post(
        "/api/auth/login",
        json={"email": "manager@apexwaste.com", "password": "OperationsPass123!"},
    )
    print("\n[Step 2] Authenticating Operations Manager:")
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    user_info = res_login.json()["user"]
    print(f"  Authenticated as: {user_info['display_name']} (Role: {user_info['role']})")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Seed demo industrial waste & recycling records
    print("\n[Step 3] Seeding Industrial Operational Records:")
    res_seed = client.post("/api/records/seed-demo", headers=headers)
    seed_data = res_seed.json()
    print(f"  Imported {seed_data['imported_count']} records ({seed_data['skipped_duplicates_count']} duplicates skipped)")

    # 4. Run exception detection engine
    print("\n[Step 4] Running Deterministic Cross-Record Reconciliation Engine:")
    res_detect = client.post("/api/exceptions/detect", headers=headers)
    new_exceptions = res_detect.json()
    res_all = client.get("/api/exceptions", headers=headers)
    exceptions = res_all.json()
    print(f"  Total operational exceptions in tenant: {len(exceptions)} ({len(new_exceptions)} newly detected):")
    for exc in exceptions:
        amt_str = f"${exc.get('discrepancy_amount') or 0:.2f}"
        print(f"    * [{exc['severity'].upper():<8}] {exc['title']} | Discrepancy: {amt_str}")

    assert len(exceptions) >= 4

    # 5. Pick an exception and trigger LangGraph investigation
    target_exc = exceptions[0]
    print(f"\n[Step 5] Triggering LangGraph Stateful Agent Investigation for: {target_exc['title']}")
    res_inv = client.post(
        "/api/investigations/trigger",
        json={"exception_id": target_exc["id"], "user_notes": "Operations review requested."},
        headers=headers,
    )
    assert res_inv.status_code == 200
    inv = res_inv.json()
    print("  LangGraph Workflow Status:", inv["status"])
    print(f"  Agent Evidence Confidence: {inv['confidence'] * 100:.1f}%")
    print("\n  Root Cause Findings:")
    print("   ", inv["findings"][:180] + "...")
    print("\n  Grounded Evidence Citations (Verified Source Records):")
    for ev in inv["evidence_items"]:
        print(f"    - {ev['evidence_reference']}: {ev['relevance_explanation']}")

    resolution = inv["proposed_resolution"]
    print(f"\n  Proposed Resolution: {resolution['recommended_action']}")
    print(f"  Proposed Financial Adjustment: ${resolution.get('proposed_amount') or 0:.2f}")

    # 6. Operations Manager reviews & approves
    approval_id = inv["pending_approval_id"]
    print(f"\n[Step 6] Human-in-the-Loop Review (Approval ID: {approval_id}):")
    res_appr = client.post(
        f"/api/approvals/{approval_id}/review",
        json={
            "decision": "approved",
            "reviewer_comment": "Approved credit memo issuance. Discrepancy confirmed by scale receipt.",
        },
        headers=headers,
    )
    assert res_appr.status_code == 200
    print("  Review Decision Committed:", res_appr.json()["decision"].upper())

    # 7. Verify Exception is now resolved
    res_exc = client.get(f"/api/exceptions/{target_exc['id']}", headers=headers)
    print(f"  Exception Status Updated to: {res_exc.json()['status'].upper()}")
    assert res_exc.json()["status"] == "resolved"

    # 8. Check Analytics Dashboard Summary
    print("\n[Step 7] Analytics Dashboard Summary:")
    res_analytics = client.get("/api/analytics/summary", headers=headers)
    summary = res_analytics.json()
    for k, v in summary.items():
        print(f"  {k}: {v}")

    print("\n" + "=" * 70)
    print("  ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
