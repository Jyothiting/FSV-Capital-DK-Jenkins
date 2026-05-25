import json

import pytest

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


@pytest.fixture
def submitted_app_id(client):
    payload = {
        "startup_name": "InsightTest AI",
        "founder_names": "Alex Kim",
        "contact_email": "insight@test.ai",
        "contact_number": "+1 555 0100",
        "problem_statement": "ML training is too expensive for startups.",
        "solution_overview": "Distributed GPU marketplace reducing cost 60%.",
        "industry_sector": "AI / ML",
        "business_model": "SaaS",
        "current_stage": "MVP",
        "current_revenue": "$10k MRR",
        "amount_raising": "$500,000 USD",
        "funding_stage": "Seed",
        "use_of_funds": "Engineering and cloud credits",
        "company_registered": "Yes",
        "legal_issues": "No",
        "consent_given": "Yes",
    }
    r = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files={"pitch_deck": ("deck.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert r.status_code == 201
    return r.json()["id"]


def test_insights_requires_admin(client, user_token, submitted_app_id):
    r = client.get(
        f"/applications/{submitted_app_id}/ai-insights",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 403


def test_insights_admin(client, admin_token, submitted_app_id):
    r = client.get(
        f"/applications/{submitted_app_id}/ai-insights",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["application_id"] == submitted_app_id
    assert data["startup_name"] == "InsightTest AI"
    assert data["executive_summary"]
    assert len(data["strengths"]) >= 1
    assert len(data["risks"]) >= 1
    assert data["recommendation"] in ("Proceed", "Hold", "Pass")
    assert data["mode"] in ("llm", "heuristic")
