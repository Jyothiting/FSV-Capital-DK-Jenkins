"""Keep the in-memory FAISS index aligned with MySQL documents."""
from sqlalchemy.orm import Session

from models import Document
from services.search_service import search_service


def sync_search_index(db: Session) -> int:
    """
    Rebuild or reload the vector index when empty or out of sync with the DB.
    Returns number of indexed vectors.
    """
    if search_service.model is None:
        return 0

    docs = (
        db.query(Document)
        .filter(
            Document.content_text.isnot(None),
            Document.embedding_status.in_(["completed", "processing"]),
        )
        .order_by(Document.id)
        .all()
    )
    if not docs:
        return 0

    db_ids = [d.id for d in docs]
    if search_service.needs_sync(db_ids):
        pairs = [(d.id, d.content_text or "") for d in docs]
        return search_service.rebuild_index(pairs)

    if search_service.index.ntotal == 0:
        search_service.reload_index_from_disk()
    return int(search_service.index.ntotal)
