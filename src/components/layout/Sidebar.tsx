import React from 'react';
import type { CurrentView } from '../../App'; // Importar o tipo CurrentView

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  setCurrentView: (view: CurrentView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, setCurrentView }) => {
  const handleNavigation = (view: CurrentView) => {
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
          background: 'rgba(0, 0, 0, 0.5)',
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
          width: '280px',
          height: '100%',
          background: '#fff',
          boxShadow: '0 0 20px rgba(0,0,0,0.2)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          zIndex: 1000,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ margin: '0 0 30px 0', color: '#333' }}>Menu</h2>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '15px' }}>
              <button
                onClick={() => handleNavigation('main')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'none', color: '#555', fontSize: '18px', textAlign: 'left', width: '100%' }}
              >
                🚀 Novo Projeto
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button
                onClick={() => handleNavigation('settings')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'none', color: '#555', fontSize: '18px', textAlign: 'left', width: '100%' }}
              >
                ⚙️ Configurações & Chaves
              </button>
            </li>
            <li style={{ marginBottom: '15px' }}>
              <button
                onClick={() => handleNavigation('main')} // Por enquanto, volta para main
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'none', color: '#555', fontSize: '18px', textAlign: 'left', width: '100%' }}
              >
                📂 Projetos Salvos
              </button>
            </li>
          </ul>
        </nav>
        <button
          onClick={onClose}
          style={{
            marginTop: 'auto',
            padding: '10px',
            background: '#eee',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Fechar
        </button>
      </div>
    </>
  );
};

