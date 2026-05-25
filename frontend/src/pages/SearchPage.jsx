import { useState } from 'react';
import { Search, Sparkles, FileText, Percent, MessageSquare, Bot } from 'lucide-react';
import api from '../services/api';

export default function SearchPage({ toast }) {
  const [query, setQuery]     = useState('');
  const [mode, setMode]       = useState('search'); // search | ask
  const [results, setResults] = useState([]);
  const [ragAnswer, setRagAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setResults([]);
    setRagAnswer(null);
    try {
      if (mode === 'ask') {
        const r = await api.get('/search/ask', { params: { q: query, top_k: 6 } });
        setRagAnswer(r.data);
      } else {
        const r = await api.get('/search/', { params: { q: query, top_k: 8 } });
        setResults(r.data);
      }
    } catch {
      toast?.error(mode === 'ask' ? 'AI Q&A failed' : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header animate-in">
        <div>
          <h2><span className="text-gradient">AI Knowledge Search</span></h2>
          <p style={{ marginTop: 4 }}>
            Semantic search (local embeddings) or <strong>RAG Q&A</strong> (FAISS + GPT when API key is set).
          </p>
        </div>
      </div>

      <div className="flex gap-2 animate-in" style={{ marginBottom: 'var(--space-3)' }}>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'search' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('search')}
        >
          <Search size={14} /> Find Documents
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'ask' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setMode('ask')}
        >
          <Bot size={14} /> Ask AI (RAG)
        </button>
      </div>

      <form onSubmit={run} className="glass-card animate-in" style={{ padding: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 42 }}
            placeholder={mode === 'ask'
              ? 'e.g. What is FSV Capital\'s typical seed check size?'
              : 'e.g. return policy enterprise customers'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
          {loading
            ? <><span className="spinner" /> {mode === 'ask' ? 'Thinking…' : 'Searching…'}</>
            : <>{mode === 'ask' ? <><MessageSquare size={15} /> Ask</> : <><Sparkles size={15} /> Search</>}</>}
        </button>
      </form>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      )}

      {!loading && searched && mode === 'ask' && ragAnswer && (
        <div className="glass-card animate-in" style={{ padding: 'var(--space-5)' }}>
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 'var(--space-3)' }}>
            <span className="badge badge-primary">
              {ragAnswer.mode === 'llm' ? `GPT · ${ragAnswer.model || 'LLM'}` : 'Retrieval excerpts'}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {ragAnswer.answer}
          </p>
          {ragAnswer.sources?.length > 0 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>SOURCES</p>
              {ragAnswer.sources.map(s => (
                <div key={s.document_id} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <FileText size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {s.original_name} ({(s.similarity_score * 100).toFixed(0)}%)
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && searched && mode === 'search' && results.length === 0 && (
        <div className="glass-card empty-state animate-in">
          <Sparkles size={36} color="var(--text-muted)" />
          <p>No matching documents found. Try a different query or upload more documents.</p>
        </div>
      )}

      {!loading && mode === 'search' && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Found <strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong> relevant results
          </p>
          {results.map((r, i) => (
            <div key={r.document_id} className="glass-card search-result animate-in" style={{ animationDelay: `${i * 50}ms`, padding: 'var(--space-5)' }}>
              <div className="flex items-center justify-between gap-4" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="flex items-center gap-2">
                  <FileText size={15} color="var(--brand-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {r.original_name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Percent size={12} color="var(--text-muted)" />
                  <span className={`badge ${r.similarity_score > 0.7 ? 'badge-success' : r.similarity_score > 0.4 ? 'badge-warning' : 'badge-info'}`}>
                    {(r.similarity_score * 100).toFixed(1)}% match
                  </span>
                </div>
              </div>
              <div className="progress-track" style={{ height: 3, marginBottom: 'var(--space-3)' }}>
                <div className="progress-fill" style={{ width: `${r.similarity_score * 100}%` }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {r.content_snippet}
              </p>
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <div className="glass-card animate-in" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
          <div className="flex gap-3 items-start">
            <Sparkles size={18} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                Hybrid AI stack
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <strong>Find Documents</strong> uses{' '}
                <code style={{ color: 'var(--text-brand)', background: 'rgba(99,102,241,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                  sentence-transformers
                </code>{' '}
                + FAISS (no API key). <strong>Ask AI</strong> adds LangChain + OpenAI RAG synthesis when{' '}
                <code style={{ color: 'var(--text-brand)', background: 'rgba(99,102,241,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                  OPENAI_API_KEY
                </code>{' '}
                is configured in the backend.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
