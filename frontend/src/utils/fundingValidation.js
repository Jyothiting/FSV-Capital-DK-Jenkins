const PRIORITY_SECTOR_KEYWORDS = ['fintech', 'ai', 'blockchain', 'deeptech'];

export const STAGE_FUNDING_RANGES = {
  'Pre-seed': [25_000, 2_000_000],
  Seed: [100_000, 8_000_000],
  'Series A': [500_000, 25_000_000],
  'Series B': [2_000_000, 50_000_000],
  Bridge: [250_000, 15_000_000],
  Growth: [1_000_000, 100_000_000],
};

const ABSOLUTE_MIN = 25_000;
const ABSOLUTE_MAX = 100_000_000;

export const STEP_REQUIRED = {
  1: ['startup_name', 'founder_names', 'contact_email', 'contact_number'],
  2: ['problem_statement', 'solution_overview', 'industry_sector', 'business_model', 'current_stage'],
  7: ['amount_raising', 'funding_stage', 'use_of_funds'],
  11: ['company_registered', 'legal_issues'],
};

const FIELD_LABELS = {
  startup_name: 'Startup Name',
  founder_names: 'Founder Name(s)',
  contact_email: 'Contact Email',
  contact_number: 'Contact Number',
  problem_statement: 'Problem Statement',
  solution_overview: 'Solution Overview',
  industry_sector: 'Industry / Sector',
  business_model: 'Business Model',
  current_stage: 'Current Stage',
  amount_raising: 'Amount Raising',
  funding_stage: 'Funding Stage',
  use_of_funds: 'Use of Funds',
  company_registered: 'Company registration status',
  legal_issues: 'Legal issues declaration',
};

export function hasTraction(data) {
  return !!(
    data.current_revenue?.trim()
    || data.growth_rate?.trim()
    || data.number_of_customers?.trim()
  );
}

export function isPrioritySector(sector) {
  const s = (sector || '').toLowerCase();
  return PRIORITY_SECTOR_KEYWORDS.some((k) => s.includes(k));
}

export function parseFundingAmount(amountRaising) {
  if (!amountRaising?.trim()) return null;

  const text = amountRaising.trim().toLowerCase();
  const isInr = text.includes('inr') || amountRaising.includes('₹') || text.includes('rupee');

  const numbers = text.match(/[\d,]+\.?\d*/g);
  if (!numbers?.length) return null;

  let amount = Math.max(...numbers.map((n) => parseFloat(n.replace(/,/g, ''))));

  if (text.includes('billion')) amount *= 1_000_000_000;
  else if (text.includes('million')) amount *= 1_000_000;
  else if (text.includes('crore')) amount *= 10_000_000;
  else if (text.includes('lakh')) amount *= 100_000;
  else if (/\d\s*k\b|\d+k/.test(text)) amount *= 1_000;

  if (isInr) amount /= 83;

  return amount;
}

export function getSectorWarning(data) {
  if (!data.industry_sector || isPrioritySector(data.industry_sector)) return null;
  return (
    'Your sector is outside FSV Capital\'s core focus (Fintech, AI, Blockchain, DeepTech). '
    + 'You may still apply; aligned startups receive priority review.'
  );
}

export function getFundingValidation(data) {
  const errors = [];
  const warnings = [];

  const amount = parseFundingAmount(data.amount_raising);
  if (amount == null) {
    errors.push('Enter a clear funding amount (e.g. "$500,000 USD" or "INR 2 crore").');
    return { errors, warnings };
  }

  if (amount < ABSOLUTE_MIN) {
    errors.push(`Minimum funding ask is USD ${ABSOLUTE_MIN.toLocaleString()} (or equivalent).`);
  } else if (amount > ABSOLUTE_MAX) {
    errors.push(`Funding amount cannot exceed USD ${ABSOLUTE_MAX.toLocaleString()}.`);
  }

  const range = STAGE_FUNDING_RANGES[data.funding_stage];
  if (range) {
    const [low, high] = range;
    if (amount < low) {
      warnings.push(
        `For ${data.funding_stage}, typical raises start around USD ${low.toLocaleString()}. `
        + 'Your ask may be below investor expectations for this stage.',
      );
    } else if (amount > high) {
      warnings.push(
        `For ${data.funding_stage}, typical raises are up to about USD ${high.toLocaleString()}. `
        + 'Confirm your amount is intentional.',
      );
    }
  }

  return { errors, warnings };
}

const TRACTION_REQUIRED_STAGES = new Set([
  'Idea', 'MVP', 'Early Revenue', 'Growth Stage', 'Scaling',
]);

export function getTractionError(data) {
  if (!data.current_stage || !TRACTION_REQUIRED_STAGES.has(data.current_stage)) {
    return null;
  }
  if (hasTraction(data)) return null;
  if (data.current_stage === 'Idea') {
    return (
      'Idea-stage startups must provide at least one traction metric '
      + '(revenue, growth rate, or customers/users) in the Traction step.'
    );
  }
  return (
    `${data.current_stage} startups must complete the Traction step with at least one of: `
    + 'current revenue, growth rate (%), or number of customers/users.'
  );
}

/** @deprecated use getTractionError */
export function getIdeaTractionError(data) {
  return getTractionError(data);
}

/** Validate fields required to leave the current step. Returns { errors, warnings }. */
export function validateStep(step, data) {
  const errors = [];
  const warnings = [];

  const required = STEP_REQUIRED[step] || [];
  for (const field of required) {
    const value = data[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(`${FIELD_LABELS[field] || field} is required.`);
    }
  }

  if (step === 1) {
    const email = data.contact_email?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Enter a valid contact email address.');
    }
    const url = data.website_url?.trim();
    if (url && !/^https?:\/\/.+/i.test(url)) {
      errors.push('Website URL must start with http:// or https://');
    }
  }

  if (step === 2) {
    const sw = getSectorWarning(data);
    if (sw) warnings.push(sw);
  }

  if (step === 5) {
    const tractionErr = getTractionError(data);
    if (tractionErr) errors.push(tractionErr);
  }

  if (step === 7) {
    const funding = getFundingValidation(data);
    errors.push(...funding.errors);
    warnings.push(...funding.warnings);
  }

  return { errors, warnings };
}

/** Full screening before submit. Returns { errors, warnings } — errors block submit. */
export function runSubmitScreening(data) {
  const errors = [];
  const warnings = [];

  for (let s = 1; s <= 11; s += 1) {
    const { errors: stepErrors, warnings: stepWarnings } = validateStep(s, data);
    errors.push(...stepErrors);
    warnings.push(...stepWarnings);
  }

  const tractionErr = getTractionError(data);
  if (tractionErr && !errors.includes(tractionErr)) errors.push(tractionErr);

  const uniqueErrors = [...new Set(errors)];
  const uniqueWarnings = [...new Set(warnings)];

  return { errors: uniqueErrors, warnings: uniqueWarnings };
}
