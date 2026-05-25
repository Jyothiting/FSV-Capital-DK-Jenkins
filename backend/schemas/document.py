from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentResponse(BaseModel):
    id: int
    original_name: str
    file_size: Optional[int]
    mime_type: Optional[str]
    embedding_status: str
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class SearchResult(BaseModel):
    document_id: int
    original_name: str
    content_snippet: str
    similarity_score: float
