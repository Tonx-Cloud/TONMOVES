export type VideoModeId = 'slideshow' | 'animated';

export interface VideoMode {
  id: VideoModeId;
  name: string;
  description: string;
  icon: string;
}

export const VIDEO_MODES: VideoMode[] = [
  { id: 'slideshow', name: 'Slideshow', description: '1 imagem a cada 3-5 segundos', icon: '🖼️' },
  { id: 'animated', name: 'Animado', description: 'Menos imagens com zoom/pan', icon: '🎬' },
];
