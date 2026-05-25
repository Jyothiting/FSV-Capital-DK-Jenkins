from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from schemas.user import UserResponse
from schemas.attachments import ApplicationAttachments

class StartupApplicationCreate(BaseModel):
    # Basic Info
    startup_name: str
    website_url: Optional[str] = None
    founder_names: str
    contact_email: EmailStr
    contact_number: str
    linkedin_founder: Optional[str] = None
    linkedin_company: Optional[str] = None
    linkedin_profile: Optional[str] = None  # optional legacy field
    hq_location: Optional[str] = None
    year_of_incorporation: Optional[int] = None

    # Overview
    problem_statement: str
    solution_overview: str
    industry_sector: str
    business_model: str
    current_stage: str

    # Product
    core_product_description: Optional[str] = None
    technology_stack: Optional[str] = None
    unique_value_proposition: Optional[str] = None
    ip_patents: Optional[str] = None
    demo_link: Optional[str] = None

    # Market
    target_market: Optional[str] = None
    customer_segment: Optional[str] = None
    key_competitors: Optional[str] = None
    competitive_advantage: Optional[str] = None

    # Traction
    current_revenue: Optional[str] = None
    growth_rate: Optional[str] = None
    number_of_customers: Optional[str] = None
    key_partnerships: Optional[str] = None
    notable_achievements: Optional[str] = None

    # Financials
    funding_raised_till_date: Optional[str] = None
    investors: Optional[str] = None
    burn_rate: Optional[str] = None
    runway_months: Optional[int] = None
    revenue_projections: Optional[str] = None

    # Funding Req
    amount_raising: str
    funding_stage: str
    equity_offered: Optional[str] = None
    use_of_funds: str

    # Team
    founder_background: Optional[str] = None
    core_team_members: Optional[str] = None
    advisors_mentors: Optional[str] = None

    # Fit
    why_partner: Optional[str] = None
    how_add_value: Optional[str] = None
    open_to_mentorship: Optional[str] = None

    # Documents (file path on server or external URL for financial model)
    financial_model_path: Optional[str] = None
    financial_model_link: Optional[str] = None

    # Compliance
    company_registered: str
    legal_issues: Optional[str] = None
    consent_given: str


class StartupApplicationResponse(StartupApplicationCreate):
    id: int
    deal_score: float
    status: str
    reviewer_id: Optional[int] = None
    reviewer_notes: Optional[str] = None
    pitch_deck_path: str
    financial_model_path: Optional[str] = None
    additional_documents_path: Optional[str] = None
    attachments: Optional[ApplicationAttachments] = None
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None

    reviewer: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class ApplicationReview(BaseModel):
    status: str
    reviewer_notes: Optional[str] = None
