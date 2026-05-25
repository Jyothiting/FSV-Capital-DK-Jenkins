import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, CheckSquare, FileText, FileSpreadsheet, TrendingUp,
  Search, ArrowRight, Activity, Clock, CheckCircle2, AlertCircle,
  LogIn, Upload, User, Target, Star, RefreshCw, Zap,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

/* ── Stat Card ───────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color, sub, trend }) {
  return (
    <div className={`stat-card stat-card-${color} animate-in`}>
      <div className="stat-card-top">
        <div className={`stat-icon stat-icon-${color}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && (
          <span className={`stat-trend ${trend >= 0 ? 'trend-up' : 'trend-dn'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/* ── Activity helpers ────────────────────────────────────────── */
const ACT_ICON = {
  login: LogIn, task_update: CheckSquare, document_upload: Upload,
  search: Search, profile_update: User, application_submit: FileSpreadsheet,
};
const ACT_COLOR = {
  login: 'indigo', task_update: 'green', document_upload: 'amber',
  search: 'blue', profile_update: 'violet', application_submit: 'cyan',
};
function timeSince(iso) {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Activity Feed ───────────────────────────────────────────── */
function ActivityFeed({ items, title = 'Recent Activity', adminView = false }) {
  return (
    <div className="db-card db-card-fill animate-in">
      <div className="db-card-header">
        <div className="db-card-title-row">
          <Activity size={16} color="var(--text-brand)" />
          <h3 className="db-card-title">{title}</h3>
        </div>
        <Link to="/activity" className="db-card-link">View all →</Link>
      </div>
      <div className="act-feed">
        {!items?.length ? (
          <div className="act-feed-empty">
            <Activity size={28} color="var(--text-muted)" />
            <p>No activity yet. Actions you take will appear here.</p>
          </div>
        ) : items.map((a, i) => {
          const Icon  = ACT_ICON[a.action] || Activity;
          const color = ACT_COLOR[a.action] || 'gray';
          return (
            <div key={a.id ?? i} className="act-feed-row">
              <div className={`act-dot act-dot-${color}`}><Icon size={11} /></div>
              <div className="act-feed-body">
                <span className="act-feed-detail">
                  {adminView && a.username && <strong>{a.username} · </strong>}
                  {a.details || a.action}
                </span>
                <span className="act-feed-time">{timeSince(a.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── App Status Widget ───────────────────────────────────────── */
function AppStatusWidget({ application, compact = false }) {
  if (!application) return null;
  const statusColor = {
    Submitted: 'badge-info', 'Under Review': 'badge-warning',
    Accepted: 'badge-success', Rejected: 'badge-error',
  };
  const scoreColor = application.deal_score >= 70
    ? 'var(--success)' : application.deal_score >= 40
    ? 'var(--warning)' : 'var(--error)';
  
  const submittedDate = application.submitted_at
    ? new Date(application.submitted_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    : 'Unknown';

  if (compact) {
    return (
      <div className="db-card animate-in app-status-horizontal">
        <div className="app-status-hz-left">
          <div className="app-status-title-row">
            <Target size={24} color="var(--text-brand)" />
            <div>
              <div className="app-status-title">My Funding Application</div>
              <div className="app-status-subtitle">Latest update on your startup funding request</div>
            </div>
          </div>
          <div className="app-status-actions" style={{ marginTop: 'auto' }}>
            <Link to="/application" className="btn btn-secondary btn-sm">View application</Link>
            <Link to="/documents" className="btn btn-ghost btn-sm">View documents</Link>
          </div>
        </div>

        <div className="app-status-hz-mid">
          <div className="app-status-name" style={{ marginBottom: '0.5rem' }}>{application.startup_name}</div>
          <div className="app-status-details-grid">
            <div className="app-detail-card">
              <span className="app-detail-label">Stage</span>
              <span className="app-detail-val">{application.current_stage || application.funding_stage || 'N/A'}</span>
            </div>
            <div className="app-detail-card">
              <span className="app-detail-label">Ask</span>
              <span className="app-detail-val">{application.amount_raising || 'TBD'}</span>
            </div>
            <div className="app-detail-card">
              <span className="app-detail-label">Sector</span>
              <span className="app-detail-val">{application.industry_sector || 'Unknown'}</span>
            </div>
            <div className="app-detail-card">
              <span className="app-detail-label">HQ</span>
              <span className="app-detail-val">{application.hq_location || 'TBD'}</span>
            </div>
            <div className="app-detail-card">
              <span className="app-detail-label">Model</span>
              <span className="app-detail-val">{application.business_model || 'N/A'}</span>
            </div>
          </div>
          <div className="app-status-meta-row" style={{ marginTop: '1rem', justifyContent: 'flex-start' }}>
            <span className={`badge ${statusColor[application.status] || 'badge-info'}`}>
              {application.status}
            </span>
            {submittedDate && (
              <span className="app-status-date compact">Submitted {submittedDate}</span>
            )}
          </div>
        </div>

        <div className="app-status-hz-right">
          <div className="app-score-box">
            <div className="app-score-ring">
              <svg width={84} height={84} viewBox="0 0 84 84">
                <circle cx="42" cy="42" r={36} fill="none" stroke="var(--bg-elevated)" strokeWidth={6} />
                <circle cx="42" cy="42" r={36} fill="none" stroke={scoreColor} strokeWidth={6}
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - application.deal_score / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 42 42)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <text x="42" y="47" textAnchor="middle" fontSize={16} fontWeight="800" fill={scoreColor}>
                  {application.deal_score}
                </text>
              </svg>
            </div>
            <div className="app-score-label">Deal Score</div>
            <div className="app-score-extra">
              <div>{application.deal_score >= 75 ? 'Strong fit' : application.deal_score >= 50 ? 'Good potential' : 'Needs attention'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-card animate-in">
      <div className="app-status-compact-header">
        <div className="app-status-title-row">
          <Target size={18} color="var(--text-brand)" />
          <div>
            <div className="app-status-title">My Funding Application</div>
            <div className="app-status-subtitle">Latest update on your startup funding request</div>
          </div>
        </div>
        <div className="app-status-meta-row">
          <span className={`badge ${statusColor[application.status] || 'badge-info'}`}>
            {application.status}
          </span>
          {submittedDate && (
            <span className="app-status-date compact">Submitted {submittedDate}</span>
          )}
        </div>
      </div>

      <div className="app-status-body app-status-compact-body">
        <div className="app-status-left">
          <div className="app-status-name">{application.startup_name}</div>
          <div className="app-status-details">
            <div><strong>Stage:</strong> {application.current_stage || application.funding_stage || 'N/A'}</div>
            <div><strong>Ask:</strong> {application.amount_raising || 'TBD'}</div>
            <div><strong>Sector:</strong> {application.industry_sector || 'Unknown'}</div>
          </div>
          <div className="app-status-details">
            <div><strong>HQ:</strong> {application.hq_location || 'TBD'}</div>
            <div><strong>Model:</strong> {application.business_model || 'N/A'}</div>
          </div>
        </div>

        <div className="app-score-box">
          <div className="app-score-ring">
            <svg width={108} height={108} viewBox="0 0 108 108">
              <circle cx="54" cy="54" r={46} fill="none" stroke="var(--bg-elevated)" strokeWidth={7} />
              <circle cx="54" cy="54" r={46} fill="none" stroke={scoreColor} strokeWidth={7}
                strokeDasharray={`${2 * Math.PI * 46}`}
                strokeDashoffset={`${2 * Math.PI * 46 * (1 - application.deal_score / 100)}`}
                strokeLinecap="round" transform="rotate(-90 54 54)"
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
              <text x="54" y="60" textAnchor="middle" fontSize={18} fontWeight="800" fill={scoreColor}>
                {application.deal_score}
              </text>
            </svg>
          </div>
          <div className="app-score-label">Deal Score</div>
          <div className="app-score-extra">
            <div>{application.deal_score >= 75 ? 'Strong fit' : application.deal_score >= 50 ? 'Good potential' : 'Needs attention'}</div>
            <div>{application.amount_raising ? `Ask: ${application.amount_raising}` : 'Ask not set'}</div>
          </div>
        </div>
      </div>

      <div className="app-status-actions">
        <Link to="/application" className="btn btn-secondary btn-sm">View application</Link>
        <Link to="/documents" className="btn btn-ghost btn-sm">View documents</Link>
      </div>
    </div>
  );
}

/* ── Due Today Banner ────────────────────────────────────────── */
function DueTodayBanner({ tasks }) {
  if (!tasks?.length) return null;
  return (
    <div className="due-today-banner animate-in">
      <AlertCircle size={15} />
      <span>
        <strong>{tasks.length} task{tasks.length > 1 ? 's' : ''}</strong> due today:&nbsp;
        {tasks.slice(0, 3).map(t => t.title).join(', ')}
        {tasks.length > 3 && ` +${tasks.length - 3} more`}
      </span>
      <Link to="/tasks" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
        View tasks →
      </Link>
    </div>
  );
}

/* ── Stage Bar (admin) ───────────────────────────────────────── */
function StageBar({ analytics }) {
  if (!analytics?.applications?.by_status) return null;
  const stages = [
    { key: 'Submitted',    color: '#60a5fa', label: 'Submitted' },
    { key: 'Under Review', color: '#fbbf24', label: 'Under Review' },
    { key: 'Accepted',     color: '#34d399', label: 'Accepted' },
    { key: 'Rejected',     color: '#f87171', label: 'Rejected' },
  ];
  const total = analytics.applications.total || 1;
  return (
    <div className="db-card animate-in">
      <div className="db-card-header">
        <div className="db-card-title-row">
          <Star size={16} color="var(--text-brand)" />
          <h3 className="db-card-title">Applications by Stage</h3>
        </div>
      </div>
      <div className="stage-bar-track">
        {stages.map(s => {
          const count = analytics.applications.by_status?.[s.key] || 0;
          const pct   = Math.round((count / total) * 100);
          if (!pct) return null;
          return (
            <div key={s.key} className="stage-bar-segment"
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="stage-legend">
        {stages.map(s => (
          <div key={s.key} className="stage-legend-item">
            <span className="stage-legend-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{analytics.applications.by_status?.[s.key] || 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Progress Card ───────────────────────────────────────────── */
function ProgressCard({ title, pct, left, right }) {
  return (
    <div className="db-card animate-in">
      <div className="db-card-header">
        <div className="db-card-title-row">
          <TrendingUp size={16} color="var(--text-brand)" />
          <h3 className="db-card-title">{title}</h3>
        </div>
        <span className="badge badge-primary">{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-footer">
        <span className="progress-footer-text">{left}</span>
        {right && <span className="progress-footer-text">{right}</span>}
      </div>
    </div>
  );
}

/* ── Quick Action Card ───────────────────────────────────────── */
function QACard({ to, iconClass, icon: Icon, label, sub }) {
  return (
    <Link to={to} className="qa-card">
      <div className={`qa-icon ${iconClass}`}><Icon size={20} /></div>
      <div>
        <div className="qa-label">{label}</div>
        <div className="qa-sub">{sub}</div>
      </div>
    </Link>
  );
}

function buildWeeklyTrend(tasks, totalCount = 1) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    return {
      label: date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      date,
    };
  });

  const baseTotal = Math.max(totalCount, 1);
  return days.map(day => {
    const completedCount = tasks.filter(task => {
      if (!task.completed_at) return false;
      const completedAt = new Date(task.completed_at);
      completedAt.setHours(0, 0, 0, 0);
      return completedAt.getTime() === day.date.getTime();
    }).length;
    return {
      label: day.label,
      count: completedCount,
      value: Math.round((completedCount / baseTotal) * 100),
    };
  });
}

function WeeklyTrendChart({ data = [] }) {
  const width = 340;
  const height = 140;
  const padding = 24;
  const maxValue = Math.max(...data.map(item => item.value), 40);
  const points = data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((item.value / maxValue) * (height - padding * 2));
    return { ...item, x, y };
  });
  const pathData = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0
    ? `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="weekly-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.22)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
          </linearGradient>
        </defs>
        {[1, 2, 3].map(i => (
          <line
            key={i}
            x1={padding}
            y1={padding + ((height - padding * 2) * i) / 4}
            x2={width - padding}
            y2={padding + ((height - padding * 2) * i) / 4}
            stroke="rgba(148,163,184,0.18)"
            strokeDasharray="4 4"
          />
        ))}
        {areaPath && <path d={areaPath} fill="url(#areaGradient)" opacity="0.9" />}
        <path d={pathData} fill="none" stroke="url(#lineGradient)" strokeWidth="4" strokeLinecap="round" />
        {points.map(point => (
          <circle key={point.label} cx={point.x} cy={point.y} r="4.5" fill="#ffffff" stroke="#4338ca" strokeWidth="2" />
        ))}
        {points.map(point => (
          <text key={`${point.label}-label`} x={point.x} y={height - 6} textAnchor="middle" className="weekly-chart-label">
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

function CompletionInsightsCard({ title, pct, segments, data }) {
  return (
    <div className="db-card completion-card animate-in">
      <div className="db-card-header">
        <div className="db-card-title-row">
          <TrendingUp size={16} color="var(--text-brand)" />
          <h3 className="db-card-title">{title}</h3>
        </div>
        <span className="badge badge-primary">{pct}%</span>
      </div>

      <div className="completion-insights-body">
        <div className="completion-insights-copy">
          <span className="completion-copy-label">Weekly task completion rate</span>
          <p className="completion-copy-text">Track performance across the last seven days with task progress segmented by status.</p>
        </div>
        <WeeklyTrendChart data={data} />
      </div>

      <div className="segmented-progress">
        <div className="segmented-progress-bar">
          {segments.map(segment => (
            <div
              key={segment.label}
              className={`progress-segment progress-segment-${segment.key}`}
              style={{ width: `${segment.pct}%` }}
              title={`${segment.label}: ${segment.count}`}
            >
              {segment.pct >= 10 && <span className="progress-segment-label">{segment.pct}%</span>}
            </div>
          ))}
        </div>
        <div className="segmented-progress-legend">
          {segments.map(segment => (
            <div key={segment.label} className="segment-chip">
              <span className={`segment-dot segment-${segment.key}`} />
              <span>{segment.label}</span>
              <strong>{segment.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ════════════════════════════════════════════════════════════ */
export default function DashboardPage({ toast }) {
  const { user, isAdmin } = useAuth();

  const [analytics,  setAnalytics]  = useState(null);
  const [userStats,  setUserStats]  = useState(null);
  const [myTasks,    setMyTasks]    = useState([]);
  const [adminFeed,  setAdminFeed]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [statsError, setStatsError] = useState(false);

  const loadData = (admin) => {
    setLoading(true);
    setStatsError(false);
    const promises = [];
    if (admin) {
      promises.push(
        api.get('/analytics/')
          .then(r => setAnalytics(r.data))
          .catch(() => toast?.error('Failed to load analytics')),
        api.get('/activity/', { params: { limit: 8 } })
          .then(r => setAdminFeed(r.data))
          .catch(() => {}),
      );
    } else {
      promises.push(
        api.get('/analytics/me')
          .then(r => { setUserStats(r.data); setStatsError(false); })
          .catch(() => { setStatsError(true); toast?.error('Failed to load your stats'); }),
        api.get('/tasks/', { params: { limit: 50 } })
          .then(r => setMyTasks(r.data))
          .catch(() => {}),
      );
    }
    Promise.all(promises).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(isAdmin); }, [isAdmin]);

  const today = new Date().toDateString();
  const dueTodayTasks = myTasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date).toDateString() === today;
  });

  const completionPct = analytics
    ? Math.round((analytics.tasks.completed / Math.max(analytics.tasks.total, 1)) * 100)
    : 0;

  const userCompletionPct = userStats?.tasks?.total > 0
    ? Math.round((userStats.tasks.completed / userStats.tasks.total) * 100)
    : 0;

  const completionSegments = userStats?.tasks?.total > 0 ? [
    { key: 'completed',   label: 'Completed',   count: userStats.tasks.completed,   pct: Math.round((userStats.tasks.completed / userStats.tasks.total) * 100) },
    { key: 'in-progress', label: 'In Progress', count: userStats.tasks.in_progress, pct: Math.round((userStats.tasks.in_progress / userStats.tasks.total) * 100) },
    { key: 'pending',     label: 'Pending',     count: userStats.tasks.pending,     pct: Math.round((userStats.tasks.pending / userStats.tasks.total) * 100) },
  ] : [];

  const weeklyTrendData = buildWeeklyTrend(myTasks, userStats?.tasks?.total || myTasks.length || 1);

  /* ── ADMIN LAYOUT ──────────────────────────────────────────── */
  if (isAdmin) {
    return (
      <div className="db-page">
        {/* Header */}
        <div className="db-header animate-in">
          <div>
            <h2 className="db-greeting">
              Welcome back, <span className="text-gradient">{user?.full_name || user?.username}</span>
            </h2>
            <p className="db-sub">Here's your investment portal overview.</p>
          </div>
          <Link to="/applications" className="btn btn-primary">
            <FileSpreadsheet size={15} /> View Applications <ArrowRight size={14} />
          </Link>
        </div>

        {/* Stats row */}
        <div className="db-stats-row">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-stat" />)
            : <>
                <StatCard label="Total Tasks"    value={analytics?.tasks.total}
                  icon={CheckSquare}    color="indigo" sub={`${analytics?.tasks.completed} completed`} />
                <StatCard label="Completion Rate" value={`${completionPct}%`}
                  icon={TrendingUp}     color="violet" sub={`${analytics?.tasks.pending} pending`} />
                <StatCard label="Applications"   value={analytics?.applications.total}
                  icon={FileSpreadsheet} color="cyan"  sub="Startup submissions" />
                <StatCard label="Avg Deal Score" value={analytics?.applications.average_deal_score}
                  icon={BarChart2}      color="amber"  sub="Out of 100" />
              </>
          }
        </div>

        {/* Main grid */}
        <div className="db-main-grid">
          {/* Left column */}
          <div className="db-col">
            {loading
              ? <div className="skeleton" style={{ flex: 1, borderRadius: 'var(--radius-lg)' }} />
              : <>
                  <ProgressCard
                    title="Task Completion Rate" pct={completionPct}
                    left={`${analytics?.tasks.completed} completed`}
                    right={`${analytics?.tasks.total} total`}
                  />
                  <StageBar analytics={analytics} />
                  {analytics?.top_searches?.length > 0 && (
                    <div className="db-card db-card-fill animate-in">
                      <div className="db-card-header">
                        <div className="db-card-title-row">
                          <Search size={16} color="var(--text-brand)" />
                          <h3 className="db-card-title">Top AI Search Queries</h3>
                        </div>
                      </div>
                      <div className="top-searches">
                        {analytics.top_searches.map((s, i) => (
                          <div key={i} className="search-row">
                            <span className="search-rank">#{i + 1}</span>
                            <span className="search-query">{s.query}</span>
                            <span className="badge badge-primary">{s.count}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
            }
          </div>

          {/* Right column — activity */}
          <div className="db-col">
            {loading
              ? <div className="skeleton" style={{ flex: 1, borderRadius: 'var(--radius-lg)' }} />
              : <ActivityFeed items={adminFeed} title="Recent System Activity" adminView={true} />
            }
          </div>
        </div>
      </div>
    );
  }

  /* ── USER LAYOUT ───────────────────────────────────────────── */
  return (
    <div className="db-page">
      {/* Header */}
      <div className="db-header animate-in">
        <div>
          <h2 className="db-greeting">
            Welcome back, <span className="text-gradient">{user?.full_name || user?.username}</span>
          </h2>
          <p className="db-sub">Here's what's happening with your account today.</p>
        </div>
        {statsError && !loading && (
          <button className="btn btn-secondary btn-sm" onClick={() => loadData(false)}>
            <RefreshCw size={14} /> Retry
          </button>
        )}
      </div>

      {/* Banners */}
      {!loading && <DueTodayBanner tasks={dueTodayTasks} />}
      {!loading && statsError && (
        <div className="stats-error-banner animate-in">
          <AlertCircle size={16} />
          <span>Could not load your stats — the server may be unavailable.</span>
        </div>
      )}

      {/* Stats row */}
      <div className="db-stats-row">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton skeleton-stat" />)
          : <>
              <StatCard label="My Tasks"    value={userStats?.tasks?.total ?? 0}
                icon={CheckSquare}  color="indigo" sub="Total assigned" />
              <StatCard label="Completed"   value={userStats?.tasks?.completed ?? 0}
                icon={CheckCircle2} color="violet" sub="Finished tasks" />
              <StatCard label="In Progress" value={userStats?.tasks?.in_progress ?? 0}
                icon={AlertCircle}  color="cyan"   sub="Active tasks" />
              <StatCard label="AI Searches" value={userStats?.search_count ?? 0}
                icon={Search}       color="amber"  sub="Queries run" />
            </>
        }
      </div>

      {/* Main grid */}
      <div className="db-main-grid">
        {/* Left column — completion & quick actions */}
        <div className="db-col">
          {/* Completion progress */}
          {!loading && userStats && userStats.tasks?.total > 0 && (
            <CompletionInsightsCard
              title="My Task Completion"
              pct={userCompletionPct}
              segments={completionSegments}
              data={weeklyTrendData}
            />
          )}

          {/* New User Empty State */}
          {!loading && userStats && (userStats.tasks?.total === 0 || !userStats.tasks) && !userStats?.application && (
            <div className="db-card animate-in" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'var(--brand-muted)', marginBottom: '16px' }}>
                  <Star size={32} color="var(--brand)" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Welcome to FSV Capital!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
                  You don't have any pending tasks or funding applications yet. Get started by applying for funding or exploring our resources.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link to="/apply" className="btn btn-primary">Apply for Funding</Link>
                  <Link to="/documents" className="btn btn-secondary">View Documents</Link>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="db-card db-card-fill animate-in">
            <div className="db-card-header">
              <div className="db-card-title-row">
                <Zap size={16} color="var(--text-brand)" />
                <h3 className="db-card-title">Quick Actions</h3>
              </div>
            </div>
            <div className="qa-grid">
              <QACard to="/tasks"    iconClass="qa-icon-indigo" icon={CheckSquare}   label="My Tasks"         sub={`${userStats?.tasks.pending ?? '–'} pending`} />
              <QACard to="/search"   iconClass="qa-icon-blue"   icon={Search}        label="AI Search"        sub="Semantic knowledge base" />
              <QACard to="/documents"iconClass="qa-icon-violet"  icon={FileText}      label="Documents"        sub="Knowledge vault" />
              <QACard to="/profile"  iconClass="qa-icon-green"  icon={User}          label="My Profile"       sub="Account settings" />
              <QACard to="/activity" iconClass="qa-icon-cyan"   icon={Activity}      label="Activity Log"     sub="Your action history" />
            </div>
          </div>
        </div>

        {/* Right column — activity only */}
        <div className="db-col">
          {loading
            ? <div className="skeleton" style={{ flex: 1, borderRadius: 'var(--radius-lg)' }} />
            : <ActivityFeed items={userStats?.recent_activity} title="My Recent Activity" />
          }
        </div>
      </div>

      {/* Full-width funding application at bottom */}
      {!loading && userStats?.application && (
        <div className="db-funding-section">
          <AppStatusWidget application={userStats.application} compact={true} />
        </div>
      )}
    </div>
  );
}
