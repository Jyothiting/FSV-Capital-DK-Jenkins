import json
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session, noload

from config import settings
from database import get_db
from middleware.auth_middleware import RequireRole, get_current_active_user, get_current_user_optional
from models import ApplicationDraft, StartupApplication, User
from schemas.application import ApplicationReview, StartupApplicationCreate, StartupApplicationResponse
from schemas.ai import ApplicationInsightsResponse
from schemas.user import UserResponse
from schemas.application_draft import ApplicationDraftResponse, ApplicationDraftSave
from middleware.activity_logger import log_activity
from services.application_screening import validate_application_screening
from services.deal_score import calculate_deal_score
from services.insights_service import generate_application_insights
from services.application_files import (
    create_application_folder,
    parse_attachments,
    save_optional_documents,
    save_pitch_deck,
)
from schemas.attachments import ApplicationAttachments, StoredFileMeta

router = APIRouter(prefix="/applications", tags=["Startup Applications"])


def _draft_key(current_user: Optional[User], contact_email: Optional[str]) -> str:
    if current_user:
        return f"user:{current_user.id}"
    if contact_email:
        return f"email:{contact_email.strip().lower()}"
    raise HTTPException(status_code=400, detail="contact_email is required to save a draft when not logged in")


def _get_draft(db: Session, draft_key: str) -> Optional[ApplicationDraft]:
    return db.query(ApplicationDraft).filter(ApplicationDraft.draft_key == draft_key).first()


def _linkedin_fields(app_in: StartupApplicationCreate) -> dict:
    """Map founder/company LinkedIn; keep legacy single field when provided."""
    founder = (app_in.linkedin_founder or "").strip()
    company = (app_in.linkedin_company or "").strip()
    legacy = (app_in.linkedin_profile or "").strip()
    if not founder and not company and legacy:
        if "/company/" in legacy.lower():
            company = legacy
        else:
            founder = legacy
    profile = legacy or " | ".join(p for p in (founder, company) if p)
    return {
        "linkedin_founder": founder or None,
        "linkedin_company": company or None,
        "linkedin_profile": profile or None,
    }


def _attachments_response(app: StartupApplication) -> Optional[ApplicationAttachments]:
    parsed = parse_attachments(app.additional_documents_path)
    if not parsed["screenshots"] and not parsed["additional"]:
        return None
    return ApplicationAttachments(
        screenshots=[StoredFileMeta(**m) for m in parsed["screenshots"]],
        additional=[StoredFileMeta(**m) for m in parsed["additional"]],
    )


def _app_response(app: StartupApplication) -> StartupApplicationResponse:
    base = StartupApplicationCreate.model_validate(app, from_attributes=True).model_dump()
    payload = {
        **base,
        "id": app.id,
        "deal_score": app.deal_score,
        "status": app.status,
        "reviewer_id": app.reviewer_id,
        "reviewer_notes": app.reviewer_notes,
        "pitch_deck_path": app.pitch_deck_path,
        "financial_model_path": app.financial_model_path,
        "additional_documents_path": app.additional_documents_path,
        "attachments": _attachments_response(app),
        "created_at": app.created_at,
        "updated_at": app.updated_at,
        "submitted_at": app.created_at,
        "reviewer": None,
    }
    if getattr(app, "reviewer", None) and app.reviewer is not None:
        role_name = app.reviewer.role.name if getattr(app.reviewer, "role", None) else "user"
        payload["reviewer"] = UserResponse(
            id=app.reviewer.id,
            username=app.reviewer.username,
            email=app.reviewer.email,
            full_name=app.reviewer.full_name,
            role=role_name,
        )
    return StartupApplicationResponse(**payload)


