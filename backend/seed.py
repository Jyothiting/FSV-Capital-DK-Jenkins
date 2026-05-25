"""
Seed script — populates MySQL with demo data for every feature in the platform.
Run: python seed.py  (restart API after if server was already running)
"""
from __future__ import annotations

import json
import os
import shutil
import uuid
from datetime import datetime, timedelta

from config import settings
from database import init_db, SessionLocal
from models import (
    User,
    Role,
    Task,
    StartupApplication,
    ActivityLog,
    Document,
    ApplicationDraft,
)
from services.auth_service import get_password_hash
from services.search_service import search_service
from seed_data.knowledge_base import KNOWLEDGE_BASE_DOCUMENTS
from seed_data.applications import MINIMAL_PDF, MINIMAL_PNG, application_records
from services.application_files import create_application_folder

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SAMPLE_FINANCIAL = os.path.join(
    ROOT, "docs", "financial-model", "samples", "Apex_AI_Labs_Financial_Model.xlsx"
)


def _seed_application_files(startup_name: str, financial_model_path: str | None = None) -> tuple:
    """Create pitch deck PDF and optional demo attachments for seeded apps."""
    app_dir = create_application_folder()
    pitch_path = os.path.join(app_dir, "pitch_deck.pdf")
    with open(pitch_path, "wb") as f:
        f.write(MINIMAL_PDF)

    fin_path = financial_model_path
    attachments_json = None

    if startup_name == "Apex AI Labs" and os.path.isfile(SAMPLE_FINANCIAL):
        fin_dest = os.path.join(app_dir, "financial_model_0.xlsx")
        shutil.copy2(SAMPLE_FINANCIAL, fin_dest)
        fin_path = fin_dest
        shot_dir = os.path.join(app_dir, "screenshots")
        screenshot_path = os.path.join(shot_dir, "screenshot_0.png")
        with open(screenshot_path, "wb") as f:
            f.write(MINIMAL_PNG)
        attachments_json = json.dumps(
            {
                "screenshots": [
                    {
                        "original_name": "dashboard_preview.png",
                        "stored_name": "screenshot_0.png",
                        "path": screenshot_path,
                        "size_bytes": os.path.getsize(screenshot_path),
                    }
                ],
                "additional": [],
            }
        )

    return pitch_path, fin_path, attachments_json


