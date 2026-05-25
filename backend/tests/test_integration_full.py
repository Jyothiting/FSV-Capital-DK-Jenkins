"""
Integration tests for all major API surfaces (uses TestClient + seeded DB from conftest).
"""
import json

import pytest

from models import Document, Task
from database import SessionLocal

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def _seed_minimal_kb(client, admin_token):
    """Index one doc when embeddings are skipped in tests."""
    content = b"FSV Capital invests in Fintech, AI, Blockchain, and DeepTech. Seed checks USD 250k-2M."
    return client.post(
        "/documents/upload",
        headers={"Authorization": f"Bearer {admin_token}"},
        files={"file": ("policy.txt", content, "text/plain")},
    )


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


def test_database_has_core_tables(db):
    assert db.query(Task).count() >= 0
    assert db.query(Document).count() >= 0


def test_full_auth_flow(client, admin_token, user_token):
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {admin_token}"}).json()["role"] == "admin"
    assert client.get("/auth/assignees", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200
    assert client.get("/auth/assignees", headers={"Authorization": f"Bearer {user_token}"}).status_code == 403


def test_tasks_crud_and_filter(client, admin_token, user_token):
    user_id = client.get("/auth/me", headers={"Authorization": f"Bearer {user_token}"}).json()["id"]
    create = client.post(
        "/tasks/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "title": "Integration test task",
            "description": "Created in pytest",
            "status": "pending",
            "priority": "medium",
            "assigned_to": user_id,
        },
    )
    assert create.status_code == 201
    task_id = create.json()["id"]

    listed = client.get(
        "/tasks/",
        headers={"Authorization": f"Bearer {user_token}"},
        params={"status": "pending"},
    )
    assert listed.status_code == 200
    ids = [t["id"] for t in listed.json()]
    assert task_id in ids

    updated = client.put(
        f"/tasks/{task_id}",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"status": "completed"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"


def test_documents_and_search_pipeline(client, admin_token, user_token):
    up = _seed_minimal_kb(client, admin_token)
    assert up.status_code == 202

    docs = client.get("/documents/", headers={"Authorization": f"Bearer {user_token}"})
    assert docs.status_code == 200

    search = client.get(
        "/search/",
        headers={"Authorization": f"Bearer {user_token}"},
        params={"q": "Fintech AI Blockchain"},
    )
    assert search.status_code == 200


def test_rag_ask_endpoint(client, user_token):
    r = client.get(
        "/search/ask",
        headers={"Authorization": f"Bearer {user_token}"},
        params={"q": "What is FSV investment policy?"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "answer" in data
    assert data["mode"] in ("llm", "retrieval_only")


def test_applications_full_flow(client, admin_token):
    payload = {
        "startup_name": "Integration Co",
        "founder_names": "Tester",
        "contact_email": "integration@test.co",
        "contact_number": "+91 9111111111",
        "problem_statement": "Problem x",
        "solution_overview": "Solution y",
        "industry_sector": "AI / ML",
        "business_model": "SaaS",
        "current_stage": "MVP",
        "current_revenue": "$1k MRR",
        "amount_raising": "$400,000 USD",
        "funding_stage": "Seed",
        "use_of_funds": "Build product",
        "company_registered": "Yes",
        "legal_issues": "No",
        "consent_given": "Yes",
    }
    sub = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files={"pitch_deck": ("d.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert sub.status_code == 201
    app_id = sub.json()["id"]

    listed = client.get("/applications/", headers={"Authorization": f"Bearer {admin_token}"})
    assert any(a["id"] == app_id for a in listed.json())

    insights = client.get(
        f"/applications/{app_id}/ai-insights",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert insights.status_code == 200
    assert insights.json()["recommendation"] in ("Proceed", "Hold", "Pass")

    deck = client.get(
        f"/applications/{app_id}/pitch-deck",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deck.status_code == 200


def test_analytics_and_activity(client, admin_token, user_token):
    a = client.get("/analytics/", headers={"Authorization": f"Bearer {admin_token}"})
    assert a.status_code == 200
    assert "tasks" in a.json()
    assert "top_searches" in a.json()

    me = client.get("/analytics/me", headers={"Authorization": f"Bearer {user_token}"})
    assert me.status_code == 200

    act = client.get("/activity/", headers={"Authorization": f"Bearer {admin_token}"})
    assert act.status_code == 200

    act_me = client.get("/activity/me", headers={"Authorization": f"Bearer {user_token}"})
    assert act_me.status_code == 200


def test_draft_lifecycle(client):
    email = "draft-lifecycle@test.co"
    save = client.put(
        "/applications/draft",
        json={"contact_email": email, "current_step": 5, "form_data": {"startup_name": "Drafty"}},
    )
    assert save.status_code == 200
    load = client.get("/applications/draft", params={"contact_email": email})
    assert load.status_code == 200
    delete = client.delete("/applications/draft", params={"contact_email": email})
    assert delete.status_code == 204
