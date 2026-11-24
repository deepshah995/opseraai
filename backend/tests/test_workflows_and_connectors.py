import inspect

from backend.app.services.chat_tools import OperationsDataTools


def _register_second_org_headers(client):
    reg = client.post(
        "/api/auth/register",
        json={
            "email": "plant2@otherfoundry.com",
            "password": "StrongPassword123!",
            "display_name": "Plant Two Manager",
        },
    )
    assert reg.status_code == 200, reg.text
    login = client.post(
        "/api/auth/login",
        json={
            "email": "plant2@otherfoundry.com",
            "password": "StrongPassword123!",
        },
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_workflow_templates_crud_and_antigravity_dag_run(client, auth_headers):
    list_res = client.get("/api/workflows", headers=auth_headers)
    assert list_res.status_code == 200
    templates = list_res.json()
    assert len(templates) == 3

    # Create a custom drag-and-drop workflow
    payload = {
        "name": "Custom CNC Sheet Audit Flow",
        "description": "Reads receiving CSV from Google Sheets and runs BOMGuard + QualityShield.",
        "category": "cost_savings",
        "estimated_cost_savings_usd": 1950.0,
        "estimated_hours_saved_monthly": 24.0,
        "nodes": [
            {
                "id": "n-in",
                "kind": "connector_input",
                "ref_id": "google_sheets",
                "label": "Google Sheets Input",
                "x": 60,
                "y": 120,
                "config": {"connector_type": "google_sheets"},
            },
            {
                "id": "n-bg",
                "kind": "agent",
                "ref_id": "bom_guard",
                "agent_id": "bom_guard",
                "label": "BOMGuard",
                "x": 320,
                "y": 120,
                "config": {},
            },
            {
                "id": "n-qs",
                "kind": "agent",
                "ref_id": "quality_shield",
                "agent_id": "quality_shield",
                "label": "QualityShield",
                "x": 580,
                "y": 120,
                "config": {},
            },
            {
                "id": "n-doc",
                "kind": "connector_output",
                "ref_id": "google_docs",
                "label": "Google Docs Report",
                "x": 840,
                "y": 120,
                "config": {"connector_type": "google_docs"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "n-in", "target": "n-bg", "condition": "always"},
            {"id": "e2", "source": "n-bg", "target": "n-qs", "condition": "if_discrepancy_found"},
            {"id": "e3", "source": "n-qs", "target": "n-doc", "condition": "always"},
        ],
    }
    create_res = client.post("/api/workflows", json=payload, headers=auth_headers)
    assert create_res.status_code == 201, create_res.text
    wf = create_res.json()
    assert wf["name"] == "Custom CNC Sheet Audit Flow"
    assert len(wf["nodes"]) == 4

    # Invalid edge target must fail validation
    bad_payload = dict(payload)
    bad_payload["edges"] = [{"id": "e_bad", "source": "n-in", "target": "missing_node", "condition": "always"}]
    assert client.post("/api/workflows", json=bad_payload, headers=auth_headers).status_code == 400

    # Update workflow node coordinates
    upd_res = client.put(
        f"/api/workflows/{wf['id']}",
        json={"name": "Custom CNC Sheet Audit Flow v2"},
        headers=auth_headers,
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["name"] == "Custom CNC Sheet Audit Flow v2"

    # Run via Antigravity SDK DAG runner
    run_res = client.post(
        f"/api/workflows/{wf['id']}/run",
        json={"dry_run": True},
        headers=auth_headers,
    )
    assert run_res.status_code == 200, run_res.text
    run_data = run_res.json()
    assert run_data["sdk"] == "google-antigravity"
    assert run_data["status"] == "completed"
    assert len(run_data["steps"]) == 4
    assert run_data["total_cost_savings_usd"] > 0
    assert run_data["total_hours_saved"] > 0
    assert len(run_data["exported_artifacts"]) >= 1

    runs_list = client.get(f"/api/workflows/{wf['id']}/runs", headers=auth_headers)
    assert runs_list.status_code == 200
    assert len(runs_list.json()) == 1

    # Tenant isolation check
    org_b_headers = _register_second_org_headers(client)
    assert client.post(f"/api/workflows/{wf['id']}/run", json={}, headers=org_b_headers).status_code == 404
    assert client.delete(f"/api/workflows/{wf['id']}", headers=org_b_headers).status_code == 404

    del_res = client.delete(f"/api/workflows/{wf['id']}", headers=auth_headers)
    assert del_res.status_code == 204


def test_connectors_google_sheets_docs_ssrf_and_tenant_isolation(client, auth_headers):
    list_res = client.get("/api/connectors", headers=auth_headers)
    assert list_res.status_code == 200
    connectors = list_res.json()
    types = {c["connector_type"] for c in connectors}
    assert {"google_sheets", "google_docs", "erp_database", "slack_webhook"}.issubset(types)

    # SSRF guardrails on Google URLs & webhooks
    bad_sheet = client.post(
        "/api/connectors",
        json={
            "connector_type": "google_sheets",
            "name": "Bad SSRF Sheet",
            "external_url": "http://169.254.169.254/latest/meta-data",
        },
        headers=auth_headers,
    )
    assert bad_sheet.status_code == 400

    bad_slack = client.post(
        "/api/connectors",
        json={
            "connector_type": "slack_webhook",
            "name": "Localhost Webhook",
            "external_url": "https://127.0.0.1/hook",
        },
        headers=auth_headers,
    )
    assert bad_slack.status_code == 400

    # Valid Google Sheet with masked credential token
    sheet_res = client.post(
        "/api/connectors",
        json={
            "connector_type": "google_sheets",
            "name": "CNC Receiving Log Sheet",
            "sync_direction": "bidirectional",
            "external_url": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0",
            "credential_token": "ya29.super-secret-token-9876",
        },
        headers=auth_headers,
    )
    assert sheet_res.status_code == 201, sheet_res.text
    sheet = sheet_res.json()
    assert sheet["has_credentials"] is True
    assert sheet["secret_preview"] == "••••9876"
    assert "super-secret-token" not in str(sheet)
    assert sheet["resource_id"] == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

    # Seed demo exceptions so export CSV also includes savings rows
    client.post("/api/records/seed-demo", headers=auth_headers)

    # Import CSV rows through Google Sheets connector
    csv_payload = (
        "ticket_number,customer_name,service_date,quantity,unit,rate,amount,notes\n"
        "PO-9901,Precision Alloy Works,2026-11-18,12.0,tons,150.0,1800.0,304L Plate Batch\n"
    )
    imp_res = client.post(
        f"/api/connectors/{sheet['id']}/sync",
        json={"mode": "import", "record_type": "service_ticket", "csv_override": csv_payload},
        headers=auth_headers,
    )
    assert imp_res.status_code == 200, imp_res.text
    imp_data = imp_res.json()
    assert imp_data["sync_result"]["imported_count"] == 1

    # Export savings CSV & download attachment
    exp_res = client.post(
        f"/api/connectors/{sheet['id']}/sync",
        json={"mode": "export"},
        headers=auth_headers,
    )
    assert exp_res.status_code == 200
    assert "Savings / Impact ($)" in exp_res.json()["sync_result"]["content"]

    dl_res = client.get(f"/api/connectors/{sheet['id']}/export", headers=auth_headers)
    assert dl_res.status_code == 200
    assert dl_res.headers.get("x-content-type-options") == "nosniff"
    assert "Savings / Impact ($)" in dl_res.text

    # Publish executive ROI summary to Google Docs connector
    doc_conn = next(c for c in connectors if c["connector_type"] == "google_docs")
    doc_sync = client.post(
        f"/api/connectors/{doc_conn['id']}/sync",
        json={"mode": "export", "document_title": "Weekly Plant Savings Summary"},
        headers=auth_headers,
    )
    assert doc_sync.status_code == 200
    assert "# Weekly Plant Savings Summary" in doc_sync.json()["sync_result"]["content"]

    # Tenant isolation on connectors
    org_b_headers = _register_second_org_headers(client)
    assert client.post(f"/api/connectors/{sheet['id']}/sync", json={"mode": "export"}, headers=org_b_headers).status_code == 404
    assert client.get(f"/api/connectors/{sheet['id']}/export", headers=org_b_headers).status_code == 404
    assert client.delete(f"/api/connectors/{sheet['id']}", headers=org_b_headers).status_code == 404


def test_chat_tools_antigravity_callables_and_roi(db_session, auth_headers, client):
    client.get("/api/connectors", headers=auth_headers)
    from backend.app.db.models.user import User
    from sqlalchemy import select

    user = db_session.execute(select(User)).scalars().first()
    tools = OperationsDataTools(db=db_session, organization_id=user.organization_id)
    callables = tools.as_antigravity_tools()
    assert len(callables) == 10
    for fn in callables:
        assert inspect.isfunction(fn)
        assert fn.__doc__

    apps = tools.list_connected_apps()
    assert apps["count"] >= 4

    roi = tools.get_savings_and_roi_summary()
    assert "cost_savings_identified_usd" in roi
    assert "estimated_hours_saved_mtd" in roi
