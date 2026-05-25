from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class ApplicationDraft(Base):
    __tablename__ = "application_drafts"

    id = Column(Integer, primary_key=True, index=True)
    draft_key = Column(String(320), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    contact_email = Column(String(255), nullable=True, index=True)
    form_data = Column(Text, nullable=False)
    current_step = Column(Integer, default=1, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")

    def __repr__(self):
        return f"<ApplicationDraft(key='{self.draft_key}')>"
