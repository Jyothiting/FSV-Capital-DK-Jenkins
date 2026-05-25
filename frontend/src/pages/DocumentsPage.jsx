import { useEffect, useState, useRef } from 'react';
import { FileText, CheckCircle, Clock, XCircle, CloudUpload } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_ICONS = {
  completed:  <CheckCircle size={14} color="var(--success)" />,
  processing: <Clock size={14} color="var(--warning)" />,
  pending:    <Clock size={14} color="var(--text-muted)" />,
  failed:     <XCircle size={14} color="var(--error)" />,
};

const STATUS_BADGE = {
  completed:  'badge-success',
  processing: 'badge-warning',
  pending:    'badge-info',
  failed:     'badge-error',
};

export default function DocumentsPage({ toast }) {
  const { isAdmin } = useAuth();
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef(null);

  const fetchDocs = (showLoading = true) => {
    if (showLoading) setLoading(true);
    api.get('/documents/')
      .then(r => setDocs(r.data))
      .catch(() => toast?.error('Failed to load documents'))
      .finally(() => { if (showLoading) setLoading(false); });
  };

  useEffect(() => { fetchDocs(); }, []);

  useEffect(() => {
    const hasProcessing = docs.some(doc => doc.embedding_status === 'processing');
    if (!hasProcessing) {
      return undefined;
    }

    const interval = setInterval(() => fetchDocs(false), 5000);
    return () => clearInterval(interval);
  }, [docs]);

  const uploadFile = async (file) => {
    const name = file?.name?.toLowerCase() || '';
    if (!file || (!name.endsWith('.txt') && !name.endsWith('.pdf'))) {
      toast?.error('Only .txt or .pdf files are supported (PDF max 5 MB)'); return;
    }
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const r = await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocs(d => [r.data, ...d]);
      toast?.success('Document uploaded! AI embeddings generating in background…');
    } catch (err) {
      toast?.error(err.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="page">
      <div className="page-header animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
        <div>
          <h2>Document Knowledge Base</h2>
          <p style={{ marginTop: 4 }}>Upload documents to power the AI semantic search engine.</p>
        </div>
        {docs.length > 0 && (
          <button className="btn btn-secondary" type="button" onClick={() => fetchDocs()} disabled={loading || uploading}>
            Refresh documents
          </button>
        )}
      </div>
      {docs.some(doc => doc.embedding_status === 'processing') && (
        <div className="glass-card animate-in" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Indexing is in progress for new documents. The page will refresh automatically while embeddings are being generated.
          </p>
        </div>
      )}

      {/* Upload zone — admin only */}
      {isAdmin && (
        <div
          className={`glass-card upload-zone animate-in ${dragging ? 'dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".txt,.pdf" style={{ display: 'none' }}
            onChange={e => uploadFile(e.target.files[0])} />
          {uploading ? (
            <><span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
              <p>Uploading &amp; indexing document…</p></>
          ) : (
            <><CloudUpload size={36} color={dragging ? 'var(--brand-primary)' : 'var(--text-muted)'} />
              <p><strong style={{ color: 'var(--text-primary)' }}>Drop a .txt or .pdf here</strong> or click to browse</p>
              <span className="badge badge-info">AI embeddings generated automatically</span></>
          )}
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="glass-card empty-state animate-in">
          <FileText size={40} color="var(--text-muted)" />
          <p>No documents yet. Upload a .txt or .pdf file to begin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {docs.map((doc, i) => (
            <div key={doc.id} className="glass-card doc-card animate-in" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="doc-card-icon"><FileText size={20} color="var(--brand-primary)" /></div>
              <div className="doc-card-info">
                <span className="doc-name">{doc.original_name}</span>
                <div className="flex gap-2 items-center" style={{ marginTop: 6 }}>
                  {STATUS_ICONS[doc.embedding_status]}
                  <span className={`badge ${STATUS_BADGE[doc.embedding_status]}`}>
                    {doc.embedding_status}
                  </span>
                  {doc.file_size && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
