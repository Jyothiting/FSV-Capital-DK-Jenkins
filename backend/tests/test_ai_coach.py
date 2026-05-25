def test_coach_public(client):
    r = client.post(
        "/ai/coach",
        json={
            "field": "problem_statement",
            "text": "Payments are slow for small businesses in India and cost too much.",
        },
    )
    assert r.status_code == 200
    assert r.json()["suggestions"]


def test_coach_authenticated(client, user_token):
    r = client.post(
        "/ai/coach",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "field": "use_of_funds",
            "text": "We will spend on engineers and marketing for growth.",
            "industry_sector": "Fintech",
            "current_stage": "Seed",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["field"] == "use_of_funds"
    assert len(data["suggestions"]) >= 1
    assert data["improved_draft"]
    assert data["mode"] in ("llm", "heuristic")


def test_coach_rejects_short_text(client, user_token):
    r = client.post(
        "/ai/coach",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"field": "problem_statement", "text": "short"},
    )
    assert r.status_code == 422
