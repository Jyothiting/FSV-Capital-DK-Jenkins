from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

from config import settings

# ---------------------------------------------------------------------------
# Engine — enable WAL mode for SQLite, use pool_pre_ping for MySQL resilience
# ---------------------------------------------------------------------------
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
)

# Enable foreign key enforcement for SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session and auto-closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_startup_application_columns():
    """Add LinkedIn columns on existing DBs without recreating tables."""
    from sqlalchemy import inspect, text

    try:
        insp = inspect(engine)
        if "startup_applications" not in insp.get_table_names():
            return
        existing = {c["name"] for c in insp.get_columns("startup_applications")}
        alters = []
        if "linkedin_founder" not in existing:
            alters.append("ADD COLUMN linkedin_founder VARCHAR(255)")
        if "linkedin_company" not in existing:
            alters.append("ADD COLUMN linkedin_company VARCHAR(255)")
        if not alters:
            return
        with engine.begin() as conn:
            for clause in alters:
                conn.execute(text(f"ALTER TABLE startup_applications {clause}"))
    except Exception as exc:
        print(f"Schema migration note: {exc}")


def init_db():
    """Create all tables. Called once on startup."""
    import models  # noqa: F401  — import so SQLAlchemy sees the models
    Base.metadata.create_all(bind=engine)
    _migrate_startup_application_columns()
