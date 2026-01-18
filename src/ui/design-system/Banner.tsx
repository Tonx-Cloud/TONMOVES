import React from 'react';
import './tokens.css';

type Tone = 'info' | 'success' | 'warn' | 'error';

interface BannerProps {
  tone?: Tone;
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export const Banner: React.FC<BannerProps> = ({ tone = 'info', title, message, action }) => {
  const tones: Record<Tone, React.CSSProperties> = {
    info: { background: 'rgba(56,189,248,0.10)', border: '1px solid rgba(56,189,248,0.35)', color: '#e0f2fe' },
    success: { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.30)', color: '#dcfce7' },
    warn: { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#fef3c7' },
    error: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fee2e2' },
  };

  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 'var(--radius-8)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-12)',
      ...tones[tone],
    }}>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</div>}
        <div style={{ fontSize: 13, color: 'inherit' }}>{message}</div>
      </div>
      {action}
    </div>
  );
};
