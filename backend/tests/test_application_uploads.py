import json
import os

# pyrefly: ignore [missing-import]
import pytest

MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
MINIMAL_XLSX = (
    b"PK\x03\x04\x14\x00\x00\x00\x08\x00"
    b"\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    b"\x0b\x00\x00\x00xl/workbook.xml"
)


def _valid_application(**overrides):
    payload = {
        "startup_name": "Upload Test Co",
        "founder_names": "Jane Doe",
        "contact_email": "uploads@testco.ai",
        "contact_number": "+91 9000000002",
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


def test_submit_with_optional_file_uploads(client, admin_token):
    payload = _valid_application()
    response = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files=[
            ("pitch_deck", ("deck.pdf", MINIMAL_PDF, "application/pdf")),
            ("financial_model", ("model.xlsx", MINIMAL_XLSX, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
            ("product_screenshots", ("ui.png", b"\x89PNG\r\n\x1a\n", "image/png")),
            ("additional_documents", ("memo.txt", b"Supporting memo content", "text/plain")),
        ],
    )
    assert response.status_code == 201
    data = response.json()
    assert data["pitch_deck_path"].endswith("pitch_deck.pdf")
    assert data["financial_model_path"] and os.path.isfile(data["financial_model_path"])
    assert data["attachments"] is not None
    assert len(data["attachments"]["screenshots"]) == 1
    assert len(data["attachments"]["additional"]) == 1

    app_id = data["id"]
    deck = client.get(
        f"/applications/{app_id}/pitch-deck",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert deck.status_code == 200

    fin = client.get(
        f"/applications/{app_id}/financial-model",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert fin.status_code == 200

    shot_name = data["attachments"]["screenshots"][0]["stored_name"]
    shot = client.get(
        f"/applications/{app_id}/files/screenshots/{shot_name}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert shot.status_code == 200


def test_rejects_invalid_financial_model_type(client):
    payload = _valid_application(contact_email="bad-file@testco.ai")
    response = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files=[
            ("pitch_deck", ("deck.pdf", MINIMAL_PDF, "application/pdf")),
            ("financial_model", ("model.exe", b"MZ", "application/octet-stream")),
        ],
    )
    assert response.status_code == 400
