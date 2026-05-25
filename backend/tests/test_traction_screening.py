import json

import pytest

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"


def _base(**overrides):
    payload = {
        "startup_name": "Traction Test Co",
        "founder_names": "Jane Doe",
        "contact_email": "traction@test.co",
        "contact_number": "+91 9000000002",
        "problem_statement": "Problem.",
        "solution_overview": "Solution.",
        "industry_sector": "Fintech",
        "business_model": "B2B",
        "current_stage": "MVP",
        "amount_raising": "$300,000 USD",
        "funding_stage": "Seed",
        "use_of_funds": "Product",
        "company_registered": "Yes",
        "legal_issues": "No",
        "consent_given": "Yes",
    }
    payload.update(overrides)
    return payload


def test_mvp_without_traction_blocked(client):
    payload = _base(
        current_stage="MVP",
        current_revenue="",
        growth_rate="",
        number_of_customers="",
    )
    r = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files={"pitch_deck": ("deck.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert r.status_code == 400


def test_mvp_with_traction_allowed(client):
    payload = _base(current_stage="MVP", current_revenue="$2k MRR")
    r = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files={"pitch_deck": ("deck.pdf", MINIMAL_PDF, "application/pdf")},
    )
    assert r.status_code == 201
