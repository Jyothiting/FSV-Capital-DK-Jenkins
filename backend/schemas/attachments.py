from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class StoredFileMeta(BaseModel):
    original_name: str
    stored_name: str
    path: str
    size_bytes: Optional[int] = None


class ApplicationAttachments(BaseModel):
    screenshots: List[StoredFileMeta] = []
    additional: List[StoredFileMeta] = []
