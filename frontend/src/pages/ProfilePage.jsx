import { useState } from 'react';
import { User, Mail, Lock, Save, Eye, EyeOff, Shield, Calendar, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './ProfilePage.css';

export default function ProfilePage({ toast }) {
  const { user, login } = useAuth();

  // Profile fields
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email:     user?.email    || '',
  });

  // Password change
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  const [saving,     setSaving]     = useState(false);
  const [savingPwd,  setSavingPwd]  = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [pwdMsg,     setPwdMsg]     = useState('');

  const handleForm = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handlePwd  = e => setPwd(p => ({ ...p, [e.target.name]: e.target.value }));

  /* ── Save profile info ─────────────────────────────────────── */
  const saveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg('');
    try {
      const { data } = await api.patch('/auth/me', {
        full_name: form.full_name || null,
        email:     form.email,
      });
      // Update cached user in localStorage so sidebar shows new name immediately
      const stored = JSON.parse(localStorage.getItem('fsv_user') || '{}');
      localStorage.setItem('fsv_user', JSON.stringify({ ...stored, ...data }));
      setProfileMsg('Profile updated successfully!');
      toast?.success('Profile updated!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update profile.';
      setProfileMsg(msg);
      toast?.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── Change password ─────────────────────────────────────────  */
  const changePassword = async e => {
    e.preventDefault();
    setPwdMsg('');
    if (pwd.next !== pwd.confirm) { setPwdMsg('New passwords do not match.'); return; }
    if (pwd.next.length < 6)      { setPwdMsg('Password must be at least 6 characters.'); return; }
    setSavingPwd(true);
    try {
      await api.patch('/auth/me', { password: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      setPwdMsg('Password changed successfully!');
      toast?.success('Password changed!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to change password.';
      setPwdMsg(msg);
      toast?.error(msg);
    } finally {
      setSavingPwd(false);
    }
  };

  const toggle = key => setShowPwd(s => ({ ...s, [key]: !s[key] }));

  /* ── Avatar initials ─────────────────────────────────────────  */
  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header animate-in">
        <div>
          <h2><span className="text-gradient">My Profile</span></h2>
          <p style={{ marginTop: 4 }}>Manage your account information and security settings.</p>
        </div>
      </div>

      <div className="profile-layout">
        {/* Left: Avatar card */}
        <div className="profile-avatar-card glass-card animate-in">
          <div className="profile-avatar-ring">
            <div className="profile-avatar">{initials}</div>
          </div>
          <div className="profile-avatar-name">{user?.full_name || user?.username}</div>
          <div className="profile-avatar-email">{user?.email}</div>

          <div className="profile-role-badge">
            <Shield size={13} />
            {user?.role === 'admin' ? 'Administrator' : 'Investor / Analyst'}
          </div>

          <div className="profile-meta">
            <div className="profile-meta-row">
              <User size={13} />
              <span>@{user?.username}</span>
            </div>
            <div className="profile-meta-row">
              <Zap size={13} />
              <span>FSV Capital</span>
            </div>
          </div>
        </div>

        {/* Right: Forms */}
        <div className="profile-forms">
          {/* ── Personal Info ─────────────────────────────── */}
          <div className="glass-card profile-section animate-in">
            <div className="profile-section-header">
              <User size={16} color="var(--text-brand)" />
              <h3>Personal Information</h3>
            </div>

            {profileMsg && (
              <div className={`profile-msg ${profileMsg.includes('success') ? 'profile-msg-ok' : 'profile-msg-err'}`}>
                {profileMsg}
              </div>
            )}

            <form onSubmit={saveProfile} className="profile-form">
              <div className="form-group">
                <label className="form-label" htmlFor="full_name">
                  <User size={13} /> Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  className="form-input"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={handleForm}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  <Mail size={13} /> Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={handleForm}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  value={user?.username || ''}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
                <span className="form-hint">Username cannot be changed.</span>
              </div>

              <div className="profile-form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>

          {/* ── Change Password ───────────────────────────── */}
          <div className="glass-card profile-section animate-in" style={{ animationDelay: '100ms' }}>
            <div className="profile-section-header">
              <Lock size={16} color="var(--text-brand)" />
              <h3>Change Password</h3>
            </div>

            {pwdMsg && (
              <div className={`profile-msg ${pwdMsg.includes('success') ? 'profile-msg-ok' : 'profile-msg-err'}`}>
                {pwdMsg}
              </div>
            )}

            <form onSubmit={changePassword} className="profile-form">
              {[
                { key: 'next',    label: 'New Password',     placeholder: 'Min. 6 characters',    autocomplete: 'new-password' },
                { key: 'confirm', label: 'Confirm Password', placeholder: 'Repeat new password', autocomplete: 'new-password' },
              ].map(({ key, label, placeholder, autocomplete }) => (
                <div className="form-group" key={key}>
                  <label className="form-label" htmlFor={`pwd-${key}`}>
                    <Lock size={13} /> {label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id={`pwd-${key}`}
                      name={key}
                      type={showPwd[key] ? 'text' : 'password'}
                      className={`form-input${key === 'confirm' && pwd.confirm && pwd.confirm !== pwd.next ? ' error' : ''}`}
                      placeholder={placeholder}
                      value={pwd[key]}
                      onChange={handlePwd}
                      autoComplete={autocomplete}
                      required
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => toggle(key)}
                      style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                    >
                      {showPwd[key]
                        ? <EyeOff size={15} color="var(--text-muted)" />
                        : <Eye    size={15} color="var(--text-muted)" />}
                    </button>
                  </div>
                  {key === 'confirm' && pwd.confirm && pwd.confirm !== pwd.next && (
                    <span className="form-error">Passwords do not match</span>
                  )}
                </div>
              ))}

              <div className="profile-form-actions">
                <button type="submit" className="btn btn-primary" disabled={savingPwd}>
                  {savingPwd
                    ? <><span className="spinner" /> Updating…</>
                    : <><Lock size={14} /> Update Password</>}
                </button>
              </div>
            </form>
          </div>

          {/* ── Account Info (read-only) ──────────────────── */}
          <div className="glass-card profile-section animate-in" style={{ animationDelay: '200ms' }}>
            <div className="profile-section-header">
              <Shield size={16} color="var(--text-brand)" />
              <h3>Account Details</h3>
            </div>
            <div className="profile-details-grid">
              <div className="profile-detail">
                <span className="profile-detail-label">Role</span>
                <span className={`badge ${user?.role === 'admin' ? 'badge-primary' : 'badge-info'}`}>
                  {user?.role}
                </span>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-label">Platform</span>
                <span className="profile-detail-val">FSV Capital</span>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-label">Account Status</span>
                <span className="badge badge-success">Active</span>
              </div>
              <div className="profile-detail">
                <span className="profile-detail-label">Auth</span>
                <span className="profile-detail-val">JWT / Bearer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
