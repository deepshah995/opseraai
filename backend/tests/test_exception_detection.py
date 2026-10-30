def test_seed_and_detect_exceptions(client, auth_headers):
    # 1. Seed demo operational records with realistic industrial service discrepancies
    res_seed = client.post("/api/records/seed-demo", headers=auth_headers)
    assert res_seed.status_code == 200
    assert res_seed.json()["imported_count"] > 0

    # 2. Trigger Exception Detection
    res_detect = client.post("/api/exceptions/detect", headers=auth_headers)
    assert res_detect.status_code == 200
    detected = res_detect.json()
    assert len(detected) >= 4

    types = [e["exception_type"] for e in detected]
    assert "rate_mismatch" in types
    assert "quantity_mismatch" in types
    assert "unbilled_job" in types
    assert "duplicate_billing" in types

    # Check Apex Construction rate mismatch ($220.00 difference between $900 invoice and $680 ticket)
    rate_exc = next(e for e in detected if e["exception_type"] == "rate_mismatch")
    assert rate_exc["discrepancy_amount"] == 220.0
    assert "Apex Construction" in rate_exc["title"]

    # Check stats endpoint
    res_stats = client.get("/api/exceptions/stats", headers=auth_headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_exceptions"] >= 4
    assert stats["total_discrepancy_amount"] > 1000.0
    assert stats["open_count"] >= 4
