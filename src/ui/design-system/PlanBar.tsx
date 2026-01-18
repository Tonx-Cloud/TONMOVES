import React from 'react';
import './tokens.css';
import { Badge } from './Badge';
import { Button } from './Button';

interface PlanBarProps {
  plan: 'free' | 'pro';
  onUpgrade?: () => void;
}

export const PlanBar: React.FC<PlanBarProps> = ({ plan, onUpgrade }) => {
  const isFree = plan === 'free';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-12)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-10)',
      padding: 'var(--space-12)',
      background: 'var(--surface)',
    }}>
      <div className="stack-horizontal" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Badge tone={isFree ? 'neutral' : 'accent'}>{isFree ? 'FREE ativo' : 'PRO ativo'}</Badge>
        {isFree && (
          <>
            <Badge tone="warn">Baixa resolução</Badge>
            <Badge tone="warn">Watermark obrigatória</Badge>
          </>
        )}
        {!isFree && <Badge tone="success">1080p sem watermark</Badge>}
      </div>
      {isFree && (
        <Button size="md" variant="primary" onClick={onUpgrade}>Upgrade PRO</Button>
      )}
    </div>
  );
};
