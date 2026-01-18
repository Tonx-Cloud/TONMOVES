import { useEffect, useRef, useState } from 'react';
import type { AspectRatio } from '../types/app';
import type { Theme, GlobalContext } from '../utils/imageGenerator';
import type { AudioAnalysis, NarrativeAnalysis } from '../utils/audioAnalyzer';
import type { StoredImage } from '../utils/imageStorage';
import { ImageStorage } from '../utils/imageStorage';
import { CheckpointManager, type Checkpoint } from '../utils/checkpointManager';

interface UseCheckpointParams {
  imageStorageRef: React.MutableRefObject<ImageStorage | null>;
  setGeneratedImages: (images: StoredImage[]) => void;
  setProgress: (progress: number) => void;
  setAudioAnalysis: (analysis: AudioAnalysis | null) => void;
  setGlobalContext: (context: GlobalContext | null) => void;
  setNarrative: (narrative: NarrativeAnalysis | null) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setSelectedTheme: (theme: Theme) => void;
  setCurrentStep: (step: string) => void;
  setStatusMessage: (message: string) => void;
}

interface CheckpointData {
  audioAnalysis: AudioAnalysis | null;
  globalContext: GlobalContext | null;
  narrative: NarrativeAnalysis | null;
  generatedImages: StoredImage[];
  aspectRatio: AspectRatio;
  selectedTheme: Theme;
  audioFileName?: string;
}

export function useCheckpoint({
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
}: UseCheckpointParams) {
  const checkpointManagerRef = useRef<CheckpointManager | null>(null);
  const [hasCheckpoint, setHasCheckpoint] = useState(false);

  useEffect(() => {
    checkpointManagerRef.current = new CheckpointManager();
    checkRecovery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureImageStorage = async () => {
    if (!imageStorageRef.current) {
      imageStorageRef.current = new ImageStorage();
      await imageStorageRef.current.init();
    }
  };

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
    if (checkpoint.data.audioAnalysis) setAudioAnalysis(checkpoint.data.audioAnalysis);
    if (checkpoint.data.globalContext) setGlobalContext(checkpoint.data.globalContext);
    if (checkpoint.data.narrative) setNarrative(checkpoint.data.narrative);
    if (checkpoint.data.aspectRatio) setAspectRatio(checkpoint.data.aspectRatio as AspectRatio);
    if (checkpoint.data.theme) setSelectedTheme(checkpoint.data.theme as Theme);

    let recoveredImages = checkpoint.data.generatedImages || [];

    if (recoveredImages.length === 0) {
      try {
        await ensureImageStorage();
        const storedImages = await imageStorageRef.current!.getAllImages();
        if (storedImages.length > 0) {
          recoveredImages = storedImages.sort((a, b) => a.segmentIndex - b.segmentIndex);
          console.log(`📂 Recuperadas ${recoveredImages.length} imagens do IndexedDB`);
        }
      } catch (e) {
        console.error('Erro ao carregar imagens do IndexedDB:', e);
      }
    }

    const processedImages = recoveredImages.map((img) => {
      if (img.blob) {
        const newBlobUrl = URL.createObjectURL(img.blob);
        console.log(`🔄 Recriando blob URL para imagem ${img.id}`);
        return { ...img, url: newBlobUrl };
      }
      if (img.url?.startsWith('blob:')) {
        console.warn(`⚠️ Blob URL inválido para imagem ${img.id}, URL não pode ser recuperada`);
        return { ...img, url: '' };
      }
      return img;
    });

    setGeneratedImages(processedImages);

    if (recoveredImages.length > 0) {
      setCurrentStep('composing');
      setStatusMessage(`📂 ${recoveredImages.length} imagens recuperadas! Selecione o áudio para criar o vídeo.`);
    } else if (checkpoint.progress >= 30) {
      setCurrentStep('composing');
      setStatusMessage('📂 Progresso recuperado! Selecione o áudio para continuar.');
    } else {
      setCurrentStep('upload');
      setStatusMessage('📂 Progresso recuperado!');
    }

    setHasCheckpoint(false);
  };

  const saveCheckpoint = async (step: string, progress: number, data: CheckpointData) => {
    if (!checkpointManagerRef.current) return;
    await checkpointManagerRef.current.autoSave(step, progress, {
      audioAnalysis: data.audioAnalysis ?? undefined,
      globalContext: data.globalContext ?? undefined,
      narrative: data.narrative ?? undefined,
      generatedImages: data.generatedImages ?? undefined,
      aspectRatio: data.aspectRatio,
      theme: data.selectedTheme,
      audioFileName: data.audioFileName,
    });
  };

  const clearCheckpoint = async () => {
    if (!checkpointManagerRef.current) return;
    await checkpointManagerRef.current.clearCheckpoint();
    setHasCheckpoint(false);
  };

  return {
    hasCheckpoint,
    handleRecoverProgress,
    saveCheckpoint,
    clearCheckpoint,
    checkRecovery,
    checkpointManagerRef,
  };
}
