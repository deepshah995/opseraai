def test_list_agents_and_tutorials(client, auth_headers):
    # Test 1: List all 5 specialized agents (including ReportBeacon reporting agent)
    res = client.get("/api/agents", headers=auth_headers)
    assert res.status_code == 200
    agents = res.json()
    assert len(agents) == 5
    agent_ids = [a["id"] for a in agents]
    assert "ticket_hawk" in agent_ids
    assert "dispatch_pulse" in agent_ids
    assert "bill_sentry" in agent_ids
    assert "ops_beacon" in agent_ids
    assert "dispute_shield" in agent_ids

    # Verify cool names
    names = [a["name"] for a in agents]
    assert "TicketHawk" in names
    assert "DispatchPulse" in names
    assert "BillSentry" in names
    assert "ReportBeacon" in names
    assert "DisputeShield" in names

    # Test 2: Get tutorials for all agents
    res_tut = client.get("/api/agents/tutorials", headers=auth_headers)
    assert res_tut.status_code == 200
    tutorials = res_tut.json()
    assert len(tutorials) == 5

    # Test 3: Run TicketHawk simulation
    run_res = client.post("/api/agents/ticket_hawk/run", json={"scenario_id": "th_scale_overestimate"}, headers=auth_headers)
    assert run_res.status_code == 200
    th_data = run_res.json()
    assert th_data["agent_name"] == "TicketHawk"
    assert th_data["status"] == "completed"
    assert th_data["proposed_resolution"]["action_type"] == "credit_memo"

    # Test 4: Run DispatchPulse simulation
    dp_res = client.post("/api/agents/dispatch_pulse/run", json={"scenario_id": "dp_truck_swap"}, headers=auth_headers)
    assert dp_res.status_code == 200
    dp_data = dp_res.json()
    assert dp_data["agent_name"] == "DispatchPulse"
    assert dp_data["proposed_resolution"]["action_type"] == "dispatch_adjustment"

    # Test 5: Run BillSentry simulation
    bs_res = client.post("/api/agents/bill_sentry/run", json={"scenario_id": "bs_rate_mismatch"}, headers=auth_headers)
    assert bs_res.status_code == 200
    bs_data = bs_res.json()
    assert bs_data["agent_name"] == "BillSentry"
    assert bs_data["proposed_resolution"]["action_type"] == "credit_memo"

    # Test 6: Run ReportBeacon report
    ob_res = client.post("/api/agents/ops_beacon/report", json={"timeframe": "Last 7 Days"}, headers=auth_headers)
    assert ob_res.status_code == 200
    ob_data = ob_res.json()
    assert ob_data["agent_name"] == "ReportBeacon"
    assert "health_score_pct" in ob_data
    assert "kpis" in ob_data

    # Test 7: Run DisputeShield dispute resolution
    ds_res = client.post("/api/agents/dispute_shield/resolve", json={
        "customer_name": "Apex Manufacturing Corp",
        "dispute_claim": "Customer says 6.8 tons was overcharged and scale receipt shows 4.0 tons.",
        "disputed_invoice_ref": "INV-9020",
        "disputed_amount": 140.0,
    }, headers=auth_headers)
    assert ds_res.status_code == 200
    ds_data = ds_res.json()
    assert ds_data["agent_name"] == "DisputeShield"
    assert "customer_resolution_letter" in ds_data
    assert ds_data["claim_is_valid"] is True

    # Test 8: Chat with AI Agent (TicketHawk)
    chat_res = client.post(
        "/api/agents/ticket_hawk/chat",
        json={"message": "Tell me a funny operations joke!"},
        headers=auth_headers
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["agent_name"] == "TicketHawk"
    assert "response" in chat_data
    assert "funny_action" in chat_data
    assert len(chat_data["linked_systems_active"]) > 0

    # Test 9: Resolution Analytics endpoint
    res_analytics = client.get("/api/agents/resolution-analytics", headers=auth_headers)
    assert res_analytics.status_code == 200
    analytics_data = res_analytics.json()
    assert "kpis" in analytics_data
    assert "agent_performance" in analytics_data
    assert "ticket_hawk" in analytics_data["agent_performance"]
    assert "dispatch_pulse" in analytics_data["agent_performance"]
    assert "bill_sentry" in analytics_data["agent_performance"]
    assert "ops_beacon" in analytics_data["agent_performance"]
    assert "dispute_shield" in analytics_data["agent_performance"]
    assert "facilities" in analytics_data

    # Test 10: Run Agents in action to auto-resolve open exceptions
    res_batch = client.post("/api/agents/resolve-batch", headers=auth_headers)
    assert res_batch.status_code == 200
    batch_data = res_batch.json()
    assert "processed_count" in batch_data
    assert "resolutions" in batch_data

