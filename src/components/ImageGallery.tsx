import React, { useState } from 'react';
import type { StoredImage } from '../utils/imageStorage';

interface ImageGalleryProps {
  images: StoredImage[];
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  onDelete,
  onClearAll
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
        <p>Nenhuma imagem gerada ainda</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>As imagens aparecerao aqui durante a geracao</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          Imagens Geradas ({images.length})
        </h3>
        {onClearAll && (
          <button
            onClick={onClearAll}
            style={{
              padding: '4px 12px',
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '12px',
      }}>
        {images.map((img) => (
          <div
            key={img.id}
            style={{
              position: 'relative',
              background: '#f3f4f6',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: hoveredId === img.id ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={() => setHoveredId(img.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <img
              src={img.url}
              alt={`Segment ${img.segmentIndex + 1}`}
              style={{
                width: '100%',
                height: '100px',
                objectFit: 'cover',
              }}
            />

            {hoveredId === img.id && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                <a
                  href={img.url}
                  download={`tonmoves-${img.segmentIndex}.jpg`}
                  style={{
                    padding: '6px 12px',
                    background: '#2563eb',
                    color: 'white',
                    fontSize: '12px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                  }}
                >
                  Download
                </a>
                {onDelete && (
                  <button
                    onClick={() => onDelete(img.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#dc2626',
                      color: 'white',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Excluir
                  </button>
                )}
              </div>
            )}

            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              padding: '4px',
            }}>
              <p style={{
                color: 'white',
                fontSize: '12px',
                textAlign: 'center',
                fontWeight: '500',
                margin: 0,
              }}>
                #{img.segmentIndex + 1}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
