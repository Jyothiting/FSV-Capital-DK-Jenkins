"""
Capture a live RAG response for README / docs (requires OPENAI_API_KEY).

Usage (from backend/):
  ..\\.venv\\Scripts\\python scripts\\capture_rag_demo.py
  ..\\.venv\\Scripts\\python scripts\\capture_rag_demo.py --query "What sectors does FSV invest in?"

Writes:
  ../docs/rag-demo/response.json
  ../docs/rag-demo/response.md
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
DOCS = ROOT / "docs" / "rag-demo"
sys.path.insert(0, str(BACKEND))

DEFAULT_QUERY = (
    "What sectors does FSV Capital invest in, and what are typical seed check sizes?"
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Capture RAG demo for README")
    parser.add_argument("--query", default=DEFAULT_QUERY, help="RAG question")
    args = parser.parse_args()

    from config import settings
    from database import SessionLocal
    from services.rag_service import answer_question

    if not settings.OPENAI_API_KEY or not str(settings.OPENAI_API_KEY).strip():
        print(
            "ERROR: OPENAI_API_KEY is not set.\n"
            "  1. Copy backend/.env.local.example to backend/.env.local\n"
            "  2. Add: OPENAI_API_KEY=sk-your-key-here\n"
            "  3. Re-run this script (API server not required).\n",
            file=sys.stderr,
        )
        return 1

    print(f"Model: {settings.LLM_MODEL} | Provider: {settings.LLM_PROVIDER}")
    print(f"Query: {args.query}\n")

    db = SessionLocal()
    try:
        result = answer_question(db, args.query, top_k=5)
    finally:
        db.close()

    if result.mode != "llm":
        print(
            f"ERROR: Expected mode=llm but got mode={result.mode!r}. "
            "Check LLM_PROVIDER=auto or openai and a valid API key.",
            file=sys.stderr,
        )
        return 1

    payload = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "query": result.query,
        "answer": result.answer,
        "mode": result.mode,
        "model": result.model,
        "sources": [s.model_dump() for s in result.sources],
    }

    DOCS.mkdir(parents=True, exist_ok=True)
    json_path = DOCS / "response.json"
    md_path = DOCS / "response.md"

    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    source_lines = "\n".join(
        f"- **{s['original_name']}** ({s['similarity_score']:.0%} match)"
        for s in payload["sources"][:5]
    )
    md_path.write_text(
        f"# RAG demo capture\n\n"
        f"**Captured:** {payload['captured_at']}  \n"
        f"**Model:** `{payload['model']}`  \n"
        f"**Mode:** `{payload['mode']}`\n\n"
        f"## Question\n\n{payload['query']}\n\n"
        f"## Answer\n\n{payload['answer']}\n\n"
        f"## Sources (FAISS retrieval)\n\n{source_lines}\n",
        encoding="utf-8",
    )

    print(f"OK: mode={result.mode} model={result.model}")
    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print("\n--- Answer preview ---\n")
    print(result.answer[:1200] + ("..." if len(result.answer) > 1200 else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
