import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Zap, CheckCircle, Upload, Star, Sparkles,
  Building2, Lightbulb, Package, Globe, TrendingUp, DollarSign,
  Users, Handshake, FileCheck, Shield, Save
} from 'lucide-react';
import api from '../services/api';
import {
  validateStep,
  runSubmitScreening,
  getSectorWarning,
} from '../utils/fundingValidation';
import { calcDealScore, scoreBreakdown } from '../utils/dealScore';
import FileUploadField from '../components/FileUploadField';
import './FundingForm.css';

// ---------- Step Definitions ----------
const STEPS = [
  { id: 1, label: 'Basic Info',   icon: Building2,   title: 'Basic Information',         desc: 'Tell us about your company' },
  { id: 2, label: 'Overview',     icon: Lightbulb,   title: 'Startup Overview',           desc: 'Problem, solution & business model' },
  { id: 3, label: 'Product',      icon: Package,     title: 'Product & Technology',       desc: 'Your tech stack and USP' },
  { id: 4, label: 'Market',       icon: Globe,       title: 'Market Opportunity',         desc: 'TAM, SAM, SOM & competition' },
  { id: 5, label: 'Traction',     icon: TrendingUp,  title: 'Traction & Metrics',         desc: 'Revenue, users & growth' },
  { id: 6, label: 'Financials',   icon: DollarSign,  title: 'Financials',                 desc: 'Funding history & projections' },
  { id: 7, label: 'Funding',      icon: DollarSign,  title: 'Funding Requirement',        desc: 'How much and what for?' },
  { id: 8, label: 'Team',         icon: Users,       title: 'Team',                       desc: 'Founders & advisors' },
  { id: 9, label: 'Fit',          icon: Handshake,   title: 'Strategic Fit',              desc: 'Why FSV Capital?' },
  { id: 10, label: 'Documents',   icon: FileCheck,   title: 'Documents',                  desc: 'Upload pitch deck & files' },
  { id: 11, label: 'Compliance',  icon: Shield,      title: 'Compliance & Declaration',   desc: 'Legal and consent' },
];

const STORAGE_KEY = 'fsv_form_draft';

const INITIAL = {
  startup_name:'', website_url:'', founder_names:'', contact_email:'',
  contact_number:'', linkedin_founder:'', linkedin_company:'', linkedin_profile:'',
  hq_location:'', year_of_incorporation:'',
  problem_statement:'', solution_overview:'', industry_sector:'', business_model:'', current_stage:'',
  core_product_description:'', technology_stack:'', unique_value_proposition:'', ip_patents:'', demo_link:'',
  target_market:'', customer_segment:'', key_competitors:'', competitive_advantage:'',
  current_revenue:'', growth_rate:'', number_of_customers:'', key_partnerships:'', notable_achievements:'',
  funding_raised_till_date:'', investors:'', burn_rate:'', runway_months:'', revenue_projections:'',
  amount_raising:'', funding_stage:'', equity_offered:'', use_of_funds:'',
  founder_background:'', core_team_members:'', advisors_mentors:'',
  why_partner:'', how_add_value:'', open_to_mentorship:'',
  company_registered:'', legal_issues:'', consent_given:'',
};

// ---------- Reusable Field Components ----------
function Field({ label, required, hint, children }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  );
}

function Input({ name, data, setData, ...rest }) {
  return (
    <input className="form-input" name={name} value={data[name]}
      onChange={e => setData(d => ({ ...d, [name]: e.target.value }))} {...rest} />
  );
}

function Textarea({ name, data, setData, ...rest }) {
  return (
    <textarea className="form-textarea" name={name} value={data[name]}
      onChange={e => setData(d => ({ ...d, [name]: e.target.value }))} {...rest} />
  );
}

