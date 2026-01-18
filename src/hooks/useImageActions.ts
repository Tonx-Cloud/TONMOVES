import { useRef } from 'react';
import type { StoredImage } from '../utils/imageStorage';
import { ImageGenerator } from '../utils/imageGenerator';
import { ImageStorage } from '../utils/imageStorage';

interface ImageActionsDeps {
  selectedProvider: string;
  apiKeys: Record<string, string>;
  selectedTheme: string;
  setGeneratedImages: (imgs: StoredImage[]) => void;
  setStatusMessage: (m: string) => void;
  setError: (e: string | null) => void;
}

export function useImageActions({
  selectedProvider,
  apiKeys,
  selectedTheme,
  setGeneratedImages,
  setStatusMessage,
  setError,
}: ImageActionsDeps) {
  const imageGeneratorRef = useRef<ImageGenerator | null>(null);
  const imageStorageRef = useRef<ImageStorage | null>(null);

  const ensureGenerator = () => {
    if (!imageGeneratorRef.current) {
      imageGeneratorRef.current = new ImageGenerator({
        provider: selectedProvider as any,
        apiKey: apiKeys[selectedProvider] || undefined,
      });
    }
  };

  const ensureStorage = async () => {
    if (!imageStorageRef.current) {
      imageStorageRef.current = new ImageStorage();
      await imageStorageRef.current.init();
    }
  };

  const handleDeleteImage = async (id: string) => {
    await ensureStorage();
    await imageStorageRef.current!.deleteImage(id);
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleClearAllImages = async () => {
    await ensureStorage();
    await imageStorageRef.current!.clearAll();
    setGeneratedImages([]);
  };

  const handleRegenerateImage = async (id: string, newPrompt: string, generatedImages: StoredImage[]) => {
    ensureGenerator();
    try {
      setStatusMessage('Re-gerando imagem...');
      const newUrl = await imageGeneratorRef.current!.generateImage(newPrompt, selectedTheme as any);
      const nextImages = generatedImages.map(img => img.id === id ? { ...img, url: newUrl, prompt: newPrompt } : img);
      setGeneratedImages(nextImages);
      await ensureStorage();
      const existingImg = generatedImages.find(img => img.id === id);
      if (existingImg) await imageStorageRef.current!.saveImage({ ...existingImg, url: newUrl, prompt: newPrompt });
      setStatusMessage('Imagem re-gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao re-gerar imagem:', error);
      setError('Erro ao re-gerar imagem. Tente novamente.');
    }
  };

  const handleUploadImage = async (file: File, index: number, generatedImages: StoredImage[]) => {
    try {
      const url = URL.createObjectURL(file);
      await ensureStorage();
      const existingImg = generatedImages.find(img => img.segmentIndex === index);
      if (existingImg) {
        const updated = generatedImages.map(img => img.segmentIndex === index ? { ...img, url, prompt: `Upload: ${file.name}` } : img);
        setGeneratedImages(updated);
        await imageStorageRef.current!.saveImage({ ...existingImg, url, prompt: `Upload: ${file.name}` });
      } else {
        const newImage: StoredImage = {
          id: `upload-${Date.now()}`, url, prompt: `Upload: ${file.name}`,
          timestamp: Date.now(), segmentIndex: index,
        };
        const updated = [...generatedImages, newImage].sort((a, b) => a.segmentIndex - b.segmentIndex);
        setGeneratedImages(updated);
        await imageStorageRef.current!.saveImage(newImage);
      }
      setStatusMessage('Imagem adicionada!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      setError('Erro ao fazer upload da imagem.');
    }
  };

  const handleUpdateAnimation = async (id: string, animationType: string, generatedImages: StoredImage[]) => {
    await ensureStorage();
    const updated = generatedImages.map(img => img.id === id ? { ...img, animationType: animationType as any } : img);
    setGeneratedImages(updated);
    const existingImg = generatedImages.find(img => img.id === id);
    if (existingImg) await imageStorageRef.current!.saveImage({ ...existingImg, animationType: animationType as any });
    const animName = animationType === 'none' ? 'Sem animação' : animationType;
    setStatusMessage(`Animação definida: ${animName}`);
  };

  return {
    handleDeleteImage,
    handleClearAllImages,
    handleRegenerateImage,
    handleUploadImage,
    handleUpdateAnimation,
    imageStorageRef,
  };
}
