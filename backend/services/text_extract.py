"""Lightweight text extraction for knowledge-base uploads (no ML)."""

import os
from typing import Optional

# Keep PDF ingestion bounded to avoid memory spikes during upload/indexing
MAX_KB_FILE_BYTES = 5 * 1024 * 1024
MAX_KB_PDF_PAGES = 40
MAX_EXTRACTED_CHARS = 120_000


def extract_txt_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return _cap(f.read())


def extract_pdf_file(path: str) -> str:
    """Extract text page-by-page; caps pages and output length."""
    if os.path.getsize(path) > MAX_KB_FILE_BYTES:
        raise ValueError(f"PDF exceeds {MAX_KB_FILE_BYTES // (1024 * 1024)} MB limit for knowledge base.")

    from pypdf import PdfReader

    reader = PdfReader(path)
    page_count = min(len(reader.pages), MAX_KB_PDF_PAGES)
    parts = []
    for i in range(page_count):
        page = reader.pages[i]
        parts.append(page.extract_text() or "")

    text = "\n".join(parts).strip()
    if not text:
        raise ValueError("No extractable text in PDF (scanned/image PDFs are not supported).")
    return _cap(text)


def extract_document_text(path: str, filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".txt"):
        return extract_txt_file(path)
    if lower.endswith(".pdf"):
        return extract_pdf_file(path)
    raise ValueError("Unsupported file type. Use .txt or .pdf")


def _cap(text: str) -> str:
    if len(text) <= MAX_EXTRACTED_CHARS:
        return text
    return text[:MAX_EXTRACTED_CHARS]
