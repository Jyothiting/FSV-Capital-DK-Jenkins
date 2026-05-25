def test_health_includes_ai_status(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert "ai" in r.json()
    assert r.json()["ai"]["provider"] in ("mock", "heuristic", "openai")
