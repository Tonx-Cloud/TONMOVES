import { useEffect, useState } from 'react';
import type { ImageProvider, VideoProvider, TranscriptionProvider } from '../types/app';
import { ImageGenerator, type ProviderConfig } from '../utils/imageGenerator';

interface UseConfigResult {
  selectedProvider: ImageProvider;
  setSelectedProvider: (p: ImageProvider) => void;
  apiKeys: Record<ImageProvider, string>;
  setApiKeys: React.Dispatch<React.SetStateAction<Record<ImageProvider, string>>>;
  selectedVideoProvider: VideoProvider;
  setSelectedVideoProvider: (p: VideoProvider) => void;
  videoApiKeys: Record<VideoProvider, string>;
  setVideoApiKeys: React.Dispatch<React.SetStateAction<Record<VideoProvider, string>>>;
  transcriptionProvider: TranscriptionProvider;
  setTranscriptionProvider: (p: TranscriptionProvider) => void;
  transcriptionApiKey: string;
  setTranscriptionApiKey: (k: string) => void;
  handleSaveConfig: () => void;
  handleSaveVideoConfig: () => void;
  handleSaveTranscriptionConfig: () => void;
}

const IMAGE_KEYS_STORAGE = 'tonmoves_api_keys';
const VIDEO_KEYS_STORAGE = 'tonmoves_video_api_keys';
const VIDEO_PROVIDER_STORAGE = 'tonmoves_video_provider';
const TRANSCRIPTION_PROVIDER_STORAGE = 'tonmoves_transcription_provider';
const TRANSCRIPTION_KEY_STORAGE = 'tonmoves_transcription_key';

export function useConfig(): UseConfigResult {
  const [selectedProvider, setSelectedProvider] = useState<ImageProvider>('openai');
  const [apiKeys, setApiKeys] = useState<Record<ImageProvider, string>>({
    openai: '', gemini: '',
  });

  const [selectedVideoProvider, setSelectedVideoProvider] = useState<VideoProvider>('local');
  const [videoApiKeys, setVideoApiKeys] = useState<Record<VideoProvider, string>>({
    local: '',
  });

  const [transcriptionProvider, setTranscriptionProvider] = useState<TranscriptionProvider>('disabled');
  const [transcriptionApiKey, setTranscriptionApiKey] = useState('');

  // Load saved config
  useEffect(() => {
    const savedConfig = ImageGenerator.getConfig();
    setSelectedProvider(savedConfig.provider);
    if (savedConfig.apiKey) {
      setApiKeys(prev => ({ ...prev, [savedConfig.provider]: savedConfig.apiKey || '' }));
    }
    try {
      const savedKeys = localStorage.getItem(IMAGE_KEYS_STORAGE);
      if (savedKeys) setApiKeys(JSON.parse(savedKeys));
    } catch {}
    try {
      const savedVideoKeys = localStorage.getItem(VIDEO_KEYS_STORAGE);
      if (savedVideoKeys) setVideoApiKeys(JSON.parse(savedVideoKeys));
      const savedVideoProvider = localStorage.getItem(VIDEO_PROVIDER_STORAGE);
      if (savedVideoProvider) setSelectedVideoProvider(savedVideoProvider as VideoProvider);
    } catch {}
    try {
      const savedTranscriptionProvider = localStorage.getItem(TRANSCRIPTION_PROVIDER_STORAGE);
      if (savedTranscriptionProvider) setTranscriptionProvider(savedTranscriptionProvider as TranscriptionProvider);
      const savedTranscriptionKey = localStorage.getItem(TRANSCRIPTION_KEY_STORAGE);
      if (savedTranscriptionKey) setTranscriptionApiKey(savedTranscriptionKey);
    } catch {}
  }, []);

  const handleSaveConfig = () => {
    const config: ProviderConfig = {
      provider: selectedProvider,
      apiKey: apiKeys[selectedProvider] || undefined,
    };
    ImageGenerator.saveConfig(config);
    localStorage.setItem(IMAGE_KEYS_STORAGE, JSON.stringify(apiKeys));
    alert('Configurações salvas!');
  };

  const handleSaveVideoConfig = () => {
    localStorage.setItem(VIDEO_KEYS_STORAGE, JSON.stringify(videoApiKeys));
    localStorage.setItem(VIDEO_PROVIDER_STORAGE, selectedVideoProvider);
    alert('Configurações salvas!');
  };

  const handleSaveTranscriptionConfig = () => {
    localStorage.setItem(TRANSCRIPTION_PROVIDER_STORAGE, transcriptionProvider);
    localStorage.setItem(TRANSCRIPTION_KEY_STORAGE, transcriptionApiKey);
    alert('Configurações salvas!');
  };

  return {
    selectedProvider,
    setSelectedProvider,
    apiKeys,
    setApiKeys,
    selectedVideoProvider,
    setSelectedVideoProvider,
    videoApiKeys,
    setVideoApiKeys,
    transcriptionProvider,
    setTranscriptionProvider,
    transcriptionApiKey,
    setTranscriptionApiKey,
    handleSaveConfig,
    handleSaveVideoConfig,
    handleSaveTranscriptionConfig,
  };
}
