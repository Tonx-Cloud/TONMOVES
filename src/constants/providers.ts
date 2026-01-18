import type { ImageProvider, VideoProvider, TranscriptionProvider } from '../types/app';

type ProviderBase<T> = { id: T; name: string; needsKey: boolean; description: string; proOnly?: boolean; icon?: string };

export const IMAGE_PROVIDERS_LIST: ProviderBase<ImageProvider>[] = [
  { id: 'pollinations', name: 'Pollinations', needsKey: false, description: 'IA gratuita, sem limite, mais lento' },
  { id: 'pexels', name: 'Pexels', needsKey: true, description: 'Fotos reais HD, gratuito com API key' },
  { id: 'together', name: 'Together AI', needsKey: true, description: 'IA rapida, modelo FLUX.1, pago' },
  { id: 'openai', name: 'OpenAI DALL-E 3 (PRO)', needsKey: true, description: 'Somente PRO, via backend', proOnly: true },
  { id: 'gemini', name: 'Google Gemini (PRO)', needsKey: true, description: 'Somente PRO, via backend', proOnly: true },
];

export const VIDEO_PROVIDERS_LIST: ProviderBase<VideoProvider>[] = [
  { id: 'local', name: 'Local (FFmpeg)', needsKey: false, description: 'Gratuito, processa no navegador', icon: '💻' },
  { id: 'pexels', name: 'Pexels Videos', needsKey: true, description: 'Videos reais HD, gratuito com API key', icon: '📹' },
  { id: 'runwayml', name: 'RunwayML Gen-3', needsKey: true, description: 'IA geradora de video de alta qualidade', icon: '🎥' },
  { id: 'lumaai', name: 'Luma Dream Machine', needsKey: true, description: 'Videos cinematograficos com IA', icon: '🌙' },
  { id: 'stability', name: 'Stability AI', needsKey: true, description: 'Stable Video Diffusion', icon: '🎞️' },
  { id: 'runwayml-gen3', name: 'RunwayML Gen-3 (legacy)', needsKey: true, description: 'Compat layer para versões antigas', icon: '🎥' },
];

export const TRANSCRIPTION_PROVIDERS_LIST: ProviderBase<TranscriptionProvider>[] = [
  { id: 'filename', name: 'Nome do Arquivo', needsKey: false, description: 'Extrai contexto do nome do arquivo (gratis)' },
  { id: 'groq', name: 'Groq Whisper', needsKey: true, description: 'Whisper gratuito, rapido e preciso' },
  { id: 'openai', name: 'OpenAI Whisper (PRO backend)', needsKey: true, description: 'Pago; somente via backend/assinatura', proOnly: true },
  { id: 'disabled', name: 'Desativado', needsKey: false, description: 'Nao transcrever, usar apenas analise de audio' },
];
