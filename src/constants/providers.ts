import type { ImageProvider, VideoProvider, TranscriptionProvider } from '../types/app';

type ProviderBase<T> = { id: T; name: string; needsKey: boolean; description: string; proOnly?: boolean; icon?: string };

export const IMAGE_PROVIDERS_LIST: ProviderBase<ImageProvider>[] = [
  { id: 'openai', name: 'OpenAI DALL-E 3 (PRO)', needsKey: true, description: 'Somente PRO, via backend', proOnly: true },
  { id: 'gemini', name: 'Google Gemini (PRO)', needsKey: true, description: 'Somente PRO, via backend', proOnly: true },
];

export const VIDEO_PROVIDERS_LIST: ProviderBase<VideoProvider>[] = [
  { id: 'local', name: 'Local (FFmpeg)', needsKey: false, description: 'Gratuito, processa no navegador', icon: '💻' },
];

export const TRANSCRIPTION_PROVIDERS_LIST: ProviderBase<TranscriptionProvider>[] = [
  { id: 'filename', name: 'Nome do Arquivo', needsKey: false, description: 'Extrai contexto do nome do arquivo (gratis)' },
  { id: 'openai', name: 'OpenAI Whisper (PRO backend)', needsKey: true, description: 'Pago; somente via backend/assinatura', proOnly: true },
  { id: 'disabled', name: 'Desativado', needsKey: false, description: 'Nao transcrever, usar apenas analise de audio' },
];
