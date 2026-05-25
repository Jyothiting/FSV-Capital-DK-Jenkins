"""
End-to-end API verification against a running backend (http://127.0.0.1:8000).
Run: python seed.py && python main.py   (separate terminal)
     python scripts/verify_system.py
"""
import json
import os
import sys

import httpx

BASE = "http://127.0.0.1:8000"
MINIMAL_PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
MINIMAL_TXT = b"FSV Capital supporting document for verification."

passed = 0
failed = 0


def check(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name} — {detail}")


def main():
    print("\n=== FSV Capital Full System Verification ===\n")
    try:
        client = httpx.Client(base_url=BASE, timeout=60.0)
    except Exception as e:
        print(f"Cannot create HTTP client: {e}")
        sys.exit(1)

    # Health + AI index
    r = client.get("/health")
    check("Health check", r.status_code == 200 and r.json().get("status") == "ok", r.text)
    if r.status_code == 200:
        h = r.json()
        check("Health: embeddings enabled", h.get("embeddings_enabled") is True, str(h))
        check(
            "Health: search index has vectors",
            (h.get("search_index_vectors") or 0) >= 3,
            f"vectors={h.get('search_index_vectors')} — restart API after seed.py",
        )

    # Auth
    r = client.post("/auth/login", data={"username": "admin", "password": "admin123"})
    check("Admin login", r.status_code == 200, r.text)
    admin_token = r.json().get("access_token", "")
    admin_h = {"Authorization": f"Bearer {admin_token}"}

    r = client.post("/auth/login", data={"username": "user1", "password": "user123"})
    check("User login", r.status_code == 200, r.text)
    user_token = r.json().get("access_token", "")
    user_h = {"Authorization": f"Bearer {user_token}"}

    r = client.get("/auth/me", headers=admin_h)
    check("GET /auth/me (admin)", r.status_code == 200 and r.json()["role"] == "admin", r.text)

    r = client.get("/auth/me", headers=user_h)
    check("GET /auth/me (user)", r.status_code == 200 and r.json()["role"] == "user", r.text)

    r = client.get("/auth/assignees", headers=admin_h)
    check("GET /auth/assignees", r.status_code == 200 and len(r.json()) >= 1, r.text)

    r = client.get("/auth/assignees", headers=user_h)
    check("Assignees blocked for user", r.status_code == 403, r.text)

    # Tasks + filtering
    r = client.get("/tasks/", headers=user_h, params={"status": "pending"})
    check("GET /tasks?status=pending", r.status_code == 200 and len(r.json()) >= 1, r.text)

    assignees = client.get("/auth/assignees", headers=admin_h).json()
    user_id = next((u["id"] for u in assignees if u["username"] == "user1"), None)
    r = client.get("/tasks/", headers=admin_h, params={"assigned_to": user_id} if user_id else {})
    check("GET /tasks?assigned_to= (admin)", r.status_code == 200, r.text)

    tasks_for_update = client.get("/tasks/", headers=user_h).json()
    if tasks_for_update:
        tid = tasks_for_update[0]["id"]
        r2 = client.put(
            f"/tasks/{tid}",
            headers=user_h,
            json={"status": "in_progress"},
        )
        check("PUT /tasks/{id} status update", r2.status_code == 200, r2.text)

    r = client.post(
        "/tasks/",
        headers=admin_h,
        json={
            "title": "Verify script task",
            "description": "Auto-created during verification",
            "status": "pending",
            "priority": "low",
            "assigned_to": user_id or assignees[0]["id"],
        },
    )
    check("POST /tasks (admin create)", r.status_code == 201, r.text)

    # Documents
    r = client.get("/documents/", headers=user_h)
    check("GET /documents", r.status_code == 200, r.text)
    docs = r.json() if r.status_code == 200 else []
    check("Knowledge base >= 8 docs", len(docs) >= 8, f"count={len(docs)} — run seed.py")

    # Semantic search
    r = client.get("/search/", headers=user_h, params={"q": "FSV Capital fintech investment policy"})
    check("GET /search semantic", r.status_code == 200, r.text)
    if r.status_code == 200:
        check("Search returns hits", len(r.json()) > 0, f"got {len(r.json())}")

    # RAG ask
    r = client.get(
        "/search/ask",
        headers=user_h,
        params={"q": "What sectors does FSV Capital invest in?"},
    )
    check("GET /search/ask RAG", r.status_code == 200, r.text)
    if r.status_code == 200:
        body = r.json()
        check("RAG has answer text", len(body.get("answer", "")) > 20, body.get("answer", "")[:80])
        check(
            "RAG has sources or retrieval mode",
            len(body.get("sources", [])) > 0 or body.get("mode") in ("llm", "retrieval_only"),
            str(body)[:120],
        )

    # AI coach (public)
    r = client.post(
        "/ai/coach",
        json={
            "field": "problem_statement",
            "text": "Small businesses struggle with slow invoice payments across India.",
            "industry_sector": "Fintech",
            "current_stage": "Seed",
        },
    )
    check("POST /ai/coach", r.status_code == 200 and r.json().get("improved_draft"), r.text)

    # Analytics
    r = client.get("/analytics/", headers=admin_h)
    check("GET /analytics (admin)", r.status_code == 200 and "tasks" in r.json(), r.text)
    if r.status_code == 200:
        check("Analytics: applications total", r.json()["applications"]["total"] >= 5, r.text)

    r = client.get("/analytics/me", headers=user_h)
    check("GET /analytics/me", r.status_code == 200, r.text)
    if r.status_code == 200:
        check("Analytics/me: has tasks", "tasks" in r.json(), r.text)

    # Activity
    r = client.get("/activity/", headers=admin_h, params={"limit": 10})
    check("GET /activity (admin)", r.status_code == 200 and len(r.json()) >= 1, r.text)

    r = client.get("/activity/me", headers=user_h)
    check("GET /activity/me", r.status_code == 200, r.text)

    # Applications
    r = client.get("/applications/", headers=admin_h)
    check("GET /applications (admin)", r.status_code == 200 and len(r.json()) >= 5, r.text)
    apps = r.json() if r.status_code == 200 else []

    if apps:
        app_id = apps[0]["id"]
        r = client.get(f"/applications/{app_id}/pitch-deck", headers=admin_h)
        check("GET pitch-deck download", r.status_code == 200, r.text[:80])

        apex = next((a for a in apps if a["startup_name"] == "Apex AI Labs"), apps[0])
        if apex.get("financial_model_path"):
            r = client.get(f"/applications/{apex['id']}/financial-model", headers=admin_h)
            check(
                "GET financial-model download",
                r.status_code == 200 or not os.path.isfile(apex.get("financial_model_path", "")),
                r.text[:80],
            )

        r = client.get(f"/applications/{app_id}/ai-insights", headers=admin_h)
        check("GET ai-insights", r.status_code == 200 and r.json().get("executive_summary"), r.text)

        r = client.post(
            f"/applications/{app_id}/review",
            headers=admin_h,
            json={"status": "Under Review", "reviewer_notes": "Verify script review"},
        )
        check("POST application review", r.status_code == 200, r.text)

    r = client.get("/applications/me", headers=user_h)
    check("GET /applications/me (user1 has Apex)", r.status_code == 200, r.text)

    # Draft
    draft_email = "verify-draft@testco.ai"
    r = client.put(
        "/applications/draft",
        json={
            "contact_email": draft_email,
            "current_step": 3,
            "form_data": {"startup_name": "Verify Draft Co", "industry_sector": "Fintech"},
        },
    )
    check("PUT /applications/draft", r.status_code == 200, r.text)

    r = client.get("/applications/draft", params={"contact_email": draft_email})
    check("GET /applications/draft", r.status_code == 200, r.text)

    r = client.delete("/applications/draft", params={"contact_email": draft_email})
    check("DELETE /applications/draft", r.status_code == 204, r.text)

    r = client.get("/applications/draft", params={"contact_email": "draft-demo@fsvcapital.com"})
    check("GET seeded draft", r.status_code == 200, r.text)

    # Submit application
    payload = {
        "startup_name": "Verify Systems",
        "founder_names": "Test Founder",
        "contact_email": "verify-submit@testco.ai",
        "contact_number": "+91 9000000099",
        "problem_statement": "Payments are slow for SMBs.",
        "solution_overview": "AI routing for instant settlement.",
        "industry_sector": "Fintech",
        "business_model": "B2B",
        "current_stage": "MVP",
        "current_revenue": "$8,000 MRR",
        "amount_raising": "$750,000 USD",
        "funding_stage": "Seed",
        "use_of_funds": "Engineering and sales",
        "company_registered": "Yes",
        "legal_issues": "No",
        "consent_given": "Yes",
    }
    r = client.post(
        "/applications/",
        data={"application_data": json.dumps(payload)},
        files=[
            ("pitch_deck", ("verify.pdf", MINIMAL_PDF, "application/pdf")),
            ("additional_documents", ("memo.txt", MINIMAL_TXT, "text/plain")),
        ],
    )
    check("POST /applications (submit)", r.status_code == 201, r.text)
    if r.status_code == 201:
        att = r.json().get("attachments")
        check("Submit includes attachments metadata", att and len(att.get("additional", [])) >= 1, str(att))

    bad = {
        **payload,
        "contact_email": "bad-idea@testco.ai",
        "current_stage": "Idea",
        "current_revenue": "",
        "growth_rate": "",
        "number_of_customers": "",
    }
    r = client.post(
        "/applications/",
        data={"application_data": json.dumps(bad)},
        files={"pitch_deck": ("bad.pdf", MINIMAL_PDF, "application/pdf")},
    )
    check("Screening blocks Idea w/o traction", r.status_code == 400, r.text)

    print(f"\n=== Results: {passed} passed, {failed} failed ===\n")
    client.close()
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
