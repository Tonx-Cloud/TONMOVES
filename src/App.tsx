import React, { useRef, useState } from 'react';
import type { Theme, GlobalContext } from './utils/imageGenerator';
import type { AudioAnalysis, NarrativeAnalysis } from './utils/audioAnalyzer';
import type { ImageStorage, StoredImage } from './utils/imageStorage';
import type { VideoMode } from './utils/videoComposer';
import { ImageGallery } from './components/ImageGallery';
import { Sidebar } from './components/layout/Sidebar';
import { Settings } from './components/Settings';
import { UploadStep } from './components/steps/UploadStep';
import { ProgressStep } from './components/steps/ProgressStep';
import { DoneStep } from './components/steps/DoneStep';
import { VIDEO_MODES, THEMES, IMAGE_PROVIDERS_LIST, VIDEO_PROVIDERS_LIST, TRANSCRIPTION_PROVIDERS_LIST } from './constants';
import type { AspectRatio, CurrentView, Step, VideoProvider, TranscriptionProvider, ImageProvider } from './types/app';
import { useConfig } from './hooks/useConfig';
import { useCheckpoint } from './hooks/useCheckpoint';
import { usePipeline } from './hooks/usePipeline';
import { useImageActions } from './hooks/useImageActions';
import './ui/design-system/tokens.css';
import { Card } from './ui/design-system/Card';
import { Button } from './ui/design-system/Button';
import { Banner } from './ui/design-system/Banner';
import { Badge } from './ui/design-system/Badge';

const IMAGE_PROVIDERS = IMAGE_PROVIDERS_LIST;
const VIDEO_PROVIDERS = VIDEO_PROVIDERS_LIST;
const TRANSCRIPTION_PROVIDERS = TRANSCRIPTION_PROVIDERS_LIST;


