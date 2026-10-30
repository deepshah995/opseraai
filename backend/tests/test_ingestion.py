import io


def test_csv_preview_and_column_inference(client, auth_headers):
    csv_data = (
        "ticket_no,account_name,job_date,tons,unit_price,total\n"
        "TKT-101,Apex Industries,2026-10-15,10.5,85.00,892.50\n"
        "TKT-102,Apex Industries,2026-10-16,8.0,85.00,680.00\n"
    )
    files = {"file": ("tickets.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/records/preview-csv",
        files=files,
        data={"record_type": "service_ticket"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 2
    assert data["valid_rows_count"] == 2
    assert data["invalid_rows_count"] == 0
    assert data["inferred_mapping"]["ticket_no"] == "external_reference"
    assert data["inferred_mapping"]["account_name"] == "customer_reference"
    assert data["inferred_mapping"]["tons"] == "quantity"
    assert len(data["sample_records"]) == 2

def test_csv_row_validation_errors(client, auth_headers):
    # Row 1 is valid, Row 2 is missing external_reference, Row 3 has invalid date
    csv_data = (
        "external_reference,customer_reference,service_date,amount\n"
        "TKT-201,Good Customer,2026-10-15,500.00\n"
        ",Good Customer,2026-10-15,400.00\n"
        "TKT-203,Good Customer,invalid-date-string,600.00\n"
    )
    files = {"file": ("tickets_with_errors.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/records/preview-csv",
        files=files,
        data={"record_type": "service_ticket"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 3
    assert data["valid_rows_count"] == 1
    assert data["invalid_rows_count"] == 2
    assert len(data["validation_errors"]) >= 2
    err_fields = [e["field"] for e in data["validation_errors"]]
    assert "external_reference" in err_fields
    assert "service_date" in err_fields

def test_commit_batch_records(client, auth_headers):
    payload = {
        "record_type": "service_ticket",
        "records": [
            {
                "record_type": "service_ticket",
                "external_reference": "TKT-301",
                "customer_reference": "Customer Alpha",
                "amount": 450.00,
                "quantity": 5.0,
                "unit": "tons",
                "rate": 90.00,
            },
            {
                "record_type": "service_ticket",
                "external_reference": "TKT-302",
                "customer_reference": "Customer Alpha",
                "amount": 900.00,
                "quantity": 10.0,
                "unit": "tons",
                "rate": 90.00,
            },
        ],
    }
    res = client.post("/api/records/commit-batch", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["imported_count"] == 2
    assert data["skipped_duplicates_count"] == 0

    # Submitting again should detect duplicates and skip them safely
    res_dupe = client.post("/api/records/commit-batch", json=payload, headers=auth_headers)
    assert res_dupe.status_code == 200
    data_dupe = res_dupe.json()
    assert data_dupe["imported_count"] == 0
    assert data_dupe["skipped_duplicates_count"] == 2
