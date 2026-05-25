from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # bytes
    mime_type = Column(String(100), nullable=True)
    content_text = Column(Text, nullable=True)  # extracted text for embedding
    embedding_status = Column(String(50), default="pending", nullable=False) # pending, processing, completed, failed
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    uploaded_by_user = relationship("User", back_populates="documents")

    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.original_name}')>"
