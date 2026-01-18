import React from 'react';
import './tokens.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, helper, error, style, ...rest }) => {
  return (
    <label style={{ display: 'block' }}>
      {label && <div className="label-small">{label}</div>}
      <input
        {...rest}
        style={{
          width: '100%',
          height: 40,
          padding: '8px 12px',
          borderRadius: 'var(--radius-8)',
          border: error ? '1px solid var(--error)' : '1px solid var(--border)',
          background: 'var(--surface-raised)',
          color: 'var(--text)',
          fontSize: 14,
          outline: 'none',
          ...style,
        }}
      />
      {helper && !error && <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>{helper}</div>}
      {error && <div style={{ color: 'var(--error)', fontSize: 12, marginTop: 4 }}>{error}</div>}
    </label>
  );
};
