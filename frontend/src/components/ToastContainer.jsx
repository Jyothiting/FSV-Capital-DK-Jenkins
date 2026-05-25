import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} color="var(--success)" />,
  error:   <XCircle size={16} color="var(--error)" />,
  warning: <AlertTriangle size={16} color="var(--warning)" />,
  info:    <Info size={16} color="var(--info)" />,
};

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {ICONS[t.type]}
          <span style={{ flex: 1, color: 'var(--text-primary)' }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
