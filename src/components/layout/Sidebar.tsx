import React, { useState } from 'react';
import type { CurrentView } from '../../App';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  setCurrentView: (view: CurrentView) => void;
  onNewProject?: () => void;
}

interface MenuItem {
  id: CurrentView;
  icon: string;
  label: string;
  description: string;
  gradient: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'main',
    icon: '🚀',
    label: 'Novo Projeto',
    description: 'Criar vídeo do zero',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'settings',
    icon: '⚙️',
    label: 'Configurações',
    description: 'API Keys e preferências',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, setCurrentView, onNewProject }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleNavigation = (view: CurrentView) => {
    // Se for "Novo Projeto", chamar a função de reset
    if (view === 'main' && onNewProject) {
      onNewProject();
    }
    setCurrentView(view);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
          zIndex: 999,
        }}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '300px',
          height: '100%',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '4px 0 30px rgba(0,0,0,0.15)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header com gradiente */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '30px 20px',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>
                🎵 TONMOVES
              </h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                v4.3 • Menu Principal
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: '0 0 15px 0',
          }}>
            Navegação
          </p>

          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                padding: '16px',
                marginBottom: '10px',
                background: hoveredItem === item.id ? '#f0f4ff' : 'white',
                border: '2px solid',
                borderColor: hoveredItem === item.id ? '#667eea' : '#e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                boxShadow: hoveredItem === item.id
                  ? '0 4px 15px rgba(102, 126, 234, 0.2)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
                transform: hoveredItem === item.id ? 'translateX(5px)' : 'translateX(0)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: item.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  fontSize: '15px',
                  color: '#1f2937',
                  marginBottom: '2px',
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                }}>
                  {item.description}
                </div>
              </div>
            </button>
          ))}

          {/* Divider */}
          <div style={{
            height: '1px',
            background: '#e5e7eb',
            margin: '20px 0',
          }} />

          <p style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: '0 0 15px 0',
          }}>
            Em breve
          </p>

          {/* Coming Soon Items */}
          <div
            style={{
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '12px',
              border: '2px dashed #e5e7eb',
              opacity: 0.7,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>📂</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Projetos Salvos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎭</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Templates</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>📊</span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Histórico</span>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: '20px',
            borderTop: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
          }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              Sistema operacional
            </span>
          </div>
          <p style={{
            fontSize: '11px',
            color: '#9ca3af',
            margin: 0,
          }}>
            100% Grátis • Processamento local
          </p>
        </div>
      </div>
    </>
  );
};
