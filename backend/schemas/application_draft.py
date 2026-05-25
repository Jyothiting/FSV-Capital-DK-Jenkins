from pydantic import BaseModel, EmailStr
from typing import Any, Dict, Optional
from datetime import datetime


class ApplicationDraftSave(BaseModel):
    form_data: Dict[str, Any]
    current_step: int = 1
    contact_email: Optional[EmailStr] = None


class ApplicationDraftResponse(BaseModel):
    form_data: Dict[str, Any]
    current_step: int
    contact_email: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
