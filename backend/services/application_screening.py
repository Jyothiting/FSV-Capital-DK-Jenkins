import re
from typing import List, Optional, Tuple

from fastapi import HTTPException

from schemas.application import StartupApplicationCreate

PRIORITY_SECTOR_KEYWORDS = ("fintech", "ai", "blockchain", "deeptech")

# Stages that must include at least one traction metric (mandatory traction section)
TRACTION_REQUIRED_STAGES = frozenset({"Idea", "MVP", "Early Revenue", "Growth Stage", "Scaling"})

# Typical USD ranges by funding stage (min, max)
STAGE_FUNDING_RANGES: dict[str, Tuple[int, int]] = {
    "Pre-seed": (25_000, 2_000_000),
    "Seed": (100_000, 8_000_000),
    "Series A": (500_000, 25_000_000),
    "Series B": (2_000_000, 50_000_000),
    "Bridge": (250_000, 15_000_000),
    "Growth": (1_000_000, 100_000_000),
}

ABSOLUTE_MIN_USD = 25_000
ABSOLUTE_MAX_USD = 100_000_000


def has_traction(app: StartupApplicationCreate) -> bool:
    return bool(
        (app.current_revenue and app.current_revenue.strip())
        or (app.growth_rate and app.growth_rate.strip())
        or (app.number_of_customers and app.number_of_customers.strip())
    )


def is_priority_sector(industry_sector: str) -> bool:
    sector = (industry_sector or "").lower()
    return any(keyword in sector for keyword in PRIORITY_SECTOR_KEYWORDS)


def parse_funding_amount(amount_raising: str) -> Optional[float]:
    """Parse USD/INR funding ask into a numeric value (USD equivalent for INR)."""
    if not amount_raising or not amount_raising.strip():
        return None

    text = amount_raising.strip().lower()
    is_inr = "inr" in text or "₹" in amount_raising or "rupee" in text

    numbers = re.findall(r"[\d,]+\.?\d*", text.replace(",", ""))
    if not numbers:
        return None

    values = [float(n.replace(",", "")) for n in numbers]
    amount = max(values)

    multipliers = {
        "billion": 1_000_000_000,
        "million": 1_000_000,
        "crore": 10_000_000,
        "lakh": 100_000,
        "k": 1_000,
    }
    for word, mult in multipliers.items():
        if word in text:
            amount *= mult
            break

    if is_inr:
        amount /= 83.0  # approximate USD equivalent for screening

    return amount


def get_sector_warning(industry_sector: str) -> Optional[str]:
    if is_priority_sector(industry_sector):
        return None
    return (
        "Your sector is outside FSV Capital's core focus (Fintech, AI, Blockchain, DeepTech). "
        "You may still apply, but priority review is given to aligned startups."
    )


def get_funding_range_issues(amount_raising: str, funding_stage: str) -> Tuple[List[str], List[str]]:
    """Return (blocking_errors, warnings)."""
    errors: List[str] = []
    warnings: List[str] = []

    amount = parse_funding_amount(amount_raising)
    if amount is None:
        errors.append(
            "Enter a clear funding amount (e.g. '$500,000 USD' or 'INR 2 crore')."
        )
        return errors, warnings

    if amount < ABSOLUTE_MIN_USD:
        errors.append(f"Minimum funding ask is USD {ABSOLUTE_MIN_USD:,} (or equivalent).")
    elif amount > ABSOLUTE_MAX_USD:
        errors.append(f"Funding amount cannot exceed USD {ABSOLUTE_MAX_USD:,}.")

    stage_range = STAGE_FUNDING_RANGES.get(funding_stage)
    if stage_range:
        low, high = stage_range
        if amount < low:
            warnings.append(
                f"For {funding_stage}, typical raises start around USD {low:,}. "
                "Your ask may be below investor expectations for this stage."
            )
        elif amount > high:
            warnings.append(
                f"For {funding_stage}, typical raises are up to about USD {high:,}. "
                "Confirm your amount is intentional."
            )

    return errors, warnings


def validate_application_screening(app: StartupApplicationCreate) -> List[str]:
    """
    Enforce mandatory screening rules. Returns non-blocking warnings.
    Raises HTTPException on blocking failures.
    """
    errors: List[str] = []
    warnings: List[str] = []

    if app.current_stage in TRACTION_REQUIRED_STAGES and not has_traction(app):
        if app.current_stage == "Idea":
            errors.append(
                "Idea-stage startups must provide at least one traction indicator "
                "(current revenue, growth rate, or number of customers/users) before applying."
            )
        else:
            errors.append(
                f"{app.current_stage} startups must complete the Traction step with at least one of: "
                "current revenue, growth rate (%), or number of customers/users."
            )

    sector_warning = get_sector_warning(app.industry_sector)
    if sector_warning:
        warnings.append(sector_warning)

    funding_errors, funding_warnings = get_funding_range_issues(
        app.amount_raising, app.funding_stage
    )
    errors.extend(funding_errors)
    warnings.extend(funding_warnings)

    if errors:
        detail = errors[0] if len(errors) == 1 else {"message": "Application did not pass screening", "errors": errors}
        raise HTTPException(status_code=400, detail=detail)

    return warnings
