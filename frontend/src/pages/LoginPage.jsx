import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Zap, ArrowRight, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ParticleCanvas from '../components/ParticleCanvas';
import './LoginPage.css';

export default function LoginPage({ toast }) {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      toast?.success(`Welcome back, ${user.full_name || user.username}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left side: Particle Animation + Branding */}
      <div className="login-visual">
        {/* Full-panel animated canvas */}
        <ParticleCanvas className="particle-canvas" />

        {/* Overlay content on top of canvas */}
        <div className="visual-overlay">
          <div className="login-brand" style={{ padding: 0 }}>
            <div className="brand-icon">
              <Zap size={22} color="white" />
            </div>
            <div>
              <div className="brand-name">FSV Capital</div>
              <div className="brand-tagline">Fueling DeepTech, Fintech &amp; Future Innovation</div>
            </div>
          </div>

          <div className="visual-text">
            <div className="visual-badge">AI-Powered Platform</div>
            <h2>Deal Intelligence<br />at Scale</h2>
            <p>Access the unified investment portal to review pitches, manage deal flow, and leverage semantic search across our entire knowledge base.</p>
            <div className="visual-stats">
              <div className="vstat">
                <span className="vstat-val">500+</span>
                <span className="vstat-lbl">Startups Reviewed</span>
              </div>
              <div className="vstat">
                <span className="vstat-val">$2.4B</span>
                <span className="vstat-lbl">AUM Tracked</span>
              </div>
              <div className="vstat">
                <span className="vstat-val">98%</span>
                <span className="vstat-lbl">Match Accuracy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="login-panel">
        <div className="login-container animate-in">
          <div className="login-header">
            <div className="brand-icon" style={{ width: 48, height: 48, marginBottom: 8 }}>
              <Zap size={24} color="white" />
            </div>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Sign in to your investor account</p>
          </div>

          {error && (
            <div className="login-error">
              <Lock size={14} />
              {error}
            </div>
          )}

          <form onSubmit={submit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                <User size={14} /> Username
              </label>
              <input
                id="username"
                name="username"
                className="form-input"
                placeholder="Enter your username"
                value={form.username}
                onChange={handle}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <Lock size={14} /> Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handle}
                  autoComplete="current-password"
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
                  {showPwd ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in…</> : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/signup">Create account →</Link>
            </p>
            <p style={{ marginTop: 6 }}>
              Want to apply for funding?{' '}
              <Link to="/apply">Submit your application →</Link>
            </p>
          </div>

          {/* Demo credentials hint */}
          <div className="login-hint glass-card" style={{ marginTop: 'var(--space-6)' }}>
            <div className="hint-label">Demo credentials</div>
            <div className="hint-row"><span>Admin:</span><code>admin / admin123</code></div>
            <div className="hint-row"><span>User:</span><code>user1 / user123</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
