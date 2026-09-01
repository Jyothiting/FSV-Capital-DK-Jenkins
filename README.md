# FSV Capital — Startup Funding & AI Knowledge Platform

A full-stack project I built to explore how AI can plug into a real venture-capital workflow — from investor-grade deal intake to a JWT-secured knowledge base with RAG-powered search. FSV Capital is a fictional VC firm I made up for the project; everything here (data, seed content, branding) is demo material.

It combines:

1. **Startup Funding Application** — 11-step investor-grade intake form with pitch deck upload and deal scoring
2. **AI Task & Knowledge Management** — JWT/RBAC portal where admins upload documents, users run semantic search, and complete assigned tasks

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Axios |
| Backend | Python 3.10+, FastAPI, SQLAlchemy |
| Database | **MySQL** (required) |
| Auth | JWT + role-based access (admin / user) |
| AI Search | sentence-transformers (`all-MiniLM-L6-v2`) + FAISS |

## Prerequisites

- Python 3.10+
- Node.js 18+
- **MySQL 8.0+** (MariaDB 10.5+ also works)

## 1. MySQL Setup

Create the database and user:

```sql
CREATE DATABASE fsv_capital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'fsv_user'@'localhost' IDENTIFIED BY 'fsv_password';
GRANT ALL PRIVILEGES ON fsv_capital.* TO 'fsv_user'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment (from project root)
python -m venv ../.venv
# Windows
..\.venv\Scripts\activate
# macOS / Linux
# source ../.venv/bin/activate

pip install -r requirements.txt

# Configure environment
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux

# Edit .env if your MySQL credentials differ from the defaults
```

Default `DATABASE_URL` in `.env.example`:

```
mysql+pymysql://fsv_user:fsv_password@localhost:3306/fsv_capital?charset=utf8mb4
```

**SQLite fallback (local testing only):** uncomment the SQLite line in `.env` — used by `pytest` only. **For normal use, run on MySQL** as configured in `.env.example`.

**Note:** `pytest` always uses SQLite (`test_fsv.db`) for speed — it does **not** validate MySQL. Confirm MySQL with `python scripts/check_mysql.py`, then run the live app + `verify_system.py`. See **[docs/TESTING.md](docs/TESTING.md)**.

**Memory-safe tips (avoid OOM on laptops):**

- Run tests with `set SKIP_EMBEDDINGS=1` (skips loading the ~90 MB embedding model).
- Knowledge-base PDFs are capped at **5 MB / 40 pages**; extracted text is capped before indexing.
- First document upload or search still downloads the embedding model once — prefer `.txt` for demos if RAM is tight.

Initialize tables and seed **full demo data** (6 startups, 9 KB docs, 6 tasks, drafts, PDF decks):

```bash
python seed.py
python main.py
```

After `seed.py`, restart the API if it was already running so search index syncs.

API runs at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App runs at **http://localhost:5173**

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `user1` | `user123` |

## Key Routes

| URL | Description |
|-----|-------------|
| `/apply` | Public startup funding form (pitch deck PDF required) |
| `/login` | Investor portal login |
| `/dashboard` | Role-based dashboard |
| `/documents` | Knowledge base (admin uploads `.txt` files) |
| `/search` | AI semantic search over uploaded documents |
| `/tasks` | Task management |
| `/applications` | Admin review of funding applications |

## API Endpoints

| Method | Path | Access |
|--------|------|--------|
| POST | `/auth/login` | Public |
| POST | `/auth/register` | Public |
| POST | `/applications/` | Public (multipart: PDF + JSON) |
| GET | `/applications/` | Admin |
| GET | `/tasks/` | Authenticated (filter: `?status=&assigned_to=`) |
| POST | `/documents/upload` | Admin |
| GET | `/documents/` | Authenticated |
| GET | `/search/?q=` | Authenticated |
| GET | `/search/ask?q=` | Authenticated (RAG + LLM) |
| POST | `/ai/coach` | Public (optional login) |
| GET | `/applications/{id}/ai-insights` | Admin |
| GET | `/analytics/` | Admin |
| GET | `/activity/` | Admin |

## Application screening (funding form)

The `/apply` form enforces:

