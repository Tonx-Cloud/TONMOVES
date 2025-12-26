
export interface SceneDescription {
  id: string;
  timestamp: string;
  description: string;
  visualPrompt: string;
  mood: string;
  imageUrl?: string;
  videoUrl?: string;
}

export type VideoOrientation = 'landscape' | 'portrait';

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING_AUDIO = 'ANALYZING_AUDIO',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  GENERATING_VEO = 'GENERATING_VEO',
  RENDERING_VIDEO = 'RENDERING_VIDEO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
