import { describe, expect, it } from 'vitest';
import { calcDealScore, scoreBreakdown } from './dealScore.js';

const strongStartup = {
  current_stage: 'Growth Stage',
  target_market: 'TAM $5B, SAM $500M, SOM $50M addressable in India',
  customer_segment: 'SMB lenders',
  competitive_advantage: 'Proprietary risk engine',
  founder_background: 'Ex-Goldman engineer, 10 years in credit risk and ML deployments.',
  core_team_members: 'CTO, VP Sales',
  advisors_mentors: 'Former RBI advisor',
  technology_stack: 'Python, PyTorch, AWS',
  unique_value_proposition: 'Real-time underwriting API',
  ip_patents: 'Provisional patent filed',
  current_revenue: '$2M ARR',
  growth_rate: '120% YoY',
  number_of_customers: '40 enterprise clients',
  industry_sector: 'Fintech',
};

describe('scoreBreakdown', () => {
  it('returns axis scores that sum to total (capped at 100)', () => {
    const b = scoreBreakdown(strongStartup);
    const sum =
      b.revenue_stage
      + b.market_size
      + b.team_strength
      + b.innovation
      + b.traction
      + b.sector_fit;
    expect(b.total).toBeLessThanOrEqual(100);
    expect(b.total).toBe(sum);
  });

  it('scores priority sector higher than non-priority', () => {
    const fintech = scoreBreakdown({ ...strongStartup, industry_sector: 'Fintech' });
    const other = scoreBreakdown({ ...strongStartup, industry_sector: 'Healthcare Logistics' });
    expect(fintech.sector_fit).toBe(5);
    expect(other.sector_fit).toBe(2);
  });
});

describe('calcDealScore', () => {
  it('returns a number between 0 and 100', () => {
    const score = calcDealScore({});
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores a strong profile higher than an empty one', () => {
    expect(calcDealScore(strongStartup)).toBeGreaterThan(calcDealScore({}));
  });
});
