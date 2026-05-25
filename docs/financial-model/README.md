# FSV Capital — Financial Model Setup

Investor-grade **3-year monthly model** tailored for FSV Capital’s funding application (`/apply`). It matches your form’s financial steps and FSV’s thesis (Fintech, AI, Blockchain, DeepTech; pre-seed/seed **USD 250k–2M**).

## Files

| File | Purpose |
|------|---------|
| [FSV_Financial_Model_Template.xlsx](FSV_Financial_Model_Template.xlsx) | Blank template — fill for your startup |
| [samples/Apex_AI_Labs_Financial_Model.xlsx](samples/Apex_AI_Labs_Financial_Model.xlsx) | Worked example aligned with seed demo **Apex AI Labs** |

Regenerate workbooks after editing assumptions in the script:

```powershell
cd "d:\Files\Projects\Future Technologies"
.\.venv\Scripts\python backend\scripts\generate_financial_model.py
```

## Workbook structure (5 tabs)

| Tab | What it covers | Form step |
|-----|----------------|-----------|
| **Assumptions** | Stage, MRR, growth, churn, burn, raise size, headcount | 5–7 |
| **Monthly P&L** | 36-month revenue, COGS, OpEx, EBITDA, burn | 6 |
| **Cash Flow** | Cash balance, runway, post-raise liquidity | 6 |
| **Use of Funds** | % and USD by category for this round | 7 |
| **Investor Summary** | Y1–Y3 rollup + copy-paste text for the form | 6, 7, 10 |

## How this maps to `/apply`

| Form field | Where to get the number |
|------------|-------------------------|
| Current revenue | Assumptions → Starting MRR; or Summary → Current revenue line |
| Growth rate | Assumptions → MoM revenue growth |
| Number of customers | Assumptions → Starting paying customers; P&L tracks growth |
| Funding raised till date | Assumptions → Funding raised to date |
| Burn rate | Cash Flow hints or P&L → Net Cash Burn (month 1) |
| Runway (months) | Cash Flow → Runway column after your raise |
| Revenue projections (3 yr) | Investor Summary → Y1/Y2/Y3 revenue |
| Amount raising / stage / equity | Assumptions → This round |
| Use of funds | Use of Funds tab (paste summary into textarea) |
| Financial model (Step 10) | Upload `.xlsx` or paste Drive link to this file |

## Model design (why this fits FSV)

1. **SaaS / usage-based AI** — MRR, ARPU, churn, and cloud-heavy COGS % (typical for Apex-style compute/API startups).
2. **Seed-stage guardrails** — Default **$500k** raise and **10%** equity align with screening (`min USD 25k`, seed band in `fundingValidation.js`).
3. **Use-of-funds categories** — Product/engineering, GTM, cloud/compute, ops/legal, reserve — mirror common FSV diligence asks and your `use_of_funds` field.
4. **Runway story** — Cash tab shows pre- and post-money runway for IC review.

## Using with the app today

Step 10 accepts a **link** (`financial_model_path`), not file upload yet. Options:

1. Upload the `.xlsx` to Google Drive → share view link → paste in **Financial Model (optional)**.
2. Commit the workbook in your GitHub repo and paste the raw/file URL in the link field.
3. *(Optional enhancement)* Add `.xlsx` file upload on the backend — say if you want that wired next.

## Customizing for your startup

Edit **Assumptions** in the template (or `TEMPLATE_DEFAULTS` / your own dict in `generate_financial_model.py`), then re-run the script:

- **Pre-revenue / Idea** — set `starting_mrr` = 0, increase `current_burn`, extend runway narrative in Summary.
- **Fintech / marketplace** — raise `sm_pct`, lower `cogs_pct`, adjust `use_of_funds_split` in code.
- **INR raises** — model in USD internally; enter INR in the form (screening converts INR→USD).

## Example copy-paste (Apex AI Labs demo)

After opening the sample workbook, Step 6–7 can use:

- **Revenue projections:** `Y1: $250K ARR | Y2: $1.1M ARR | Y3: $3.8M ARR (base case)`
- **Burn:** ~`$42,000/month`
- **Use of funds:** `40% hiring core engineers, 25% enterprise GTM, 20% cloud/GPU compute credits, 10% security & compliance, 5% reserve.`

These align with seeded application **Apex AI Labs** in `backend/seed.py`.
