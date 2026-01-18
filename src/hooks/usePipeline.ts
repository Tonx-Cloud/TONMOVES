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

      const providerConfig: ProviderConfig = { provider: selectedProvider, apiKey: apiKeys[selectedProvider] || undefined };
      imageGeneratorRef.current = new ImageGenerator(providerConfig);
      await ensureStorage();
      const prompts = await imageGeneratorRef.current.generatePrompts(
        analysis.segments,
        audioFile.name.replace(/\.[^/.]+$/, ''),
        selectedTheme,
        analysis
      );
      if (prompts[0]?.globalContext) setGlobalContext(prompts[0].globalContext);
      setProgress(30);
      await saveCheckpoint('prompts-created', 30, {
        audioAnalysis: analysis,
        globalContext: prompts[0]?.globalContext ?? null,
        narrative: analysis.narrative ?? null,
      });

      const images: StoredImage[] = [];

      // MODO VÍDEOS PEXELS
      if (selectedVideoProvider === 'pexels' && apiKeys.pexels) {
        setStatusMessage(`🎬 Buscando ${prompts.length} clipes de vídeo no Pexels...`);
        const searchQueries = prompts.map(p => p.prompt.split(' ').slice(0, 3).join(' '));

        for (let i = 0; i < searchQueries.length; i++) {
          try {
            setStatusMessage(`📹 Buscando vídeo ${i + 1}/${searchQueries.length}: "${searchQueries[i]}"...`);
            const videos = await searchPexelsVideos(searchQueries[i], apiKeys.pexels, 1);

            const selectedVideo = videos[0];
            if (selectedVideo) {
              const storedVideo: StoredImage = {
                id: `video-${Date.now()}-${i}`,
                url: selectedVideo.url,
                prompt: prompts[i].prompt,
                timestamp: Date.now(),
                segmentIndex: i,
              };
              images.push(storedVideo);
              await imageStorageRef.current!.saveImage(storedVideo);
            }

            setGeneratedImages([...images]);
            const vidProgress = 30 + ((i + 1) / searchQueries.length) * 45;
            setProgress(vidProgress);
            await saveCheckpoint(`video-${i}`, vidProgress, {
              audioAnalysis: analysis,
              globalContext: prompts[0]?.globalContext ?? null,
              narrative: analysis.narrative ?? null,
              generatedImages: images,
              aspectRatio,
              selectedTheme,
            });

            if (i < searchQueries.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (videoError) {
            console.error(`Erro ao buscar vídeo ${i}:`, videoError);
          }
        }

        setStatusMessage(`✅ ${images.length} clipes de vídeo encontrados!`);
      } else {
        // MODO IMAGENS
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

              let blob: Blob | undefined;
              let finalUrl = imageUrl;

              if (imageUrl.startsWith('blob:')) {
                try {
                  const response = await fetch(imageUrl);
                  blob = await response.blob();
                  console.log(`💾 Blob salvo para imagem ${globalIndex + 1}`);
                } catch (e) {
                  console.warn('Não foi possível salvar blob:', e);
                }
              } else if (imageUrl.startsWith('https://image.pollinations.ai/')) {
                try {
                  const response = await fetch(imageUrl);
                  if (response.ok) {
                    blob = await response.blob();
                    finalUrl = URL.createObjectURL(blob);
                    console.log(`💾 Pollinations imagem convertida para blob ${globalIndex + 1}`);
                  }
                } catch (e) {
                  console.warn('Não foi possível baixar imagem do Pollinations:', e);
                }
              }

              const storedImage: StoredImage = {
                id: `img-${Date.now()}-${globalIndex}`,
                url: finalUrl,
                blob: blob,
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

      const isVideoAIMode = selectedVideoProvider === 'runwayml' || selectedVideoProvider === 'lumaai' || selectedVideoProvider === 'stability';

      if (isVideoAIMode) {
        const videoAIProvider = selectedVideoProvider as VideoAIProvider;
        const videoAIKey = videoApiKeys[selectedVideoProvider];

        if (!videoAIKey) {
          throw new Error(`API key não configurada para ${selectedVideoProvider}`);
        }

        setStatusMessage(`🎬 Gerando vídeos com ${videoAIProvider}...`);
        const generatedVideos: GeneratedVideo[] = [];

        for (let i = 0; i < images.length; i++) {
          try {
            setStatusMessage(`🎥 Gerando vídeo ${i + 1}/${images.length} com IA...`);
            setProgress(75 + ((i / images.length) * 20));

            const videoResult = await generateVideoFromImage(
              images[i].url,
              videoAIProvider,
              videoAIKey,
              {
                prompt: images[i].prompt,
                duration: 4,
                aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
              }
            );

            generatedVideos.push(videoResult);
            images[i] = {
              ...images[i],
              videoUrl: videoResult.url,
            };

            setGeneratedImages([...images]);
            await saveCheckpoint(`video-ai-${i}`, 75 + ((i + 1) / images.length) * 20, {
              audioAnalysis: analysis,
              globalContext: prompts[0]?.globalContext ?? null,
              narrative: analysis.narrative ?? null,
              generatedImages: images,
              aspectRatio,
              selectedTheme,
            });
          } catch (videoError) {
            console.error(`Erro ao gerar vídeo ${i}:`, videoError);
            setStatusMessage(`⚠️ Erro no vídeo ${i + 1}, usando imagem original...`);
          }
        }

        setStatusMessage(`✅ ${generatedVideos.length} vídeos IA gerados!`);
      }

      setCurrentStep('composing');
      setStatusMessage('🎬 Criando vídeo final...');
      videoComposerRef.current = new VideoComposer();
      await videoComposerRef.current.load((p) => {
        setProgress(95 + (p / 100) * 3);
        if (p % 20 === 0) setStatusMessage(`🎬 FFmpeg... ${p}%`);
      });
      setStatusMessage('🎬 Renderizando vídeo...');
      const videoOptions: VideoOptions = {
        fps: 24, width: aspectRatio === '9:16' ? 720 : 1280,
        height: aspectRatio === '9:16' ? 1280 : 720, audioFile, videoMode,
      };
      const videoBlob = await videoComposerRef.current.createVideo(images, videoOptions, (p) => {
        setProgress(98 + (p / 100) * 2);
        if (p % 25 === 0) setStatusMessage(`🎬 Renderizando... ${p}%`);
      });
      const videoObjectUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoObjectUrl);
      setProgress(100);
      setCurrentStep('done');
      setStatusMessage('✅ Vídeo criado!');
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
