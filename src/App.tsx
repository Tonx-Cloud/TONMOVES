import React, { useState, useRef, useEffect } from 'react';
import { AudioAnalyzer, type AudioAnalysis, type NarrativeAnalysis } from './utils/audioAnalyzer';
import { ImageGenerator, type ImagePrompt, type Theme, type GlobalContext, type ProviderConfig, searchPexelsVideos } from './utils/imageGenerator';
import { ImageStorage, type StoredImage } from './utils/imageStorage';
import { VideoComposer, type VideoOptions, type VideoMode } from './utils/videoComposer';
import { ImageGallery } from './components/ImageGallery';
import { CheckpointManager, type Checkpoint } from './utils/checkpointManager';
import { Sidebar } from './components/layout/Sidebar';
import { Settings, IMAGE_PROVIDERS, VIDEO_PROVIDERS, TRANSCRIPTION_PROVIDERS } from './components/Settings';

export type AspectRatio = '16:9' | '9:16';
export type Step = 'upload' | 'analyzing' | 'generating' | 'composing' | 'done';
export type CurrentView = 'main' | 'settings';

// Definir os tipos de provedores de vídeo e transcrição aqui para uso global
export type VideoProvider = 'local' | 'pexels' | 'runwayml' | 'lumaai' | 'stability' | 'runwayml-gen3';
export type TranscriptionProvider = 'disabled' | 'filename' | 'groq' | 'openai';

const VIDEO_MODES: { id: VideoMode; name: string; description: string; icon: string }[] = [
  { id: 'slideshow', name: 'Slideshow', description: '1 imagem a cada 3-5 segundos', icon: '🖼️' },
  { id: 'animated', name: 'Animado', description: 'Menos imagens com zoom/pan', icon: '🎬' },
];

interface ThemeConfig {
  name: string;
  emoji: string;
  description: string;
  gradient: string;
}

