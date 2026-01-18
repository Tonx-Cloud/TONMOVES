import { useRef } from 'react';
import type { AspectRatio, ImageProvider, VideoProvider } from '../types/app';
import type { Theme, GlobalContext, ProviderConfig } from '../utils/imageGenerator';
import type { AudioAnalysis, NarrativeAnalysis } from '../utils/audioAnalyzer';
import type { StoredImage } from '../utils/imageStorage';
import type { VideoOptions } from '../utils/videoComposer';
import type { VideoAIProvider, GeneratedVideo } from '../utils/videoGenerator';
import { AudioAnalyzer } from '../utils/audioAnalyzer';
import { ImageGenerator, searchPexelsVideos } from '../utils/imageGenerator';
import { ImageStorage } from '../utils/imageStorage';
import { VideoComposer } from '../utils/videoComposer';
import { generateVideoFromImage } from '../utils/videoGenerator';
import { renderCanvasVideo } from '../utils/canvasRenderer';
import { segmentForShortClips } from '../utils/segmentAudio';

interface PipelineDeps {
  setProgress: (p: number) => void;
  setStatusMessage: (m: string) => void;
  setAudioAnalysis: (a: AudioAnalysis | null) => void;
  setGlobalContext: (g: GlobalContext | null) => void;
  setNarrative: (n: NarrativeAnalysis | null) => void;
  setGeneratedImages: (imgs: StoredImage[]) => void;
  setVideoUrl: (url: string | null) => void;
  setCurrentStep: (step: string) => void;
  setError: (err: string | null) => void;
  saveCheckpoint: (step: string, prog: number, data: any) => Promise<void>;
  selectedTheme: Theme;
  aspectRatio: AspectRatio;
  videoMode: 'slideshow' | 'animated';
  selectedProvider: ImageProvider;
  apiKeys: Record<ImageProvider, string>;
  selectedVideoProvider: VideoProvider;
  videoApiKeys: Record<VideoProvider, string>;
}