const App: React.FC = () => {
  // State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('baby');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [videoMode, setVideoMode] = useState<VideoMode>('slideshow');
  
  // States de configuração de API (movidos para Settings, mas os estados são mantidos aqui e passados como props)
  const {
    selectedProvider, setSelectedProvider, apiKeys, setApiKeys,
    selectedVideoProvider, setSelectedVideoProvider, videoApiKeys, setVideoApiKeys,
    transcriptionProvider, setTranscriptionProvider, transcriptionApiKey, setTranscriptionApiKey,
    handleSaveConfig, handleSaveVideoConfig, handleSaveTranscriptionConfig,
  } = useConfig();


  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [globalContext, setGlobalContext] = useState<GlobalContext | null>(null);
  const [narrative, setNarrative] = useState<NarrativeAnalysis | null>(null);
  const [generatedImages, setGeneratedImages] = useState<StoredImage[]>([]);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<CurrentView>('main');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageStorageRef = useRef<ImageStorage | null>(null);

  // hooks: checkpoint/pipeline/image actions
  const {
    hasCheckpoint,
    handleRecoverProgress,
    saveCheckpoint,
    clearCheckpoint,
  } = useCheckpoint({
    imageStorageRef,
    setGeneratedImages,
    setProgress,
    setAudioAnalysis,
    setGlobalContext,
    setNarrative,
    setAspectRatio,
    setSelectedTheme,
    setCurrentStep,
    setStatusMessage,
  });

  const {
    handleStartGeneration,
    handleCreateVideoFromRecovered,
  } = usePipeline({
    setProgress,
    setStatusMessage,
    setAudioAnalysis,
    setGlobalContext,
    setNarrative,
    setGeneratedImages,
    setVideoUrl,
    setCurrentStep,
    setError,
    saveCheckpoint,
    selectedTheme,
    aspectRatio,
    videoMode,
    selectedProvider,
    apiKeys,
    selectedVideoProvider,
    videoApiKeys,
  });

  const {
    handleDeleteImage,
    handleClearAllImages,
    handleRegenerateImage,
    handleUploadImage,
    handleUpdateAnimation,
  } = useImageActions({
    selectedProvider,
    apiKeys,
    selectedTheme,
    setGeneratedImages,
    setStatusMessage,
    setError,
  });






  // ANCHOR: Handle File Select
  // DESC: Processa seleção de arquivo de áudio
  // WHY: Permite upload de áudio para criar vídeo
  // USAGE: onChange do input type="file"
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setError(null);

      if (currentStep === 'composing' && generatedImages.length > 0) {
        setStatusMessage('✅ Áudio selecionado! Pronto para criar vídeo.');
      } else {
        setCurrentStep('upload');
        setGeneratedImages([]);
        setVideoUrl(null);
        setGlobalContext(null);
        setNarrative(null);
      }
    } else {
      setError('Por favor, selecione um arquivo de áudio válido');
    }
  };

  // ANCHOR_END: Handle File Select

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setError(null);
    } else {
      setError('Por favor, solte um arquivo de áudio válido');
    }
  };





  // ANCHOR: Handle Reset
  // DESC: Reseta toda a aplicação para estado inicial
  // WHY: Permitir criar novo projeto do zero
  // USAGE: Chamado pelo botão "Criar Novo" e menu "Novo Projeto"
  const handleReset = async () => {
    setAudioFile(null);
    setCurrentStep('upload');
    setCurrentView('main');
    setProgress(0);
    setStatusMessage('');
    setAudioAnalysis(null);
    setGlobalContext(null);
    setNarrative(null);
    setGeneratedImages([]);
    setVideoUrl(null);
    setError(null);
    await clearCheckpoint();
  };

  // ANCHOR_END: Handle Reset



  const currentTheme = THEMES[selectedTheme];

  const renderContent = () => {
    switch (currentView) {
      case 'settings':
        return <Settings
          transcriptionProvider={transcriptionProvider}
          setTranscriptionProvider={setTranscriptionProvider}
          transcriptionApiKey={transcriptionApiKey}
          setTranscriptionApiKey={setTranscriptionApiKey}
          handleSaveTranscriptionConfig={handleSaveTranscriptionConfig}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
          handleSaveConfig={handleSaveConfig}
          selectedVideoProvider={selectedVideoProvider}
          setSelectedVideoProvider={setSelectedVideoProvider}
          videoApiKeys={videoApiKeys}
          setVideoApiKeys={setVideoApiKeys}
          handleSaveVideoConfig={handleSaveVideoConfig}
        />;
      case 'main':
      default:
        return (
          <div className="grid-2">
            <div className="stack-vertical">
              {hasCheckpoint && currentStep === 'upload' && (
                <Banner
                  tone="info"
                  title="Progresso encontrado"
                  message="Você pode recuperar o trabalho salvo ou descartá-lo."
                  action={(
                    <div className="stack-horizontal" style={{ gap: 8 }}>
                      <Button size="md" variant="primary" onClick={handleRecoverProgress}>Recuperar</Button>
                      <Button size="md" variant="ghost" onClick={clearCheckpoint}>Descartar</Button>
                    </div>
                  )}
                />
              )}

              {error && (
                <Banner
                  tone="error"
                  title="Erro"
                  message={generatedImages.length > 0 ? `${error} — ${generatedImages.length} imagens foram salvas.` : error}
                />
              )}

              {currentStep === 'upload' ? (
                <>
                  <Card title="Plano" description="FREE: baixa resolução + watermark. PRO: 1080p sem watermark." padding="lg">
                    <div className="stack-horizontal" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone="neutral">FREE ativo</Badge>
                      <Badge tone="warn">Limite: baixa resolução</Badge>
                      <Badge tone="warn">Watermark obrigatória</Badge>
                      <Badge tone="accent">CTA: Upgrade PRO</Badge>
                    </div>
                  </Card>

                  <Card title="Áudio" description="Envie sua faixa para gerar o vídeo." padding="lg">
                    <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      style={{
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-10)',
                        padding: 'var(--space-16)',
                        background: 'var(--surface-raised)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{audioFile ? audioFile.name : 'Clique ou arraste um áudio'}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{audioFile ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB` : 'MP3, WAV, OGG, M4A'}</div>
                    </div>
                  </Card>

                  <Card title="Estilo visual" description="Escolha o tema e o modo." padding="lg">
                    <div className="stack-vertical">
                      <div>
                        <div className="label-small">Modo do vídeo</div>
                        <div className="stack-horizontal" style={{ flexWrap: 'wrap', gap: 8 }}>
                          {VIDEO_MODES.map(mode => (
                            <button
                              key={mode.id}
                              onClick={() => setVideoMode(mode.id)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-8)',
                                border: `1px solid ${videoMode === mode.id ? 'var(--accent)' : 'var(--border)'}`,
                                background: videoMode === mode.id ? 'rgba(91,103,241,0.12)' : 'var(--surface-raised)',
                                color: 'var(--text)',
                                cursor: 'pointer',
                                minWidth: 120,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{mode.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{mode.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="label-small">Tema</div>
                        <div className="stack-horizontal" style={{ flexWrap: 'wrap', gap: 8 }}>
                          {Object.entries(THEMES).map(([key, theme]) => (
                            <button
                              key={key}
                              onClick={() => setSelectedTheme(key as Theme)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-8)',
                                border: `1px solid ${selectedTheme === key ? 'var(--accent)' : 'var(--border)'}`,
                                background: selectedTheme === key ? 'rgba(91,103,241,0.12)' : 'var(--surface-raised)',
                                color: 'var(--text)',
                                cursor: 'pointer',
                                minWidth: 110,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{theme.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{theme.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Export" description="Defina formato e proporção." padding="lg">
                    <div className="stack-vertical">
                      <div className="label-small">Proporção</div>
                      <div className="stack-horizontal" style={{ gap: 8, flexWrap: 'wrap' }}>
                        {['16:9', '9:16'].map(ratio => (
                          <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio as AspectRatio)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-8)',
                              border: `1px solid ${aspectRatio === ratio ? 'var(--accent)' : 'var(--border)'}`,
                              background: aspectRatio === ratio ? 'rgba(91,103,241,0.12)' : 'var(--surface-raised)',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              minWidth: 120,
                            }}
                          >
                            {ratio === '16:9' ? 'Paisagem 16:9' : 'Retrato 9:16'}
                          </button>
                        ))}
                      </div>
                      <Badge tone="neutral">FREE: resolução baixa + watermark</Badge>
                    </div>
                  </Card>

                  <Card title="Providers" description="Fontes de mídia e transcrição." padding="lg">
                    <div className="stack-vertical">
                      <div>
                        <div className="label-small">Vídeo</div>
                        <div className="stack-horizontal" style={{ gap: 8, flexWrap: 'wrap' }}>
                          {VIDEO_PROVIDERS.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedVideoProvider(p.id)}
                              disabled={p.id !== 'local' && p.id !== 'pexels' && !videoApiKeys[p.id]}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-8)',
                                border: `1px solid ${selectedVideoProvider === p.id ? 'var(--accent)' : 'var(--border)'}`,
                                background: selectedVideoProvider === p.id ? 'rgba(91,103,241,0.12)' : 'var(--surface-raised)',
                                color: 'var(--text)',
                                cursor: p.id === 'local' || p.id === 'pexels' || videoApiKeys[p.id] ? 'pointer' : 'not-allowed',
                                opacity: p.id === 'local' || p.id === 'pexels' || videoApiKeys[p.id] ? 1 : 0.6,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="label-small">Imagens</div>
                        <div className="stack-horizontal" style={{ gap: 8, flexWrap: 'wrap' }}>
                          {IMAGE_PROVIDERS.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedProvider(p.id)}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-8)',
                                border: `1px solid ${selectedProvider === p.id ? 'var(--accent)' : 'var(--border)'}`,
                                background: selectedProvider === p.id ? 'rgba(91,103,241,0.12)' : 'var(--surface-raised)',
                                color: 'var(--text)',
                                cursor: 'pointer',
                                minWidth: 120,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="label-small">Transcrição</div>
                        <div className="stack-horizontal" style={{ gap: 8, flexWrap: 'wrap' }}>
                          {TRANSCRIPTION_PROVIDERS.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setTranscriptionProvider(p.id)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-8)',
                                border: `1px solid ${transcriptionProvider === p.id ? 'var(--accent)' : 'var(--border)'}`,
                                background: transcriptionProvider === p.id ? 'rgba(91,103,241,0.12)' : 'var(--surface-raised)',
                                color: 'var(--text)',
                                cursor: 'pointer',
                                minWidth: 120,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Button
                    size="lg"
                    variant="primary"
                    disabled={!audioFile}
                    onClick={() => audioFile && handleStartGeneration(audioFile, transcriptionProvider, transcriptionApiKey)}
                    style={{ width: '100%' }}
                  >
                    {audioFile ? 'Criar vídeo' : 'Selecione um áudio'}
                  </Button>
                </>
              ) : (
                <Card title="Configuração atual" description="Resumo da seleção." padding="lg">
                  <div className="stack-vertical">
                    <div style={{ fontSize: 14 }}>
                      <strong>Proporção:</strong> {aspectRatio} • <strong>Modo:</strong> {VIDEO_MODES.find(m => m.id === videoMode)?.name}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      <strong>Tema:</strong> {THEMES[selectedTheme].name}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      <strong>Imagem:</strong> {selectedProvider} • <strong>Vídeo:</strong> {selectedVideoProvider}
                    </div>
                    <div className="stack-horizontal" style={{ gap: 8 }}>
                      <Button variant="ghost" onClick={handleReset}>Novo projeto</Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="stack-vertical">
              {(currentStep === 'analyzing' || currentStep === 'generating' || currentStep === 'composing') && (
                <ProgressStep
                  currentStep={currentStep}
                  statusMessage={statusMessage}
                  narrative={narrative}
                  globalContext={globalContext}
                  currentTheme={currentTheme}
                  progress={progress}
                  generatedImages={generatedImages}
                  audioFile={audioFile}
                  fileInputRef={fileInputRef}
                  handleFileSelect={handleFileSelect}
                  onCreateVideo={() => audioFile && handleCreateVideoFromRecovered(generatedImages, audioFile, aspectRatio, videoMode)}
                  onDeleteImage={handleDeleteImage}
                  onClearAllImages={handleClearAllImages}
                  onRegenerateImage={handleRegenerateImage}
                  onUploadImage={handleUploadImage}
                  onUpdateAnimation={handleUpdateAnimation}
                  videoUrl={videoUrl}
                />
              )}

              {currentStep === 'done' && videoUrl && (
                <DoneStep
                  aspectRatio={aspectRatio}
                  videoUrl={videoUrl}
                  currentTheme={currentTheme}
                  narrative={narrative}
                  generatedImages={generatedImages}
                  onReset={handleReset}
                  onDeleteImage={handleDeleteImage}
                  onClearAllImages={handleClearAllImages}
                  onRegenerateImage={handleRegenerateImage}
                  onUploadImage={handleUploadImage}
                  onUpdateAnimation={handleUpdateAnimation}
                />
              )}

              {currentStep === 'upload' && generatedImages.length > 0 && (
                <Card title="Galeria" description="Imagens geradas." padding="lg">
                  <ImageGallery
                    images={generatedImages}
                    onDelete={handleDeleteImage}
                    onClearAll={handleClearAllImages}
                    onRegenerate={handleRegenerateImage}
                    onUpload={handleUploadImage}
                    onUpdateAnimation={handleUpdateAnimation}
                  />
                </Card>
              )}
            </div>
          </div>
        );
    }
  };


  return (
    <div style={{ minHeight: '100vh', background: currentTheme.gradient, padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', transition: 'background 0.5s ease' }}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} setCurrentView={setCurrentView} onNewProject={handleReset} />

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '1200px', margin: '0 auto 40px', textAlign: 'center', position: 'relative' }}>
        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'absolute',
            left: 0,
            background: 'rgba(255,255,255,0.25)',
            border: '2px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '24px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.4)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ☰
        </button>
        <div>
          <h1 style={{ color: 'white', fontSize: 'clamp(32px, 8vw, 56px)', fontWeight: '800', margin: '0 0 10px 0', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            🎵 TONMOVES
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: 'clamp(16px, 3vw, 20px)', margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            Crie vídeos que contam histórias • 100% Grátis
          </p>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: '5px 0 0 0' }}>
            v4.3 FREE • Whisper API • Auto-Save
          </p>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        {renderContent()}
      </main>

      <footer style={{ maxWidth: '900px', margin: '40px auto 0', textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
        <p style={{ margin: '5px 0' }}>Web Speech API • Pollinations.ai • FFmpeg.wasm • 100% Grátis</p>
        <p style={{ margin: '5px 0' }}>v4.3 FREE • Auto-Save • {aspectRatio} • {currentTheme.name}</p>
      </footer>
    </div>
  );
};

export default App;
