from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class StartupApplication(Base):
    __tablename__ = "startup_applications"

    id = Column(Integer, primary_key=True, index=True)
    
    # Section 1: Basic Information
    startup_name = Column(String(255), nullable=False)
    website_url = Column(String(255), nullable=True)
    founder_names = Column(String(500), nullable=False)
    contact_email = Column(String(255), nullable=False)
    contact_number = Column(String(50), nullable=False)
    linkedin_founder = Column(String(255), nullable=True)
    linkedin_company = Column(String(255), nullable=True)
    linkedin_profile = Column(String(255), nullable=True)  # legacy / combined display
    hq_location = Column(String(255), nullable=True)
    year_of_incorporation = Column(Integer, nullable=True)

    # Section 2: Startup Overview
    problem_statement = Column(Text, nullable=False)
    solution_overview = Column(Text, nullable=False)
    industry_sector = Column(String(100), nullable=False) # Fintech, AI, Blockchain, etc.
    business_model = Column(String(100), nullable=False) # B2B, B2C, etc.
    current_stage = Column(String(50), nullable=False) # Idea, MVP, Early Revenue, Growth Stage, Scaling

    # Section 3: Product & Technology
    core_product_description = Column(Text, nullable=True)
    technology_stack = Column(Text, nullable=True)
    unique_value_proposition = Column(Text, nullable=True)
    ip_patents = Column(Text, nullable=True)
    demo_link = Column(String(255), nullable=True)

    # Section 4: Market Opportunity
    target_market = Column(Text, nullable=True)
    customer_segment = Column(Text, nullable=True)
    key_competitors = Column(Text, nullable=True)
    competitive_advantage = Column(Text, nullable=True)

    # Section 5: Traction & Metrics
    current_revenue = Column(String(100), nullable=True)
    growth_rate = Column(String(50), nullable=True)
    number_of_customers = Column(String(100), nullable=True)
    key_partnerships = Column(Text, nullable=True)
    notable_achievements = Column(Text, nullable=True)

    # Section 6: Financials
    funding_raised_till_date = Column(String(100), nullable=True)
    investors = Column(Text, nullable=True)
    burn_rate = Column(String(100), nullable=True)
    runway_months = Column(Integer, nullable=True)
    revenue_projections = Column(Text, nullable=True)

    # Section 7: Funding Requirement
    amount_raising = Column(String(100), nullable=False)
    funding_stage = Column(String(100), nullable=False) # Pre-seed, Seed, Series A, etc.
    equity_offered = Column(String(50), nullable=True)
    use_of_funds = Column(Text, nullable=False)

    # Section 8: Team
    founder_background = Column(Text, nullable=True)
    core_team_members = Column(Text, nullable=True)
    advisors_mentors = Column(Text, nullable=True)

    # Section 9: Strategic Fit
    why_partner = Column(Text, nullable=True)
    how_add_value = Column(Text, nullable=True)
    open_to_mentorship = Column(String(10), nullable=True) # Yes/No

    # Section 10: Documents (File paths)
    pitch_deck_path = Column(String(500), nullable=False) # Mandatory
    financial_model_path = Column(String(500), nullable=True)
    additional_documents_path = Column(Text, nullable=True)

    # Section 11: Compliance
    company_registered = Column(String(10), nullable=False) # Yes/No
    legal_issues = Column(Text, nullable=True) # Yes - Explain / No
    consent_given = Column(String(10), nullable=False) # Checkbox

    # AI Smart Scoring System
    deal_score = Column(Float, nullable=True, default=0.0) # 0-100 score

    status = Column(String(50), default="Submitted") # Submitted, Under Review, Rejected, Accepted
    
    # Admin who reviewed this application
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    reviewer = relationship("User")

    def __repr__(self):
        return f"<StartupApplication(id={self.id}, startup_name='{self.startup_name}', score={self.deal_score})>"
