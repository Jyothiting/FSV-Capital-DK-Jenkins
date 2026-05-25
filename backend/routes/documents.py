import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from database import get_db, SessionLocal
from config import settings
from models import Document, User
from schemas.document import DocumentResponse
from middleware.auth_middleware import get_current_active_user, RequireRole
from middleware.activity_logger import log_activity
from services.search_service import search_service
from services.text_extract import MAX_KB_FILE_BYTES, extract_document_text

router = APIRouter(prefix="/documents", tags=["Documents & AI"])

ALLOWED_EXTENSIONS = (".txt", ".pdf")


def process_embedding_background(doc_id: int, content_text: str):
    """Background task to generate FAISS embeddings without blocking the API."""
    db = SessionLocal()
    db_doc = None
    try:
        db_doc = db.query(Document).filter(Document.id == doc_id).first()
        if not db_doc:
            return

        search_service.add_document(doc_id=db_doc.id, text=content_text)

        db_doc.embedding_status = "completed"
        db.commit()
    except Exception as e:
        print(f"Background embedding failed: {e}")
        if db_doc:
            db_doc.embedding_status = "failed"
            db.commit()
    finally:
        db.close()


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin uploads .txt or .pdf; text is extracted and embedded asynchronously."""
    filename = file.filename or ""
    lower = filename.lower()
    if not any(lower.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail="Only .txt and .pdf files are supported for the knowledge base.",
        )

    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(file_path)
    if file_size > MAX_KB_FILE_BYTES:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {MAX_KB_FILE_BYTES // (1024 * 1024)} MB limit.",
        )

    try:
        content_text = extract_document_text(file_path, filename)
    except ValueError as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    mime = file.content_type or (
        "application/pdf" if lower.endswith(".pdf") else "text/plain"
    )

    db_doc = Document(
        filename=filename,
        original_name=filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime,
        content_text=content_text,
        embedding_status="processing",
        uploaded_by=current_user.id,
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    background_tasks.add_task(process_embedding_background, db_doc.id, content_text)

    log_activity(db, current_user.id, "document_upload", f"Uploaded document: {filename}", request)

    return db_doc


@router.get("/", response_model=List[DocumentResponse])
def get_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List all knowledge-base documents. Upload remains admin-only."""
    return (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