@router.post("/", response_model=StartupApplicationResponse, status_code=status.HTTP_201_CREATED)
async def submit_application(
    request: Request,
    pitch_deck: UploadFile = File(..., description="Mandatory pitch deck (PDF, max 20 MB)"),
    application_data: str = Form(..., description="JSON payload matching StartupApplicationCreate"),
    financial_model: Optional[UploadFile] = File(
        None, description="Optional financial model (.xlsx, .xls, .csv, .pdf — max 10 MB)"
    ),
    product_screenshots: List[UploadFile] = File(
        default=[], description="Optional product screenshots (png, jpg, webp — max 5 files)"
    ),
    additional_documents: List[UploadFile] = File(
        default=[], description="Optional supporting documents (pdf, txt, docx, xlsx — max 5 files)"
    ),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Public endpoint for startups to submit funding applications with document uploads."""
    try:
        payload = json.loads(application_data)
        app_in = StartupApplicationCreate.model_validate(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="application_data must be valid JSON")
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())

    if app_in.consent_given != "Yes":
        raise HTTPException(status_code=400, detail="Consent is required to submit an application")

    validate_application_screening(app_in)

    app_dir = create_application_folder()
    pitch_deck_path = await save_pitch_deck(pitch_deck, app_dir)
    financial_path, attachments_json = await save_optional_documents(
        app_dir,
        financial_model=financial_model,
        product_screenshots=product_screenshots,
        additional_documents=additional_documents,
        financial_model_url=app_in.financial_model_link or app_in.financial_model_path,
    )

    deal_score = calculate_deal_score(app_in)
    contact_email = current_user.email if current_user else app_in.contact_email

    dump = app_in.model_dump(exclude={"contact_email", "financial_model_link"})
    dump.pop("financial_model_path", None)
    dump.update(_linkedin_fields(app_in))

    db_app = StartupApplication(
        **dump,
        contact_email=contact_email,
        deal_score=deal_score,
        pitch_deck_path=pitch_deck_path,
        financial_model_path=financial_path,
        additional_documents_path=attachments_json,
    )
    db.add(db_app)
    db.commit()
    db.refresh(db_app)

    draft_key = _draft_key(current_user, contact_email)
    existing_draft = _get_draft(db, draft_key)
    if existing_draft:
        db.delete(existing_draft)
        db.commit()

    log_activity(
        db,
        current_user.id if current_user else None,
        "application_submit",
        f"Submitted application: {db_app.startup_name} ({contact_email})",
        request,
    )

    return _app_response(db_app)


@router.put("/draft", response_model=ApplicationDraftResponse)
def save_application_draft(
    payload: ApplicationDraftSave,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Save or update a server-side application draft (resume later)."""
    email = current_user.email if current_user else payload.contact_email
    if not email:
        raise HTTPException(status_code=400, detail="contact_email is required to save a draft")

    draft_key = _draft_key(current_user, str(email))
    form_json = json.dumps(payload.form_data, ensure_ascii=False)
    draft = _get_draft(db, draft_key)

    if draft:
        draft.form_data = form_json
        draft.current_step = max(1, min(payload.current_step, 11))
        draft.contact_email = str(email)
        draft.user_id = current_user.id if current_user else None
    else:
        draft = ApplicationDraft(
            draft_key=draft_key,
            user_id=current_user.id if current_user else None,
            contact_email=str(email),
            form_data=form_json,
            current_step=max(1, min(payload.current_step, 11)),
        )
        db.add(draft)

    db.commit()
    db.refresh(draft)
    return ApplicationDraftResponse(
        form_data=json.loads(draft.form_data),
        current_step=draft.current_step,
        contact_email=draft.contact_email,
        updated_at=draft.updated_at,
    )


@router.get("/draft", response_model=ApplicationDraftResponse)
def load_application_draft(
    contact_email: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Load a saved application draft for the current user or contact email."""
    email = current_user.email if current_user else contact_email
    if not email:
        raise HTTPException(status_code=400, detail="contact_email query param is required when not logged in")

    draft_key = _draft_key(current_user, str(email))
    draft = _get_draft(db, draft_key)
    if not draft:
        raise HTTPException(status_code=404, detail="No saved draft found")

    return ApplicationDraftResponse(
        form_data=json.loads(draft.form_data),
        current_step=draft.current_step,
        contact_email=draft.contact_email,
        updated_at=draft.updated_at,
    )


@router.delete("/draft", status_code=status.HTTP_204_NO_CONTENT)
def delete_application_draft(
    contact_email: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    email = current_user.email if current_user else contact_email
    if not email:
        raise HTTPException(status_code=400, detail="contact_email is required")

    draft_key = _draft_key(current_user, str(email))
    draft = _get_draft(db, draft_key)
    if draft:
        db.delete(draft)
        db.commit()
    return None


@router.get("/", response_model=List[StartupApplicationResponse])
def get_applications(
    skip: int = 0,
    limit: int = 100,
    current_admin: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all received applications with pagination."""
    apps = (
        db.query(StartupApplication)
        .options(noload(StartupApplication.reviewer))
        .order_by(StartupApplication.deal_score.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_app_response(a) for a in apps]


@router.get("/me", response_model=StartupApplicationResponse)
def get_my_application(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    app = (
        db.query(StartupApplication)
        .filter(StartupApplication.contact_email == current_user.email)
        .order_by(StartupApplication.created_at.desc())
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No application found for the current user")
    return _app_response(app)


@router.get("/{app_id}/ai-insights", response_model=ApplicationInsightsResponse)
def get_application_ai_insights(
    app_id: int,
    request: Request,
    current_admin: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin: LLM-generated investment brief (summary, risks, diligence questions)."""
    app = db.query(StartupApplication).filter(StartupApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    insights = generate_application_insights(app)
    log_activity(
        db,
        current_admin.id,
        "ai_insights",
        f"Generated AI insights for {app.startup_name}",
        request,
    )
    return insights


def _resolve_attachment_file(app: StartupApplication, category: str, stored_name: str) -> str:
    parsed = parse_attachments(app.additional_documents_path)
    bucket = parsed.get(category) or []
    for item in bucket:
        if item.get("stored_name") == stored_name and item.get("path") and os.path.isfile(item["path"]):
            return item["path"]
    raise HTTPException(status_code=404, detail="Attachment not found")


@router.get("/{app_id}/pitch-deck")
def download_pitch_deck(
    app_id: int,
    current_admin: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin download of submitted pitch deck PDF."""
    app = db.query(StartupApplication).filter(StartupApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if not app.pitch_deck_path or not os.path.isfile(app.pitch_deck_path):
        raise HTTPException(status_code=404, detail="Pitch deck file not found on server")

    filename = f"{app.startup_name.replace(' ', '_')}_pitch_deck.pdf"
    return FileResponse(
        app.pitch_deck_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/{app_id}/financial-model")
def download_financial_model(
    app_id: int,
    current_admin: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin download of uploaded financial model file."""
    app = db.query(StartupApplication).filter(StartupApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    path = app.financial_model_path
    if not path or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Financial model file not uploaded (URL-only submissions have no file)")

    filename = os.path.basename(path)
    return FileResponse(path, filename=filename)


@router.get("/{app_id}/files/{category}/{stored_name}")
def download_application_file(
    app_id: int,
    category: str,
    stored_name: str,
    current_admin: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Download screenshot or additional document by stored name."""
    if category not in ("screenshots", "additional"):
        raise HTTPException(status_code=400, detail="category must be screenshots or additional")

    app = db.query(StartupApplication).filter(StartupApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    path = _resolve_attachment_file(app, category, stored_name)
    parsed = parse_attachments(app.additional_documents_path)
    meta = next(
        (m for m in parsed[category] if m.get("stored_name") == stored_name),
        {},
    )
    filename = meta.get("original_name") or stored_name
    return FileResponse(path, filename=filename)


@router.post("/{app_id}/review", response_model=StartupApplicationResponse)
def review_application(
    app_id: int,
    review: ApplicationReview,
    request: Request,
    current_admin: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin reviews an application, adds notes, and updates status."""
    app = db.query(StartupApplication).filter(StartupApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = review.status
    app.reviewer_notes = review.reviewer_notes
    app.reviewer_id = current_admin.id

    db.commit()
    db.refresh(app)

    log_activity(
        db,
        current_admin.id,
        "application_review",
        f"Reviewed {app.startup_name} — status: {review.status}",
        request,
    )

    return _app_response(app)
