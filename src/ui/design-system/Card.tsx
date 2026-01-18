import React from 'react';
import './tokens.css';

interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ title, description, children, footer, padding = 'md' }) => {
  const pad = padding === 'lg' ? 'var(--space-24)' : 'var(--space-16)';
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-10)',
      background: 'var(--surface)',
      padding: pad,
      boxShadow: 'var(--shadow-xs)',
    }}>
      {(title || description) && (
        <div style={{ marginBottom: 'var(--space-12)' }}>
          {title && <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text)', marginBottom: description ? 4 : 0 }}>{title}</div>}
          {description && <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{description}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && <div style={{ marginTop: 'var(--space-16)' }}>{footer}</div>}
    </div>
  );
};
