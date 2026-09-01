# Testing notes

## MySQL vs pytest (important)

| What you run | Database | Purpose |
|--------------|----------|---------|
| **`python main.py`** + **`python seed.py`** | **MySQL** (from `backend/.env`) | **Normal runtime** — this is how the app is meant to run |
| **`pytest tests/`** | **SQLite** (`backend/test_fsv.db`) | Fast, isolated API tests — no MySQL install required |
| **`python scripts/verify_system.py`** | **MySQL** (via running API) | Full end-to-end check against a live server |

**pytest does not prove MySQL works** — it intentionally overrides `DATABASE_URL` in `backend/tests/conftest.py` to SQLite.

### Confirm MySQL is in use (30 seconds)

```powershell
cd backend
..\.venv\Scripts\python scripts\check_mysql.py
```

Expected: `OK: Connected to MySQL database 'fsv_capital'`.

Then start the app and run the end-to-end checks:

```powershell
..\.venv\Scripts\python seed.py
..\.venv\Scripts\python main.py          # keep running
..\.venv\Scripts\python scripts\verify_system.py
```

### Full verification flow (recommended)

```powershell
# 1. Backend on MySQL
cd backend
copy .env.example .env    # edit DATABASE_URL if needed
..\.venv\Scripts\pip install -r requirements.txt
..\.venv\Scripts\python scripts\check_mysql.py
..\.venv\Scripts\python seed.py
..\.venv\Scripts\python main.py          # terminal A

# 2. End-to-end (MySQL-backed API)
..\.venv\Scripts\python scripts\verify_system.py   # terminal B

# 3. Unit/integration tests (SQLite — fast)
$env:SKIP_EMBEDDINGS="1"
..\.venv\Scripts\pytest tests/ -v

# 4. Frontend smoke tests (no server)
cd ..\frontend
npm install
npm run test:run
```

## Frontend tests

Vitest smoke tests cover funding form logic only (`validateStep`, traction screening, `calcDealScore`) — not the React UI. Run: `cd frontend && npm run test:run`.