def seed():
    os.environ.pop("SKIP_EMBEDDINGS", None)
    init_db()
    db = SessionLocal()

    # --- Roles ---
    roles = {}
    for name, desc in [("admin", "Administrator role"), ("user", "Standard user role")]:
        role = db.query(Role).filter(Role.name == name).first()
        if not role:
            role = Role(name=name, description=desc)
            db.add(role)
            db.commit()
            db.refresh(role)
        roles[name] = role

    # --- Users ---
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            email="admin@fsvcapital.com",
            full_name="FSV Admin",
            hashed_password=get_password_hash("admin123"),
            role_id=roles["admin"].id,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    user1 = db.query(User).filter(User.username == "user1").first()
    if not user1:
        user1 = User(
            username="user1",
            email="user1@fsvcapital.com",
            full_name="John Analyst",
            hashed_password=get_password_hash("user123"),
            role_id=roles["user"].id,
            is_active=True,
        )
        db.add(user1)
        db.commit()
        db.refresh(user1)

    # --- Applications (with on-disk pitch decks) ---
    db.query(StartupApplication).delete()
    db.commit()

    defaults = {
        "problem_statement": "Market problem to be refined.",
        "solution_overview": "Product solution in development.",
        "industry_sector": "SaaS",
        "business_model": "B2B",
        "current_stage": "MVP",
        "consent_given": "Yes",
        "company_registered": "Yes",
        "legal_issues": "No",
    }

    for item in application_records(admin.id, user1.email):
        merged = {**defaults, **item}
        pitch, fin, attachments = _seed_application_files(
            merged["startup_name"],
            merged.get("financial_model_path"),
        )
        merged["pitch_deck_path"] = pitch
        merged["financial_model_path"] = fin
        if attachments:
            merged["additional_documents_path"] = attachments
        db.add(StartupApplication(**merged))
    db.commit()
    app_count = db.query(StartupApplication).count()
    print(f"  -> {app_count} startup applications (with PDF pitch decks)")

    # --- Application draft (save & resume demo) ---
    db.query(ApplicationDraft).delete()
    draft_form = {
        "startup_name": "DraftFlow Payments",
        "founder_names": "Demo Founder",
        "contact_email": "draft-demo@fsvcapital.com",
        "contact_number": "+91 90000 11111",
        "problem_statement": "Cross-border freelancer payments are slow.",
        "solution_overview": "Instant INR-USD wallet for creators.",
        "industry_sector": "Fintech",
        "business_model": "B2C",
        "current_stage": "MVP",
        "current_step_saved": 4,
    }
    db.add(
        ApplicationDraft(
            draft_key="email:draft-demo@fsvcapital.com",
            contact_email="draft-demo@fsvcapital.com",
            form_data=json.dumps(draft_form),
            current_step=4,
        )
    )
    db.commit()
    print("  -> 1 application draft (email: draft-demo@fsvcapital.com)")

    # --- Tasks ---
    db.query(Task).delete()
    now = datetime.now()
    tasks_data = [
        {
            "title": "Review pitch deck — Apex AI Labs",
            "description": "Validate GPU cost claims and reference customer calls.",
            "status": "pending",
            "priority": "high",
            "assigned_to": user1.id,
            "created_by": admin.id,
            "due_date": now,
        },
        {
            "title": "Due diligence — Quantum Security",
            "description": "Patent scan + FIPS roadmap review.",
            "status": "in_progress",
            "priority": "urgent",
            "assigned_to": user1.id,
            "created_by": admin.id,
            "due_date": now + timedelta(days=1),
        },
        {
            "title": "Founder call — PayGrid India",
            "description": "NBFC partnership and unit economics.",
            "status": "pending",
            "priority": "high",
            "assigned_to": user1.id,
            "created_by": admin.id,
            "due_date": now - timedelta(days=1),
        },
        {
            "title": "IC memo draft — ChainLedger",
            "description": "Prepare seed recommendation memo.",
            "status": "pending",
            "priority": "medium",
            "assigned_to": user1.id,
            "created_by": admin.id,
            "due_date": now + timedelta(days=3),
        },
        {
            "title": "Update pipeline CRM export",
            "description": "Sync accepted deals to portfolio tracker.",
            "status": "completed",
            "priority": "medium",
            "assigned_to": user1.id,
            "created_by": admin.id,
            "due_date": now - timedelta(days=2),
            "completed_at": now - timedelta(hours=6),
        },
        {
            "title": "Upload Q1 market research to knowledge base",
            "description": "Admin: add new fintech/AI briefs for analyst search.",
            "status": "pending",
            "priority": "low",
            "assigned_to": admin.id,
            "created_by": admin.id,
            "due_date": now + timedelta(days=7),
        },
    ]
    for item in tasks_data:
        db.add(Task(**item))
    db.commit()
    print(f"  -> {len(tasks_data)} tasks")

    # --- Activity logs ---
    db.query(ActivityLog).delete()
    logs_data = [
        {"user_id": user1.id, "action": "login", "details": "User logged in", "created_at": now - timedelta(hours=8)},
        {"user_id": user1.id, "action": "search", "details": "Query: FSV Capital investment policy sectors", "created_at": now - timedelta(hours=7)},
        {"user_id": user1.id, "action": "search", "details": "Query: FSV Capital investment policy sectors", "created_at": now - timedelta(hours=7)},
        {"user_id": user1.id, "action": "search", "details": "Query: seed term sheet equity", "created_at": now - timedelta(hours=6)},
        {"user_id": user1.id, "action": "search", "details": "Query: due diligence TAM SAM SOM", "created_at": now - timedelta(hours=5)},
        {"user_id": user1.id, "action": "rag_ask", "details": "RAG query: What sectors does FSV invest in?", "created_at": now - timedelta(hours=4)},
        {"user_id": user1.id, "action": "task_update", "details": "Updated task status to completed", "created_at": now - timedelta(hours=3)},
        {"user_id": user1.id, "action": "ai_coach", "details": "Coached field: use_of_funds (heuristic)", "created_at": now - timedelta(hours=2)},
        {"user_id": admin.id, "action": "login", "details": "Admin logged in", "created_at": now - timedelta(hours=10)},
        {"user_id": admin.id, "action": "document_upload", "details": "Uploaded document: investment_policy.txt", "created_at": now - timedelta(hours=9)},
        {"user_id": admin.id, "action": "application_review", "details": "Reviewed Quantum Security — Accepted", "created_at": now - timedelta(hours=8)},
        {"user_id": admin.id, "action": "application_review", "details": "Reviewed BioPulse Systems — Rejected", "created_at": now - timedelta(hours=7)},
        {"user_id": admin.id, "action": "ai_insights", "details": "Generated AI insights for Apex AI Labs", "created_at": now - timedelta(hours=6)},
        {"user_id": admin.id, "action": "task_create", "details": "Created task: Review pitch deck — Apex AI Labs", "created_at": now - timedelta(hours=5)},
        {"user_id": admin.id, "action": "application_submit", "details": "Submitted application: ChainLedger", "created_at": now - timedelta(hours=1)},
    ]
    for item in logs_data:
        db.add(
            ActivityLog(
                user_id=item["user_id"],
                action=item["action"],
                details=item["details"],
                ip_address="127.0.0.1",
                created_at=item["created_at"],
            )
        )
    db.commit()
    print(f"  -> {len(logs_data)} activity logs")

    # --- Knowledge base + FAISS ---
    seed_knowledge_base(db, admin)

    db.close()
    print("\nSeed complete! Restart the API server, then run: python scripts/verify_system.py")


def seed_knowledge_base(db, admin: User):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    db.query(Document).delete()
    db.commit()
    search_service.reset_index()

    doc_count = 0
    for filename, content in KNOWLEDGE_BASE_DOCUMENTS.items():
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        db_doc = Document(
            filename=filename,
            original_name=filename,
            file_path=file_path,
            file_size=len(content.encode("utf-8")),
            mime_type="text/plain",
            content_text=content,
            embedding_status="completed",
            uploaded_by=admin.id,
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        search_service.add_document(db_doc.id, content)
        doc_count += 1

    print(f"  -> Indexed {doc_count} knowledge-base documents ({search_service.index.ntotal} vectors)")


if __name__ == "__main__":
    seed()
