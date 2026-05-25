import json

import pytest

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def _valid_application(**overrides):
    payload = {
        "startup_name": "TestCo AI",
        "founder_names": "Jane Doe",
        "contact_email": "founder@testco.ai",
        "contact_number": "+91 9000000001",
        "problem_statement": "Big problem in fintech payments.",
        "solution_overview": "AI-powered payment routing.",
        "industry_sector": "Fintech",
        "business_model": "B2B",
        "current_stage": "MVP",
        "current_revenue": "$5,000 MRR",
        "amount_raising": "$500,000 USD",
        "funding_stage": "Seed",
        "use_of_funds": "Product and GTM",
        "company_registered": "Yes",
        "legal_issues": "No",
        "consent_given": "Yes",
    }
    payload.update(overrides)
    return payload


def test_submit_application_success(client):
    payload = _valid_application()
    response = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files={"pitch_deck": ("deck.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["startup_name"] == "TestCo AI"
    assert data["deal_score"] > 0
    assert data["pitch_deck_path"].endswith("pitch_deck.pdf")


def test_submit_blocks_idea_without_traction(client):
    payload = _valid_application(
        current_stage="Idea",
        current_revenue="",
        growth_rate="",
        number_of_customers="",
    )
    response = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files={"pitch_deck": ("deck.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert response.status_code == 400


def test_draft_save_and_load(client):
    email = "draft@testco.ai"
    form = _valid_application(contact_email=email, startup_name="Draft Startup")

    save = client.put(
        "/applications/draft",
        json={
            "contact_email": email,
            "current_step": 3,
            "form_data": form,
        },
    )
    assert save.status_code == 200
    assert save.json()["current_step"] == 3

    load = client.get("/applications/draft", params={"contact_email": email})
    assert load.status_code == 200
    assert load.json()["form_data"]["startup_name"] == "Draft Startup"


def test_draft_deleted_after_submit(client):
    email = "submit-draft@testco.ai"
    form = _valid_application(contact_email=email)

    client.put(
        "/applications/draft",
        json={"contact_email": email, "current_step": 2, "form_data": form},
    )

    submit = client.post(
        "/applications/",
        data={"application_data": json.dumps(form)},
        files={"pitch_deck": ("deck.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert submit.status_code == 201

    load = client.get("/applications/draft", params={"contact_email": email})
    assert load.status_code == 404
