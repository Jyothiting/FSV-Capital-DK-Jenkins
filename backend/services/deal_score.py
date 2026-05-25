"""Investor deal score (0–100) — multi-axis rubric aligned with assignment spec."""

from typing import Any, Dict, Union

from schemas.application import StartupApplicationCreate

PRIORITY_SECTORS = ("fintech", "ai", "blockchain", "deeptech")

STAGE_SCORES = {
    "Idea": 5,
    "MVP": 10,
    "Early Revenue": 15,
    "Growth Stage": 20,
    "Scaling": 25,
}


def _text(val: Any) -> str:
    return (val or "").strip() if val is not None else ""


def _has_traction(app: Union[StartupApplicationCreate, Dict]) -> bool:
    if isinstance(app, dict):
        rev, gr, cust = app.get("current_revenue"), app.get("growth_rate"), app.get("number_of_customers")
    else:
        rev, gr, cust = app.current_revenue, app.growth_rate, app.number_of_customers
    return bool(_text(rev) or _text(gr) or _text(cust))


def score_breakdown(app: Union[StartupApplicationCreate, Dict]) -> Dict[str, float]:
    """Return axis scores and total (capped at 100)."""

    def g(key: str) -> Any:
        return app.get(key) if isinstance(app, dict) else getattr(app, key, None)

    stage = STAGE_SCORES.get(g("current_stage"), 5)

    market = 0.0
    tam = _text(g("target_market"))
    if len(tam) >= 20:
        market += 8
    if any(k in tam.lower() for k in ("tam", "sam", "som", "$", "billion", "million", "bn", "mn")):
        market += 6
    if _text(g("customer_segment")):
        market += 4
    if _text(g("competitive_advantage")):
        market += 2
    market = min(20.0, market)

    team = 0.0
    fb = _text(g("founder_background"))
    if len(fb) >= 50:
        team += 10
    elif len(fb) >= 20:
        team += 6
    if _text(g("core_team_members")):
        team += 5
    if _text(g("advisors_mentors")):
        team += 5
    team = min(20.0, team)

    innovation = 0.0
    if _text(g("technology_stack")):
        innovation += 5
    if _text(g("unique_value_proposition")):
        innovation += 5
    ip = _text(g("ip_patents")).lower()
    if ip and ip not in ("none", "n/a", "no", "nil", "-"):
        innovation += 5
    innovation = min(15.0, innovation)

    traction = 0.0
    if _text(g("current_revenue")):
        traction += 5
    if _text(g("growth_rate")):
        traction += 5
    if _text(g("number_of_customers")):
        traction += 5
    traction = min(15.0, traction)

    sector_raw = _text(g("industry_sector")).lower()
    sector = 5.0 if any(s in sector_raw for s in PRIORITY_SECTORS) else 2.0

    total = min(100.0, stage + market + team + innovation + traction + sector)

    return {
        "revenue_stage": stage,
        "market_size": market,
        "team_strength": team,
        "innovation": innovation,
        "traction": traction,
        "sector_fit": sector,
        "total": round(total, 1),
    }


def calculate_deal_score(app: Union[StartupApplicationCreate, Dict]) -> float:
    return score_breakdown(app)["total"]
