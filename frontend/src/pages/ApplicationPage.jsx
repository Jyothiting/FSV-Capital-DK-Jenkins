import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, FileText, Shield, Target } from 'lucide-react';
import api from '../services/api';

export default function ApplicationPage({ toast }) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/applications/me')
      .then((r) => {
        setApplication(r.data);
        setError(false);
      })
      .catch(() => {
        toast?.error('Failed to load your application details');
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header animate-in">
        <div>
          <h2>My Funding Application</h2>
          <p style={{ marginTop: 4 }}>Review the latest details and status of your startup application.</p>
        </div>
        <Link to="/dashboard" className="btn btn-secondary">
          Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 96, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card empty-state animate-in">
          <Shield size={40} color="var(--text-muted)" />
          <p>Unable to load application information right now.</p>
        </div>
      ) : !application ? (
        <div className="glass-card empty-state animate-in">
          <Shield size={40} color="var(--text-muted)" />
          <p>You haven't submitted an application yet.</p>
          <Link to="/apply" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Submit your application
          </Link>
        </div>
      ) : (
        <div className="glass-card animate-in" style={{ padding: 'var(--space-5)' }}>
          <div className="db-card-header" style={{ padding: 0, marginBottom: 'var(--space-4)' }}>
            <div className="db-card-title-row">
              <Target size={18} color="var(--text-brand)" />
              <h3 className="db-card-title">{application.startup_name}</h3>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${application.status === 'Accepted' ? 'badge-success' : application.status === 'Rejected' ? 'badge-error' : application.status === 'Under Review' ? 'badge-warning' : 'badge-info'}`}>
                {application.status}
              </span>
              {(application.submitted_at || application.created_at) && (
                <span className="app-status-date compact">
                  <Clock size={12} /> Submitted {new Date(application.submitted_at || application.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <h4 style={{ marginBottom: '8px' }}>Application Summary</h4>
                <div className="app-status-details">
                  <div><strong>Sector:</strong> {application.industry_sector || 'Unknown'}</div>
                  <div><strong>Stage:</strong> {application.current_stage || application.funding_stage || 'N/A'}</div>
                  <div><strong>Funding:</strong> {application.amount_raising || 'TBD'}</div>
                </div>
              </div>
              <div>
                <h4 style={{ marginBottom: '8px' }}>Deal Snapshot</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="badge badge-primary" style={{ width: 'fit-content' }}>
                    Score: {application.deal_score ?? '—'}
                  </div>
                  <div><strong>HQ:</strong> {application.hq_location || 'Not provided'}</div>
                  <div><strong>Founders:</strong> {application.founder_names}</div>
                  <div><strong>Business Model:</strong> {application.business_model || 'N/A'}</div>
                </div>
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 'var(--space-3)' }}>
                  <FileText size={18} color="var(--text-brand)" />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Deal Score</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Quality score from our review model</div>
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-brand)' }}>
                  {application.deal_score ?? 0}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
            <div>
              <h4 style={{ marginBottom: '8px' }}>Use of Funds</h4>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, minHeight: '3.5rem' }}>
                {application.use_of_funds || 'No description provided.'}
              </p>
            </div>
            <div>
              <h4 style={{ marginBottom: '8px' }}>Current Stage</h4>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, minHeight: '3.5rem' }}>
                {application.current_stage || 'Not specified'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
            <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.03)' }}>
              <h4 style={{ marginBottom: '10px' }}>Company & Contact</h4>
              <div className="app-status-details" style={{ gap: '10px' }}>
                <div><strong>Contact Email:</strong> {application.contact_email || 'N/A'}</div>
                <div><strong>Contact Phone:</strong> {application.contact_number || 'N/A'}</div>
                <div><strong>LinkedIn (Founder):</strong> {application.linkedin_founder || 'N/A'}</div>
                <div><strong>LinkedIn (Company):</strong> {application.linkedin_company || 'N/A'}</div>
                <div><strong>Website:</strong> {application.website_url || 'N/A'}</div>
                <div><strong>Registered:</strong> {application.company_registered || 'N/A'}</div>
                <div><strong>Legal Issues:</strong> {application.legal_issues || 'No'}</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.03)' }}>
              <h4 style={{ marginBottom: '10px' }}>Team & Fit</h4>
              <div className="app-status-details" style={{ gap: '10px' }}>
                <div><strong>Founder Background:</strong> {application.founder_background || 'N/A'}</div>
                <div><strong>Team Members:</strong> {application.core_team_members || 'N/A'}</div>
                <div><strong>Advisors / Mentors:</strong> {application.advisors_mentors || 'N/A'}</div>
                <div><strong>FSV Fit:</strong> {application.why_partner || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-5)', display: 'grid', gap: 'var(--space-4)' }}>
            <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.03)' }}>
              <h4 style={{ marginBottom: '10px' }}>Startup Overview</h4>
              <div className="app-status-details" style={{ gap: '10px' }}>
                <div><strong>Problem:</strong> {application.problem_statement || 'N/A'}</div>
                <div><strong>Solution:</strong> {application.solution_overview || 'N/A'}</div>
                <div><strong>Industry:</strong> {application.industry_sector || 'N/A'}</div>
                <div><strong>Business Model:</strong> {application.business_model || 'N/A'}</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.03)' }}>
              <h4 style={{ marginBottom: '10px' }}>Financial & Traction</h4>
              <div className="app-status-details" style={{ gap: '10px' }}>
                <div><strong>Funding Raised:</strong> {application.funding_raised_till_date || 'N/A'}</div>
                <div><strong>Runway:</strong> {application.runway_months ? `${application.runway_months} months` : 'N/A'}</div>
                <div><strong>Revenue:</strong> {application.current_revenue || 'N/A'}</div>
                <div><strong>Growth Rate:</strong> {application.growth_rate || 'N/A'}</div>
                <div><strong>Investors:</strong> {application.investors || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-5)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.03)' }}>
              <h4 style={{ marginBottom: '10px' }}>Documents & Links</h4>
              <div className="app-status-details" style={{ gap: '10px' }}>
                <div><strong>Pitch Deck:</strong> {application.pitch_deck_path || 'N/A'}</div>
                <div><strong>Financial Model:</strong> {application.financial_model_path || 'N/A'}</div>
                <div><strong>Demo Link:</strong> {application.demo_link || 'N/A'}</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: 'var(--space-4)', background: 'rgba(15,23,42,0.03)' }}>
              <h4 style={{ marginBottom: '10px' }}>Compliance & Timing</h4>
              <div className="app-status-details" style={{ gap: '10px' }}>
                <div><strong>Consent Given:</strong> {application.consent_given || 'No'}</div>
                <div><strong>Submitted:</strong> {(application.submitted_at || application.created_at)
                  ? new Date(application.submitted_at || application.created_at).toLocaleString()
                  : 'Unknown'}</div>
                <div><strong>Last Updated:</strong> {application.updated_at ? new Date(application.updated_at).toLocaleString() : 'Unknown'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
