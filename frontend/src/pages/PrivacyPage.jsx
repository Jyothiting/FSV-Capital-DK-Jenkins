import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import './PrivacyPage.css';

export default function PrivacyPage() {
  return (
    <div className="privacy-page">
      <header className="privacy-header">
        <Link to="/apply" className="privacy-back">
          <ArrowLeft size={16} /> Back to application
        </Link>
        <div className="privacy-brand">
          <Shield size={20} color="var(--brand-primary)" />
          <div>
            <h1>Privacy Policy</h1>
            <p>FSV Capital — Data protection under India&apos;s DPDP Act, 2023</p>
          </div>
        </div>
      </header>

      <main className="privacy-content glass-card">
        <section>
          <h2>1. Who we are</h2>
          <p>
            FSV Capital (&quot;we&quot;, &quot;us&quot;) operates the Startup Funding Application
            and related investor portal. This policy explains how we collect, use, and protect
            personal and business information you submit through our platform.
          </p>
        </section>

        <section>
          <h2>2. Information we collect</h2>
          <ul>
            <li>Founder and company identity (names, email, phone, location)</li>
            <li>Business details (problem, solution, market, traction, financials, funding ask)</li>
            <li>Uploaded documents (pitch deck PDF and optional materials)</li>
            <li>Account data if you register on the investor portal</li>
            <li>Technical logs (IP address, login and activity events) for security and audit</li>
          </ul>
        </section>

        <section>
          <h2>3. How we use your data</h2>
          <p>We process your information to:</p>
          <ul>
            <li>Evaluate funding applications and generate deal screening scores</li>
            <li>Share application materials with FSV Capital&apos;s investment team and approved partners</li>
            <li>Communicate with you about your application status</li>
            <li>Operate internal task and knowledge-management tools used by our team</li>
            <li>Comply with legal obligations and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2>4. Legal basis (DPDP Act 2023)</h2>
          <p>
            We rely on your <strong>explicit consent</strong> (provided via the application consent
            checkbox) to process and share your data with investment partners. You may withdraw
            consent by contacting us; withdrawal may limit our ability to continue reviewing your
            application.
          </p>
        </section>

        <section>
          <h2>5. Data retention &amp; security</h2>
          <p>
            Application data is stored on secure servers with access restricted to authorized
            personnel. We retain records for as long as needed for investment review, regulatory
            compliance, and legitimate business purposes, then delete or anonymize where appropriate.
          </p>
        </section>

        <section>
          <h2>6. Your rights</h2>
          <p>Under applicable law, you may request:</p>
          <ul>
            <li>Access to personal data we hold about you</li>
            <li>Correction of inaccurate information</li>
            <li>Erasure where processing is no longer necessary</li>
            <li>Grievance redressal through our designated contact</li>
          </ul>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            For privacy requests or questions: <strong>privacy@fsvcapital.com</strong>
            <br />
            FSV Capital
          </p>
        </section>

        <p className="privacy-updated">Last updated: May 2026</p>
      </main>
    </div>
  );
}
