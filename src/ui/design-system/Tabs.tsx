import React from 'react';
import './tokens.css';

type TabItem = { id: string; label: string; disabled?: boolean };

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ items, value, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-8)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-8)' }}>
      {items.map(item => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            onClick={() => !item.disabled && onChange(item.id)}
            disabled={item.disabled}
            style={{
              border: 'none',
              background: 'transparent',
              color: active ? '#fff' : 'var(--muted)',
              fontWeight: active ? 600 : 500,
              padding: '8px 10px',
              borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
