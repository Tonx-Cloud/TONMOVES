import React from 'react';
import './tokens.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Size = 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...rest
}) => {
  const base: React.CSSProperties = {
    borderRadius: 'var(--radius-8)',
    border: '1px solid transparent',
    fontWeight: 600,
    fontSize: '14px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: size === 'lg' ? 44 : 40,
    padding: size === 'lg' ? '10px 16px' : '8px 14px',
    opacity: disabled || loading ? 0.7 : 1,
  };

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      color: '#fff',
      boxShadow: 'var(--shadow-xs)',
    },
    secondary: {
      background: 'var(--surface-raised)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    },
    danger: {
      background: 'var(--error)',
      color: '#fff',
    },
  };

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.6)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />}
      {children}
    </button>
  );
};

const spinner = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = spinner;
  document.head.appendChild(styleEl);
}
