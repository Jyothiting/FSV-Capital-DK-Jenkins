import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database — MySQL is required for production; override with sqlite in .env for local-only testing
    DATABASE_URL: str = (
        "mysql+pymysql://fsv_user:fsv_password@localhost:3306/fsv_capital?charset=utf8mb4"
    )

    # JWT Settings
    JWT_SECRET_KEY: str = "fsv-capital-super-secret-key-change-in-prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # File Uploads
    UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "uploads")
    APPLICATION_UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "uploads", "applications")
    MAX_PITCH_DECK_BYTES: int = 20 * 1024 * 1024  # 20 MB
    MAX_OPTIONAL_FILE_BYTES: int = 10 * 1024 * 1024  # 10 MB per optional attachment

    # AI / Embeddings (local — no API key)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    FAISS_INDEX_PATH: str = os.path.join(os.path.dirname(__file__), "faiss_index")

    # LLM / RAG (OpenAI via LangChain — optional; falls back to mock/heuristic)
    OPENAI_API_KEY: str | None = None
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_PROVIDER: str = "auto"  # auto | openai | mock
    LLM_TEMPERATURE: float = 0.2
    RAG_MAX_CONTEXT_CHARS: int = 6000

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(__file__), ".env"),
            os.path.join(os.path.dirname(__file__), ".env.local"),
        ),
        extra="ignore",
    )

# Initialize settings
settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.APPLICATION_UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.FAISS_INDEX_PATH, exist_ok=True)

