def test_rag_ask_requires_auth(client):
    assert client.get("/search/ask", params={"q": "investment policy"}).status_code == 401


def test_rag_ask_empty_index(client, user_token):
    r = client.get(
        "/search/ask",
        params={"q": "What sectors does FSV invest in?"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["query"]
    assert data["answer"]
    assert data["mode"] in ("llm", "retrieval_only")
    assert isinstance(data["sources"], list)
