# Feature Implementation Checklist

Verified via `python seed.py`, `python scripts/verify_system.py` (**40+**), and `pytest tests/` (**33+**).

## Startup Funding Web Form

| Feature | Status | Notes |
|---------|--------|-------|
| All 11 form sections | ✅ | `FundingForm.jsx` |
| Investor-grade UI + multi-step | ✅ | Progress bar, sidebar steps |
| Save & resume | ✅ | localStorage + `PUT/GET /applications/draft` |
| Per-step validation | ✅ | |
| Screening rules (traction all stages, sector, funding) | ✅ | Frontend + backend |
| Pitch deck PDF upload (mandatory) | ✅ | Stored under `uploads/applications/` |
| Deal score 0–100 (multi-axis rubric) | ✅ | `deal_score.py` + `dealScore.js` |
| LinkedIn founder + company | ✅ | Split fields + legacy `linkedin_profile` |
| Admin applications list + review | ✅ | `/applications` |
| CSV export | ✅ | Applications page |
| Consent + privacy link | ✅ | `/privacy` |
| Branding (title + tagline) | ✅ | |
| Financial model file upload | ✅ | `.xlsx/.xls/.csv/.pdf` + optional Drive link |
| Product screenshots upload | ✅ | Up to 5 images |
| Additional documents upload | ✅ | Up to 5 files (pdf, txt, docx, xlsx) |
| CRM / email integrations | ➖ | Out of scope for now |

## AI Task & Knowledge Management

| Feature | Status | Notes |
|---------|--------|-------|
| JWT authentication | ✅ | `/auth/login`, `/auth/register` |
| RBAC admin / user | ✅ | All protected routes |
| MySQL database | ✅ | Configure via `backend/.env` |
| Tables: users, roles, tasks, documents, activity_logs | ✅ | + `startup_applications`, `application_drafts` |
| Document upload (.txt + .pdf) | ✅ | Admin `/documents/upload`; PDF text via `pypdf` (5 MB cap) |
| Semantic search (embeddings + FAISS) | ✅ | `sentence-transformers` + FAISS |
| RAG Q&A (LangChain + OpenAI) | ✅ | `GET /search/ask` — fallback without API key |
| AI application insights (admin) | ✅ | `GET /applications/{id}/ai-insights` |
| AI form writing coach | ✅ | `POST /ai/coach` on `/apply` |
| Task create / assign / status update | ✅ | `/tasks` |
| Dynamic filtering `?status=&assigned_to=` | ✅ | |
| Activity logging | ✅ | login, search, upload, task_update, task_create, application_submit, application_review |
| Analytics | ✅ | `/analytics`, `/analytics/me` |
| React frontend | ✅ | |
| README + setup | ✅ | |
| Automated tests | ✅ | `backend/tests/` + `frontend` Vitest smoke tests |
| Assignee dropdown | ✅ | `GET /auth/assignees` |

## Demo credentials (after seed)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| User | `user1` | `user123` |

## Quick verification commands

```powershell
cd backend
..\.venv\Scripts\python seed.py
..\.venv\Scripts\python scripts\verify_system.py
$env:SKIP_EMBEDDINGS="1"
..\.venv\Scripts\python scripts\check_mysql.py
..\.venv\Scripts\pytest tests/ -v
cd ..\frontend && npm run test:run
```

Testing notes: [docs/TESTING.md](docs/TESTING.md) (MySQL vs SQLite).

## Seeded demo data (after `python seed.py`)

| Data | Count | Notes |
|------|-------|-------|
| Startup applications | 6 | Full form fields + real `pitch_deck.pdf` on disk |
| Knowledge-base `.txt` docs | 9 | VC/fintech/AI/blockchain content |
| Tasks | 6 | pending / in_progress / completed |
| Activity logs | 15 | search, RAG, reviews, uploads |
| Application draft | 1 | `draft-demo@fsvcapital.com` step 4 |
| FAISS vectors | 12+ | Auto-sync on API startup |
