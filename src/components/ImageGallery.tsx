import React, { useState, useRef } from 'react';
import type { StoredImage, AnimationType } from '../utils/imageStorage';

const ANIMATION_OPTIONS: { id: AnimationType; name: string; icon: string }[] = [
  { id: 'none', name: 'Sem animação', icon: '⏹️' },
  { id: 'zoomIn', name: 'Zoom In', icon: '🔍' },
  { id: 'zoomOut', name: 'Zoom Out', icon: '🔎' },
  { id: 'panLeft', name: 'Pan Esquerda', icon: '⬅️' },
  { id: 'panRight', name: 'Pan Direita', icon: '➡️' },
  { id: 'panUp', name: 'Pan Cima', icon: '⬆️' },
  { id: 'panDown', name: 'Pan Baixo', icon: '⬇️' },
  { id: 'zoomInRotate', name: 'Zoom + Rotação', icon: '🔄' },
  { id: 'kenBurnsClassic', name: 'Ken Burns', icon: '🎬' },
];

interface ImageGalleryProps {
  images: StoredImage[];
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
  onRegenerate?: (id: string, newPrompt: string) => void;
  onUpload?: (file: File, index: number) => void;
  onUpdatePrompt?: (id: string, newPrompt: string) => void;
  onUpdateAnimation?: (id: string, animationType: AnimationType) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onDelete,
  onClearAll,
  onRegenerate,
  onUpload,
  onUpdatePrompt,
  onUpdateAnimation,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAnimationMenu, setShowAnimationMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetIndex, setUploadTargetIndex] = useState<number>(0);

  if (images.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
        <p>Nenhuma imagem gerada ainda</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>As imagens aparecerao aqui durante a geracao</p>
      </div>
    );
  }

  const handleEditClick = (img: StoredImage) => {
    setEditingId(img.id);
    setEditingPrompt(img.prompt);
  };

  const handleSavePrompt = (id: string) => {
    if (onUpdatePrompt) {
      onUpdatePrompt(id, editingPrompt);
    }
    setEditingId(null);
  };

  const handleRegenerate = (id: string) => {
    if (onRegenerate) {
      onRegenerate(id, editingPrompt || images.find(i => i.id === id)?.prompt || '');
    }
    setEditingId(null);
  };

  const handleUploadClick = (index: number) => {
    setUploadTargetIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) {
      onUpload(file, uploadTargetIndex);
    }
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          Imagens Geradas ({images.length})
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleUploadClick(images.length)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            + Upload
          </button>
          {onClearAll && (
            <button
              onClick={onClearAll}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Limpar Todas
            </button>
          )}
        </div>
      </div>

      {/* Input de upload oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Lista vertical de imagens */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {images.map((img, index) => (
          <div
            key={img.id}
            style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              flexWrap: 'wrap',
            }}
          >
            {/* Imagem */}
            <div style={{
              position: 'relative',
              flexShrink: 0,
              width: '120px',
            }}>
              <img
                src={img.url}
                alt={`Imagem ${index + 1}`}
                style={{
                  width: '120px',
                  height: '160px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedId(expandedId === img.id ? null : img.id)}
              />
              {/* Numero */}
              <div style={{
                position: 'absolute',
                top: '6px',
                left: '6px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 'bold',
              }}>
                #{index + 1}
              </div>
            </div>

            {/* Conteudo */}
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Prompt */}
              {editingId === img.id ? (
                <textarea
                  value={editingPrompt}
                  onChange={(e) => setEditingPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  autoFocus
                />
              ) : (
                <div
                  style={{
                    padding: '10px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#374151',
                    lineHeight: '1.4',
                    maxHeight: '80px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleEditClick(img)}
                  title="Clique para editar"
                >
                  {img.prompt}
                </div>
              )}

              {/* Botoes de acao */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {editingId === img.id ? (
                  <>
                    <button
                      onClick={() => handleSavePrompt(img.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => handleRegenerate(img.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Re-gerar
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleEditClick(img)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                    >
                      Editar
                    </button>
                    {onRegenerate && (
                      <button
                        onClick={() => handleRegenerate(img.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                        }}
                      >
                        Re-gerar
                      </button>
                    )}
                    <button
                      onClick={() => handleUploadClick(img.segmentIndex)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Substituir
                    </button>

                    {/* Botão de Animação */}
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowAnimationMenu(showAnimationMenu === img.id ? null : img.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: img.animationType && img.animationType !== 'none'
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        🎬 {img.animationType && img.animationType !== 'none'
                          ? ANIMATION_OPTIONS.find(a => a.id === img.animationType)?.name
                          : 'Animar'}
                      </button>

                      {/* Dropdown de animações */}
                      {showAnimationMenu === img.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '4px',
                          background: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                          border: '1px solid #e2e8f0',
                          zIndex: 100,
                          minWidth: '180px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            padding: '8px 12px',
                            background: '#f8fafc',
                            fontWeight: 'bold',
                            fontSize: '11px',
                            color: '#64748b',
                            borderBottom: '1px solid #e2e8f0',
                          }}>
                            Escolha a animação:
                          </div>
                          {ANIMATION_OPTIONS.map(anim => (
                            <button
                              key={anim.id}
                              onClick={() => {
                                if (onUpdateAnimation) {
                                  onUpdateAnimation(img.id, anim.id);
                                }
                                setShowAnimationMenu(null);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                background: img.animationType === anim.id ? '#fef3c7' : 'white',
                                cursor: 'pointer',
                                fontSize: '13px',
                                textAlign: 'left',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              <span>{anim.icon}</span>
                              <span style={{
                                fontWeight: img.animationType === anim.id ? 'bold' : 'normal',
                                color: img.animationType === anim.id ? '#d97706' : '#374151',
                              }}>
                                {anim.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <a
                      href={img.url}
                      download={`tonmoves-${index + 1}.jpg`}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        display: 'inline-block',
                      }}
                    >
                      Download
                    </a>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(img.id)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de imagem expandida */}
      {expandedId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setExpandedId(null)}
        >
          <img
            src={images.find(i => i.id === expandedId)?.url}
            alt="Expandida"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '12px',
            }}
          />
          <button
            onClick={() => setExpandedId(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
