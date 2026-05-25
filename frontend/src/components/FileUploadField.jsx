import { Upload, CheckCircle, X } from 'lucide-react';

/**
 * Single or multi-file upload zone for the funding form.
 */
export default function FileUploadField({
  label,
  hint,
  required,
  accept,
  multiple = false,
  files = [],
  onChange,
  maxFiles = 5,
}) {
  const inputId = `upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  const handleChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!multiple) {
      onChange(picked.slice(0, 1));
      return;
    }
    const merged = [...files, ...picked].slice(0, maxFiles);
    onChange(merged);
  };

  const removeAt = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <div
        className={`upload-zone compact ${files.length ? 'has-file' : ''}`}
        onClick={() => document.getElementById(inputId)?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && document.getElementById(inputId)?.click()}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        {files.length === 0 ? (
          <>
            <Upload size={20} color="var(--text-muted)" />
            <span>{multiple ? 'Click to add files' : 'Click to upload'}</span>
          </>
        ) : (
          <>
            <CheckCircle size={20} color="var(--success)" />
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>
              {multiple ? `${files.length} file(s) selected` : files[0].name}
            </span>
          </>
        )}
      </div>
      {hint && <span className="form-hint">{hint}</span>}
      {multiple && files.length > 0 && (
        <ul className="upload-file-list">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <span>{f.name}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeAt(i)} aria-label="Remove">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
