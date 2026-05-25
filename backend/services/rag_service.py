"""
RAG: FAISS semantic retrieval + LangChain/OpenAI answer synthesis with citations.
"""
from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from config import settings
from models import Document
from schemas.ai import RAGAnswerResponse, RAGSource
from services.llm_service import get_llm_provider
from services.index_sync import sync_search_index
from services.search_service import search_service

RAG_SYSTEM_PROMPT = """You are FSV Capital's internal research assistant.
Answer ONLY using the provided knowledge-base excerpts.
If the context is insufficient, say what is missing and suggest which document to upload.
Be concise, factual, and cite document names in parentheses like (policy.txt).
Do not invent policies or dollar amounts not present in the context."""


def _extract_context(text: str, query: str, max_chars: int) -> str:
    if not text:
        return ""
    normalized = " ".join(text.split())
    if len(normalized) <= max_chars:
        return normalized

    query_words = [w.lower() for w in query.split() if len(w) > 3]
    lower = normalized.lower()
    best_pos = 0
    best_score = 0
    window = max_chars
    for i in range(0, max(len(normalized) - window, 1), 200):
        chunk = lower[i : i + window]
        score = sum(1 for w in query_words if w in chunk)
        if score > best_score:
            best_score = score
            best_pos = i
    return normalized[best_pos : best_pos + window]


def _keyword_fallback(db: Session, query: str, top_k: int = 5) -> List[RAGSource]:
    """Simple overlap search when the vector index is unavailable."""
    words = [w.lower() for w in query.split() if len(w) > 2]
    if not words:
        return []

    docs = db.query(Document).filter(Document.content_text.isnot(None)).all()
    scored = []
    for doc in docs:
        text = (doc.content_text or "").lower()
        score = sum(1 for w in words if w in text) / len(words)
        if score > 0:
            excerpt = doc.content_text[:400] + ("..." if len(doc.content_text) > 400 else "")
            scored.append((score, doc, excerpt))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        RAGSource(
            document_id=doc.id,
            original_name=doc.original_name,
            content_snippet=excerpt,
            similarity_score=min(0.99, s),
        )
        for s, doc, excerpt in scored[:top_k]
    ]


def build_context(db: Session, query: str, top_k: int = 5) -> tuple[List[RAGSource], str]:
    sync_search_index(db)
    hits = search_service.search(query, top_k=top_k)
    if not hits:
        fallback = _keyword_fallback(db, query, top_k=top_k)
        if fallback:
            blocks = [f"### {s.original_name}\n{s.content_snippet}" for s in fallback]
            return fallback, "\n\n".join(blocks)
    sources: List[RAGSource] = []
    blocks: List[str] = []
    budget = settings.RAG_MAX_CONTEXT_CHARS

    for hit in hits:
        doc = db.query(Document).filter(Document.id == hit["document_id"]).first()
        if not doc:
            continue
        snippet = hit.get("content_snippet") or ""
        excerpt = _extract_context(doc.content_text or snippet, query, max_chars=min(1200, budget))
        if not excerpt:
            continue
        sources.append(
            RAGSource(
                document_id=doc.id,
                original_name=doc.original_name,
                content_snippet=excerpt[:400] + ("..." if len(excerpt) > 400 else ""),
                similarity_score=hit["similarity_score"],
            )
        )
        blocks.append(f"### {doc.original_name}\n{excerpt}")
        budget -= len(excerpt)
        if budget <= 0:
            break

    return sources, "\n\n".join(blocks)


def _retrieval_only_answer(query: str, sources: List[RAGSource]) -> str:
    if not sources:
        return (
            "No relevant documents were found in the knowledge base. "
            "Ask an admin to upload .txt policy or research files, then try again."
        )
    lines = [f"Top matches for “{query}”:"]
    for s in sources:
        lines.append(f"- **{s.original_name}** ({s.similarity_score:.0%} match): {s.content_snippet}")
    return "\n".join(lines)


def answer_question(db: Session, query: str, top_k: int = 5) -> RAGAnswerResponse:
    sources, context = build_context(db, query, top_k=top_k)
    provider = get_llm_provider()

    if not context:
        return RAGAnswerResponse(
            query=query,
            answer=_retrieval_only_answer(query, sources),
            sources=sources,
            mode="retrieval_only",
            model=None,
        )

    if provider.name in ("heuristic", "mock") and not settings.OPENAI_API_KEY:
        return RAGAnswerResponse(
            query=query,
            answer=_retrieval_only_answer(query, sources),
            sources=sources,
            mode="retrieval_only",
            model=None,
        )

    user_prompt = f"""User question: {query}

Knowledge-base excerpts:
{context}

Write a clear answer for an FSV Capital analyst."""

    answer = provider.invoke(RAG_SYSTEM_PROMPT, user_prompt)
    return RAGAnswerResponse(
        query=query,
        answer=answer,
        sources=sources,
        mode="llm",
        model=settings.LLM_MODEL if provider.name == "openai" else provider.name,
    )