function RadioGroup({ name, data, setData, options }) {
  return (
    <div className="radio-group">
      {options.map(opt => (
        <label key={opt} className={`radio-option ${data[name] === opt ? 'selected' : ''}`}>
          <input type="radio" name={name} value={opt} checked={data[name] === opt}
            onChange={() => setData(d => ({ ...d, [name]: opt }))} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function AiCoachBtn({ field, data, setData, toast }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    const text = (data[field] || '').trim();
    if (text.length < 10) {
      toast?.error('Write at least 10 characters before using AI Coach');
      return;
    }
    setLoading(true);
    try {
      const r = await api.post('/ai/coach', {
        field,
        text,
        industry_sector: data.industry_sector,
        current_stage: data.current_stage,
      });
      setData(d => ({ ...d, [field]: r.data.improved_draft }));
      toast?.success(`AI Coach (${r.data.mode}): ${r.data.suggestions[0]}`);
    } catch {
      toast?.error('AI Coach unavailable');
    } finally {
      setLoading(false);
    }
  };
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={run} disabled={loading} style={{ marginTop: 6 }}>
      {loading ? <><span className="spinner" /> Coaching…</> : <><Sparkles size={13} /> AI Coach</>}
    </button>
  );
}

// ---------- Step Content ----------
function StepContent({
  step, data, setData, pitchFile, setPitchFile,
  financialModelFile, setFinancialModelFile,
  screenshotFiles, setScreenshotFiles,
  additionalFiles, setAdditionalFiles,
  authUser, toast,
}) {
  switch (step) {
    case 1: return (
      <div className="grid grid-cols-2 gap-4">
        <Field label="Startup Name" required>
          <Input name="startup_name" data={data} setData={setData} placeholder="e.g. TechVenture AI" />
        </Field>
        <Field label="Website URL">
          <Input name="website_url" data={data} setData={setData} placeholder="https://yoursite.com" type="url" />
        </Field>
        <Field label="Founder Name(s)" required>
          <Input name="founder_names" data={data} setData={setData} placeholder="John Doe, Jane Smith" />
        </Field>
        <Field label="Contact Email" required>
          <Input name="contact_email" data={data} setData={setData} placeholder="founder@company.com" type="email" readOnly={!!authUser?.email} />
          {authUser?.email && <span className="form-hint">Using your registered account email for application retrieval.</span>}
        </Field>
        <Field label="Contact Number" required>
          <Input name="contact_number" data={data} setData={setData} placeholder="+91 9876543210" type="tel" />
        </Field>
        <Field label="LinkedIn — Founder" hint="Founder personal profile URL">
          <Input name="linkedin_founder" data={data} setData={setData} placeholder="linkedin.com/in/founder" />
        </Field>
        <Field label="LinkedIn — Company" hint="Company page URL">
          <Input name="linkedin_company" data={data} setData={setData} placeholder="linkedin.com/company/yourstartup" />
        </Field>
        <Field label="Headquarters Location">
          <Input name="hq_location" data={data} setData={setData} placeholder="Bangalore, India" />
        </Field>
        <Field label="Year of Incorporation">
          <Input name="year_of_incorporation" data={data} setData={setData} placeholder="2022" type="number" min="1900" max="2026" />
        </Field>
      </div>
    );
    case 2: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <Field label="Problem Statement" required hint="What specific problem are you solving? Be concise.">
          <Textarea name="problem_statement" data={data} setData={setData} placeholder="Describe the core problem in 2-3 sentences..." />
          <AiCoachBtn field="problem_statement" data={data} setData={setData} toast={toast} />
        </Field>
        <Field label="Solution Overview" required hint="How does your product uniquely solve this problem?">
          <Textarea name="solution_overview" data={data} setData={setData} placeholder="Describe your solution..." />
          <AiCoachBtn field="solution_overview" data={data} setData={setData} toast={toast} />
        </Field>
        <Field label="Industry / Sector" required>
          <RadioGroup name="industry_sector" data={data} setData={setData}
            options={['Fintech','AI / ML','Blockchain','DeepTech','SaaS','HealthTech','EdTech','Other']} />
        </Field>
        <Field label="Business Model" required>
          <RadioGroup name="business_model" data={data} setData={setData}
            options={['B2B','B2C','B2B2C','Marketplace','SaaS','Subscription','Other']} />
        </Field>
        <Field label="Current Stage" required>
          <RadioGroup name="current_stage" data={data} setData={setData}
            options={['Idea','MVP','Early Revenue','Growth Stage','Scaling']} />
        </Field>
      </div>
    );
    case 3: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <Field label="Core Product Description">
          <Textarea name="core_product_description" data={data} setData={setData} placeholder="Describe your product in detail..." />
        </Field>
        <Field label="Technology Stack" hint="AI, Blockchain, Cloud, APIs, etc.">
          <Input name="technology_stack" data={data} setData={setData} placeholder="e.g. React, Python, GPT-4, Ethereum, AWS" />
        </Field>
        <Field label="Unique Value Proposition">
          <Textarea name="unique_value_proposition" data={data} setData={setData} placeholder="What makes you 10x better than alternatives?" style={{ minHeight: 80 }} />
        </Field>
        <Field label="IP / Patents">
          <Input name="ip_patents" data={data} setData={setData} placeholder="Patent numbers or 'None'" />
        </Field>
        <Field label="Demo Link / Product Video">
          <Input name="demo_link" data={data} setData={setData} placeholder="https://demo.yourproduct.com" type="url" />
        </Field>
      </div>
    );
    case 4: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <Field label="Target Market (TAM, SAM, SOM)" hint="E.g. TAM: $50B, SAM: $5B, SOM: $500M">
          <Textarea name="target_market" data={data} setData={setData} placeholder="Define your market size..." style={{ minHeight: 80 }} />
        </Field>
        <Field label="Customer Segment">
          <Input name="customer_segment" data={data} setData={setData} placeholder="e.g. SMBs in Tier 2 cities, Gen Z consumers" />
        </Field>
        <Field label="Key Competitors">
          <Input name="key_competitors" data={data} setData={setData} placeholder="e.g. CompanyA, CompanyB" />
        </Field>
        <Field label="Your Competitive Advantage">
          <Textarea name="competitive_advantage" data={data} setData={setData} placeholder="Why will you win?" style={{ minHeight: 80 }} />
          <AiCoachBtn field="competitive_advantage" data={data} setData={setData} toast={toast} />
        </Field>
      </div>
    );
    case 5: return (
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current Revenue (Monthly/Annual)">
          <Input name="current_revenue" data={data} setData={setData} placeholder="e.g. $12,000/month ARR" />
        </Field>
        <Field label="Growth Rate (%)">
          <Input name="growth_rate" data={data} setData={setData} placeholder="e.g. 25% MoM" />
        </Field>
        <Field label="Number of Customers / Users">
          <Input name="number_of_customers" data={data} setData={setData} placeholder="e.g. 1,200 active users" />
        </Field>
        <Field label="Key Partnerships">
          <Input name="key_partnerships" data={data} setData={setData} placeholder="e.g. AWS Activate, Y Combinator" />
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Notable Achievements / Awards">
            <Textarea name="notable_achievements" data={data} setData={setData} placeholder="Awards, press mentions, milestones..." style={{ minHeight: 80 }} />
          </Field>
        </div>
      </div>
    );
    case 6: return (
      <div className="grid grid-cols-2 gap-4">
        <Field label="Funding Raised Till Date">
          <Input name="funding_raised_till_date" data={data} setData={setData} placeholder="e.g. $250,000 pre-seed" />
        </Field>
        <Field label="Existing Investors">
          <Input name="investors" data={data} setData={setData} placeholder="e.g. Angel investor names" />
        </Field>
        <Field label="Monthly Burn Rate">
          <Input name="burn_rate" data={data} setData={setData} placeholder="e.g. $15,000/month" />
        </Field>
        <Field label="Runway (in months)">
          <Input name="runway_months" data={data} setData={setData} placeholder="e.g. 12" type="number" />
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Revenue Projections (Next 3 Years)">
            <Textarea name="revenue_projections" data={data} setData={setData} placeholder="Year 1: $X, Year 2: $Y, Year 3: $Z" style={{ minHeight: 80 }} />
          </Field>
        </div>
      </div>
    );
    case 7: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount Raising (USD / INR)" required>
            <Input name="amount_raising" data={data} setData={setData} placeholder="e.g. $500,000 USD" />
          </Field>
          <Field label="Equity Offered (%)">
            <Input name="equity_offered" data={data} setData={setData} placeholder="e.g. 10%" />
          </Field>
        </div>
        <Field label="Funding Stage" required>
          <RadioGroup name="funding_stage" data={data} setData={setData}
            options={['Pre-seed','Seed','Series A','Series B','Bridge','Growth']} />
        </Field>
        <Field label="Use of Funds" required hint="Product, GTM, Hiring, Expansion, etc.">
          <Textarea name="use_of_funds" data={data} setData={setData} placeholder="How will you deploy this capital?" />
          <AiCoachBtn field="use_of_funds" data={data} setData={setData} toast={toast} />
        </Field>
      </div>
    );
    case 8: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <Field label="Founder Background (Education, Experience)">
          <Textarea name="founder_background" data={data} setData={setData} placeholder="Your academic background and professional experience..." />
        </Field>
        <Field label="Core Team Members">
          <Textarea name="core_team_members" data={data} setData={setData} placeholder="Name — Role — Background (one per line)" />
        </Field>
        <Field label="Advisors / Mentors">
          <Textarea name="advisors_mentors" data={data} setData={setData} placeholder="Name — Domain expertise" />
        </Field>
      </div>
    );
    case 9: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <Field label="Why do you want to partner with FSV Capital?">
          <Textarea name="why_partner" data={data} setData={setData} placeholder="What specifically about FSV Capital aligns with your goals?" />
        </Field>
        <Field label="How can FSV Capital add value beyond funding?">
          <Textarea name="how_add_value" data={data} setData={setData} placeholder="Mentorship, network, industry expertise?" />
        </Field>
        <Field label="Open to Mentorship / Cohort Programs?">
          <RadioGroup name="open_to_mentorship" data={data} setData={setData} options={['Yes','No']} />
        </Field>
      </div>
    );
    case 10: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <p className="documents-section-note">
          Upload your investor materials securely. Pitch deck is required; other files help accelerate due diligence.
        </p>
        <FileUploadField
          label="Pitch Deck"
          required
          accept=".pdf,application/pdf"
          files={pitchFile ? [pitchFile] : []}
          onChange={(arr) => setPitchFile(arr[0] || null)}
          hint="PDF only, max 20 MB — required"
        />
        <Field label="Product Demo / Video URL" hint="Loom, YouTube, or live product URL">
          <Input name="demo_link" data={data} setData={setData} placeholder="https://..." type="url" />
        </Field>
        <FileUploadField
          label="Financial Model (file)"
          accept=".xlsx,.xls,.csv,.pdf"
          files={financialModelFile ? [financialModelFile] : []}
          onChange={(arr) => setFinancialModelFile(arr[0] || null)}
          hint="Excel, CSV, or PDF — max 10 MB (optional if link provided below)"
        />
        <Field label="Financial Model (cloud link)" hint="Google Sheets / Drive if you prefer not to upload">
          <Input name="financial_model_link" data={data} setData={setData} placeholder="https://docs.google.com/spreadsheets/..." type="url" />
        </Field>
        <FileUploadField
          label="Product Screenshots"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.gif,image/*"
          files={screenshotFiles}
          onChange={setScreenshotFiles}
          maxFiles={5}
          hint="Up to 5 images (PNG, JPG, WebP) — max 10 MB each"
        />
        <FileUploadField
          label="Additional Documents"
          multiple
          accept=".pdf,.txt,.docx,.xlsx,.xls"
          files={additionalFiles}
          onChange={setAdditionalFiles}
          maxFiles={5}
          hint="Cap table, patents, LOIs, etc. — up to 5 files"
        />
      </div>
    );
    case 11: return (
      <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>
        <Field label="Is your company legally registered?" required>
          <RadioGroup name="company_registered" data={data} setData={setData} options={['Yes','No']} />
        </Field>
        <Field label="Any pending legal issues?" required>
          <RadioGroup name="legal_issues" data={data} setData={setData} options={['No','Yes — see details below']} />
        </Field>
        {data.legal_issues?.startsWith('Yes') && (
          <Field label="Please explain the legal issue">
            <Textarea name="legal_issues_detail" data={data} setData={setData} placeholder="Provide details..." style={{ minHeight: 80 }} />
          </Field>
        )}
        <div className="compliance-notice">
          <Shield size={16} color="var(--brand-primary)" />
          <div>
            <p style={{ color:'var(--text-primary)', fontWeight:600, fontSize:'0.875rem' }}>Data Privacy Notice</p>
            <p style={{ fontSize:'0.8rem', marginTop:4 }}>
              Your information will be securely stored and shared only with FSV Capital&apos;s investment team in compliance with the{' '}
              <Link to="/privacy" className="privacy-inline-link">Privacy Policy (DPDP Act 2023)</Link>.
            </p>
          </div>
        </div>
        <label className={`checkbox-option ${data.consent_given === 'Yes' ? 'selected' : ''}`}
          style={{ cursor:'pointer' }}>
          <input type="checkbox" style={{ display:'none' }} checked={data.consent_given === 'Yes'}
            onChange={e => setData(d => ({ ...d, consent_given: e.target.checked ? 'Yes' : '' }))} />
          <Shield size={14} />
          <span>
            I consent to FSV Capital sharing my information with their investment partners for evaluation purposes,
            as described in the <Link to="/privacy" className="privacy-inline-link" onClick={e => e.stopPropagation()}>Privacy Policy</Link>.
          </span>
        </label>
      </div>
    );
    default: return null;
  }
}

// ---------- Main Form Component ----------
export default function FundingForm({ toast }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const authUser = JSON.parse(localStorage.getItem('fsv_user') || 'null');
      const initial = { ...INITIAL, ...stored };
      if (!initial.contact_email && authUser?.email) {
        initial.contact_email = authUser.email;
      }
      if (initial.linkedin_profile && !initial.linkedin_founder && !initial.linkedin_company) {
        if (String(initial.linkedin_profile).toLowerCase().includes('/company/')) {
          initial.linkedin_company = initial.linkedin_profile;
        } else {
          initial.linkedin_founder = initial.linkedin_profile;
        }
      }
      return initial;
    } catch {
      const authUser = JSON.parse(localStorage.getItem('fsv_user') || 'null');
      return authUser?.email ? { ...INITIAL, contact_email: authUser.email } : INITIAL;
    }
  });
  const authUser = JSON.parse(localStorage.getItem('fsv_user') || 'null');
  const [pitchFile, setPitchFile] = useState(null);
  const [financialModelFile, setFinancialModelFile] = useState(null);
  const [screenshotFiles, setScreenshotFiles] = useState([]);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedAt, setSavedAt]  = useState(null);
  const [stepErrors, setStepErrors] = useState([]);
  const [stepWarnings, setStepWarnings] = useState([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const formRef = useRef(null);

  const score = calcDealScore(data);
  const scoreAxes = scoreBreakdown(data);
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;
  const sectorWarning = step >= 2 && data.industry_sector ? getSectorWarning(data) : null;

  // Load server draft once (falls back to localStorage from initial state)
  useEffect(() => {
    if (draftLoaded) return;
    const email = authUser?.email || data.contact_email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setDraftLoaded(true);
      return;
    }
    api.get('/applications/draft', { params: { contact_email: email } })
      .then((r) => {
        setData((d) => ({ ...INITIAL, ...r.data.form_data, contact_email: email }));
        if (r.data.current_step) setStep(r.data.current_step);
        setSavedAt(r.data.updated_at
          ? `Cloud · ${new Date(r.data.updated_at).toLocaleTimeString()}`
          : 'Cloud draft');
        toast?.info('Resumed your saved application');
      })
      .catch(() => {})
      .finally(() => setDraftLoaded(true));
  }, [authUser?.email, data.contact_email, draftLoaded, toast]);

  // Auto-save to localStorage + server
  useEffect(() => {
    if (!draftLoaded) return;
    const email = authUser?.email || data.contact_email?.trim();
    const t = setTimeout(async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _step: step }));
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setSavedAt(`${new Date().toLocaleTimeString()} (local)`);
        return;
      }
      try {
        await api.put('/applications/draft', {
          contact_email: email,
          current_step: step,
          form_data: data,
        });
        setSavedAt(`${new Date().toLocaleTimeString()} (cloud)`);
      } catch {
        setSavedAt(`${new Date().toLocaleTimeString()} (local only)`);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [data, step, authUser, draftLoaded]);

  const next = () => {
    const { errors, warnings } = validateStep(step, data);
    setStepErrors(errors);
    setStepWarnings(warnings);
    if (errors.length > 0) {
      toast?.error(errors[0]);
      return;
    }
    warnings.forEach((w) => toast?.warning(w));
    setStep(s => Math.min(s + 1, STEPS.length));
    setStepErrors([]);
    setStepWarnings([]);
    formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prev = () => {
    setStepErrors([]);
    setStepWarnings([]);
    setStep(s => Math.max(s - 1, 1));
  };

  const goToStep = (targetStep) => {
    if (targetStep > step) {
      const { errors } = validateStep(step, data);
      if (errors.length > 0) {
        setStepErrors(errors);
        toast?.error('Complete required fields on this step before continuing.');
        return;
      }
    }
    setStepErrors([]);
    setStepWarnings([]);
    setStep(targetStep);
  };

  const submit = async () => {
    if (!pitchFile) { toast?.error('Please upload your Pitch Deck (PDF)'); return; }
    if (data.consent_given !== 'Yes') { toast?.error('You must provide consent to submit'); return; }

    const { errors, warnings } = runSubmitScreening(data);
    setStepErrors(errors);
    setStepWarnings(warnings);
    if (errors.length > 0) {
      toast?.error(errors[0]);
      return;
    }
    warnings.forEach((w) => toast?.warning(w));

    setSubmitting(true);
    try {
      const payload = { ...data };
      if (!payload.runway_months) delete payload.runway_months;
      if (!payload.year_of_incorporation) delete payload.year_of_incorporation;
      payload.company_registered = payload.company_registered || 'No';
      const authUser = JSON.parse(localStorage.getItem('fsv_user') || 'null');
      if (authUser?.email) {
        payload.contact_email = authUser.email;
      }

      const formData = new FormData();
      formData.append('pitch_deck', pitchFile);
      formData.append('application_data', JSON.stringify(payload));
      if (financialModelFile) {
        formData.append('financial_model', financialModelFile);
      }
      screenshotFiles.forEach((f) => formData.append('product_screenshots', f));
      additionalFiles.forEach((f) => formData.append('additional_documents', f));

      await api.post('/applications/', formData);
      localStorage.removeItem(STORAGE_KEY);
      const draftEmail = authUser?.email || payload.contact_email;
      if (draftEmail) {
        try {
          await api.delete('/applications/draft', { params: { contact_email: draftEmail } });
        } catch { /* ignore */ }
      }
      setSubmitted(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map(e => e.msg || JSON.stringify(e)).join(', ')
        : (detail || 'Submission failed. Please try again.');
      toast?.error(message);
    } finally { setSubmitting(false); }
  };

  if (submitted) return (
    <div className="form-page">
      <div className="form-submitted animate-in glass-card">
        <div className="submitted-icon">
          <CheckCircle size={40} color="var(--success)" />
        </div>
        <h2>Application Submitted!</h2>
        <p>Thank you for applying to FSV Capital. Our investment team will review your application and reach out within 7 business days.</p>
        <Link to="/login" className="btn btn-primary btn-lg">Access Investor Portal →</Link>
      </div>
    </div>
  );

  const stepInfo = STEPS[step - 1];
  const StepIcon = stepInfo.icon;

  return (
    <div className="form-page">
      {/* Ambient blobs */}
      <div className="form-blob form-blob-1" />
      <div className="form-blob form-blob-2" />

      {/* Header */}
      <header className="form-header">
        <div className="form-brand">
          <div className="brand-icon"><Zap size={18} color="white" /></div>
          <div>
            <div className="brand-name">FSV Capital — Startup Funding Application</div>
            <div className="brand-tagline">Fueling DeepTech, Fintech &amp; Future Innovation</div>
          </div>
        </div>

        {/* Deal Score */}
        <div
          className="deal-score-pill"
          title={`Stage ${scoreAxes.revenue_stage} · Market ${scoreAxes.market_size} · Team ${scoreAxes.team_strength} · Innovation ${scoreAxes.innovation} · Traction ${scoreAxes.traction} · Sector ${scoreAxes.sector_fit}`}
        >
          <Star size={13} color="var(--brand-gold)" />
          <span className="deal-score-label">Deal Score</span>
          <span className="deal-score-value" style={{
            color: score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--error)'
          }}>{score}</span>
          <span className="deal-score-max">/100</span>
        </div>
      </header>

      <div className="form-body">
        {/* Step sidebar */}
        <aside className="form-sidebar">
          {STEPS.map(s => (
            <button key={s.id}
              className={`form-step-btn ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
              onClick={() => goToStep(s.id)}
            >
              <div className="form-step-indicator">
                {step > s.id ? <CheckCircle size={14} /> : <span>{s.id}</span>}
              </div>
              <span>{s.label}</span>
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className="form-main" ref={formRef}>
          {/* Progress bar */}
          <div className="progress-track form-progress">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="glass-card form-card animate-in" key={step}>
            <div className="form-card-header">
              <div className={`form-card-icon step-icon-${step}`}>
                <StepIcon size={20} />
              </div>
              <div>
                <div className="form-step-label">Step {step} of {STEPS.length}</div>
                <h2 className="form-card-title">{stepInfo.title}</h2>
                <p className="form-card-desc">{stepInfo.desc}</p>
              </div>
            </div>

            <div className="form-card-body">
              {stepErrors.length > 0 && (
                <div className="screening-banner screening-error" role="alert">
                  <ul>
                    {stepErrors.map((msg) => <li key={msg}>{msg}</li>)}
                  </ul>
                </div>
              )}
              {stepWarnings.length > 0 && (
                <div className="screening-banner screening-warning" role="status">
                  <ul>
                    {stepWarnings.map((msg) => <li key={msg}>{msg}</li>)}
                  </ul>
                </div>
              )}
              {sectorWarning && step >= 2 && stepWarnings.length === 0 && !stepErrors.length && (
                <div className="screening-banner screening-warning" role="status">
                  <p>{sectorWarning}</p>
                </div>
              )}
              <StepContent step={step} data={data} setData={setData}
                pitchFile={pitchFile} setPitchFile={setPitchFile}
                financialModelFile={financialModelFile} setFinancialModelFile={setFinancialModelFile}
                screenshotFiles={screenshotFiles} setScreenshotFiles={setScreenshotFiles}
                additionalFiles={additionalFiles} setAdditionalFiles={setAdditionalFiles}
                authUser={authUser} toast={toast} />
            </div>

            <div className="form-card-footer">
              <div className="footer-left">
                {savedAt && (
                  <span className="autosave-indicator">
                    <Save size={12} /> Draft saved at {savedAt}
                  </span>
                )}
              </div>
              <div className="footer-right">
                {step > 1 && (
                  <button className="btn btn-ghost" onClick={prev}>
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
                {step < STEPS.length ? (
                  <button className="btn btn-primary" onClick={next}>
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button className="btn btn-primary btn-lg" onClick={submit} disabled={submitting}>
                    {submitting
                      ? <><span className="spinner" /> Submitting…</>
                      : <><CheckCircle size={16} /> Submit Application</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
