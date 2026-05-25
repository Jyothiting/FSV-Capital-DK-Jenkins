from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from contextlib import asynccontextmanager

from database import init_db, SessionLocal
from routes import auth, documents, search, tasks, applications, analytics, activity, ai
from services.llm_service import llm_status
from services.index_sync import sync_search_index


@asynccontextmanager
async def lifespan(app):
    """Sync FAISS with DB on startup so search works after seed or laptop restart."""
    init_db()
    db = SessionLocal()
    try:
        vectors = sync_search_index(db)
        if vectors:
            print(f"Search index ready: {vectors} vectors indexed from knowledge base.")
        else:
            print("Search index empty — run: python seed.py (then restart API if needed).")
    finally:
        db.close()
    yield


# Initialize database tables on startup (lifespan also calls init_db)
init_db()

app = FastAPI(
    title="FSV Capital - Startup Funding & Management System",
    description="Backend API for Startup Funding Applications and AI-Powered Task Management.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow React frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

# Register Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(tasks.router)
app.include_router(applications.router)
app.include_router(analytics.router)
app.include_router(activity.router)
app.include_router(ai.router)

# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later.", "error": str(exc)},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )

@app.get("/health")
def health_check():
    from services.search_service import search_service

    return {
        "status": "ok",
        "message": "FSV Capital API is running.",
        "ai": llm_status(),
        "search_index_vectors": int(search_service.index.ntotal),
        "embeddings_enabled": search_service.model is not None,
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
