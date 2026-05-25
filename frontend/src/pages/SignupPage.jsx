import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, Zap, ArrowRight, Lock, User, Mail, UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ParticleCanvas from '../components/ParticleCanvas';
import './SignupPage.css';

/* Password strength helper */
const strength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8)               score++;
  if (/[A-Z]/.test(pwd))             score++;
  if (/[0-9]/.test(pwd))             score++;
  if (/[^A-Za-z0-9]/.test(pwd))      score++;
  return score; // 0–4
};
const strengthLabel  = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor  = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export default function SignupPage({ toast }) {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    username:  '',
    email:     '',
    password:  '',
    confirm:   '',
    role:      'user',
  });

  const [showPwd,  setShowPwd]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const pwdStrength = strength(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        username:  form.username,
        email:     form.email,
        password:  form.password,
        full_name: form.full_name || undefined,
        role:      form.role,
      });
      setSuccess(true);
      toast?.success('Account created! Please sign in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      {/* Left side: Particle Canvas */}
      <div className="signup-visual">
        <ParticleCanvas className="particle-canvas" />

        <div className="signup-visual-overlay">
          {/* Brand */}
          <div className="signup-brand">
            <div className="brand-icon">
              <Zap size={22} color="white" />
            </div>
            <div>
              <div className="brand-name">FSV Capital</div>
              <div className="brand-tagline">Fueling DeepTech, Fintech &amp; Future Innovation</div>
            </div>
          </div>

          {/* Hero copy */}
          <div className="signup-hero">
            <div className="visual-badge">Join the Network</div>
            <h2>Your Gateway to<br />Smarter Investing</h2>
            <p>
              Create your investor account and gain access to AI-curated deal flow,
              semantic search, and real-time portfolio intelligence.
            </p>

            {/* Feature checklist */}
            <ul className="signup-features">
              {[
                'AI-powered deal scoring & matching',
                'Semantic search across all submissions',
                'Real-time task & pipeline management',
                'Institutional-grade document vault',
              ].map((f) => (
                <li key={f}>
                  <CheckCircle2 size={15} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right side: Sign-up Form */}
      <div className="signup-panel">
        <div className="signup-container animate-in">
          {success ? (
            <div className="signup-success">
              <div className="success-icon">
                <CheckCircle2 size={40} color="#10b981" />
              </div>
              <h2>Account Created!</h2>
              <p>Redirecting you to the login page…</p>
            </div>
          ) : (
            <>
              <div className="signup-header">
                <div className="brand-icon" style={{ width: 48, height: 48, marginBottom: 8 }}>
                  <Zap size={24} color="white" />
                </div>
                <h1 className="signup-title">Create account</h1>
                <p className="signup-subtitle">Join FSV Capital&apos;s investor platform</p>
              </div>

              {error && (
                <div className="signup-error">
                  <Lock size={14} />
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="signup-form">
                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="full_name">
                    <UserCheck size={14} /> Full Name
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    className="form-input"
                    placeholder="Jane Smith"
                    value={form.full_name}
                    onChange={handle}
                    autoComplete="name"
                  />
                </div>

                {/* Username */}
                <div className="form-group">
                  <label className="form-label" htmlFor="su-username">
                    <User size={14} /> Username <span className="required">*</span>
                  </label>
                  <input
                    id="su-username"
                    name="username"
                    className="form-input"
                    placeholder="janesmith"
                    value={form.username}
                    onChange={handle}
                    autoComplete="username"
                    required
                  />
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label" htmlFor="su-email">
                    <Mail size={14} /> Email Address <span className="required">*</span>
                  </label>
                  <input
                    id="su-email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={handle}
                    autoComplete="email"
                    required
                  />
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="su-password">
                    <Lock size={14} /> Password <span className="required">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="su-password"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={handle}
                      autoComplete="new-password"
                      required
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => setShowPwd(s => !s)}
                      style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                      aria-label="Toggle password visibility"
                    >
                      {showPwd
                        ? <EyeOff size={16} color="var(--text-muted)" />
                        : <Eye    size={16} color="var(--text-muted)" />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {form.password && (
                    <div className="pwd-strength">
                      <div className="pwd-bars">
                        {[1, 2, 3, 4].map((lvl) => (
                          <div
                            key={lvl}
                            className="pwd-bar"
                            style={{
                              background: lvl <= pwdStrength
                                ? strengthColor[pwdStrength]
                                : 'var(--border-default)',
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ color: strengthColor[pwdStrength] }}>
                        {strengthLabel[pwdStrength]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="su-confirm">
                    <Lock size={14} /> Confirm Password <span className="required">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="su-confirm"
                      name="confirm"
                      type={showConf ? 'text' : 'password'}
                      className={`form-input${form.confirm && form.confirm !== form.password ? ' error' : ''}`}
                      placeholder="Repeat your password"
                      value={form.confirm}
                      onChange={handle}
                      autoComplete="new-password"
                      required
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={() => setShowConf(s => !s)}
                      style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConf
                        ? <EyeOff size={16} color="var(--text-muted)" />
                        : <Eye    size={16} color="var(--text-muted)" />}
                    </button>
                  </div>
                  {form.confirm && form.confirm !== form.password && (
                    <span className="form-error">Passwords do not match</span>
                  )}
                </div>

                {/* Role selector */}
                <div className="form-group">
                  <label className="form-label" htmlFor="su-role">Account Type</label>
                  <select
                    id="su-role"
                    name="role"
                    className="form-select"
                    value={form.role}
                    onChange={handle}
                  >
                    <option value="user">Investor / Analyst</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={loading}
                >
                  {loading
                    ? <><span className="spinner" /> Creating account…</>
                    : <>Create Account <ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="signup-footer">
                <p>
                  Already have an account?{' '}
                  <Link to="/login">Sign in →</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
