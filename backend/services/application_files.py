"""
Save and validate startup application document uploads (pitch deck + optional files).
"""
from __future__ import annotations

import json
import os
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, UploadFile

from config import settings

FINANCIAL_MODEL_EXT = {".xlsx", ".xls", ".csv", ".pdf"}
SCREENSHOT_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ADDITIONAL_EXT = {".pdf", ".txt", ".docx", ".xlsx", ".xls", ".png", ".jpg", ".jpeg"}
MAX_OPTIONAL_FILE_BYTES = settings.MAX_OPTIONAL_FILE_BYTES
MAX_SCREENSHOTS = 5
MAX_ADDITIONAL = 5


def _safe_filename(name: str) -> str:
    base = os.path.basename(name or "file")
    base = re.sub(r"[^\w.\-]", "_", base)
    return base[:120] or "file"


def create_application_folder() -> str:
    app_dir = os.path.join(settings.APPLICATION_UPLOAD_DIR, str(uuid.uuid4()))
    os.makedirs(app_dir, exist_ok=True)
    os.makedirs(os.path.join(app_dir, "screenshots"), exist_ok=True)
    os.makedirs(os.path.join(app_dir, "additional"), exist_ok=True)
    return app_dir


async def save_pitch_deck(file: UploadFile, app_dir: str) -> str:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Pitch deck must be a PDF file")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Pitch deck file is empty")
    if len(contents) > settings.MAX_PITCH_DECK_BYTES:
        raise HTTPException(status_code=400, detail="Pitch deck exceeds the 20 MB size limit")

    path = os.path.join(app_dir, "pitch_deck.pdf")
    with open(path, "wb") as out:
        out.write(contents)
    return path


async def _save_optional_file(
    file: UploadFile,
    dest_dir: str,
    allowed_ext: set,
    prefix: str,
    index: int,
) -> Dict[str, str]:
    if not file.filename:
        raise HTTPException(status_code=400, detail=f"Invalid file name for {prefix}")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"File type {ext} not allowed. Allowed: {', '.join(sorted(allowed_ext))}",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail=f"Uploaded file {file.filename} is empty")
    if len(contents) > MAX_OPTIONAL_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"{file.filename} exceeds the 10 MB size limit",
        )

    stored = f"{prefix}_{index}{ext}"
    path = os.path.join(dest_dir, stored)
    with open(path, "wb") as out:
        out.write(contents)

    return {
        "original_name": file.filename,
        "stored_name": stored,
        "path": path,
        "size_bytes": len(contents),
    }


async def save_optional_documents(
    app_dir: str,
    financial_model: Optional[UploadFile] = None,
    product_screenshots: Optional[List[UploadFile]] = None,
    additional_documents: Optional[List[UploadFile]] = None,
    financial_model_url: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Returns (financial_model_path, additional_documents_json).
    financial_model_path is file path or external URL string.
    additional_documents_json encodes screenshots + extra files metadata.
    """
    screenshots_meta: List[Dict[str, Any]] = []
    additional_meta: List[Dict[str, Any]] = []

    if financial_model and financial_model.filename:
        meta = await _save_optional_file(
            financial_model,
            app_dir,
            FINANCIAL_MODEL_EXT,
            "financial_model",
            0,
        )
        financial_path: Optional[str] = meta["path"]
    elif financial_model_url and str(financial_model_url).strip():
        financial_path = str(financial_model_url).strip()
    else:
        financial_path = None

    shots = [f for f in (product_screenshots or []) if f.filename]
    if len(shots) > MAX_SCREENSHOTS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_SCREENSHOTS} screenshots allowed")

    shot_dir = os.path.join(app_dir, "screenshots")
    for i, f in enumerate(shots):
        meta = await _save_optional_file(f, shot_dir, SCREENSHOT_EXT, "screenshot", i)
        screenshots_meta.append(meta)

    extras = [f for f in (additional_documents or []) if f.filename]
    if len(extras) > MAX_ADDITIONAL:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_ADDITIONAL} additional documents allowed")

    add_dir = os.path.join(app_dir, "additional")
    for i, f in enumerate(extras):
        meta = await _save_optional_file(f, add_dir, ADDITIONAL_EXT, "document", i)
        additional_meta.append(meta)

    attachments_json = None
    if screenshots_meta or additional_meta:
        attachments_json = json.dumps(
            {"screenshots": screenshots_meta, "additional": additional_meta},
            ensure_ascii=False,
        )

    return financial_path, attachments_json


def parse_attachments(raw: Optional[str]) -> Dict[str, List[Dict[str, Any]]]:
    if not raw:
        return {"screenshots": [], "additional": []}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return {
                "screenshots": data.get("screenshots") or [],
                "additional": data.get("additional") or [],
            }
    except json.JSONDecodeError:
        pass
    return {"screenshots": [], "additional": []}
