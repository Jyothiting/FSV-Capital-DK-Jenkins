"""
Confirm the app is configured for MySQL (assignment requirement).
Run from backend/:  python scripts/check_mysql.py
Exits 0 on success, 1 on failure.
"""
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from sqlalchemy import text  # noqa: E402

from config import settings  # noqa: E402
from database import engine  # noqa: E402


def main() -> int:
    url = settings.DATABASE_URL
    if url.startswith("sqlite"):
        print("FAIL: DATABASE_URL points to SQLite.")
        print("  Set MySQL in backend/.env (see .env.example) for assignment grading.")
        return 1

    if "mysql" not in url.lower():
        print(f"FAIL: DATABASE_URL does not look like MySQL: {url.split('@')[-1]}")
        return 1

    db_name = engine.url.database or "(unknown)"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        print(f"FAIL: Cannot connect to MySQL database '{db_name}': {exc}")
        print("  Ensure MySQL is running and credentials in backend/.env are correct.")
        return 1

    print(f"OK: Connected to MySQL database '{db_name}'.")
    print("  Runtime (main.py, seed.py, verify_system.py) uses this database.")
    print("  pytest uses SQLite only — see docs/GRADING.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