const THEMES: Record<Theme, ThemeConfig> = {
  cinematic: { name: 'Cinematic', emoji: '🎬', description: 'Cinematográfico dramático', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  neon: { name: 'Neon', emoji: '💜', description: 'Cyberpunk futurista', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  nature: { name: 'Nature', emoji: '🌿', description: 'Natureza orgânica', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  abstract: { name: 'Abstract', emoji: '🎨', description: 'Arte moderna', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  minimal: { name: 'Minimal', emoji: '⚪', description: 'Minimalista elegante', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  baby: { name: 'Baby', emoji: '👶', description: 'Super colorido e fofo', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
};

const App: React.FC = () => {
  // State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('baby');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [videoMode, setVideoMode] = useState<VideoMode>('slideshow');
  
  // States de configuração de API (movidos para Settings, mas os estados são mantidos aqui e passados como props)
  const [transcriptionProvider, setTranscriptionProvider] = useState<TranscriptionProvider>('filename');
  const [transcriptionApiKey, setTranscriptionApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ImageProvider>('pollinations');
  const [apiKeys, setApiKeys] = useState<Record<ImageProvider, string>>({
    pollinations: '', pexels: '', together: '', openai: '', gemini: '',
  });
  const [selectedVideoProvider, setSelectedVideoProvider] = useState<VideoProvider>('runwayml-gen3');
  const [videoApiKeys, setVideoApiKeys] = useState<Record<VideoProvider, string>>({
    local: '', pexels: '', runwayml: '', lumaai: '', stability: '',
  });

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
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<CurrentView>('main');

  // Carregar config salva
  useEffect(() => {
    const savedConfig = ImageGenerator.getConfig();
    setSelectedProvider(savedConfig.provider);
    if (savedConfig.apiKey) {
      setApiKeys(prev => ({ ...prev, [savedConfig.provider]: savedConfig.apiKey || '' }));
    }
    try {
      const savedKeys = localStorage.getItem('tonmoves_api_keys');
      if (savedKeys) setApiKeys(JSON.parse(savedKeys));
    } catch {}
    try {
      const savedVideoKeys = localStorage.getItem('tonmoves_video_api_keys');
      if (savedVideoKeys) setVideoApiKeys(JSON.parse(savedVideoKeys));
      const savedVideoProvider = localStorage.getItem('tonmoves_video_provider');
      if (savedVideoProvider) setSelectedVideoProvider(savedVideoProvider as VideoProvider);
    } catch {}
    try {
      const savedTranscriptionProvider = localStorage.getItem('tonmoves_transcription_provider');
      if (savedTranscriptionProvider) setTranscriptionProvider(savedTranscriptionProvider as TranscriptionProvider);
      const savedTranscriptionKey = localStorage.getItem('tonmoves_transcription_key');
      if (savedTranscriptionKey) setTranscriptionApiKey(savedTranscriptionKey);
    } catch {}
  }, []);

  // Salvar config de imagem
  const handleSaveConfig = () => {
    const config: ProviderConfig = {
      provider: selectedProvider,
      apiKey: apiKeys[selectedProvider] || undefined,
    };
    ImageGenerator.saveConfig(config);
    localStorage.setItem('tonmoves_api_keys', JSON.stringify(apiKeys));
    alert('Configurações salvas!');
  };

  // Salvar config de video
  const handleSaveVideoConfig = () => {
    localStorage.setItem('tonmoves_video_api_keys', JSON.stringify(videoApiKeys));
    localStorage.setItem('tonmoves_video_provider', selectedVideoProvider);
    alert('Configurações salvas!');
  };

  // Salvar config de transcricao
  const handleSaveTranscriptionConfig = () => {
    localStorage.setItem('tonmoves_transcription_provider', transcriptionProvider);
    localStorage.setItem('tonmoves_transcription_key', transcriptionApiKey);
    alert('Configurações salvas!');
  };

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const imageGeneratorRef = useRef<ImageGenerator | null>(null);
  const imageStorageRef = useRef<ImageStorage | null>(null);
  const videoComposerRef = useRef<VideoComposer | null>(null);
  const checkpointManagerRef = useRef<CheckpointManager | null>(null);

  useEffect(() => {
    checkpointManagerRef.current = new CheckpointManager();
    checkRecovery();
  }, []);

  const checkRecovery = async () => {
    if (!checkpointManagerRef.current) return;
    const hasRecent = await checkpointManagerRef.current.hasRecentCheckpoint();
    setHasCheckpoint(hasRecent);
  };

  const handleRecoverProgress = async () => {
    if (!checkpointManagerRef.current) return;
    const checkpoint = await checkpointManagerRef.current.loadCheckpoint();
    if (!checkpoint) return;

    setProgress(checkpoint.progress);
    setCurrentStep(checkpoint.step as Step);
    if (checkpoint.data.audioAnalysis) setAudioAnalysis(checkpoint.data.audioAnalysis);
    if (checkpoint.data.globalContext) setGlobalContext(checkpoint.data.globalContext);
    if (checkpoint.data.narrative) setNarrative(checkpoint.data.narrative);
    if (checkpoint.data.generatedImages) {
      setGeneratedImages(checkpoint.data.generatedImages);
      if (checkpoint.step === 'images-complete' || checkpoint.progress >= 75) {
        setCurrentStep('composing');
        setStatusMessage('📂 Imagens recuperadas! Pronto para criar vídeo.');
      }
    }
    if (checkpoint.data.aspectRatio) setAspectRatio(checkpoint.data.aspectRatio as AspectRatio);
    if (checkpoint.data.theme) setSelectedTheme(checkpoint.data.theme as Theme);

    setStatusMessage('📂 Progresso recuperado! Continuando de onde parou...');
    setHasCheckpoint(false);
  };

  const saveCheckpoint = async (step: string, prog: number) => {
    if (!checkpointManagerRef.current) return;
    await checkpointManagerRef.current.autoSave(step, prog, {
      audioAnalysis, globalContext, narrative, generatedImages,
      aspectRatio, theme: selectedTheme, audioFileName: audioFile?.name
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

  const handleCreateVideoFromRecovered = async () => {
    if (generatedImages.length === 0) { setError('Nenhuma imagem encontrada para criar vídeo'); return; }
    if (!audioFile) { setError('Arquivo de áudio não encontrado. Faça upload novamente.'); return; }
    try {
      setError(null);
      setCurrentStep('composing');
      setProgress(75);
      setStatusMessage('🎬 Criando vídeo com as imagens recuperadas...');
      videoComposerRef.current = new VideoComposer();
      await videoComposerRef.current.load((p) => {
        setProgress(75 + (p / 100) * 20);
        if (p % 20 === 0) setStatusMessage(`🎬 Carregando FFmpeg... ${p}%`);
      });
      setStatusMessage('🎬 Renderizando vídeo...');
      const videoOptions: VideoOptions = {
        fps: 24,
        width: aspectRatio === '9:16' ? 720 : 1280,
        height: aspectRatio === '9:16' ? 1280 : 720,
        audioFile, videoMode,
      };
      console.log('📐 Criando vídeo:', videoOptions.width, 'x', videoOptions.height, 'modo:', videoMode);
      const videoBlob = await videoComposerRef.current.createVideo(generatedImages, videoOptions, (p) => {
        setProgress(75 + 20 + (p / 100) * 5);
        if (p % 25 === 0) setStatusMessage(`🎬 Renderizando... ${p}%`);
      });
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      setProgress(100);
      setCurrentStep('done');
      setStatusMessage('✅ Vídeo criado com sucesso!');
      if (checkpointManagerRef.current) await checkpointManagerRef.current.clearCheckpoint();
    } catch (err) {
      console.error('Erro ao criar vídeo:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar vídeo');
      setStatusMessage('❌ Erro ao criar vídeo!');
    }
  };

  const handleStartGeneration = async () => {
    if (!audioFile) { setError('Selecione um arquivo de áudio primeiro'); return; }
    try {
      setError(null);
      await saveCheckpoint('starting', 0);
      setCurrentStep('analyzing');
      setProgress(5);
      const providerName = TRANSCRIPTION_PROVIDERS.find(p => p.id === transcriptionProvider)?.name || '';
      setStatusMessage(transcriptionProvider !== 'disabled' ? `🎤 Transcrevendo com ${providerName}...` : '🎧 Analisando áudio...');
      audioAnalyzerRef.current = new AudioAnalyzer();
      const analysis = await audioAnalyzerRef.current.analyzeAudio(audioFile, {
        transcribe: transcriptionProvider !== 'disabled' && transcriptionProvider !== 'filename',
        analyzeNarrative: transcriptionProvider !== 'disabled',
        useFilename: transcriptionProvider === 'filename' || transcriptionProvider !== 'disabled',
        transcriptionProvider: transcriptionProvider,
        transcriptionApiKey: transcriptionApiKey,
      });
      setAudioAnalysis(analysis);
      if (analysis.narrative) setNarrative(analysis.narrative);
      setProgress(20);
      await saveCheckpoint('analyzed', 20);
      if (analysis.fullTranscription) setStatusMessage(`✅ História: "${analysis.narrative?.story || 'Narrativa detectada'}"`);
      else if (analysis.narrative) setStatusMessage(`✅ Contexto: ${analysis.narrative.story}`);
      else setStatusMessage(`✅ Áudio analisado: ${analysis.segments.length} cenas`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCurrentStep('generating');
      setProgress(25);
      if (analysis.narrative) {
        setStatusMessage(`📖 Personagens: ${analysis.narrative.characters.join(', ')}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setStatusMessage('Criando prompts visuais...');
      const providerConfig: ProviderConfig = { provider: selectedProvider, apiKey: apiKeys[selectedProvider] || undefined };
      imageGeneratorRef.current = new ImageGenerator(providerConfig);
      imageStorageRef.current = new ImageStorage();
      await imageStorageRef.current.init();
      const prompts = await imageGeneratorRef.current.generatePrompts(analysis.segments, audioFile.name.replace(/\.[^/.]+$/, ''), selectedTheme, analysis);
      if (prompts[0]?.globalContext) setGlobalContext(prompts[0].globalContext);
      setProgress(30);
      await saveCheckpoint('prompts-created', 30);

      const images: StoredImage[] = [];

      // ===== MODO VÍDEOS PEXELS =====
      if (selectedVideoProvider === 'pexels' && apiKeys.pexels) {
        setStatusMessage(`🎬 Buscando ${prompts.length} clipes de vídeo no Pexels...`);

        // Criar queries de busca baseadas nos prompts
        const searchQueries = prompts.map(p => {
          // Extrair palavras-chave do prompt para busca
          const keywords = p.prompt.split(' ').slice(0, 3).join(' ');
          return keywords;
        });

        // Buscar vídeos para cada segmento
        for (let i = 0; i < searchQueries.length; i++) {
          try {
            setStatusMessage(`📹 Buscando vídeo ${i + 1}/${searchQueries.length}: "${searchQueries[i]}"...`);

            // Buscar vídeos do Pexels
            const videos = await searchPexelsVideos(searchQueries[i], apiKeys.pexels, 1);

            if (videos.length > 0) {
              const storedVideo: StoredImage = {
                id: `video-${Date.now()}-${i}`,
                url: videos[0].url,
                prompt: prompts[i].prompt,
                timestamp: Date.now(),
                segmentIndex: i,
              };
              images.push(storedVideo);
              await imageStorageRef.current!.saveImage(storedVideo);
            } else {
              // Fallback: usar tema genérico
              const fallbackVideos = await searchPexelsVideos(selectedTheme, apiKeys.pexels, 1);
              if (fallbackVideos.length > 0) {
                const storedVideo: StoredImage = {
                  id: `video-${Date.now()}-${i}`,
                  url: fallbackVideos[0].url,
                  prompt: prompts[i].prompt,
                  timestamp: Date.now(),
                  segmentIndex: i,
                };
                images.push(storedVideo);
                await imageStorageRef.current!.saveImage(storedVideo);
              }
            }

            setGeneratedImages([...images]);
            const vidProgress = 30 + ((i + 1) / searchQueries.length) * 45;
            setProgress(vidProgress);
            await saveCheckpoint(`video-${i}`, vidProgress);

            // Pequeno delay entre requisições
            if (i < searchQueries.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (videoError) {
            console.error(`Erro ao buscar vídeo ${i}:`, videoError);
          }
        }

        setStatusMessage(`✅ ${images.length} clipes de vídeo encontrados!`);

      } else {
        // ===== MODO IMAGENS (PADRÃO) =====
        setStatusMessage(`🎨 Gerando ${prompts.length} imagens (2 por vez para evitar sobrecarga)...`);
        const BATCH_SIZE = 2;
        const DELAY_BETWEEN_BATCHES = 500;

        for (let batchStart = 0; batchStart < prompts.length; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE, prompts.length);
          const batch = prompts.slice(batchStart, batchEnd);
          setStatusMessage(`🚀 Gerando imagens ${batchStart + 1}-${batchEnd} de ${prompts.length}...`);
          try {
            const batchResults = await Promise.all(batch.map(async (imagePrompt, batchIndex) => {
              const globalIndex = batchStart + batchIndex;
              const imageUrl = await imageGeneratorRef.current!.generateImage(imagePrompt.prompt, selectedTheme);
              const storedImage: StoredImage = {
                id: `img-${Date.now()}-${globalIndex}`, url: imageUrl, prompt: imagePrompt.prompt,
                timestamp: Date.now(), segmentIndex: globalIndex,
              };
              await imageStorageRef.current!.saveImage(storedImage);
              return storedImage;
            }));
            images.push(...batchResults);
            setGeneratedImages([...images]);
            const imgProgress = 30 + (images.length / prompts.length) * 45;
            setProgress(imgProgress);
            await saveCheckpoint(`batch-${batchEnd}`, imgProgress);
            if (batchEnd < prompts.length) await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
          } catch (batchError) {
            console.error(`Erro no batch ${batchStart}-${batchEnd}:`, batchError);
            setError(`⚠️ Erro ao gerar imagens, mas ${images.length} foram salvas!`);
            await saveCheckpoint(`error-batch-${batchEnd}`, 30 + (images.length / prompts.length) * 45);
            throw batchError;
          }
        }
      }
      setProgress(75);
      await saveCheckpoint('images-complete', 75);
      setCurrentStep('composing');
      setStatusMessage('🎬 Criando vídeo final...');
      videoComposerRef.current = new VideoComposer();
      await videoComposerRef.current.load((p) => {
        setProgress(75 + (p / 100) * 20);
        if (p % 20 === 0) setStatusMessage(`🎬 FFmpeg... ${p}%`);
      });
      setStatusMessage('🎬 Renderizando vídeo...');
      const videoOptions: VideoOptions = {
        fps: 24, width: aspectRatio === '9:16' ? 720 : 1280,
        height: aspectRatio === '9:16' ? 1280 : 720, audioFile, videoMode,
      };
      console.log('📐 Criando vídeo:', videoOptions.width, 'x', videoOptions.height, 'modo:', videoMode);
      const videoBlob = await videoComposerRef.current.createVideo(images, videoOptions, (p) => {
        setProgress(75 + 20 + (p / 100) * 5);
        if (p % 25 === 0) setStatusMessage(`🎬 Renderizando... ${p}%`);
      });
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      setProgress(100);
      setCurrentStep('done');
      setStatusMessage('✅ Vídeo criado!');
      if (checkpointManagerRef.current) await checkpointManagerRef.current.clearCheckpoint();
    } catch (err) {
      console.error('Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatusMessage('❌ Erro! Mas seu progresso foi salvo.');
    }
  };

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
    if (audioAnalyzerRef.current) audioAnalyzerRef.current.cleanup();
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

  const handleRegenerateImage = async (id: string, newPrompt: string) => {
    if (!imageGeneratorRef.current) {
      imageGeneratorRef.current = new ImageGenerator({
        provider: selectedProvider,
        apiKey: apiKeys[selectedProvider] || undefined,
      });
    }
    try {
      setStatusMessage('Re-gerando imagem...');
      const newUrl = await imageGeneratorRef.current.generateImage(newPrompt, selectedTheme);
      setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, url: newUrl, prompt: newPrompt } : img));
      if (imageStorageRef.current) {
        const existingImg = generatedImages.find(img => img.id === id);
        if (existingImg) await imageStorageRef.current.saveImage({ ...existingImg, url: newUrl, prompt: newPrompt });
      }
      setStatusMessage('Imagem re-gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao re-gerar imagem:', error);
      setError('Erro ao re-gerar imagem. Tente novamente.');
    }
  };

  const handleUploadImage = async (file: File, index: number) => {
    try {
      const url = URL.createObjectURL(file);
      const existingImg = generatedImages.find(img => img.segmentIndex === index);
      if (existingImg) {
        setGeneratedImages(prev => prev.map(img => img.segmentIndex === index ? { ...img, url, prompt: `Upload: ${file.name}` } : img));
        if (imageStorageRef.current) await imageStorageRef.current.saveImage({ ...existingImg, url, prompt: `Upload: ${file.name}` });
      } else {
        const newImage: StoredImage = {
          id: `upload-${Date.now()}`, url, prompt: `Upload: ${file.name}`,
          timestamp: Date.now(), segmentIndex: index,
        };
        setGeneratedImages(prev => [...prev, newImage].sort((a, b) => a.segmentIndex - b.segmentIndex));
        if (imageStorageRef.current) await imageStorageRef.current.saveImage(newImage);
      }
      setStatusMessage('Imagem adicionada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setError('Erro ao fazer upload da imagem.');
    }
  };

  const handleUpdateAnimation = async (id: string, animationType: string) => {
    setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, animationType: animationType as any } : img));
    if (imageStorageRef.current) {
      const existingImg = generatedImages.find(img => img.id === id);
      if (existingImg) await imageStorageRef.current.saveImage({ ...existingImg, animationType: animationType as any });
    }
    const animName = animationType === 'none' ? 'Sem animação' : animationType;
    setStatusMessage(`Animação definida: ${animName}`);
  };

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
                    <button onClick={async () => { if (checkpointManagerRef.current) { await checkpointManagerRef.current.clearCheckpoint(); setHasCheckpoint(false); } }} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️ Descartar</button>
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
              <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>1. Selecione seu áudio</h2>
                <div onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed #667eea', borderRadius: '12px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: audioFile ? '#f0f4ff' : '#fafafa', transition: 'all 0.3s', marginBottom: '30px' }}>
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
                    {VIDEO_MODES.map(mode => (
                        <button key={mode.id} onClick={() => setVideoMode(mode.id)} style={{ flex: 1, minWidth: '150px', padding: '16px', border: `2px solid ${videoMode === mode.id ? '#667eea' : '#ddd'}`, borderRadius: '8px', background: videoMode === mode.id ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: videoMode === mode.id ? 'bold' : 'normal', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{mode.icon}</div>
                            <div style={{ fontWeight: 'bold' }}>{mode.name}</div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{mode.description}</div>
                        </button>
                    ))}
                </div>
                <h3 style={{ color: '#333' }}>4. Tema visual</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '30px' }}>
                    {Object.entries(THEMES).map(([key, theme]) => (
                        <button key={key} onClick={() => setSelectedTheme(key as Theme)} style={{ padding: '16px 12px', border: `2px solid ${selectedTheme === key ? '#667eea' : '#ddd'}`, borderRadius: '8px', background: selectedTheme === key ? '#f0f4ff' : 'white', cursor: 'pointer', fontWeight: selectedTheme === key ? 'bold' : 'normal', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{theme.emoji}</div>
                            {theme.name}
                        </button>
                    ))}
                </div>

                {/* Seção 5: Fonte de Mídia */}
                <h3 style={{ color: '#333' }}>5. Fonte de mídia</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setSelectedVideoProvider('local')}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '16px',
                      border: `2px solid ${selectedVideoProvider === 'local' || selectedVideoProvider === 'pexels' && selectedProvider !== 'pexels' ? '#667eea' : '#ddd'}`,
                      borderRadius: '8px',
                      background: selectedVideoProvider === 'local' ? '#f0f4ff' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🖼️</div>
                    <div style={{ fontWeight: selectedVideoProvider === 'local' ? 'bold' : 'normal' }}>Imagens IA</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Gera imagens com IA e anima</div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedVideoProvider('pexels');
                      setSelectedProvider('pexels');
                    }}
                    disabled={!apiKeys.pexels}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '16px',
                      border: `2px solid ${selectedVideoProvider === 'pexels' ? '#667eea' : '#ddd'}`,
                      borderRadius: '8px',
                      background: selectedVideoProvider === 'pexels' ? '#f0f4ff' : 'white',
                      cursor: apiKeys.pexels ? 'pointer' : 'not-allowed',
                      textAlign: 'center',
                      opacity: apiKeys.pexels ? 1 : 0.5,
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📸</div>
                    <div style={{ fontWeight: selectedVideoProvider === 'pexels' ? 'bold' : 'normal' }}>Fotos Pexels</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      {apiKeys.pexels ? 'Fotos profissionais reais HD' : '⚠️ Configure API key'}
                    </div>
                  </button>
                </div>

                {/* Seletor de provider de imagem (só mostra se for modo Imagens IA) */}
                {selectedVideoProvider === 'local' && (
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#666', fontWeight: '500' }}>Gerador de imagens:</p>
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

                {/* Aviso para Pexels Photos */}
                {selectedVideoProvider === 'pexels' && (
                  <div style={{ background: '#e0f2fe', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #7dd3fc' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#0369a1' }}>
                      <strong>📸 Modo Pexels:</strong> Busca fotos profissionais reais do Pexels baseadas no tema e análise do áudio.
                    </p>
                  </div>
                )}

                <button onClick={handleStartGeneration} disabled={!audioFile} style={{ width: '100%', padding: '20px', background: audioFile ? currentTheme.gradient : '#ccc', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: audioFile ? 'pointer' : 'not-allowed', boxShadow: audioFile ? '0 4px 15px rgba(102,126,234,0.4)' : 'none', transition: 'background 0.3s ease' }} aria-label="Iniciar geração de vídeo">
                  {audioFile ? (
                    <>
                      <div>Criar Video</div>
                      <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px', opacity: 0.9 }}>
                        Imagens: {selectedProvider} | Video: {selectedVideoProvider} | Modo: {VIDEO_MODES.find(m => m.id === videoMode)?.name}
                      </div>
                    </>
                  ) : 'Selecione um audio'}
                </button>
              </div>
            )}
            {(currentStep === 'analyzing' || currentStep === 'generating' || currentStep === 'composing') && (
              <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
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
                <p style={{ color: '#666', fontSize: '16px', marginBottom: '10px' }}>{statusMessage}</p>
                <p style={{ color: '#28a745', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>💾 Progresso salvo automaticamente</p>
                {narrative && (
                  <div style={{ background: '#fff5f5', border: '2px solid #f093fb', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#f093fb' }}>📖 História: {narrative.story}</h3>
                    {narrative.characters.length > 0 && <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}><strong>Personagens:</strong> {narrative.characters.join(', ')}</p>}
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
                {generatedImages.length > 0 && !videoUrl && currentStep !== 'done' && (
                  <button onClick={handleCreateVideoFromRecovered} style={{ width: '100%', padding: '20px', marginTop: '20px', background: currentTheme.gradient, color: 'white', border: 'none', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(102,126,234,0.4)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    Criar Video Agora ({generatedImages.length} imagens prontas)
                  </button>
                )}
                {generatedImages.length > 0 && (
                  <div style={{ marginTop: '30px', textAlign: 'left' }}>
                    <ImageGallery images={generatedImages} onDelete={handleDeleteImage} onClearAll={handleClearAllImages} onRegenerate={handleRegenerateImage} onUpload={handleUploadImage} onUpdateAnimation={handleUpdateAnimation} />
                  </div>
                )}
              </div>
            )}
            {currentStep === 'done' && videoUrl && (
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
                    <ImageGallery images={generatedImages} onDelete={handleDeleteImage} onClearAll={handleClearAllImages} onRegenerate={handleRegenerateImage} onUpload={handleUploadImage} onUpdateAnimation={handleUpdateAnimation} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a href={videoUrl} download={`tonmoves-${aspectRatio}-${Date.now()}.mp4`} style={{ flex: 1, minWidth: '150px', padding: '16px', background: currentTheme.gradient, color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block', textAlign: 'center', cursor: 'pointer' }}>
                    ⬇️ Download
                  </a>
                  <button onClick={handleReset} style={{ flex: 1, minWidth: '150px', padding: '16px', background: 'white', color: '#667eea', border: '2px solid #667eea', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔄 Criar Novo
                  </button>
                </div>
              </div>
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
