"""AI writing coach for funding form fields."""
from __future__ import annotations

from pydantic import BaseModel, Field

from config import settings
from schemas.ai import CoachRequest, CoachResponse
from services.llm_service import get_llm_provider

COACH_SYSTEM = """You are an investor-grade writing coach for FSV Capital startup applications.
Return JSON only with: suggestions (3 short bullet strings), improved_draft (one polished paragraph).
Keep the founder's facts; improve clarity, specificity, and investor readability."""


class _CoachPayload(BaseModel):
    suggestions: list[str] = Field(default_factory=list)
    improved_draft: str = ""


FIELD_HINTS = {
    "problem_statement": "Quantify the pain, name the customer, and why now.",
    "solution_overview": "Explain the product mechanism and 10x advantage.",
    "use_of_funds": "Allocate percentages to hiring, product, GTM, and runway months.",
    "competitive_advantage": "Moat, data, network effects, or technical differentiation.",
}


def _heuristic_coach(req: CoachRequest) -> CoachResponse:
    hint = FIELD_HINTS.get(req.field, "Be specific and investor-friendly.")
    draft = req.text.strip()
    if len(draft) < 200:
        draft = f"{draft} {hint}"
    return CoachResponse(
        field=req.field,
        original_text=req.text,
        suggestions=[
            hint,
            "Add one measurable metric (users, revenue, or growth).",
            "Remove jargon; use active voice.",
        ],
        improved_draft=draft,
        mode="heuristic",
        model=None,
    )


def coach_field(req: CoachRequest) -> CoachResponse:
    provider = get_llm_provider()

    if provider.name in ("heuristic", "mock") and not settings.OPENAI_API_KEY:
        return _heuristic_coach(req)

    user = (
        f"Field: {req.field}\n"
        f"Sector: {req.industry_sector or 'unknown'}\n"
        f"Stage: {req.current_stage or 'unknown'}\n"
        f"Draft:\n{req.text}"
    )
    try:
        parsed = provider.invoke_json(COACH_SYSTEM, user, _CoachPayload)
    except (ValueError, Exception):
        return _heuristic_coach(req)

    return CoachResponse(
        field=req.field,
        original_text=req.text,
        suggestions=parsed.suggestions[:5] or ["Add metrics and customer specificity."],
        improved_draft=parsed.improved_draft or req.text,
        mode="llm",
        model=settings.LLM_MODEL if provider.name == "openai" else provider.name,
    )
