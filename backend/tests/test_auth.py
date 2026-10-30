def test_login_success(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "testops@industrial.com", "password": "TestSecret123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testops@industrial.com"
    assert data["user"]["role"] == "operations_manager"

def test_login_invalid_password(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "testops@industrial.com", "password": "WrongPassword123!"},
    )
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]

def test_register_new_user(client):
    res = client.post(
        "/api/auth/register",
        json={
            "email": "newreviewer@industrial.com",
            "password": "SecurePassword456!",
            "display_name": "New Reviewer",
            "role": "reviewer",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "newreviewer@industrial.com"
    assert data["role"] == "reviewer"

def test_get_me_authenticated(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == "test-user-1"
