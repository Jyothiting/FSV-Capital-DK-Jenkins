import { useEffect, useState } from 'react';
import {
  LogIn, RefreshCw, Upload, Search, CheckSquare,
  User, Shield, Clock, Activity, Filter,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ActivityPage.css';

/* ── action metadata ────────────────────────────────────────── */
const ACTION_META = {
  login:            { icon: LogIn,       color: 'indigo', label: 'Login' },
  task_update:      { icon: CheckSquare, color: 'green',  label: 'Task Update' },
  document_upload:  { icon: Upload,      color: 'amber',  label: 'Doc Upload' },
  search:           { icon: Search,      color: 'blue',   label: 'AI Search' },
  profile_update:   { icon: User,        color: 'violet', label: 'Profile Update' },
  application_submit: { icon: Shield,    color: 'cyan',   label: 'Application' },
};

const DEFAULT_META = { icon: Activity, color: 'gray', label: 'Action' };

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeSince(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_OPTIONS = [
  { value: '',                   label: 'All Actions' },
  { value: 'login',              label: 'Login' },
  { value: 'task_update',        label: 'Task Updates' },
  { value: 'document_upload',    label: 'Document Uploads' },
  { value: 'search',             label: 'AI Searches' },
  { value: 'profile_update',     label: 'Profile Updates' },
  { value: 'application_submit', label: 'Applications' },
];

export default function ActivityPage({ toast }) {
  const { isAdmin } = useAuth();
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [action,  setAction]  = useState('');
  const [page,    setPage]    = useState(0);
  const LIMIT = 20;

  const fetchLogs = (act = action, pg = page) => {
    setLoading(true);
    const endpoint = isAdmin ? '/activity/' : '/activity/me';
    const params = { skip: pg * LIMIT, limit: LIMIT };
    if (act) params.action = act;
    api.get(endpoint, { params })
      .then(r => setLogs(r.data))
      .catch(() => toast?.error('Failed to load activity log'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleAction = (val) => {
    setAction(val);
    setPage(0);
    fetchLogs(val, 0);
  };

  const handlePage = (delta) => {
    const next = Math.max(0, page + delta);
    setPage(next);
    fetchLogs(action, next);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header animate-in">
        <div>
          <h2><span className="text-gradient">Activity Log</span></h2>
          <p style={{ marginTop: 4 }}>
            {isAdmin ? 'Full system-wide activity history.' : 'Your personal action history.'}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {/* Action filter */}
          <div className="act-filter-row">
            <Filter size={14} color="var(--text-muted)" />
            <select
              id="act-filter"
              className="form-select"
              style={{ width: 'auto', minWidth: 160 }}
              value={action}
              onChange={e => handleAction(e.target.value)}
            >
              {ACTION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={() => fetchLogs()} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="activity-timeline">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton act-skeleton" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card empty-state animate-in">
          <Activity size={40} color="var(--text-muted)" />
          <p>No activity found{action ? ` for "${action}"` : ''}.</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {logs.map((log, i) => {
            const meta = ACTION_META[log.action] || DEFAULT_META;
            const Icon = meta.icon;
            return (
              <div
                key={log.id}
                className="act-entry animate-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Timeline connector */}
                <div className="act-line-col">
                  <div className={`act-dot act-dot-${meta.color}`}>
                    <Icon size={13} />
                  </div>
                  {i < logs.length - 1 && <div className="act-connector" />}
                </div>

                {/* Content */}
                <div className="glass-card act-card">
                  <div className="act-card-top">
                    <div className="flex items-center gap-2">
                      <span className={`badge act-badge-${meta.color}`}>{meta.label}</span>
                      {isAdmin && log.username && (
                        <span className="act-user">
                          <User size={11} /> {log.username}
                        </span>
                      )}
                    </div>
                    <div className="act-time">
                      <Clock size={11} />
                      <span title={fmtTime(log.created_at)}>{timeSince(log.created_at)}</span>
                    </div>
                  </div>
                  {log.details && (
                    <p className="act-details">{log.details}</p>
                  )}
                  <div className="act-meta-row">
                    <span className="act-timestamp">{fmtTime(log.created_at)}</span>
                    {log.ip_address && (
                      <span className="act-ip">IP: {log.ip_address}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <div className="act-pagination">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handlePage(-1)}
            disabled={page === 0}
          >
            ← Prev
          </button>
          <span className="act-page-label">Page {page + 1}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handlePage(1)}
            disabled={logs.length < LIMIT}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
