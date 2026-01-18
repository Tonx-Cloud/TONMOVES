export type AspectRatio = '16:9' | '9:16';
export type Step = 'upload' | 'analyzing' | 'generating' | 'composing' | 'done';
export type CurrentView = 'main' | 'settings';

// Provedores globais
export type ImageProvider = 'pollinations' | 'pexels' | 'together' | 'openai' | 'gemini';
export type VideoProvider = 'local' | 'pexels' | 'runwayml' | 'lumaai' | 'stability' | 'runwayml-gen3';
export type TranscriptionProvider = 'disabled' | 'filename' | 'groq' | 'openai';
