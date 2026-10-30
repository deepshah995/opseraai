def test_end_to_end_investigation_and_approval(client, auth_headers):
    # 1. Seed records & detect exceptions
    client.post("/api/records/seed-demo", headers=auth_headers)
    res_detect = client.post("/api/exceptions/detect", headers=auth_headers)
    exceptions = res_detect.json()
    assert len(exceptions) > 0

    target_exc = exceptions[0]
    exc_id = target_exc["id"]

    # 2. Trigger LangGraph investigation
    res_inv = client.post(
        "/api/investigations/trigger",
        json={"exception_id": exc_id, "user_notes": "Operations review requested."},
        headers=auth_headers,
    )
    assert res_inv.status_code == 200
    inv_data = res_inv.json()
    assert inv_data["status"] == "awaiting_review"
    assert inv_data["findings"] is not None
    assert len(inv_data["findings"]) > 20
    assert inv_data["confidence"] > 0.8
    assert inv_data["proposed_resolution"] is not None
    assert "recommended_action" in inv_data["proposed_resolution"]

    # Verify grounded evidence items are linked to real records
    assert len(inv_data["evidence_items"]) > 0
    for ev in inv_data["evidence_items"]:
        assert ev["evidence_reference"] != ""
        assert ev["relevance_explanation"] != ""

    approval_id = inv_data["pending_approval_id"]
    assert approval_id is not None

    # Verify exception status updated to awaiting_approval
    res_exc = client.get(f"/api/exceptions/{exc_id}", headers=auth_headers)
    assert res_exc.json()["status"] == "awaiting_approval"

    # 3. Human Reviewer Approves the recommendation
    res_approval = client.post(
        f"/api/approvals/{approval_id}/review",
        json={
            "decision": "approved",
            "reviewer_comment": "Approved credit memo issuance. Discrepancy confirmed by scale ticket.",
        },
        headers=auth_headers,
    )
    assert res_approval.status_code == 200
    assert res_approval.json()["decision"] == "approved"
    assert res_approval.json()["reviewer_comment"] is not None

    # 4. Verify Exception is now resolved
    res_exc_final = client.get(f"/api/exceptions/{exc_id}", headers=auth_headers)
    assert res_exc_final.json()["status"] == "resolved"
    assert res_exc_final.json()["resolved_at"] is not None

    # 5. Verify Audit trail has logged the approval
    res_audit = client.get("/api/audit", headers=auth_headers)
    assert res_audit.status_code == 200
    actions = [a["action"] for a in res_audit.json()]
    assert "approval_approved" in actions
