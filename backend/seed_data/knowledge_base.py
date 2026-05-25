"""
Knowledge-base documents for FSV Capital demo.
Content reflects publicly known industry themes (VC practice, fintech/AI markets, India DPDP).
"""

KNOWLEDGE_BASE_DOCUMENTS = {
    "investment_policy.txt": """
FSV Capital — Investment Policy (Effective 2025)

Mission: Back exceptional founders building category-defining companies in Fintech, Artificial Intelligence,
Blockchain infrastructure, and DeepTech.

Stage focus:
- Pre-seed: USD 250,000 – USD 750,000 (idea/MVP with early signals)
- Seed: USD 500,000 – USD 2,000,000 (product in market, repeatable GTM)
- Series A: USD 2,000,000 – USD 8,000,000 (scaling revenue, unit economics under review)

Sector priorities:
1. Fintech — payments, lending infrastructure, embedded finance, regtech
2. AI / ML — enterprise copilots, vertical LLM applications, MLOps, data infrastructure
3. Blockchain — custody, identity, enterprise chains, post-quantum security
4. DeepTech — robotics, semiconductors, climate hardware with software margins

Screening criteria:
- Minimum funding ask USD 25,000; typical seed USD 250k–2M
- Idea-stage applicants must show traction: revenue, growth rate, or active customers
- Standard diligence: team, TAM/SAM/SOM, competitive moat, cap table, financial model

IC cadence: Monthly investment committee. Partner sponsor required for term sheet.
""".strip(),
    "due_diligence_checklist.txt": """
FSV Capital — Due Diligence Checklist (Analyst Edition)

Before IC presentation, complete:

1. Corporate & legal
   - Certificate of incorporation, cap table, founder agreements
   - IP assignment, pending litigation, regulatory licences (RBI/SEBI where applicable)

2. Product & technology
   - Architecture review, security posture, SOC2 roadmap
   - Customer references (minimum 3 for B2B)

3. Financials
   - MRR/ARR bridge, burn rate, runway months, use-of-funds vs plan
   - Revenue projections sanity-check vs sector benchmarks

4. Market
   - TAM/SAM/SOM with sources (Gartner, McKinsey, industry reports)
   - Competitor matrix and differentiation proof points

5. Team
   - Founder backgrounds (LinkedIn, prior exits)
   - Key hires planned with this round

6. Deal terms
   - Amount raising, equity offered, prior investors, option pool

Risk documentation: market, execution, regulatory, technology — rate High/Medium/Low.
""".strip(),
    "fintech_market_brief.txt": """
Fintech Market Brief — Q1 2025 (Public industry synthesis)

Global digital payments volume continues double-digit growth. Embedded finance — banking-as-a-service
APIs inside ERP, payroll, and e-commerce platforms — is a top FSV Capital theme.

India: UPI processed 100+ billion annual transactions; account-aggregator framework enables cash-flow
underwriting for SMB credit. RBI guidelines emphasize data localization and consent-based sharing (DPDP alignment).

B2B priorities: cross-border remittance, invoice financing, spend management, fraud detection using ML.

Key risks: interchange regulation, partner bank concentration, cyber fraud.

Benchmarks cited in sector reports: leading neobanks target 15–25% MoM early-stage growth; enterprise SaaS
fintech targets NRR above 110% at scale.
""".strip(),
    "ai_market_outlook_2025.txt": """
AI Market Outlook 2025 — Enterprise Adoption

Generative AI enterprise spend is forecast to exceed USD 150B globally by 2028 across multiple analyst outlooks.
Near-term winners: vertical applications (legal, healthcare ops, developer tools), GPU-efficient inference,
and RAG knowledge systems for regulated industries.

FSV Capital looks for:
- Defensible data loops or proprietary evaluation benchmarks
- Clear path from pilot to paid production (not perpetual POC)
- Unit economics: gross margin after model/API costs

Infrastructure themes: vector databases, fine-tuning pipelines, on-prem deployments for banks.
Safety: model governance, PII redaction, audit trails for financial services clients.
""".strip(),
    "blockchain_regulatory_guide.txt": """
Blockchain & Digital Assets — Regulatory Primer

Enterprise blockchain use cases at FSV: trade finance, supply chain attestations, digital identity,
and post-quantum migration for financial institutions.

Compliance checklist:
- Token classification (utility vs security)
- Travel Rule for VASPs where applicable
- Smart contract audits for DeFi exposure

India context: RBI caution on crypto retail; permissioned chains and CBDC pilots favored for bank partners.
Founders should articulate off-chain legal entity and on-chain asset separation.
""".strip(),
    "seed_term_sheet_guide.txt": """
Seed Stage Term Sheet — FSV Capital Standard Positions

Typical seed economics (illustrative, deal-specific):
- Investment: USD 500k–2M on SAFE or priced equity
- Option pool: 10–15% post-money
- Board: observer rights at seed; full seat at Series A

Standard provisions: pro-rata rights, information rights, MFN on future rounds.
Founder vesting: 4-year with 1-year cliff if not already in place.

Timeline from term sheet to wire: 4–6 weeks subject to diligence completion.
""".strip(),
    "portfolio_support_playbook.txt": """
FSV Portfolio Support Playbook

Post-investment services:
- GTM intros to Fortune 500 innovation teams and India top-50 enterprises
- Hiring: fractional CFO, VP Sales, ML engineers via partner network
- Cloud credits: AWS Activate, Azure, GCP startup programs
- Compliance workshops: DPDP, PCI-DSS scoping for fintech

Quarterly OKR review with founders. Annual strategic offsite for Series A+ portfolio.
""".strip(),
    "dpdp_compliance_summary.txt": """
India Digital Personal Data Protection Act (DPDP) 2023 — Summary for Portfolio

Applicability: Processing personal data in India; consent required for most purposes.

Startup obligations:
- Privacy notice at collection (funding forms, SaaS signup)
- Purpose limitation; data minimization
- Breach notification to Data Protection Board
- Cross-border transfer rules for cloud hosting

FSV Capital funding applications require explicit consent checkbox linking to published privacy policy.
Data shared with investment partners only for evaluation per consent text.
""".strip(),
    "ic_memo_template.txt": """
Investment Committee Memo Template

Company:
Round:
Sponsor partner:

Investment thesis (3 bullets):
Risks (3 bullets):
Traction snapshot:
Recommendation: Proceed / Hold / Pass

Appendix: deal score breakdown, comparable transactions, cap table summary.
""".strip(),
}
