import React from 'react';
import './tokens.css';

interface BadgeProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'warn' | 'success';
}

export const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral' }) => {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { background: 'var(--chip)', color: 'var(--chip-text)', border: '1px solid var(--border)' },
    accent: { background: 'rgba(91,103,241,0.12)', color: '#cdd3ff', border: '1px solid rgba(91,103,241,0.25)' },
    warn: { background: 'rgba(245,158,11,0.12)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.35)' },
    success: { background: 'rgba(34,197,94,0.12)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.25)' },
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      borderRadius: 'var(--radius-6)',
      fontSize: 12,
      fontWeight: 600,
      ...tones[tone],
    }}>
      {children}
    </span>
  );
};
