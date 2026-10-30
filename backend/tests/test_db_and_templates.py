def test_seed_demo_reset_existing(client, auth_headers):
    # Call seed once
    res1 = client.post("/api/records/seed-demo?reset_existing=true", headers=auth_headers)
    assert res1.status_code == 200
    assert res1.json()["imported_count"] >= 11

    # Call seed a second time with reset_existing=true - should cleanly reseed identical count
    res2 = client.post("/api/records/seed-demo?reset_existing=true", headers=auth_headers)
    assert res2.status_code == 200
    assert res2.json()["imported_count"] == res1.json()["imported_count"]


def test_database_connection_and_import(client, auth_headers):
    # 1. Test Connection
    res_conn = client.post(
        "/api/records/db/test-connection",
        headers=auth_headers,
        json={
            "system_type": "postgres",
            "host": "localhost",
            "port": 5432,
            "database_name": "operations_db",
            "username": "ops_user",
            "password": "",
        },
    )
    assert res_conn.status_code == 200
    data = res_conn.json()
    assert data["success"] is True
    assert "dispatch_tickets" in data["available_tables"]

    # 2. Preview Table & Column Inferred Mapping
    res_prev = client.post(
        "/api/records/db/preview-table",
        headers=auth_headers,
        json={
            "system_type": "postgres",
            "table_name": "dispatch_tickets",
        },
    )
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert len(prev_data["sample_rows"]) > 0
    assert "ticket_id" in prev_data["columns"]
    assert prev_data["inferred_mapping"]["ticket_id"] == "external_reference"
    assert prev_data["inferred_mapping"]["customer_name"] == "customer_reference"

    # 3. Import Records with valid schema mapping
    res_import = client.post(
        "/api/records/db/import",
        headers=auth_headers,
        json={
            "system_type": "postgres",
            "table_name": "dispatch_tickets",
            "record_type": "service_ticket",
            "column_mapping": {
                "ticket_id": "external_reference",
                "customer_name": "customer_reference",
                "ticket_date": "service_date",
                "weight_tons": "quantity",
                "unit_rate": "rate",
                "total_amount": "amount",
            },
            "rows": prev_data["sample_rows"],
        },
    )
    assert res_import.status_code == 200
    imp_data = res_import.json()
    assert imp_data["imported_count"] > 0

    # 4. Fail on missing required template field
    res_fail = client.post(
        "/api/records/db/import",
        headers=auth_headers,
        json={
            "system_type": "postgres",
            "table_name": "dispatch_tickets",
            "record_type": "service_ticket",
            "column_mapping": {
                "ticket_date": "service_date",
            },
            "rows": prev_data["sample_rows"],
        },
    )
    assert res_fail.status_code == 400
    assert "Template format error" in res_fail.json()["detail"]
