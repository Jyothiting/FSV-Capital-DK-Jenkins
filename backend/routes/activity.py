from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import ActivityLog, User
from middleware.auth_middleware import get_current_active_user, RequireRole

router = APIRouter(prefix="/activity", tags=["Activity Log"])


def _format(log: ActivityLog) -> dict:
    return {
        "id":         log.id,
        "action":     log.action,
        "details":    log.details,
        "ip_address": log.ip_address,
        "created_at": log.created_at.isoformat() if log.created_at else None,
        "user_id":    log.user_id,
        "username":   log.user.username if log.user else None,
    }


@router.get("/me", summary="Get current user's activity log")
def get_my_activity(
    skip:   int = Query(0,  ge=0),
    limit:  int = Query(20, le=100),
    action: Optional[str] = Query(None, description="Filter by action type"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Return the authenticated user's own activity history, newest first."""
    q = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
    )
    if action:
        q = q.filter(ActivityLog.action == action)
    entries = q.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    return [_format(e) for e in entries]


@router.get("/", summary="Admin — get all activity logs")
def get_all_activity(
    skip:    int = Query(0,    ge=0),
    limit:   int = Query(50,   le=200),
    action:  Optional[str] = Query(None),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    _admin:  User = Depends(RequireRole("admin")),
    db: Session = Depends(get_db),
):
    """Admin endpoint: full activity log with optional filters."""
    q = db.query(ActivityLog)
    if user_id is not None:
        q = q.filter(ActivityLog.user_id == user_id)
    if action:
        q = q.filter(ActivityLog.action == action)
    entries = q.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    return [_format(e) for e in entries]
