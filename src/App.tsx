import React, { useState, useRef, useEffect } from 'react';
import { AudioAnalyzer, type AudioAnalysis, type NarrativeAnalysis } from './utils/audioAnalyzer';
import { ImageGenerator, type ImagePrompt, type Theme, type GlobalContext } from './utils/imageGenerator';
import { ImageStorage, type StoredImage } from './utils/imageStorage';
import { VideoComposer, type VideoOptions } from './utils/videoComposer';
import { ImageGallery } from './components/ImageGallery';
import { CheckpointManager, type Checkpoint } from './utils/checkpointManager';

type AspectRatio = '16:9' | '9:16';
type Step = 'upload' | 'analyzing' | 'generating' | 'composing' | 'done';

interface ThemeConfig {
  name: string;
  emoji: string;
  description: string;
  gradient: string;
}

const THEMES: Record<Theme, ThemeConfig> = {
  cinematic: {
    name: 'Cinematic',
    emoji: '🎬',
    description: 'Cinematográfico dramático',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  neon: {
    name: 'Neon',
    emoji: '💜',
    description: 'Cyberpunk futurista',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  nature: {
    name: 'Nature',
    emoji: '🌿',
    description: 'Natureza orgânica',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  abstract: {
    name: 'Abstract',
    emoji: '🎨',
    description: 'Arte moderna',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  minimal: {
    name: 'Minimal',
    emoji: '⚪',
    description: 'Minimalista elegante',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  baby: {
    name: 'Baby',
    emoji: '👶',
    description: 'Super colorido e fofo',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
};

const App: React.FC = () => {
  // State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('baby');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [enableTranscription, setEnableTranscription] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [globalContext, setGlobalContext] = useState<GlobalContext | null>(null);
  const [narrative, setNarrative] = useState<NarrativeAnalysis | null>(null);
  const [generatedImages, setGeneratedImages] = useState<StoredImage[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckpoint, setHasCheckpoint] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const imageGeneratorRef = useRef<ImageGenerator | null>(null);
  const imageStorageRef = useRef<ImageStorage | null>(null);
  const videoComposerRef = useRef<VideoComposer | null>(null);
  const checkpointManagerRef = useRef<CheckpointManager | null>(null);

  // ✅ Inicializar checkpoint manager
  useEffect(() => {
    checkpointManagerRef.current = new CheckpointManager();
    checkRecovery();
  }, []);

  // ✅ Verificar se tem checkpoint para recuperar
  const checkRecovery = async () => {
    if (!checkpointManagerRef.current) return;
    
    const hasRecent = await checkpointManagerRef.current.hasRecentCheckpoint();
    setHasCheckpoint(hasRecent);
  };

  // ✅ Recuperar progresso anterior
  const handleRecoverProgress = async () => {
    if (!checkpointManagerRef.current) return;

    const checkpoint = await checkpointManagerRef.current.loadCheckpoint();
    if (!checkpoint) return;

    // Restaurar estado
    setProgress(checkpoint.progress);
    setCurrentStep(checkpoint.step as Step);
    
    if (checkpoint.data.audioAnalysis) {
      setAudioAnalysis(checkpoint.data.audioAnalysis);
    }
    if (checkpoint.data.globalContext) {
      setGlobalContext(checkpoint.data.globalContext);
    }
    if (checkpoint.data.narrative) {
      setNarrative(checkpoint.data.narrative);
    }
    if (checkpoint.data.generatedImages) {
      setGeneratedImages(checkpoint.data.generatedImages);
    }
    if (checkpoint.data.aspectRatio) {
      setAspectRatio(checkpoint.data.aspectRatio as AspectRatio);
    }
    if (checkpoint.data.theme) {
      setSelectedTheme(checkpoint.data.theme as Theme);
    }

    setStatusMessage('📂 Progresso recuperado! Continuando de onde parou...');
    setHasCheckpoint(false);
  };

  // ✅ Salvar checkpoint automaticamente
  const saveCheckpoint = async (step: string, prog: number) => {
    if (!checkpointManagerRef.current) return;

    await checkpointManagerRef.current.autoSave(step, prog, {
      audioAnalysis,
      globalContext,
      narrative,
      generatedImages,
      aspectRatio,
      theme: selectedTheme,
      audioFileName: audioFile?.name
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setError(null);
      setCurrentStep('upload');
      setGeneratedImages([]);
      setVideoUrl(null);
      setGlobalContext(null);
      setNarrative(null);
    } else {
      setError('Por favor, selecione um arquivo de áudio válido');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setError(null);
    } else {
      setError('Por favor, solte um arquivo de áudio válido');
    }
  };

  const handleStartGeneration = async () => {
    if (!audioFile) {
      setError('Selecione um arquivo de áudio primeiro');
      return;
    }

    try {
      setError(null);
      
      // ✅ CHECKPOINT 1: Início
      await saveCheckpoint('starting', 0);
      
      // Step 1: Analyze Audio
      setCurrentStep('analyzing');
      setProgress(5);
      setStatusMessage(enableTranscription 
        ? '🎤 Preparando transcrição com Web Speech API...'
        : '🎧 Analisando áudio...');
      
      audioAnalyzerRef.current = new AudioAnalyzer();
      
      const analysis = await audioAnalyzerRef.current.analyzeAudio(audioFile, {
        transcribe: enableTranscription,
        analyzeNarrative: enableTranscription,
        useFilename: true  // ✅ Sempre usar nome do arquivo
      });
      
      setAudioAnalysis(analysis);
      if (analysis.narrative) {
        setNarrative(analysis.narrative);
      }
      
      // ✅ CHECKPOINT 2: Áudio analisado
      setProgress(20);
      await saveCheckpoint('analyzed', 20);
      
      if (analysis.fullTranscription) {
        setStatusMessage(`✅ História: "${analysis.narrative?.story || 'Narrativa detectada'}"`);
      } else if (analysis.narrative) {
        setStatusMessage(`✅ Contexto: ${analysis.narrative.story}`);
      } else {
        setStatusMessage(`✅ Áudio analisado: ${analysis.segments.length} cenas`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 2: Generate Images
      setCurrentStep('generating');
      setProgress(25);
      
      if (analysis.narrative) {
        setStatusMessage(`📖 Personagens: ${analysis.narrative.characters.join(', ')}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setStatusMessage('🎨 Criando prompts visuais...');
      
      imageGeneratorRef.current = new ImageGenerator();
      imageStorageRef.current = new ImageStorage();
      await imageStorageRef.current.init();
      
      const prompts = await imageGeneratorRef.current.generatePrompts(
        analysis.segments,
        audioFile.name.replace(/\.[^/.]+$/, ''),
        selectedTheme,
        analysis
      );
      
      if (prompts[0]?.globalContext) {
        setGlobalContext(prompts[0].globalContext);
      }
      
      // ✅ CHECKPOINT 3: Prompts criados
      setProgress(30);
      await saveCheckpoint('prompts-created', 30);
      
      setStatusMessage(`🎨 Gerando ${prompts.length} imagens...`);
      
      const images: StoredImage[] = [];
      
      for (let i = 0; i < prompts.length; i++) {
        const imagePrompt = prompts[i];
        const narrativeInfo = imagePrompt.narrativeContext 
          ? ` - ${imagePrompt.narrativeContext}`
          : '';
        
        setStatusMessage(`🎨 Imagem ${i + 1}/${prompts.length}${narrativeInfo}`);
        
        try {
          const imageUrl = await imageGeneratorRef.current.generateImage(
            imagePrompt.prompt,
            selectedTheme
          );
          
          const blob = await imageStorageRef.current.downloadImage(imageUrl);
          
          const storedImage: StoredImage = {
            id: `img-${Date.now()}-${i}`,
            url: imageUrl,
            blob,
            prompt: imagePrompt.prompt,
            timestamp: Date.now(),
            segmentIndex: i,
          };
          
          await imageStorageRef.current.saveImage(storedImage);
          images.push(storedImage);
          setGeneratedImages([...images]);
          
          const imgProgress = 30 + ((i + 1) / prompts.length) * 45;
          setProgress(imgProgress);
          
          // ✅ CHECKPOINT a cada 3 imagens
          if ((i + 1) % 3 === 0 || i === prompts.length - 1) {
            await saveCheckpoint(`image-${i + 1}`, imgProgress);
          }
          
        } catch (imgError) {
          console.error(`Erro na imagem ${i + 1}:`, imgError);
          setError(`⚠️ Erro na imagem ${i + 1}, mas progresso salvo. Você pode tentar novamente.`);
          // ✅ Salvar checkpoint mesmo com erro
          await saveCheckpoint(`error-image-${i + 1}`, 30 + ((i + 1) / prompts.length) * 45);
          throw imgError;
        }
      }
      
      // ✅ CHECKPOINT 4: Todas imagens geradas
      setProgress(75);
      await saveCheckpoint('images-complete', 75);
      
      // Step 3: Compose Video
      setCurrentStep('composing');
      setStatusMessage('🎬 Criando vídeo final...');
      
      videoComposerRef.current = new VideoComposer();
      await videoComposerRef.current.load((p) => {
        setProgress(75 + (p / 100) * 20);
        if (p % 20 === 0) {
          setStatusMessage(`🎬 FFmpeg... ${p}%`);
        }
      });
      
      setStatusMessage('🎬 Renderizando vídeo...');
      
      // ✅ CORREÇÃO: Usar aspectRatio corretamente
      const videoOptions: VideoOptions = {
        fps: 30,
        width: aspectRatio === '9:16' ? 720 : 1280,   // ✅ CORRIGIDO
        height: aspectRatio === '9:16' ? 1280 : 720,  // ✅ CORRIGIDO
        audioFile,
      };
      
      console.log('📐 Formato do vídeo:', videoOptions.width, 'x', videoOptions.height);
      
      const videoBlob = await videoComposerRef.current.createVideo(
        images,
        videoOptions,
        (p) => {
          setProgress(75 + 20 + (p / 100) * 5);
          if (p % 25 === 0) {
            setStatusMessage(`🎬 Renderizando... ${p}%`);
          }
        }
      );
      
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      
      setProgress(100);
      setCurrentStep('done');
      setStatusMessage('✅ Vídeo criado!');
      
      // ✅ Limpar checkpoint ao finalizar com sucesso
      if (checkpointManagerRef.current) {
        await checkpointManagerRef.current.clearCheckpoint();
      }
      
    } catch (err) {
      console.error('Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatusMessage('❌ Erro! Mas seu progresso foi salvo.');
      // ✅ NÃO limpar checkpoint em caso de erro
    }
  };

  const handleReset = async () => {
    setAudioFile(null);
    setCurrentStep('upload');
    setProgress(0);
    setStatusMessage('');
    setAudioAnalysis(null);
    setGlobalContext(null);
    setNarrative(null);
    setGeneratedImages([]);
    setVideoUrl(null);
    setError(null);
    
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.cleanup();
    }
    
    // Limpar checkpoint
    if (checkpointManagerRef.current) {
      await checkpointManagerRef.current.clearCheckpoint();
      setHasCheckpoint(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (imageStorageRef.current) {
      await imageStorageRef.current.deleteImage(id);
      setGeneratedImages(prev => prev.filter(img => img.id !== id));
    }
  };

  const handleClearAllImages = async () => {
    if (imageStorageRef.current) {
      await imageStorageRef.current.clearAll();
      setGeneratedImages([]);
    }
  };

  const currentTheme = THEMES[selectedTheme];

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.gradient,
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'background 0.5s ease',
    }}>
      {/* Header */}
      <header style={{
        maxWidth: '1200px',
        margin: '0 auto 40px',
        textAlign: 'center',
      }}>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: '800',
          margin: '0 0 10px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
        }}>
          🎵 TONMOVES
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.95)',
          fontSize: 'clamp(16px, 3vw, 20px)',
          margin: 0,
          textShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}>
          Crie vídeos que contam histórias • 100% Grátis
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '14px',
          margin: '5px 0 0 0',
        }}>
          v4.0 FREE • Web Speech API • Auto-Save
        </p>
      </header>

      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Recovery Banner */}
        {hasCheckpoint && currentStep === 'upload' && (
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '0 4px 15px rgba(255,193,7,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <strong style={{ color: '#856404' }}>📂 Progresso anterior encontrado!</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#856404' }}>
                  Você pode continuar de onde parou ou começar novo
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleRecoverProgress}
                  style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  ✅ Recuperar
                </button>
                <button
                  onClick={async () => {
                    if (checkpointManagerRef.current) {
                      await checkpointManagerRef.current.clearCheckpoint();
                      setHasCheckpoint(false);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Descartar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee',
            border: '2px solid #f44',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            color: '#c00',
          }}>
            <strong>⚠️ {error}</strong>
            {generatedImages.length > 0 && (
              <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                ✅ {generatedImages.length} imagens foram salvas. Seu progresso não foi perdido!
              </p>
            )}
          </div>
        )}

        {/* Upload Card */}
        {currentStep === 'upload' && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>
              1. Selecione seu áudio
            </h2>
            
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
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {audioFile ? (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎵</div>
                  <p style={{ fontSize: '18px', color: '#667eea', margin: '10px 0', fontWeight: 'bold' }}>
                    {audioFile.name}
                  </p>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
                  <p style={{ fontSize: '18px', color: '#333', fontWeight: 'bold' }}>
                    Clique ou arraste o áudio
                  </p>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    MP3, WAV, OGG, M4A
                  </p>
                </>
              )}
            </div>

            {/* Transcription Toggle */}
            <div style={{
              background: '#f0f4ff',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '30px',
              border: '2px solid #667eea',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={enableTranscription}
                  onChange={(e) => setEnableTranscription(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginRight: '12px',
                    cursor: 'pointer',
                  }}
                />
                <div>
                  <strong>🎤 Transcrever com Web Speech API (Chrome/Edge)</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                    100% grátis! O navegador transcreve a letra e detecta a história.
                  </p>
                </div>
              </label>
            </div>

            <h3 style={{ color: '#333' }}>2. Formato do vídeo</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setAspectRatio('16:9')}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '16px',
                  border: `2px solid ${aspectRatio === '16:9' ? '#667eea' : '#ddd'}`,
                  borderRadius: '8px',
                  background: aspectRatio === '16:9' ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  fontWeight: aspectRatio === '16:9' ? 'bold' : 'normal',
                }}
              >
                📺 16:9 Paisagem
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '16px',
                  border: `2px solid ${aspectRatio === '9:16' ? '#667eea' : '#ddd'}`,
                  borderRadius: '8px',
                  background: aspectRatio === '9:16' ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  fontWeight: aspectRatio === '9:16' ? 'bold' : 'normal',
                }}
              >
                📱 9:16 Retrato
              </button>
            </div>

            <h3 style={{ color: '#333' }}>3. Tema visual</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              marginBottom: '30px',
            }}>
              {Object.entries(THEMES).map(([key, theme]) => (
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

            <button
              onClick={handleStartGeneration}
              disabled={!audioFile}
              style={{
                width: '100%',
                padding: '18px',
                background: audioFile ? currentTheme.gradient : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: audioFile ? 'pointer' : 'not-allowed',
                boxShadow: audioFile ? '0 4px 15px rgba(102,126,234,0.4)' : 'none',
              }}
            >
              {audioFile ? '🚀 Criar Vídeo (com Auto-Save)' : '⏸️ Selecione um áudio'}
            </button>
          </div>
        )}

        {/* Processing Cards - Mesmo código anterior mas com indicador de checkpoint */}
        {(currentStep === 'analyzing' || currentStep === 'generating' || currentStep === 'composing') && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              {currentStep === 'analyzing' && '🎤'}
              {currentStep === 'generating' && '🎨'}
              {currentStep === 'composing' && '🎬'}
            </div>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>
              {currentStep === 'analyzing' && 'Analisando...'}
              {currentStep === 'generating' && 'Gerando imagens...'}
              {currentStep === 'composing' && 'Criando vídeo...'}
            </h2>
            <p style={{ color: '#666', fontSize: '16px', marginBottom: '10px' }}>
              {statusMessage}
            </p>
            <p style={{ color: '#28a745', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>
              💾 Progresso salvo automaticamente
            </p>
            
            {/* Narrative/Context cards... */}
            {narrative && (
              <div style={{
                background: '#fff5f5',
                border: '2px solid #f093fb',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#f093fb' }}>
                  📖 História: {narrative.story}
                </h3>
                {narrative.characters.length > 0 && (
                  <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                    <strong>Personagens:</strong> {narrative.characters.join(', ')}
                  </p>
                )}
              </div>
            )}

            {globalContext && (
              <div style={{
                background: '#f0f4ff',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#667eea' }}>
                  🎬 Tema: {currentTheme.emoji} {currentTheme.name}
                </h3>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  {globalContext.mainTheme}
                </p>
              </div>
            )}
            
            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '12px',
              background: '#eee',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: currentTheme.gradient,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ color: '#666', marginTop: '10px', fontSize: '14px' }}>
              {progress.toFixed(0)}% • {generatedImages.length} imagens salvas
            </p>

            {/* Image Gallery */}
            {generatedImages.length > 0 && (
              <div style={{ marginTop: '30px', textAlign: 'left' }}>
                <ImageGallery
                  images={generatedImages}
                  onDelete={handleDeleteImage}
                  onClearAll={handleClearAllImages}
                />
              </div>
            )}
          </div>
        )}

        {/* Done Card - mesmo código anterior */}
        {currentStep === 'done' && videoUrl && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#333', marginBottom: '20px' }}>
              Vídeo criado! {aspectRatio === '9:16' ? '📱' : '📺'}
            </h2>
            
            {narrative && (
              <div style={{
                background: '#fff5f5',
                border: '2px solid #f093fb',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  <strong>História:</strong> {narrative.story}
                </p>
              </div>
            )}
            
            <div style={{
              background: '#f0f4ff',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <video
                controls
                style={{
                  width: '100%',
                  maxWidth: aspectRatio === '16:9' ? '600px' : '400px',
                  borderRadius: '8px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                }}
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            </div>

            {generatedImages.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <ImageGallery
                  images={generatedImages}
                  onDelete={handleDeleteImage}
                  onClearAll={handleClearAllImages}
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
                onClick={handleReset}
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
        )}
      </main>

      <footer style={{
        maxWidth: '900px',
        margin: '40px auto 0',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.9)',
        fontSize: '14px',
      }}>
        <p style={{ margin: '5px 0' }}>
          Web Speech API • Pollinations.ai • FFmpeg.wasm • 100% Grátis
        </p>
        <p style={{ margin: '5px 0' }}>
          v4.0 FREE • Auto-Save • {aspectRatio} • {currentTheme.name}
        </p>
      </footer>
    </div>
  );
};

export default App;
