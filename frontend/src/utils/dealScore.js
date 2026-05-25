/** Deal score (0–100) — mirrors backend/services/deal_score.py */

const PRIORITY_SECTORS = ['fintech', 'ai', 'blockchain', 'deeptech'];

const STAGE_SCORES = {
  Idea: 5,
  MVP: 10,
  'Early Revenue': 15,
  'Growth Stage': 20,
  Scaling: 25,
};

function text(val) {
  return (val || '').trim();
}

export function scoreBreakdown(data) {
  const stage = STAGE_SCORES[data.current_stage] || 5;

  let market = 0;
  const tam = text(data.target_market);
  if (tam.length >= 20) market += 8;
  if (['tam', 'sam', 'som', '$', 'billion', 'million', 'bn', 'mn'].some((k) => tam.toLowerCase().includes(k))) {
    market += 6;
  }
  if (text(data.customer_segment)) market += 4;
  if (text(data.competitive_advantage)) market += 2;
  market = Math.min(20, market);

  let team = 0;
  const fb = text(data.founder_background);
  if (fb.length >= 50) team += 10;
  else if (fb.length >= 20) team += 6;
  if (text(data.core_team_members)) team += 5;
  if (text(data.advisors_mentors)) team += 5;
  team = Math.min(20, team);

  let innovation = 0;
  if (text(data.technology_stack)) innovation += 5;
  if (text(data.unique_value_proposition)) innovation += 5;
  const ip = text(data.ip_patents).toLowerCase();
  if (ip && !['none', 'n/a', 'no', 'nil', '-'].includes(ip)) innovation += 5;
  innovation = Math.min(15, innovation);

  let traction = 0;
  if (text(data.current_revenue)) traction += 5;
  if (text(data.growth_rate)) traction += 5;
  if (text(data.number_of_customers)) traction += 5;
  traction = Math.min(15, traction);

  const sectorRaw = text(data.industry_sector).toLowerCase();
  const sector = PRIORITY_SECTORS.some((s) => sectorRaw.includes(s)) ? 5 : 2;

  const total = Math.min(
    100,
    stage + market + team + innovation + traction + sector,
  );

  return {
    revenue_stage: stage,
    market_size: market,
    team_strength: team,
    innovation,
    traction,
    sector_fit: sector,
    total: Math.round(total * 10) / 10,
  };
}

export function calcDealScore(data) {
  return scoreBreakdown(data).total;
}
