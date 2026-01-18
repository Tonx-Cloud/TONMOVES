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
          <>
            {hasCheckpoint && currentStep === 'upload' && (
              <div style={{ background: '#fff3cd', border: '2px solid #ffc107', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(255,193,7,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <strong style={{ color: '#856404' }}>📂 Progresso anterior encontrado!</strong>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#856404' }}>Você pode continuar de onde parou ou começar novo</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleRecoverProgress} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Recuperar</button>
                    <button onClick={clearCheckpoint} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️ Descartar</button>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div style={{ background: '#fee', border: '2px solid #f44', borderRadius: '12px', padding: '16px', marginBottom: '20px', color: '#c00' }} role="alert" aria-live="assertive">
                <strong>⚠️ {error}</strong>
                {generatedImages.length > 0 && (
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                    ✅ {generatedImages.length} imagens foram salvas. Seu progresso não foi perdido!
                  </p>
                )}
              </div>
            )}
            {currentStep === 'upload' && (
              <UploadStep
                audioFile={audioFile}
                fileInputRef={fileInputRef}
                handleFileSelect={handleFileSelect}
                handleDragOver={handleDragOver}
                handleDrop={handleDrop}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                videoMode={videoMode}
                setVideoMode={setVideoMode}
                selectedTheme={selectedTheme}
                setSelectedTheme={setSelectedTheme}
                themes={THEMES}
                videoModes={VIDEO_MODES}
                selectedVideoProvider={selectedVideoProvider}
                setSelectedVideoProvider={setSelectedVideoProvider}
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                apiKeys={apiKeys}
                videoApiKeys={videoApiKeys}
                IMAGE_PROVIDERS={IMAGE_PROVIDERS}
                VIDEO_PROVIDERS={VIDEO_PROVIDERS}
                currentTheme={currentTheme}
                onStart={() => audioFile && handleStartGeneration(audioFile, transcriptionProvider, transcriptionApiKey)}
              />
            )}

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

          </>
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
