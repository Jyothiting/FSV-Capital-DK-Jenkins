import { describe, expect, it } from 'vitest';
import {
  hasTraction,
  parseFundingAmount,
  getTractionError,
  validateStep,
  runSubmitScreening,
  isPrioritySector,
} from './fundingValidation.js';

const minimalValid = {
  startup_name: 'Test Co',
  founder_names: 'Jane Doe',
  contact_email: 'jane@test.co',
  contact_number: '+91 9000000000',
  problem_statement: 'A real problem in fintech.',
  solution_overview: 'Our product solves it.',
  industry_sector: 'Fintech',
  business_model: 'B2B',
  current_stage: 'MVP',
  current_revenue: '$10k MRR',
  growth_rate: '20%',
  number_of_customers: '50',
  amount_raising: '$500,000 USD',
  funding_stage: 'Seed',
  use_of_funds: 'Product development',
  company_registered: 'Yes',
  legal_issues: 'No',
  consent_given: 'Yes',
};

describe('validateStep', () => {
  it('requires step 1 fields', () => {
    const { errors } = validateStep(1, {});
    expect(errors.some((e) => e.includes('Startup Name'))).toBe(true);
    expect(errors.some((e) => e.includes('Contact Email'))).toBe(true);
  });

  it('passes step 1 with valid email', () => {
    const { errors } = validateStep(1, {
      startup_name: 'Co',
      founder_names: 'A',
      contact_email: 'a@b.co',
      contact_number: '123',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid email on step 1', () => {
    const { errors } = validateStep(1, {
      ...minimalValid,
      contact_email: 'not-an-email',
    });
    expect(errors.some((e) => e.includes('valid contact email'))).toBe(true);
  });

  it('blocks step 5 when MVP has no traction metrics', () => {
    const { errors } = validateStep(5, {
      current_stage: 'MVP',
      current_revenue: '',
      growth_rate: '',
      number_of_customers: '',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/traction/i);
  });

  it('passes step 5 when at least one traction metric is set', () => {
    const { errors } = validateStep(5, {
      current_stage: 'MVP',
      number_of_customers: '100',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('hasTraction / getTractionError', () => {
  it('detects any traction field', () => {
    expect(hasTraction({ current_revenue: ' $1 ' })).toBe(true);
    expect(hasTraction({})).toBe(false);
  });

  it('requires traction for Idea stage', () => {
    expect(
      getTractionError({
        current_stage: 'Idea',
        current_revenue: '',
        growth_rate: '',
        number_of_customers: '',
      }),
    ).toMatch(/Idea-stage/);
  });
});

describe('parseFundingAmount', () => {
  it('parses USD amounts', () => {
    expect(parseFundingAmount('$500,000 USD')).toBe(500_000);
  });

  it('returns null for empty input', () => {
    expect(parseFundingAmount('')).toBeNull();
  });
});

describe('isPrioritySector', () => {
  it('recognizes core sectors', () => {
    expect(isPrioritySector('AI / ML')).toBe(true);
    expect(isPrioritySector('Consumer SaaS')).toBe(false);
  });
});

describe('runSubmitScreening', () => {
  it('passes a complete valid payload', () => {
    const { errors } = runSubmitScreening(minimalValid);
    expect(errors).toHaveLength(0);
  });

  it('fails when Idea stage lacks traction', () => {
    const { errors } = runSubmitScreening({
      ...minimalValid,
      current_stage: 'Idea',
      current_revenue: '',
      growth_rate: '',
      number_of_customers: '',
    });
    expect(errors.some((e) => e.match(/traction/i))).toBe(true);
  });
});
