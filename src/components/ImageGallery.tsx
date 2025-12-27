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
        <h3 className="text-lg font-semibold text-white">
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative group bg-gray-800 rounded-lg overflow-hidden"
          >
            <img
              src={img.url}
              alt={`Segment ${img.segmentIndex + 1}`}
              className="w-full h-32 object-cover"
            />
            
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-70 transition-all duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
                <a
                  href={img.url}
                  download={`image-${img.segmentIndex}.jpg`}
                  className="inline-block px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                >
                  Download
                </a>
                {onDelete && (
                  <button
                    onClick={() => onDelete(img.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                  >
                    Deletar
                  </button>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
              <p className="text-white text-xs truncate">
                Segmento {img.segmentIndex + 1}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
