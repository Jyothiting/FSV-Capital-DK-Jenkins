from services.deal_score import calculate_deal_score, score_breakdown


def _rich_app():
    return {
        "current_stage": "Growth Stage",
        "target_market": "TAM USD 10B; SAM USD 1B; SOM USD 50M",
        "customer_segment": "SMB fintech",
        "competitive_advantage": "Lower CAC",
        "founder_background": "Ex-Stripe PM, 10 years payments " * 3,
        "core_team_members": "2 engineers",
        "advisors_mentors": "Former VC partner",
        "technology_stack": "Python, AWS",
        "unique_value_proposition": "Real-time settlement",
        "ip_patents": "US provisional 2024",
        "current_revenue": "$50k MRR",
        "growth_rate": "8% MoM",
        "number_of_customers": "120",
        "industry_sector": "Fintech",
    }


def test_deal_score_breakdown_sums_to_total():
    b = score_breakdown(_rich_app())
    assert b["total"] <= 100
    assert b["revenue_stage"] == 20
    assert b["market_size"] >= 10
    assert b["team_strength"] >= 10
    assert b["innovation"] >= 10
    assert b["traction"] == 15


def test_calculate_deal_score_matches_breakdown():
    app = _rich_app()
    assert calculate_deal_score(app) == score_breakdown(app)["total"]
