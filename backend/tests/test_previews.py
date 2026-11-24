def test_seeded_manufacturing_prospect_previews(client):
    expected_slugs = [
        "macfab",
        "fourmark",
        "bmpmetals",
        "brannonsteel",
        "dishoncnc",
        "worldtek-ind",
        "styberg",
        "prd-inc",
    ]
    for slug in expected_slugs:
        res = client.get(f"/api/previews/{slug}")
        assert res.status_code == 200, f"Missing preview for {slug}"
        data = res.json()
        assert data["slug"] == slug
        assert data["company_name"]
        assert len(data["agent_deployments"]) >= 3
        assert len(data["simulated_findings"]) >= 2
        assert all(item["is_simulated"] is True for item in data["simulated_findings"])
        assert "Simulation" in data["simulation_notice"]

    # Domain-like slugs normalize cleanly
    alias_res = client.get("/api/previews/bmpmetals.com")
    assert alias_res.status_code == 200
    assert alias_res.json()["slug"] == "bmpmetals"


def test_unknown_preview_returns_404_and_generate_preview_works(client, auth_headers):
    miss = client.get("/api/previews/nonexistent-plant-999")
    assert miss.status_code == 404

    gen = client.post(
        "/api/previews/generate",
        headers=auth_headers,
        json={
            "domain": "https://www.midweststamping.com",
            "company_name": "Midwest Stamping Co.",
            "subsector": "Precision Stamping & CNC Machining",
            "location": "Toledo, OH",
            "observed_signals": [
                "Runs DelmiaWorks (IQMS) across 400-ton stamping presses with IATF 16949 traceability"
            ],
            "top_opportunities": [
                "Automate vendor coil PO reconciliation & DelmiaWorks work-order closeouts"
            ],
        },
    )
    assert gen.status_code == 200
    created = gen.json()
    assert created["slug"] == "midweststamping"
    assert "DelmiaWorks (IQMS)" in created["erp_stack"]
    assert "IATF 16949" in created["compliance_tags"]

    fetch_back = client.get("/api/previews/midweststamping")
    assert fetch_back.status_code == 200
    assert fetch_back.json()["company_name"] == "Midwest Stamping Co."
