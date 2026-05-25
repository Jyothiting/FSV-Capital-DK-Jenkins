def test_login_success(client):
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client):
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "wrong"},
    )
    assert response.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/auth/me").status_code == 401


def test_me_returns_profile(client, admin_token):
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert data["role"] == "admin"


def test_assignees_admin_only(client, user_token, admin_token):
    assert client.get(
        "/auth/assignees",
        headers={"Authorization": f"Bearer {user_token}"},
    ).status_code == 403

    response = client.get(
        "/auth/assignees",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assignees = response.json()
    assert len(assignees) >= 1
    assert all(a["role"] == "user" for a in assignees)
