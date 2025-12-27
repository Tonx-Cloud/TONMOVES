import React, { useState, useRef } from 'react';
import { AudioAnalyzer, type AudioAnalysis } from './utils/audioAnalyzer';
import { ImageGenerator, type ImagePrompt } from './utils/imageGenerator';
import { ImageStorage, type StoredImage } from './utils/imageStorage';
import { VideoComposer, type VideoOptions } from './utils/videoComposer';
import { ImageGallery } from './components/ImageGallery';

type Theme = 'cinematic' | 'neon' | 'nature' | 'abstract' | 'minimal' | 'baby';
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
    description: 'Estilo cinematográfico com cores vibrantes e dramáticas',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  neon: {
    name: 'Neon',
    emoji: '💜',
    description: 'Luzes neon vibrantes, cyberpunk, futurista',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  nature: {
    name: 'Nature',
    emoji: '🌿',
    description: 'Natureza, paisagens orgânicas, verde exuberante',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  abstract: {
    name: 'Abstract',
    emoji: '🎨',
    description: 'Formas abstratas, cores vibrantes, arte moderna',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  minimal: {
    name: 'Minimal',
    emoji: '⚪',
    description: 'Minimalista, clean, espaços vazios, elegante',
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  baby: {
    name: 'Baby',
    emoji: '👶',
    description: 'Super colorido, fofo, alegre e vibrante!',
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
};

const App: React.FC = () => {
  // State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [generatedImages, setGeneratedImages] = useState<StoredImage[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const imageGeneratorRef = useRef<ImageGenerator | null>(null);
  const imageStorageRef = useRef<ImageStorage | null>(null);
  const videoComposerRef = useRef<VideoComposer | null>(null);

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setError(null);
      setCurrentStep('upload');
      setGeneratedImages([]);
      setVideoUrl(null);
    } else {
      setError('Por favor, selecione um arquivo de áudio válido (MP3, WAV, OGG, etc.)');
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

    const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!groqApiKey) {
      setError('GROQ API Key não configurada. Configure VITE_GROQ_API_KEY no Vercel.');
      return;
    }

    try {
      setError(null);
      
      // Step 1: Analyze Audio
      setCurrentStep('analyzing');
      setProgress(0);
      setStatusMessage('Analisando áudio...');
      
      audioAnalyzerRef.current = new AudioAnalyzer();
      const analysis = await audioAnalyzerRef.current.analyzeAudio(audioFile);
      setAudioAnalysis(analysis);
      setProgress(25);
      
      // Step 2: Generate Images
      setCurrentStep('generating');
      setStatusMessage(`Gerando ${analysis.segments.length} imagens com IA...`);
      
      imageGeneratorRef.current = new ImageGenerator(groqApiKey);
      imageStorageRef.current = new ImageStorage();
      await imageStorageRef.current.init();
      
      const prompts = await imageGeneratorRef.current.generatePrompts(
        analysis.segments,
        audioFile.name.replace(/\.[^/.]+$/, '')
      );
      
      const images: StoredImage[] = [];
      
      for (let i = 0; i < prompts.length; i++) {
        const imagePrompt = prompts[i];
        setStatusMessage(`Gerando imagem ${i + 1}/${prompts.length}...`);
        
        // Generate image URL
        const imageUrl = await imageGeneratorRef.current.generateImage(imagePrompt.prompt);
        
        // Download and store
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
        
        setProgress(25 + (i / prompts.length) * 50);
      }
      
      setProgress(75);
      
      // Step 3: Compose Video
      setCurrentStep('composing');
      setStatusMessage('Criando vídeo final...');
      
      videoComposerRef.current = new VideoComposer();
      await videoComposerRef.current.load((p) => {
        setProgress(75 + (p / 100) * 20);
      });
      
      const videoOptions: VideoOptions = {
        fps: 30,
        width: aspectRatio === '16:9' ? 1280 : 720,
        height: aspectRatio === '16:9' ? 720 : 1280,
        audioFile,
      };
      
      const videoBlob = await videoComposerRef.current.createVideo(
        images,
        videoOptions,
        (p) => setProgress(75 + 20 + (p / 100) * 5)
      );
      
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      
      setProgress(100);
      setCurrentStep('done');
      setStatusMessage('Vídeo criado com sucesso!');
      
    } catch (err) {
      console.error('Erro ao gerar vídeo:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setCurrentStep('upload');
    }
  };

  const handleReset = () => {
    setAudioFile(null);
    setCurrentStep('upload');
    setProgress(0);
    setStatusMessage('');
    setAudioAnalysis(null);
    setGeneratedImages([]);
    setVideoUrl(null);
    setError(null);
    
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.cleanup();
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
          Transforme seu áudio em vídeo profissional com IA
        </p>
      </header>

      {/* Main Container */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee',
            border: '2px solid #f44',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            color: '#c00',
            boxShadow: '0 4px 15px rgba(244,68,68,0.2)',
          }}>
            <strong>⚠️ Erro:</strong> {error}
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
            
            {/* Upload Area */}
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
                  <p style={{ fontSize: '18px', color: '#333', fontWeight: 'bold', margin: '10px 0' }}>
                    Clique para selecionar ou arraste aqui
                  </p>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    Formatos suportados: MP3, WAV, OGG, M4A
                  </p>
                </>
              )}
            </div>

            <h3 style={{ color: '#333', fontSize: '20px' }}>2. Escolha o formato</h3>
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '30px',
              flexWrap: 'wrap',
            }}>
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
                  fontSize: '16px',
                  fontWeight: aspectRatio === '16:9' ? 'bold' : 'normal',
                  color: aspectRatio === '16:9' ? '#667eea' : '#666',
                  transition: 'all 0.3s',
                }}
              >
                📺 16:9 (Horizontal)
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
                  fontSize: '16px',
                  fontWeight: aspectRatio === '9:16' ? 'bold' : 'normal',
                  color: aspectRatio === '9:16' ? '#667eea' : '#666',
                  transition: 'all 0.3s',
                }}
              >
                📱 9:16 (Vertical)
              </button>
            </div>

            <h3 style={{ color: '#333', fontSize: '20px' }}>3. Selecione o tema visual</h3>
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
                    fontSize: '14px',
                    fontWeight: selectedTheme === key ? 'bold' : 'normal',
                    color: selectedTheme === key ? '#667eea' : '#666',
                    transition: 'all 0.3s',
                    textAlign: 'center',
                  }}
                  title={theme.description}
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
                transition: 'all 0.3s',
              }}
            >
              {audioFile ? '🚀 Criar Vídeo' : '⏸️ Selecione um áudio primeiro'}
            </button>
          </div>
        )}

        {/* Processing Cards */}
        {(currentStep === 'analyzing' || currentStep === 'generating' || currentStep === 'composing') && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              {currentStep === 'analyzing' && '🎧'}
              {currentStep === 'generating' && '🎨'}
              {currentStep === 'composing' && '🎬'}
            </div>
            <h2 style={{ color: '#333', marginBottom: '10px' }}>
              {currentStep === 'analyzing' && 'Analisando áudio...'}
              {currentStep === 'generating' && 'Gerando imagens com IA...'}
              {currentStep === 'composing' && 'Criando vídeo...'}
            </h2>
            <p style={{ color: '#666', fontSize: '16px', marginBottom: '20px' }}>
              {statusMessage}
            </p>
            
            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '12px',
              background: '#eee',
              borderRadius: '6px',
              overflow: 'hidden',
              marginTop: '20px',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: currentTheme.gradient,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ color: '#666', marginTop: '10px', fontSize: '14px' }}>
              {progress.toFixed(0)}%
            </p>

            {/* Image Gallery during generation */}
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

        {/* Done Card */}
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
              Vídeo criado com sucesso!
            </h2>
            
            {/* Video Preview */}
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
                  maxWidth: '600px',
                  borderRadius: '8px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                }}
              >
                <source src={videoUrl} type="video/mp4" />
                Seu navegador não suporta vídeo.
              </video>
            </div>

            {/* Audio Analysis Info */}
            {audioAnalysis && (
              <div style={{
                background: '#fafafa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'left',
              }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#667eea' }}>
                  📊 Análise do Áudio
                </h3>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  <strong>BPM:</strong> {audioAnalysis.bpm}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Energia:</strong> {(audioAnalysis.energy * 100).toFixed(0)}%
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Duração:</strong> {audioAnalysis.duration.toFixed(1)}s
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Cenas:</strong> {audioAnalysis.segments.length}
                </p>
              </div>
            )}

            {/* Image Gallery */}
            {generatedImages.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <ImageGallery
                  images={generatedImages}
                  onDelete={handleDeleteImage}
                  onClearAll={handleClearAllImages}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href={videoUrl}
                download={`tonmoves-${Date.now()}.mp4`}
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
                  boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
                  transition: 'transform 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                  transition: 'all 0.3s',
                }}
              >
                🔄 Criar Novo
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        maxWidth: '900px',
        margin: '40px auto 0',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.9)',
        fontSize: '14px',
        textShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        <p style={{ margin: '5px 0' }}>
          Powered by GROQ AI + Pollinations.ai + FFmpeg.wasm
        </p>
        <p style={{ margin: '5px 0' }}>
          TONMOVES v2.8 • Tema: {currentTheme.emoji} {currentTheme.name}
        </p>
      </footer>
    </div>
  );
};

export default App;
