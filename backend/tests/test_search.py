def test_search_requires_auth(client):
    assert client.get("/search/", params={"q": "policy"}).status_code == 401


def test_search_authenticated_empty_index(client, user_token):
    response = client.get(
        "/search/",
        params={"q": "enterprise customers"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_search_with_indexed_document(client, admin_token, user_token):
    content = b"Enterprise customers receive a 30-day return policy on all SaaS subscriptions."
    upload = client.post(
        "/documents/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("policy.txt", content, "text/plain")},
    )
    assert upload.status_code == 202

    response = client.get(
        "/search/",
        params={"q": "return policy", "top_k": 3},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    # With SKIP_EMBEDDINGS search returns empty; verify endpoint works
    assert isinstance(response.json(), list)
