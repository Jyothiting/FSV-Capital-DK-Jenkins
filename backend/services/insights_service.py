"""
AI-generated investment briefs for submitted startup applications.
"""
from __future__ import annotations

from pydantic import BaseModel, Field

from config import settings
from models import StartupApplication
from schemas.ai import ApplicationInsightsResponse
from services.llm_service import get_llm_provider

INSIGHTS_SYSTEM = """You are a senior VC analyst at FSV Capital (Fintech, AI, Blockchain, DeepTech).
Produce a structured JSON object ONLY — no markdown fences.
Fields: executive_summary (2-3 sentences), strengths (3-5 bullets as strings),
risks (3-5 bullets), diligence_questions (3-5 bullets),
recommendation (exactly one of: Proceed, Hold, Pass).
Be direct and evidence-based from the application data only."""


class _InsightsPayload(BaseModel):
    executive_summary: str
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    diligence_questions: list[str] = Field(default_factory=list)
    recommendation: str


def _application_blob(app: StartupApplication) -> str:
    fields = [
        ("Startup", app.startup_name),
        ("Sector", app.industry_sector),
        ("Stage", app.current_stage),
        ("Business model", app.business_model),
        ("Problem", app.problem_statement),
        ("Solution", app.solution_overview),
        ("TAM/Market", app.target_market),
        ("Competitive advantage", app.competitive_advantage),
        ("Revenue", app.current_revenue),
        ("Growth", app.growth_rate),
        ("Customers", app.number_of_customers),
        ("Funding ask", app.amount_raising),
        ("Funding stage", app.funding_stage),
        ("Use of funds", app.use_of_funds),
        ("Burn", app.burn_rate),
        ("Runway (mo)", app.runway_months),
        ("Prior funding", app.funding_raised_till_date),
        ("Deal score", app.deal_score),
        ("Team", app.founder_background),
    ]
    return "\n".join(f"{label}: {value}" for label, value in fields if value)


def _heuristic_insights(app: StartupApplication) -> ApplicationInsightsResponse:
    rec = "Hold"
    if app.deal_score and app.deal_score >= 75:
        rec = "Proceed"
    elif app.deal_score and app.deal_score < 50:
        rec = "Pass"

    sector = (app.industry_sector or "").lower()
    sector_note = (
        "Core FSV sector alignment."
        if any(k in sector for k in ("fintech", "ai", "blockchain", "deeptech"))
        else "Sector outside core thesis — extra scrutiny required."
    )

    return ApplicationInsightsResponse(
        application_id=app.id,
        startup_name=app.startup_name,
        executive_summary=(
            f"{app.startup_name} is raising {app.amount_raising} at {app.funding_stage} "
            f"with deal score {app.deal_score or 0:.0f}/100. {sector_note}"
        ),
        strengths=[
            sector_note,
            f"Clear ask: {app.amount_raising} for {app.use_of_funds[:80]}..."
            if app.use_of_funds
            else "Funding use described",
            "Team background provided" if app.founder_background else "Team details need follow-up",
        ],
        risks=[
            f"Stage risk: {app.current_stage}",
            "Traction claims require verification" if not app.current_revenue else "Revenue scale TBD",
            "Legal/compliance review pending" if app.legal_issues and "yes" in app.legal_issues.lower() else "",
        ],
        diligence_questions=[
            "Verify revenue and growth metrics with data room exports",
            "Confirm cap table and prior round terms",
            "Map 18-month milestones to this round size",
        ],
        recommendation=rec,  # type: ignore[arg-type]
        mode="heuristic",
        model=None,
    )


def generate_application_insights(app: StartupApplication) -> ApplicationInsightsResponse:
    provider = get_llm_provider()

    if provider.name in ("heuristic", "mock") and not settings.OPENAI_API_KEY:
        return _heuristic_insights(app)

    user = f"Analyze this startup application and return JSON.\n\n{_application_blob(app)}"
    try:
        parsed = provider.invoke_json(INSIGHTS_SYSTEM, user, _InsightsPayload)
    except (ValueError, Exception):
        return _heuristic_insights(app)

    rec = parsed.recommendation.strip()
    if rec not in ("Proceed", "Hold", "Pass"):
        rec = "Hold"

    return ApplicationInsightsResponse(
        application_id=app.id,
        startup_name=app.startup_name,
        executive_summary=parsed.executive_summary,
        strengths=parsed.strengths[:5],
        risks=[r for r in parsed.risks[:5] if r],
        diligence_questions=parsed.diligence_questions[:5],
        recommendation=rec,  # type: ignore[arg-type]
        mode="llm",
        model=settings.LLM_MODEL if provider.name == "openai" else provider.name,
    )
