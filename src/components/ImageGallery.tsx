import React from 'react';
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
  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Nenhuma imagem gerada ainda</p>
        <p className="text-sm mt-2">As imagens aparecerão aqui durante a geração</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Imagens Geradas ({images.length})
        </h3>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Limpar Todas
          </button>
        )}
      </div>

      {/* ✅ GRID DE 5 COLUNAS */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative group bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <img
              src={img.url}
              alt={`Segment ${img.segmentIndex + 1}`}
              className="w-full object-cover"
              style={{ 
                height: '100px',
                maxHeight: '100px',
                minHeight: '100px'
              }}
            />
            
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-80 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                <a
                  href={img.url}
                  download={`tonmoves-${img.segmentIndex}.jpg`}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded text-center"
                >
                  ⬇️
                </a>
                {onDelete && (
                  <button
                    onClick={() => onDelete(img.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-1">
              <p className="text-white text-xs text-center font-medium">
                #{img.segmentIndex + 1}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
