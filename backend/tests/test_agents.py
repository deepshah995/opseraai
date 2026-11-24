def test_list_manufacturing_agents_and_tutorials(client, auth_headers):
    res = client.get("/api/agents", headers=auth_headers)
    assert res.status_code == 200
    agents = res.json()
    assert len(agents) == 5

    ids = {a["id"] for a in agents}
    assert ids == {
        "bom_guard",
        "cost_sentry",
        "line_pulse",
        "quality_shield",
        "plant_beacon",
    }

    for agent in agents:
        assert agent["name"]
        assert agent["code_name"]
        assert agent["cost_savings_focus"]
        assert agent["time_saved_per_task_mins"] > 0
        assert isinstance(agent["inputs"], list) and len(agent["inputs"]) > 0
        assert isinstance(agent["outputs"], list) and len(agent["outputs"]) > 0

    tut_res = client.get("/api/agents/tutorials", headers=auth_headers)
    assert tut_res.status_code == 200
    tutorials = tut_res.json()
    assert len(tutorials) == 5
    for tut in tutorials:
        assert len(tut["tutorial_steps"]) > 0


def test_legacy_agent_aliases_work(client, auth_headers):
    for alias, canonical in (
        ("ticket_hawk", "bom_guard"),
        ("dispatch_pulse", "line_pulse"),
        ("bill_sentry", "cost_sentry"),
        ("ops_beacon", "plant_beacon"),
        ("dispute_shield", "quality_shield"),
    ):
        res = client.get(f"/api/agents/{alias}", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["id"] == canonical


def test_run_manufacturing_agents_with_scenarios(client, auth_headers):
    agents = client.get("/api/agents", headers=auth_headers).json()
    for agent in agents:
        agent_id = agent["id"]
        scenarios = agent.get("sample_scenarios", [])
        scenario_id = scenarios[0]["scenario_id"] if scenarios else None

        run_res = client.post(
            f"/api/agents/{agent_id}/run",
            json={"scenario_id": scenario_id},
            headers=auth_headers,
        )
        assert run_res.status_code == 200, f"Failed running {agent_id}: {run_res.text}"
        data = run_res.json()
        assert data["agent_id"] == agent_id


def test_plant_beacon_report_and_quality_shield_dispute(client, auth_headers):
    rep_res = client.post(
        "/api/agents/plant_beacon/report",
        json={"timeframe": "Last 30 Days"},
        headers=auth_headers,
    )
    assert rep_res.status_code == 200
    rep = rep_res.json()
    assert rep["agent_id"] == "plant_beacon"
    assert "kpis" in rep
    assert "hours_saved" in rep["kpis"]
    assert "executive_summary" in rep

    dispute_res = client.post(
        "/api/agents/quality_shield/resolve",
        json={
            "customer_name": "Apex Construction & Metals",
            "dispute_claim": "Raw steel bar delivery on PO-4401 was overbilled vs contracted rate.",
            "disputed_invoice_ref": "INV-9021",
            "disputed_amount": 900.0,
        },
        headers=auth_headers,
    )
    assert dispute_res.status_code == 200
    disp = dispute_res.json()
    assert disp["agent_id"] == "quality_shield"
    assert disp["customer_resolution_letter"]


def test_analytics_batch_resolve_and_antigravity_chat(client, auth_headers):
    client.post("/api/records/seed-demo", headers=auth_headers)

    analytics_res = client.get("/api/agents/resolution-analytics", headers=auth_headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert analytics["kpis"]["hours_saved"] >= 0
    assert set(analytics["agent_performance"].keys()) == {
        "bom_guard",
        "line_pulse",
        "cost_sentry",
        "plant_beacon",
        "quality_shield",
    }

    batch_res = client.post("/api/agents/resolve-batch", headers=auth_headers)
    assert batch_res.status_code == 200
    batch = batch_res.json()
    assert "processed_count" in batch
    assert "total_hours_saved" in batch

    llm_res = client.get("/api/agents/llm-status", headers=auth_headers)
    assert llm_res.status_code == 200
    llm_data = llm_res.json()
    assert llm_data["sdk"] == "Google Antigravity SDK"

    chat_res = client.post(
        "/api/agents/cost_sentry/chat",
        json={"message": "Summarize open cost savings and pending approvals"},
        headers=auth_headers,
    )
    assert chat_res.status_code == 200
    chat = chat_res.json()
    assert chat["agent_id"] == "cost_sentry"
    assert "Google Antigravity SDK" in chat["ai_provider"]
    assert len(chat["response"]) > 10