- **Per-step validation** — required fields must be completed before "Next"
- **Traction required** — all stages (Idea, MVP, Early Revenue, Growth, Scaling) need at least one traction metric before submit
- **Deal score (0–100)** — multi-axis rubric: revenue stage, market size (TAM/SAM/SOM), team, innovation, traction, sector fit (`services/deal_score.py`)
- **LinkedIn** — separate founder and company profile fields
- **Sector advisory** — warns when industry is outside Fintech / AI / Blockchain / DeepTech
- **Funding range** — validates parsed amount (min USD 25k, stage-typical ranges)
- **Privacy** — [http://localhost:5173/privacy](http://localhost:5173/privacy) (DPDP Act 2023)

## Financial model (optional)

Investor-grade Excel templates aligned with the funding form live under [`docs/financial-model/`](docs/financial-model/README.md):

- **Template:** `FSV_Financial_Model_Template.xlsx` (5 tabs: assumptions, P&L, cash flow, use of funds, summary)
- **Demo:** `samples/Apex_AI_Labs_Financial_Model.xlsx` (matches seed startup Apex AI Labs)

Regenerate: `python backend/scripts/generate_financial_model.py`

Step 10 supports **file uploads**: pitch deck (PDF, required), financial model (Excel/CSV/PDF), product screenshots (images), and additional documents — plus an optional cloud link for the financial model.

## Pitch Deck Upload

- Format: **PDF only**
- Max size: **20 MB**
- Stored under `backend/uploads/applications/<uuid>/pitch_deck.pdf`
- Path saved in `startup_applications.pitch_deck_path`

## AI stack (hybrid — local + LLM)

| Layer | Technology | API |
|-------|------------|-----|
| Embeddings | `sentence-transformers` + FAISS | `GET /search/?q=` |
| RAG Q&A | FAISS retrieval + **LangChain** + **OpenAI** | `GET /search/ask?q=` |
| Deal insights | Structured LLM brief for admins | `GET /applications/{id}/ai-insights` |
| Form coach | Improve problem / solution / use of funds | `POST /ai/coach` |

**Local mode (no API key):** semantic search returns ranked excerpts (`mode: retrieval_only`).  
**LLM mode:** set `OPENAI_API_KEY` — GPT synthesizes an answer with citations (`mode: llm`).

### How to get an OpenAI API key

1. Go to [https://platform.openai.com](https://platform.openai.com) and sign up or log in.
2. Open **API keys**: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
3. Click **Create new secret key**, name it (e.g. `fsv-capital-dev`), and copy the key once — it starts with `sk-` and is shown only once.
4. Add billing if prompted: **Settings → Billing** ([https://platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing)). `gpt-4o-mini` is low cost; a few RAG demo calls are typically well under $1.
5. Never commit the key. Store it only in `backend/.env.local` (gitignored) or your OS environment variable `OPENAI_API_KEY`.

### Enable OpenAI in this project

1. Copy the local secrets template (gitignored):

```powershell
cd backend
copy .env.local.example .env.local
```

2. Edit `backend/.env.local` and set your key:

```env
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4o-mini
LLM_PROVIDER=openai
```

3. Restart the API (`python main.py`) so settings reload.

4. Capture a live RAG response for docs (no server required — uses DB + FAISS + OpenAI directly):

```powershell
..\.venv\Scripts\python scripts\capture_rag_demo.py
```

This writes `docs/rag-demo/response.json` and `docs/rag-demo/response.md`.

### AI Knowledge Search demo

**UI:** Log in as `admin` / `admin123` → **Search** → **Ask AI (RAG)**.

**Example question:** `What traction do idea-stage startups need to apply for funding?`

![AI Knowledge Search — Ask AI (RAG) with FAISS retrieval excerpts and sources](docs/rag-demo/rag-ask-demo.png)

The UI shows **Retrieval excerpts** when FAISS returns ranked chunks (`investment_policy.txt` ~48%, etc.). With `OPENAI_API_KEY` and active billing, the same flow returns **`mode: llm`** and a synthesized GPT answer instead of excerpt bullets.

**Alternate mode:** **Find Documents** — same query, card layout with match % per file (semantic search only).

**API (with JWT):**

```http
GET /search/ask?q=What+sectors+does+FSV+Capital+invest+in%2C+and+what+are+typical+seed+check+sizes%3F
Authorization: Bearer <token>
```

**Expected LLM response shape** (after `capture_rag_demo.py` with a valid key):

| Field | Example |
|-------|---------|
| `mode` | `llm` |
| `model` | `gpt-4o-mini` |
| `answer` | Narrative citing Fintech, AI, Blockchain, DeepTech; pre-seed USD 250k–750k; seed USD 500k–2M |
| `sources` | `investment_policy.txt`, `due_diligence_checklist.txt`, `seed_term_sheet_guide.txt` |

See [`docs/rag-demo/response.md`](docs/rag-demo/response.md) after capture (or [`response-retrieval-only.json`](docs/rag-demo/response-retrieval-only.json) for FAISS-only preview without a key).

## AI Search Flow

1. Admin uploads a `.txt` or `.pdf` document via `/documents/upload` (PDF: text extraction only, no OCR)
2. Backend extracts text, chunks it, generates embeddings, and indexes in FAISS
3. **Find documents:** `GET /search/?q=your+query` (cosine similarity)
4. **Ask AI (RAG):** `GET /search/ask?q=your+question` — retrieves chunks, synthesizes answer with citations when OpenAI is configured

## Project Structure

```
backend/
  main.py              # FastAPI entry point
  config.py            # Settings (MySQL, JWT, uploads)
  database.py          # SQLAlchemy engine + session
  models/              # ORM models (users, roles, tasks, documents, …)
  routes/              # API routers
  services/            # Auth + FAISS search service
  middleware/          # JWT, RBAC, activity logging
  seed.py              # Demo data
frontend/
  src/pages/           # React pages
  src/context/         # Auth state
  src/services/api.js  # Axios client
```

## Troubleshooting

**Cannot connect to MySQL**  
Verify MySQL is running and credentials in `backend/.env` match your server.

**Search returns no results**  
Ensure an admin has uploaded `.txt` documents and wait for embedding status to show `completed`.

**First run is slow**  
The embedding model (~90 MB) downloads on first document upload or search.

**CORS errors**  
Backend allows `http://localhost:5173` and `5174`. Run the frontend on one of those ports.

## Seed test data & verify everything

```powershell
cd backend
..\.venv\Scripts\python seed.py
..\.venv\Scripts\python main.py          # separate terminal
..\.venv\Scripts\python scripts\check_mysql.py     # confirm MySQL is configured
..\.venv\Scripts\python scripts\verify_system.py   # 40 E2E checks (MySQL API)
$env:SKIP_EMBEDDINGS="1"
..\.venv\Scripts\pytest tests/ -v                  # 39 tests (SQLite)
cd ..\frontend && npm run test:run                 # frontend smoke tests
```

**Seeded knowledge-base files** (under `backend/uploads/`): `investment_policy.txt`, `due_diligence_checklist.txt`, `fintech_market_brief.txt`, `ai_market_outlook_2025.txt`, `blockchain_regulatory_guide.txt`, `seed_term_sheet_guide.txt`, `portfolio_support_playbook.txt`, `dpdp_compliance_summary.txt`, `ic_memo_template.txt`

`seed.py` loads users, sample applications, tasks, activity logs, and **3 knowledge-base documents** indexed for AI search.

See [FEATURES.md](FEATURES.md) for the full implementation checklist.

## Running tests

### Backend (SQLite — fast, no MySQL required)

```powershell
cd backend
..\.venv\Scripts\pip install pytest httpx
$env:SKIP_EMBEDDINGS="1"
..\.venv\Scripts\pytest tests/ -v
```

`conftest.py` forces `DATABASE_URL=sqlite:///./test_fsv.db`. This is intentional; run the app itself on **MySQL** (see [docs/TESTING.md](docs/TESTING.md)).

### Confirm MySQL

```powershell
cd backend
..\.venv\Scripts\python scripts\check_mysql.py
```

### Frontend smoke tests (Vitest)

```powershell
cd frontend
npm install
npm run test:run
```

Covers `validateStep`, traction screening, and `calcDealScore` — not full UI/browser tests.

## Additional features

- **Server-side drafts** — `PUT/GET/DELETE /applications/draft` (resume by email or logged-in user)
- **Task assignee picker** — `GET /auth/assignees` (admin) + dropdown on Tasks page
- **Automated tests** — auth, search, application submit & screening (`backend/tests/`)

## License

MIT — see [LICENSE](LICENSE). Built by [Nishanth](https://github.com/nishanthsr7-eng) as a personal project.
