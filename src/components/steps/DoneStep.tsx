import React from 'react';
import type { NarrativeAnalysis } from '../../utils/audioAnalyzer';
import type { ThemeConfig } from '../../constants/themes';
import type { StoredImage } from '../../utils/imageStorage';
import type { AspectRatio } from '../../types/app';
import { ImageGallery } from '../ImageGallery';

interface DoneStepProps {
  aspectRatio: AspectRatio;
  videoUrl: string;
  currentTheme: ThemeConfig;
  narrative: NarrativeAnalysis | null;
  generatedImages: StoredImage[];
  onReset: () => void;
  onDeleteImage: (id: string) => void;
  onClearAllImages: () => void;
  onRegenerateImage: (id: string, newPrompt: string, images: StoredImage[]) => void;
  onUploadImage: (file: File, index: number, images: StoredImage[]) => void;
  onUpdateAnimation: (id: string, animationType: string, images: StoredImage[]) => void;
}

export const DoneStep: React.FC<DoneStepProps> = ({
  aspectRatio,
  videoUrl,
  currentTheme,
  narrative,
  generatedImages,
  onReset,
  onDeleteImage,
  onClearAllImages,
  onRegenerateImage,
  onUploadImage,
  onUpdateAnimation,
}) => {
  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Vídeo criado! {aspectRatio === '9:16' ? '📱' : '📺'}</h2>

      {narrative && (
        <div style={{ background: '#fff5f5', border: '2px solid #f093fb', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}><strong>História:</strong> {narrative.story}</p>
        </div>
      )}

      <div style={{ background: '#f0f4ff', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
        <video controls style={{ width: '100%', maxWidth: aspectRatio === '16:9' ? '600px' : '400px', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
          <source src={videoUrl} type="video/mp4" />
        </video>
      </div>

      {generatedImages.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <ImageGallery
            images={generatedImages}
            onDelete={onDeleteImage}
            onClearAll={onClearAllImages}
            onRegenerate={onRegenerateImage}
            onUpload={onUploadImage}
            onUpdateAnimation={onUpdateAnimation}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <a
          href={videoUrl}
          download={`tonmoves-${aspectRatio}-${Date.now()}.mp4`}
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '16px',
            background: currentTheme.gradient,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            textDecoration: 'none',
            display: 'inline-block',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          ⬇️ Download
        </a>
        <button
          onClick={onReset}
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '16px',
            background: 'white',
            color: '#667eea',
            border: '2px solid #667eea',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          🔄 Criar Novo
        </button>
      </div>
    </div>
  );
};
