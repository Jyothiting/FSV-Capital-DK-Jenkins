import { useEffect, useState } from 'react';
import { FileSpreadsheet, Download, Star, FileDown, Sparkles } from 'lucide-react';
import api from '../services/api';

const STAGE_BADGE = {
  Submitted:     'badge-info',
  'Under Review':'badge-warning',
  Accepted:      'badge-success',
  Rejected:      'badge-error',
};

function ScoreRing({ score }) {
  const r = 22, circ = 2 * Math.PI * r;
  const fill = circ - (circ * Math.min(score, 100)) / 100;
  const color = score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--error)';
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="28" y="32" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {Math.round(score)}
      </text>
    </svg>
  );
}

export default function ApplicationsPage({ toast }) {
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/applications/')
      .then(r => setApps(r.data))
      .catch(() => toast?.error('Failed to load applications'))
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const headers = ['ID','Startup','Sector','Stage','Score','Status','Email','Raising'];
    const rows = apps.map(a => [
      a.id, `"${a.startup_name}"`, a.industry_sector, a.current_stage,
      a.deal_score, a.status, a.contact_email, a.amount_raising
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'fsv_applications.csv'; a.click();
    URL.revokeObjectURL(url);
    toast?.success('CSV exported!');
  };

  const downloadBlob = async (url, filename, successMsg) => {
    const r = await api.get(url, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
    toast?.success(successMsg);
  };

  const downloadPitchDeck = async (appId, startupName) => {
    try {
      await downloadBlob(
        `/applications/${appId}/pitch-deck`,
        `${startupName.replace(/\s+/g, '_')}_pitch_deck.pdf`,
        'Pitch deck downloaded',
      );
    } catch {
      toast?.error('Pitch deck not available for download');
    }
  };

  const updateStatus = async (id, status, notes) => {
    try {
      const r = await api.post(`/applications/${id}/review`, { status, reviewer_notes: notes });
      setApps(a => a.map(x => x.id === id ? r.data : x));
      setSelected(null);
      toast?.success('Application status updated!');
    } catch { toast?.error('Update failed'); }
  };

  return (
    <div className="page">
      <div className="page-header animate-in">
        <div>
          <h2>Startup Applications</h2>
          <p style={{ marginTop: 4 }}>Review and score submitted funding applications.</p>
        </div>
        {apps.length > 0 && (
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="glass-card empty-state animate-in">
          <FileSpreadsheet size={40} color="var(--text-muted)" />
          <p>No applications submitted yet.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {apps.map((app, i) => (
              <div key={app.id} className="glass-card animate-in" style={{ animationDelay: `${i * 40}ms`, padding: 'var(--space-4) var(--space-5)' }}>
                <div className="flex items-center gap-4">
                  <ScoreRing score={app.deal_score || 0} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {app.startup_name}
                      </span>
                      <span className="badge badge-primary">{app.industry_sector}</span>
                      <span className="badge badge-info">{app.current_stage}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {app.founder_names} · {app.hq_location} · {app.amount_raising}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.problem_statement}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center" style={{ flexShrink: 0 }}>
                    <span className={`badge ${STAGE_BADGE[app.status] || 'badge-info'}`}>{app.status}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => downloadPitchDeck(app.id, app.startup_name)} title="Download pitch deck">
                      <FileDown size={14} />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(app)}>
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Review Modal */}
          {selected && (
            <ReviewModal app={selected} onClose={() => setSelected(null)} onSave={updateStatus} toast={toast} />
          )}
        </>
      )}
    </div>
  );
}

function DocumentsPanel({ app, toast }) {
  const downloadFile = async (path, filename, label) => {
    try {
      const r = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast?.success(`${label} downloaded`);
    } catch {
      toast?.error(`${label} not available`);
    }
  };

  const att = app.attachments || { screenshots: [], additional: [] };
  const finLink = app.financial_model_path?.startsWith('http') ? app.financial_model_path : null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>DOCUMENTS</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFile(
          `/applications/${app.id}/pitch-deck`, `${app.startup_name}_deck.pdf`, 'Pitch deck'
        )}>
          <FileDown size={14} /> Pitch deck
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFile(
          `/applications/${app.id}/financial-model`, `${app.startup_name}_financials.xlsx`, 'Financial model'
        )}>
          <FileDown size={14} /> Financial model
        </button>
        {finLink && (
          <a className="btn btn-ghost btn-sm" href={finLink} target="_blank" rel="noreferrer">Financial link ↗</a>
        )}
        {app.demo_link && (
          <a className="btn btn-ghost btn-sm" href={app.demo_link} target="_blank" rel="noreferrer">Demo ↗</a>
        )}
      </div>
      {(att.screenshots?.length > 0 || att.additional?.length > 0) && (
        <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: 'none', fontSize: '0.8rem' }}>
          {att.screenshots?.map((f) => (
            <li key={f.stored_name} style={{ marginBottom: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFile(
                `/applications/${app.id}/files/screenshots/${f.stored_name}`,
                f.original_name,
                'Screenshot',
              )}>
                📷 {f.original_name}
              </button>
            </li>
          ))}
          {att.additional?.map((f) => (
            <li key={f.stored_name} style={{ marginBottom: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => downloadFile(
                `/applications/${app.id}/files/additional/${f.stored_name}`,
                f.original_name,
                'Document',
              )}>
                📄 {f.original_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewModal({ app, onClose, onSave, toast }) {
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes]   = useState(app.reviewer_notes || '');
  const [saving, setSaving] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const r = await api.get(`/applications/${app.id}/ai-insights`);
      setInsights(r.data);
      toast?.success('AI investment brief generated');
    } catch {
      toast?.error('Could not generate AI insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    await onSave(app.id, status, notes);
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-card modal-panel animate-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{app.startup_name}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.contact_email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Star size={16} color="var(--brand-gold)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Score: {Math.round(app.deal_score)}/100</span>
          </div>
        </div>
        <div className="divider" style={{ margin: '12px 0' }} />
        <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Detail label="Problem" value={app.problem_statement} />
          <Detail label="Solution" value={app.solution_overview} />
          <Detail label="Funding Ask" value={`${app.amount_raising} — ${app.funding_stage}`} />
          <Detail label="Use of Funds" value={app.use_of_funds} />
        </div>
        <DocumentsPanel app={app} toast={toast} />
        <div style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadInsights} disabled={insightsLoading}>
            {insightsLoading ? <><span className="spinner" /> Analyzing…</> : <><Sparkles size={14} /> AI Investment Brief</>}
          </button>
        </div>
        {insights && (
          <div className="glass-card" style={{ padding: 12, marginTop: 12, background: 'var(--bg-elevated)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              AI BRIEF · {insights.recommendation} · {insights.mode === 'llm' ? 'GPT' : 'Heuristic'}
            </p>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 8 }}>{insights.executive_summary}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginBottom: 4 }}><strong>Strengths:</strong> {insights.strengths?.join(' · ')}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginBottom: 4 }}><strong>Risks:</strong> {insights.risks?.filter(Boolean).join(' · ')}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}><strong>Diligence:</strong> {insights.diligence_questions?.join(' · ')}</p>
          </div>
        )}
        <div className="divider" style={{ margin: '12px 0' }} />
        <div className="form-group">
          <label className="form-label">Update Status</label>
          <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option>Submitted</option>
            <option>Under Review</option>
            <option>Accepted</option>
            <option>Rejected</option>
          </select>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Reviewer Notes</label>
          <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add your review notes..." style={{ minHeight: 80 }} />
        </div>
        <div className="flex gap-3 justify-end" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{value}</p>
    </div>
  );
}
