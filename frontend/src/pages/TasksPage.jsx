import { useEffect, useState } from 'react';
import {
  CheckSquare, Clock, CheckCircle, AlertCircle, Plus,
  Calendar, User,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './TasksPage.css';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     class: 'badge-warning', icon: Clock },
  in_progress: { label: 'In Progress', class: 'badge-info',    icon: AlertCircle },
  completed:   { label: 'Completed',   class: 'badge-success', icon: CheckCircle },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    class: 'badge-info' },
  medium: { label: 'Medium', class: 'badge-warning' },
  high:   { label: 'High',   class: 'badge-error' },
  urgent: { label: 'Urgent', class: 'badge-error' },
};

/* ── Due-date helpers ────────────────────────────────────────── */
function dueDateLabel(dateStr, status) {
  if (!dateStr || status === 'completed') return null;
  const due   = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff  = Math.floor((due - today) / 86400000);   // days

  if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, cls: 'due-overdue' };
  if (diff === 0) return { text: 'Due today',      cls: 'due-today' };
  if (diff === 1) return { text: 'Due tomorrow',   cls: 'due-soon' };
  return {
    text: `Due ${due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
    cls: 'due-normal',
  };
}

export default function TasksPage({ toast }) {
  const { isAdmin } = useAuth();
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [statusF,    setStatusF]    = useState('');
  const [priorityF,  setPriorityF]  = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [newTask,    setNewTask]    = useState({
    title: '', description: '', priority: 'medium', assigned_to: '', due_date: '',
  });
  const [assignees,  setAssignees]  = useState([]);

  const fetchTasks = (sf = statusF, pf = priorityF) => {
    setLoading(true);
    const params = {};
    if (sf) params.status = sf;
    api.get('/tasks/', { params })
      .then(r => {
        let data = r.data;
        if (pf) data = data.filter(t => t.priority === pf);
        setTasks(data);
      })
      .catch(() => toast?.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/auth/assignees')
      .then((r) => setAssignees(r.data))
      .catch(() => toast?.error('Failed to load team members'));
  }, [isAdmin]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tasks/${id}`, { status });
      setTasks(t => t.map(task => task.id === id ? { ...task, status } : task));
      toast?.success('Task updated!');
    } catch { toast?.error('Failed to update task'); }
  };

  /* Admin: bulk complete all visible tasks */
  const bulkComplete = async () => {
    const incomplete = tasks.filter(t => t.status !== 'completed');
    if (!incomplete.length) return;
    try {
      await Promise.all(incomplete.map(t => api.put(`/tasks/${t.id}`, { status: 'completed' })));
      setTasks(ts => ts.map(t => ({ ...t, status: 'completed' })));
      toast?.success(`${incomplete.length} tasks marked complete!`);
    } catch { toast?.error('Bulk update failed'); }
  };

  const createTask = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = { ...newTask };
      if (payload.assigned_to) payload.assigned_to = parseInt(payload.assigned_to, 10);
      else delete payload.assigned_to;
      if (!payload.due_date) delete payload.due_date;
      const r = await api.post('/tasks/', payload);
      setTasks(t => [r.data, ...t]);
      setShowCreate(false);
      setNewTask({ title: '', description: '', priority: 'medium', assigned_to: '', due_date: '' });
      toast?.success('Task created!');
    } catch (err) {
      toast?.error(err.response?.data?.detail || 'Failed to create task');
    } finally { setCreating(false); }
  };

  /* Stats summary */
  const total      = tasks.length;
  const completed  = tasks.filter(t => t.status === 'completed').length;
  const overdue    = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date) < new Date();
  }).length;

  return (
    <div className="page">
      <div className="page-header animate-in">
        <div>
          <h2>Task Management</h2>
          <p style={{ marginTop: 4 }}>Track and manage all assigned tasks.</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {/* Status filter */}
          <select
            id="status-filter"
            className="form-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={statusF}
            onChange={e => { setStatusF(e.target.value); fetchTasks(e.target.value, priorityF); }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority filter */}
          <select
            id="priority-filter"
            className="form-select"
            style={{ width: 'auto', minWidth: 140 }}
            value={priorityF}
            onChange={e => { setPriorityF(e.target.value); fetchTasks(statusF, e.target.value); }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {isAdmin && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={bulkComplete} title="Mark all complete">
                <CheckCircle size={14} /> Bulk Complete
              </button>
              <button className="btn btn-primary" onClick={() => setShowCreate(s => !s)}>
                <Plus size={15} /> New Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task summary strip */}
      {!loading && tasks.length > 0 && (
        <div className="task-summary-strip animate-in">
          <div className="tsstrip-item">
            <CheckSquare size={13} color="var(--text-muted)" />
            <span>{total} total</span>
          </div>
          <div className="tsstrip-sep" />
          <div className="tsstrip-item">
            <CheckCircle size={13} color="var(--success)" />
            <span style={{ color: 'var(--success)' }}>{completed} done</span>
          </div>
          <div className="tsstrip-sep" />
          <div className="tsstrip-item">
            <Clock size={13} color={overdue ? 'var(--error)' : 'var(--text-muted)'} />
            <span style={{ color: overdue ? 'var(--error)' : 'var(--text-muted)' }}>
              {overdue} overdue
            </span>
          </div>
          {total > 0 && (
            <>
              <div className="tsstrip-sep" />
              <div className="tsstrip-progress">
                <div className="progress-track" style={{ flex: 1, height: 5 }}>
                  <div className="progress-fill" style={{ width: `${Math.round((completed / total) * 100)}%` }} />
                </div>
                <span>{Math.round((completed / total) * 100)}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Create task form */}
      {showCreate && isAdmin && (
        <div className="glass-card animate-in" style={{ padding: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-5)', fontSize: '1rem' }}>Create New Task</h3>
          <form onSubmit={createTask} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Title <span className="required">*</span></label>
                <input className="form-input" required value={newTask.title}
                  onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} placeholder="Task title" />
              </div>
              <div className="form-group">
                <label className="form-label"><User size={13} /> Assign to</label>
                <select
                  className="form-select"
                  value={newTask.assigned_to}
                  onChange={e => setNewTask(t => ({ ...t, assigned_to: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {assignees.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.full_name || u.username} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={newTask.description} style={{ minHeight: 70 }}
                onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} placeholder="Task details…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label"><Calendar size={13} /> Due Date</label>
                <input type="datetime-local" className="form-input" value={newTask.due_date}
                  onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <div className="radio-group">
                  {['low', 'medium', 'high', 'urgent'].map(p => (
                    <label key={p} className={`radio-option ${newTask.priority === p ? 'selected' : ''}`}>
                      <input type="radio" value={p} checked={newTask.priority === p}
                        onChange={() => setNewTask(t => ({ ...t, priority: p }))} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? <><span className="spinner" /> Creating…</> : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-card empty-state animate-in">
          <CheckSquare size={40} color="var(--text-muted)" />
          <p>No tasks found{statusF || priorityF ? ' with selected filters' : ''}.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {tasks.map((task, i) => {
            const sc   = STATUS_CONFIG[task.status]   || STATUS_CONFIG.pending;
            const pc   = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            const StatusIcon = sc.icon;
            const due  = dueDateLabel(task.due_date, task.status);

            return (
              <div
                key={task.id}
                className={`glass-card task-card animate-in ${due?.cls === 'due-overdue' ? 'task-overdue' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="task-card-left">
                  <div className={`task-card-icon task-icon-${task.status}`}>
              <StatusIcon
                size={16}
                color={
                  task.status === 'completed'  ? 'var(--success)' :
                  task.status === 'in_progress' ? 'var(--info)'    : 'var(--warning)'
                }
              />
            </div>
            <div className="task-card-info">
                    <span className="task-title">{task.title}</span>
                    {task.description && (
                      <span className="task-desc">{task.description}</span>
                    )}
                    {/* Due date + assignee row */}
                    <div className="task-meta-row">
                      {due && (
                        <span className={`task-due-tag ${due.cls}`}>
                          <Calendar size={10} /> {due.text}
                        </span>
                      )}
                      {task.assignee?.username && (
                        <span className="task-assignee-tag">
                          <User size={10} /> {task.assignee.full_name || task.assignee.username}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="task-card-right">
                  <div className="task-card-badges">
                    <span className={`badge ${pc.class} task-priority-badge`}>{pc.label}</span>
                    <span className={`badge ${sc.class} task-status-badge`}>{sc.label}</span>
                  </div>
                  <select
                    className="form-select task-status-select"
                    value={task.status}
                    onChange={e => updateStatus(task.id, e.target.value)}
                    disabled={task.status === 'completed'}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
