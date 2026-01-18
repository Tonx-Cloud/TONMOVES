import React from 'react';
import type { Step } from '../../types/app';
import type { NarrativeAnalysis, GlobalContext } from '../../utils/audioAnalyzer';
import type { ThemeConfig } from '../../constants/themes';
import type { StoredImage } from '../../utils/imageStorage';
import { ImageGallery } from '../ImageGallery';

interface ProgressStepProps {
  currentStep: Step;
  statusMessage: string;
  narrative: NarrativeAnalysis | null;
  globalContext: GlobalContext | null;
  currentTheme: ThemeConfig;
  progress: number;
  generatedImages: StoredImage[];
  audioFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateVideo: () => void;
  onDeleteImage: (id: string) => void;
  onClearAllImages: () => void;
  onRegenerateImage: (id: string, newPrompt: string, images: StoredImage[]) => void;
  onUploadImage: (file: File, index: number, images: StoredImage[]) => void;
  onUpdateAnimation: (id: string, animationType: string, images: StoredImage[]) => void;
  videoUrl: string | null;
}

const stepIcon: Record<Step, string> = {
  upload: '📁',
  analyzing: '🎤',
  generating: '🎨',
  composing: '🎬',
  done: '🎉',
};

const stepTitle: Record<Step, string> = {
  upload: 'Selecione seu áudio',
  analyzing: 'Analisando...',
  generating: 'Gerando imagens...',
  composing: 'Criando vídeo...',
  done: 'Vídeo criado!',
};

export const ProgressStep: React.FC<ProgressStepProps> = ({
  currentStep,
  statusMessage,
  narrative,
  globalContext,
  currentTheme,
  progress,
  generatedImages,
  audioFile,
  fileInputRef,
  handleFileSelect,
  onCreateVideo,
  onDeleteImage,
  onClearAllImages,
  onRegenerateImage,
  onUploadImage,
  onUpdateAnimation,
  videoUrl,
}) => {
  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>
        {stepIcon[currentStep]}
      </div>
      <h2 style={{ color: '#333', marginBottom: '10px' }}>
        {stepTitle[currentStep]}
      </h2>
      <p style={{ color: '#666', fontSize: '16px', marginBottom: '10px' }}>{statusMessage}</p>
      <p style={{ color: '#28a745', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>💾 Progresso salvo automaticamente</p>

      {narrative && (
        <div style={{ background: '#fff5f5', border: '2px solid #f093fb', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#f093fb' }}>📖 História: {narrative.story}</h3>
          {narrative.characters.length > 0 && (
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
              <strong>Personagens:</strong> {narrative.characters.join(', ')}
            </p>
          )}
        </div>
      )}

      {globalContext && (
        <div style={{ background: '#f0f4ff', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#667eea' }}>🎬 Tema: {currentTheme.emoji} {currentTheme.name}</h3>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>{globalContext.mainTheme}</p>
        </div>
      )}

      <div style={{ width: '100%', height: '12px', background: '#eee', borderRadius: '6px', overflow: 'hidden' }} aria-label="Barra de progresso" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${progress}%`, height: '100%', background: currentTheme.gradient, transition: 'width 0.3s ease' }} />
      </div>
      <p style={{ color: '#666', marginTop: '10px', fontSize: '14px' }}>{progress.toFixed(0)}% • {generatedImages.length} imagens salvas</p>

      {!audioFile && generatedImages.length > 0 && (
        <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '12px', marginTop: '20px', border: '2px solid #f59e0b' }}>
          <p style={{ margin: '0 0 15px 0', color: '#92400e', fontWeight: 'bold' }}>
            📁 Selecione o áudio para criar o vídeo:
          </p>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #f59e0b',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#fffbeb',
            }}
          >
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎵</div>
            <p style={{ margin: 0, color: '#92400e' }}>Clique para selecionar o áudio</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#b45309' }}>MP3, WAV, OGG, M4A</p>
          </div>
        </div>
      )}

      {generatedImages.length > 0 && audioFile && !videoUrl && currentStep !== 'done' && (
        <button
          onClick={onCreateVideo}
          style={{
            width: '100%',
            padding: '20px',
            marginTop: '20px',
            background: currentTheme.gradient,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🎬 Criar Video Agora ({generatedImages.length} imagens prontas)
        </button>
      )}

      {generatedImages.length > 0 && (
        <div style={{ marginTop: '30px', textAlign: 'left' }}>
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
    </div>
  );
};
