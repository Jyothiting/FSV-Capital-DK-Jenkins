import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, FileText, Search,
  FileSpreadsheet, Zap, LogOut, User, Activity, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',        icon: CheckSquare,     label: 'Tasks' },
  { to: '/documents',    icon: FileText,        label: 'Documents' },
  { to: '/search',       icon: Search,          label: 'AI Search' },
  { to: '/applications', icon: FileSpreadsheet, label: 'Applications', adminOnly: true },
  { to: '/activity',     icon: Activity,        label: 'Activity Log' },
  { to: '/profile',      icon: User,            label: 'My Profile' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Zap size={18} color="white" />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">FSV Capital</span>
          <span className="sidebar-brand-sub">Investment Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Menu</div>
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
            <ChevronRight size={13} className="sidebar-link-arrow" />
          </NavLink>
        ))}
      </nav>

      {/* Apply link */}
      <div className="sidebar-apply">
        <NavLink to="/apply" className="btn btn-primary btn-full" style={{ fontSize: '0.8rem' }}>
          <FileSpreadsheet size={14} /> Apply for Funding
        </NavLink>
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.full_name || user?.username}</span>
            <div className="sidebar-user-meta">
              <span className="sidebar-user-role-label">Role</span>
              <span className={`sidebar-user-role-badge ${isAdmin ? 'admin' : 'user'}`}>
                {isAdmin ? 'Administrator' : 'Investor'}
              </span>
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-icon sidebar-logout" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
