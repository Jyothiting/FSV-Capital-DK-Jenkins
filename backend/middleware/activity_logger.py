from fastapi import Request
from sqlalchemy.orm import Session
from models import ActivityLog

def log_activity(db: Session, user_id: int, action: str, details: str = None, request: Request = None):
    """
    Utility function to log activities.
    Actions: 'login', 'task_update', 'document_upload', 'search'
    """
    ip_address = None
    if request and request.client:
        ip_address = request.client.host

    log_entry = ActivityLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