export function usePipeline({
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
}: PipelineDeps) {
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const imageGeneratorRef = useRef<ImageGenerator | null>(null);
  const imageStorageRef = useRef<ImageStorage | null>(null);
  const videoComposerRef = useRef<VideoComposer | null>(null);

  const ensureStorage = async () => {
    if (!imageStorageRef.current) {
      imageStorageRef.current = new ImageStorage();
      await imageStorageRef.current.init();
    }
  };

  const handleStartGeneration = async (audioFile: File, transcriptionProvider: string, transcriptionApiKey: string) => {
    try {
      setError(null);
      await saveCheckpoint('starting', 0, {});

      const keyTrimmed = transcriptionApiKey?.trim() ?? '';
      const isOpenAI = transcriptionProvider === 'openai';
      const isGroq = transcriptionProvider === 'groq';
      const openAIKeyLooksValid = /^sk-/.test(keyTrimmed);

      let effectiveTranscriptionProvider = transcriptionProvider;
      if (isOpenAI && !openAIKeyLooksValid) {
        effectiveTranscriptionProvider = 'disabled';
        setStatusMessage('🎧 Analisando áudio sem transcrição (chave OpenAI ausente/inválida).');
      } else if (isGroq && !keyTrimmed) {
        effectiveTranscriptionProvider = 'disabled';
        setStatusMessage('🎧 Analisando áudio sem transcrição (Groq sem chave).');
      } else {
        setStatusMessage(effectiveTranscriptionProvider !== 'disabled' ? '🎤 Transcrevendo...' : '🎧 Analisando áudio...');
      }

      setCurrentStep('analyzing');
      setProgress(5);

      audioAnalyzerRef.current = new AudioAnalyzer();
      const analysis = await audioAnalyzerRef.current.analyzeAudio(audioFile, {
        transcribe: effectiveTranscriptionProvider !== 'disabled' && effectiveTranscriptionProvider !== 'filename',
        analyzeNarrative: effectiveTranscriptionProvider !== 'disabled',
        useFilename: effectiveTranscriptionProvider === 'filename' || effectiveTranscriptionProvider !== 'disabled',
        transcriptionProvider: effectiveTranscriptionProvider,
        transcriptionApiKey: keyTrimmed,
      });

      setAudioAnalysis(analysis);
      if (analysis.narrative) setNarrative(analysis.narrative);
      setProgress(20);
      await saveCheckpoint('analyzed', 20, { audioAnalysis: analysis });
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

      const proProviders = ['openai', 'gemini'];
      const hasKey = Boolean(apiKeys[selectedProvider]);
      const fallbackProvider = 'openai';
      const effectiveProvider = proProviders.includes(selectedProvider) && hasKey ? selectedProvider : fallbackProvider;
      const providerConfig: ProviderConfig = { provider: effectiveProvider, apiKey: apiKeys[effectiveProvider] || undefined };
      imageGeneratorRef.current = new ImageGenerator(providerConfig);

      await ensureStorage();
      const prompts = await imageGeneratorRef.current.generatePrompts(
        analysis.segments,
        audioFile.name.replace(/\.[^/.]+$/, ''),
        selectedTheme,
        analysis
      );

      // Segmentação para clipes curtos (VO2) — base para PRO; no FREE apenas informativo
      const shortSegments = segmentForShortClips(analysis, 6);
      if (shortSegments.length > 0) {
        console.log(`⚙️ Segmentação mock: ${shortSegments.length} clipes de ~6s`);
      }

      if (prompts[0]?.globalContext) setGlobalContext(prompts[0].globalContext);
      setProgress(30);
      await saveCheckpoint('prompts-created', 30, {
        audioAnalysis: analysis,
        globalContext: prompts[0]?.globalContext ?? null,
        narrative: analysis.narrative ?? null,
      });

      const images: StoredImage[] = [];

      // MODO IMAGENS (apenas OpenAI/Gemini no fluxo atual)
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
              id: `img-${Date.now()}-${globalIndex}`,
              url: imageUrl,
              prompt: imagePrompt.prompt,
              timestamp: Date.now(),
              segmentIndex: globalIndex,
            };
            await imageStorageRef.current!.saveImage(storedImage);
            return storedImage;
          }));
          images.push(...batchResults);
          setGeneratedImages([...images]);
          const imgProgress = 30 + (images.length / prompts.length) * 45;
          setProgress(imgProgress);
          await saveCheckpoint(`batch-${batchEnd}`, imgProgress, {
            audioAnalysis: analysis,
            globalContext: prompts[0]?.globalContext ?? null,
            narrative: analysis.narrative ?? null,
            generatedImages: images,
            aspectRatio,
            selectedTheme,
          });
          if (batchEnd < prompts.length) await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        } catch (batchError) {
          console.error(`Erro no batch ${batchStart}-${batchEnd}:`, batchError);
          setError(`⚠️ Erro ao gerar imagens, mas ${images.length} foram salvas!`);
          await saveCheckpoint(`error-batch-${batchEnd}`, 30 + (images.length / prompts.length) * 45, {
            audioAnalysis: analysis,
            globalContext: prompts[0]?.globalContext ?? null,
            narrative: analysis.narrative ?? null,
            generatedImages: images,
            aspectRatio,
            selectedTheme,
          });
          throw batchError;
        }
      }

      setProgress(75);
      await saveCheckpoint('images-complete', 75, {
        audioAnalysis: analysis,
        globalContext: prompts[0]?.globalContext ?? null,
        narrative: analysis.narrative ?? null,
        generatedImages: images,
        aspectRatio,
        selectedTheme,
      });

      // Para testes FREE: render client-side via canvas/WebRTC MediaRecorder
      setCurrentStep('composing');
      setStatusMessage('🎬 Renderizando vídeo (canvas)...');
      setProgress(90);
      const videoBlob = await renderCanvasVideo({
        images,
        audioFile,
        aspectRatio,
        fps: 24,
        watermarkText: 'tonmovies.app',
        watermarkOpacity: 0.15,
        onProgress: (p) => setProgress(90 + (p * 0.1)),
      });
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      setProgress(100);
      setCurrentStep('done');
      setStatusMessage('✅ Vídeo criado (canvas)!');
      await saveCheckpoint('done', 100, {
        audioAnalysis: analysis,
        globalContext: prompts[0]?.globalContext ?? null,
        narrative: analysis.narrative ?? null,
        generatedImages: images,
        aspectRatio,
        selectedTheme,
      });


    } catch (err) {
      console.error('Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatusMessage('❌ Erro! Mas seu progresso foi salvo.');
    }
  };

  const handleCreateVideoFromRecovered = async (
    generatedImages: StoredImage[],
    audioFile: File,
    aspectRatio: AspectRatio,
    videoMode: 'slideshow' | 'animated'
  ) => {
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
      const videoBlob = await videoComposerRef.current.createVideo(generatedImages, videoOptions, (p) => {
        setProgress(75 + 20 + (p / 100) * 5);
        if (p % 25 === 0) setStatusMessage(`🎬 Renderizando... ${p}%`);
      });
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      setProgress(100);
      setCurrentStep('done');
      setStatusMessage('✅ Vídeo criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar vídeo:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar vídeo');
      setStatusMessage('❌ Erro ao criar vídeo!');
    }
  };

  return {
    handleStartGeneration,
    handleCreateVideoFromRecovered,
    audioAnalyzerRef,
    imageGeneratorRef,
    imageStorageRef,
    videoComposerRef,
  };
}
