import React from 'react';
import type { AspectRatio, VideoProvider, ImageProvider } from '../../types/app';
import type { Theme } from '../../utils/imageGenerator';
import type { VideoMode } from '../../utils/videoComposer';
import type { ThemeConfig } from '../../constants/themes';
import type { VideoMode as VideoModeDef } from '../../constants/videoModes';
import type { StoredImage } from '../../utils/imageStorage';

interface UploadStepProps {
  audioFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (r: AspectRatio) => void;
  videoMode: VideoMode;
  setVideoMode: (m: VideoMode) => void;
  selectedTheme: Theme;
  setSelectedTheme: (t: Theme) => void;
  themes: Record<Theme, ThemeConfig>;
  videoModes: VideoModeDef[];
  selectedVideoProvider: VideoProvider;
  setSelectedVideoProvider: (p: VideoProvider) => void;
  selectedProvider: ImageProvider;
  setSelectedProvider: (p: ImageProvider) => void;
  apiKeys: Record<ImageProvider, string>;
  videoApiKeys: Record<VideoProvider, string>;
  IMAGE_PROVIDERS: { id: ImageProvider; name: string; needsKey: boolean; description: string }[];
  VIDEO_PROVIDERS: { id: VideoProvider; name: string; needsKey: boolean; description: string; icon: string }[];
  currentTheme: ThemeConfig;
  onStart: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  audioFile,
  fileInputRef,
  handleFileSelect,
  handleDragOver,
  handleDrop,
  aspectRatio,
  setAspectRatio,
  videoMode,
  setVideoMode,
  selectedTheme,
  setSelectedTheme,
  themes,
  videoModes,
  selectedVideoProvider,
  setSelectedVideoProvider,
  selectedProvider,
  setSelectedProvider,
  apiKeys,
  videoApiKeys,
  IMAGE_PROVIDERS,
  VIDEO_PROVIDERS,
  currentTheme,
  onStart,
}) => {
  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
      <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>1. Selecione seu áudio</h2>
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed #667eea',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          background: audioFile ? '#f0f4ff' : '#fafafa',
          transition: 'all 0.3s',
          marginBottom: '30px',
        }}
      >
        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
        {audioFile ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎵</div>
            <p style={{ fontSize: '18px', color: '#667eea', margin: '10px 0', fontWeight: 'bold' }}>{audioFile.name}</p>
            <p style={{ fontSize: '14px', color: '#666' }}>{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
            <p style={{ fontSize: '18px', color: '#333', fontWeight: 'bold' }}>Clique ou arraste o áudio</p>
            <p style={{ fontSize: '14px', color: '#666' }}>MP3, WAV, OGG, M4A</p>
          </>
        )}
      </div>

      <h3 style={{ color: '#333' }}>2. Formato do vídeo</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setAspectRatio('16:9')} style={{ flex: 1, minWidth: '150px', padding: '16px', border: `2px solid ${aspectRatio === '16:9' ? '#667eea' : '#ddd'}`, borderRadius: '8px', background: aspectRatio === '16:9' ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: aspectRatio === '16:9' ? 'bold' : 'normal' }}>📺 16:9 Paisagem</button>
        <button onClick={() => setAspectRatio('9:16')} style={{ flex: 1, minWidth: '150px', padding: '16px', border: `2px solid ${aspectRatio === '9:16' ? '#667eea' : '#ddd'}`, borderRadius: '8px', background: aspectRatio === '9:16' ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: aspectRatio === '9:16' ? 'bold' : 'normal' }}>📱 9:16 Retrato</button>
      </div>

      <h3 style={{ color: '#333' }}>3. Modo do vídeo</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
        {videoModes.map(mode => (
          <button
            key={mode.id}
            onClick={() => setVideoMode(mode.id as VideoMode)}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '16px',
              border: `2px solid ${videoMode === mode.id ? '#667eea' : '#ddd'}`,
              borderRadius: '8px',
              background: videoMode === mode.id ? '#f0f4ff' : 'white',
              cursor: 'pointer',
              fontWeight: videoMode === mode.id ? 'bold' : 'normal',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{mode.icon}</div>
            <div style={{ fontWeight: 'bold' }}>{mode.name}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{mode.description}</div>
          </button>
        ))}
      </div>

      <h3 style={{ color: '#333' }}>4. Tema visual</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '30px' }}>
        {Object.entries(themes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => setSelectedTheme(key as Theme)}
            style={{
              padding: '16px 12px',
              border: `2px solid ${selectedTheme === key ? '#667eea' : '#ddd'}`,
              borderRadius: '8px',
              background: selectedTheme === key ? '#f0f4ff' : 'white',
              cursor: 'pointer',
              fontWeight: selectedTheme === key ? 'bold' : 'normal',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{theme.emoji}</div>
            {theme.name}
          </button>
        ))}
      </div>

      <h3 style={{ color: '#333' }}>5. Fonte de mídia</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={() => setSelectedVideoProvider('local')}
          style={{
            padding: '16px 12px',
            border: `2px solid ${selectedVideoProvider === 'local' ? '#667eea' : '#ddd'}`,
            borderRadius: '8px',
            background: selectedVideoProvider === 'local' ? '#f0f4ff' : 'white',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>🖼️</div>
          <div style={{ fontWeight: selectedVideoProvider === 'local' ? 'bold' : 'normal', fontSize: '13px' }}>Imagens IA</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>Gera e anima com FFmpeg</div>
        </button>

        <button
          onClick={() => {
            setSelectedVideoProvider('pexels');
            setSelectedProvider('pexels');
          }}
          disabled={!apiKeys.pexels}
          style={{
            padding: '16px 12px',
            border: `2px solid ${selectedVideoProvider === 'pexels' ? '#667eea' : '#ddd'}`,
            borderRadius: '8px',
            background: selectedVideoProvider === 'pexels' ? '#f0f4ff' : 'white',
            cursor: apiKeys.pexels ? 'pointer' : 'not-allowed',
            textAlign: 'center',
            opacity: apiKeys.pexels ? 1 : 0.5,
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📸</div>
          <div style={{ fontWeight: selectedVideoProvider === 'pexels' ? 'bold' : 'normal', fontSize: '13px' }}>Fotos Pexels</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
            {apiKeys.pexels ? 'Fotos reais HD' : '⚠️ API key'}
          </div>
        </button>

        {VIDEO_PROVIDERS.filter(p => p.id !== 'local' && p.id !== 'pexels').map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedVideoProvider(p.id)}
            disabled={!videoApiKeys[p.id]}
            style={{
              padding: '16px 12px',
              border: `2px solid ${selectedVideoProvider === p.id ? '#b45309' : '#ddd'}`,
              borderRadius: '8px',
              background: selectedVideoProvider === p.id ? '#fde68a' : 'white',
              cursor: videoApiKeys[p.id] ? 'pointer' : 'not-allowed',
              textAlign: 'center',
              opacity: videoApiKeys[p.id] ? 1 : 0.5,
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{p.icon}</div>
            <div style={{ fontWeight: selectedVideoProvider === p.id ? 'bold' : 'normal', fontSize: '13px' }}>{p.name}</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              {videoApiKeys[p.id] ? p.description : '⚠️ API key'}
            </div>
          </button>
        ))}
      </div>

      {(selectedVideoProvider === 'local' || selectedVideoProvider === 'runwayml' || selectedVideoProvider === 'lumaai' || selectedVideoProvider === 'stability') && (
        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666', fontWeight: '500' }}>
            {selectedVideoProvider === 'local' ? 'Gerador de imagens:' : 'Gerador de imagens base:'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {IMAGE_PROVIDERS.slice(0, 4).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                style={{
                  padding: '8px 14px',
                  border: `2px solid ${selectedProvider === p.id ? '#667eea' : '#ddd'}`,
                  borderRadius: '6px',
                  background: selectedProvider === p.id ? '#e0e7ff' : 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: selectedProvider === p.id ? 'bold' : 'normal',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          {IMAGE_PROVIDERS.find(p => p.id === selectedProvider)?.needsKey && !apiKeys[selectedProvider] && (
            <p style={{ margin: '10px 0 0 0', fontSize: '11px', color: '#dc2626' }}>
              ⚠️ Configure a API key em Configurações
            </p>
          )}
        </div>
      )}

      {selectedVideoProvider === 'pexels' && (
        <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #7dd3fc' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
            <strong>📸 Modo Pexels:</strong> Busca fotos profissionais reais do Pexels baseadas no tema e análise do áudio.
          </p>
        </div>
      )}

      {(selectedVideoProvider === 'runwayml' || selectedVideoProvider === 'lumaai' || selectedVideoProvider === 'stability') && (
        <div style={{ background: '#fef3c7', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #fcd34d' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
            <strong>🎬 Modo Video IA:</strong> Primeiro gera imagens com {IMAGE_PROVIDERS.find(p => p.id === selectedProvider)?.name}, depois transforma cada imagem em vídeo de 4-5 segundos usando {VIDEO_PROVIDERS.find(p => p.id === selectedVideoProvider)?.name}.
            <br /><span style={{ fontSize: '11px', opacity: 0.8 }}>Processo mais lento (~2-5 min por imagem), mas resultados cinematográficos!</span>
          </p>
        </div>
      )}

      <button
        onClick={onStart}
        disabled={!audioFile}
        style={{
          width: '100%',
          padding: '20px',
          background: audioFile ? currentTheme.gradient : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: audioFile ? 'pointer' : 'not-allowed',
          boxShadow: audioFile ? '0 4px 15px rgba(102,126,234,0.4)' : 'none',
          transition: 'background 0.3s ease',
        }}
        aria-label="Iniciar geração de vídeo"
      >
        {audioFile ? (
          <>
            <div>Criar Video</div>
            <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px', opacity: 0.9 }}>
              Imagens: {selectedProvider} | Video: {selectedVideoProvider} | Modo: {videoModes.find(m => m.id === videoMode)?.name}
            </div>
          </>
        ) : 'Selecione um audio'}
      </button>
    </div>
  );
};
