import os
import json
import faiss
import numpy as np
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from config import settings

class SearchService:
    CHUNK_SIZE = 750
    CHUNK_OVERLAP = 150

    def __init__(self):
        if os.getenv("SKIP_EMBEDDINGS") == "1":
            self.embedding_dimension = 384
            self.model = None
            self.index_path = os.path.join(settings.FAISS_INDEX_PATH, "documents.index")
            self.metadata_path = os.path.join(settings.FAISS_INDEX_PATH, "doc_metadata.json")
            self.index = faiss.IndexFlatIP(self.embedding_dimension)
            self.metadata = []
            return

        print(f"Loading embedding model: {settings.EMBEDDING_MODEL}...")
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)
        self.embedding_dimension = self.model.get_sentence_embedding_dimension()
        self.index_path = os.path.join(settings.FAISS_INDEX_PATH, "documents.index")
        self.metadata_path = os.path.join(settings.FAISS_INDEX_PATH, "doc_metadata.json")

        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            self.index = faiss.IndexFlatIP(self.embedding_dimension)

        self.metadata = self._load_metadata()

    def _load_metadata(self) -> List[Dict]:
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def _save_metadata(self):
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)

    def _save_index(self):
        faiss.write_index(self.index, self.index_path)
        self._save_metadata()

    def reset_index(self):
        """Clear the vector index (used when re-seeding the knowledge base)."""
        self.metadata = []
        self.index = faiss.IndexFlatIP(self.embedding_dimension)
        if os.path.exists(self.index_path):
            os.remove(self.index_path)
        if os.path.exists(self.metadata_path):
            os.remove(self.metadata_path)
        self._save_index()

    def _chunk_text(self, text: str) -> List[str]:
        if not text:
            return []

        normalized = " ".join(text.split())
        chunks = []
        start = 0
        while start < len(normalized):
            end = min(start + self.CHUNK_SIZE, len(normalized))
            chunk = normalized[start:end]
            chunks.append(chunk)
            if end == len(normalized):
                break
            start += self.CHUNK_SIZE - self.CHUNK_OVERLAP
        return chunks

    def add_document(self, doc_id: int, text: str):
        """Convert document text into embeddings and add each chunk into the FAISS index."""
        if self.model is None:
            return
        if text and len(text) > 120_000:
            text = text[:120_000]
        if not text or not text.strip():
            return

        # Prevent duplicate indexing for the same document id
        if any(entry["doc_id"] == doc_id for entry in self.metadata):
            return

        chunks = self._chunk_text(text)
        if not chunks:
            return

        embeddings = self.model.encode(chunks, convert_to_numpy=True, normalize_embeddings=True)
        embeddings = embeddings.astype('float32')
        self.index.add(embeddings)

        for chunk in chunks:
            snippet = chunk if len(chunk) <= 200 else chunk[:197] + "..."
            self.metadata.append({
                "doc_id": doc_id,
                "snippet": snippet,
            })

        self._save_index()

    def reload_index_from_disk(self) -> None:
        """Reload FAISS index + metadata from disk (e.g. after seed.py in another process)."""
        if self.model is None:
            return
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            self.index = faiss.IndexFlatIP(self.embedding_dimension)
        self.metadata = self._load_metadata()

    def rebuild_index(self, documents: List[tuple]) -> int:
        """Rebuild the full index from (doc_id, content_text) pairs. Returns vector count."""
        if self.model is None:
            return 0
        self.reset_index()
        for doc_id, text in documents:
            if text and str(text).strip():
                self.add_document(int(doc_id), str(text))
        return int(self.index.ntotal)

    def needs_sync(self, db_doc_ids: List[int]) -> bool:
        if self.model is None:
            return False
        if not db_doc_ids:
            return False
        if self.index.ntotal == 0:
            return True
        indexed = {entry["doc_id"] for entry in self.metadata}
        return indexed != set(db_doc_ids)

    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search the FAISS index and return the best matched document results."""
        if self.model is None or self.index.ntotal == 0:
            return []

        query_embedding = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True).astype('float32')
        search_k = min(max(top_k * 4, top_k), self.index.ntotal)
        distances, indices = self.index.search(query_embedding, search_k)

        best_matches = {}
        for score, idx in zip(distances[0], indices[0]):
            if idx == -1:
                continue
            if idx >= len(self.metadata):
                continue

            entry = self.metadata[idx]
            doc_id = entry["doc_id"]
            if doc_id not in best_matches or score > best_matches[doc_id]["similarity_score"]:
                best_matches[doc_id] = {
                    "document_id": doc_id,
                    "similarity_score": float(score),
                    "content_snippet": entry["snippet"],
                }

        results = sorted(best_matches.values(), key=lambda item: item["similarity_score"], reverse=True)
        return results[:top_k]

search_service = SearchService()
