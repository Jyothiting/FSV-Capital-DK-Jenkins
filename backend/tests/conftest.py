import os
import sys
# pyrefly: ignore [missing-import]
import pytest

# Run tests without loading the embedding model
os.environ["SKIP_EMBEDDINGS"] = "1"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["DATABASE_URL"] = "sqlite:///./test_fsv.db"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest-only"

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from database import Base, engine, SessionLocal, init_db  # noqa: E402
from models import Role, User  # noqa: E402
from services.auth_service import get_password_hash  # noqa: E402
from main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    init_db()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for name, desc in [("admin", "Admin"), ("user", "User")]:
            if not db.query(Role).filter(Role.name == name).first():
                db.add(Role(name=name, description=desc))
        db.commit()

        admin_role = db.query(Role).filter(Role.name == "admin").first()
        user_role = db.query(Role).filter(Role.name == "user").first()

        if not db.query(User).filter(User.username == "admin").first():
            db.add(
                User(
                    username="admin",
                    email="admin@test.com",
                    full_name="Test Admin",
                    hashed_password=get_password_hash("admin123"),
                    role_id=admin_role.id,
                    is_active=True,
                )
            )
        if not db.query(User).filter(User.username == "user1").first():
            db.add(
                User(
                    username="user1",
                    email="user1@test.com",
                    full_name="Test User",
                    hashed_password=get_password_hash("user123"),
                    role_id=user_role.id,
                    is_active=True,
                )
            )
        db.commit()
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_token(client):
    r = client.post(
        "/auth/login",
        data={"username": "admin", "password": "admin123"},
    )
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture
def user_token(client):
    r = client.post(
        "/auth/login",
        data={"username": "user1", "password": "user123"},
    )
    assert r.status_code == 200
    return r.json()["access_token"]
