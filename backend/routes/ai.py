from fastapi import APIRouter, Depends, Request

from middleware.activity_logger import log_activity
from models import User
from schemas.ai import CoachRequest, CoachResponse
from services.coach_service import coach_field
from database import get_db
from sqlalchemy.orm import Session
from middleware.auth_middleware import get_current_user_optional

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


@router.post("/coach", response_model=CoachResponse)
def ai_coach(
    payload: CoachRequest,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Improve funding-form text (problem, solution, use of funds, moat).
    Public-friendly (optional login). Uses OpenAI when OPENAI_API_KEY is set.
    """
    result = coach_field(payload)
    log_activity(
        db,
        current_user.id if current_user else None,
        "ai_coach",
        f"Coached field: {payload.field} ({result.mode})",
        request,
    )
    return result
