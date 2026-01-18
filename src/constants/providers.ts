import type { ImageProvider, VideoProvider, TranscriptionProvider } from '../types/app';

export const IMAGE_PROVIDERS_LIST: { id: ImageProvider; name: string; needsKey: boolean; description: string }[] = [
  { id: 'pollinations', name: 'Pollinations', needsKey: false, description: 'IA gratuita, sem limite, mais lento' },
  { id: 'pexels', name: 'Pexels', needsKey: true, description: 'Fotos reais HD, gratuito com API key' },
  { id: 'together', name: 'Together AI', needsKey: true, description: 'IA rapida, modelo FLUX.1, pago' },
  { id: 'openai', name: 'OpenAI DALL-E 3', needsKey: true, description: 'IA alta qualidade, pago' },
  { id: 'gemini', name: 'Google Gemini', needsKey: true, description: 'IA Imagen 3, pago' },
];

export const VIDEO_PROVIDERS_LIST: { id: VideoProvider; name: string; needsKey: boolean; description: string; icon: string }[] = [
  { id: 'local', name: 'Local (FFmpeg)', needsKey: false, description: 'Gratuito, processa no navegador', icon: '💻' },
  { id: 'pexels', name: 'Pexels Videos', needsKey: true, description: 'Videos reais HD, gratuito com API key', icon: '📹' },
  { id: 'runwayml', name: 'RunwayML Gen-3', needsKey: true, description: 'IA geradora de video de alta qualidade', icon: '🎥' },
  { id: 'lumaai', name: 'Luma Dream Machine', needsKey: true, description: 'Videos cinematograficos com IA', icon: '🌙' },
  { id: 'stability', name: 'Stability AI', needsKey: true, description: 'Stable Video Diffusion', icon: '🎞️' },
  { id: 'runwayml-gen3', name: 'RunwayML Gen-3 (legacy)', needsKey: true, description: 'Compat layer para versões antigas', icon: '🎥' },
];

export const TRANSCRIPTION_PROVIDERS_LIST: { id: TranscriptionProvider; name: string; needsKey: boolean; description: string; icon: string }[] = [
  { id: 'filename', name: 'Nome do Arquivo', needsKey: false, description: 'Extrai contexto do nome do arquivo (gratis)', icon: '📄' },
  { id: 'groq', name: 'Groq Whisper', needsKey: true, description: 'Whisper gratuito, rapido e preciso', icon: '⚡' },
  { id: 'openai', name: 'OpenAI Whisper', needsKey: true, description: 'Whisper original, muito preciso (~$0.006/min)', icon: '🎯' },
  { id: 'disabled', name: 'Desativado', needsKey: false, description: 'Nao transcrever, usar apenas analise de audio', icon: '🔇' },
];
