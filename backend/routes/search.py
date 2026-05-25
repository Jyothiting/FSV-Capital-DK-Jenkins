from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Document, User
from schemas.document import SearchResult
from schemas.ai import RAGAnswerResponse
from middleware.auth_middleware import get_current_active_user
from middleware.activity_logger import log_activity
from services.index_sync import sync_search_index
from services.search_service import search_service
from services.rag_service import answer_question, _keyword_fallback

router = APIRouter(prefix="/search", tags=["Documents & AI"])

@router.get("/", response_model=List[SearchResult])
def semantic_search(
    request: Request,
    q: str = Query(..., description="The query to search for"),
    top_k: int = Query(5, description="Number of results to return"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Core AI feature: Perform semantic search over documents using FAISS index.
    Does not rely on simple keyword matching.
    """
    # Log the search activity
    log_activity(db, current_user.id, "search", f"Query: {q}", request)

    sync_search_index(db)
    raw_results = search_service.search(q, top_k)
    if not raw_results:
        for src in _keyword_fallback(db, q, top_k=top_k):
            raw_results.append(
                {
                    "document_id": src.document_id,
                    "similarity_score": src.similarity_score,
                    "content_snippet": src.content_snippet,
                }
            )

    enriched_results = []
    for item in raw_results:
        doc = db.query(Document).filter(Document.id == item["document_id"]).first()
        if not doc:
            continue

        enriched_results.append({
            "document_id": doc.id,
            "original_name": doc.original_name,
            "content_snippet": item.get("content_snippet") or (doc.content_text[:200] + "..." if doc.content_text and len(doc.content_text) > 200 else doc.content_text or ""),
            "similarity_score": item["similarity_score"],
        })

    return enriched_results


@router.get("/ask", response_model=RAGAnswerResponse)
def rag_ask(
    request: Request,
    q: str = Query(..., description="Natural-language question over the knowledge base"),
    top_k: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    RAG Q&A: FAISS retrieval + LLM synthesis (LangChain + OpenAI when configured).
    Falls back to ranked excerpts when no API key is set.
    """
    log_activity(db, current_user.id, "rag_ask", f"RAG query: {q}", request)
    return answer_question(db, q, top_k=top_k)
