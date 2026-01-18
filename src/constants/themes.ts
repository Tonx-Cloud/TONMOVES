import type { Theme } from '../utils/imageGenerator';

export interface ThemeConfig {
  name: string;
  emoji: string;
  description: string;
  gradient: string;
}

export const THEMES: Record<Theme, ThemeConfig> = {
  cinematic: { name: 'Cinematic', emoji: '🎬', description: 'Cinematográfico dramático', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  neon: { name: 'Neon', emoji: '💜', description: 'Cyberpunk futurista', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  nature: { name: 'Nature', emoji: '🌿', description: 'Natureza orgânica', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  abstract: { name: 'Abstract', emoji: '🎨', description: 'Arte moderna', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  minimal: { name: 'Minimal', emoji: '⚪', description: 'Minimalista elegante', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  baby: { name: 'Baby', emoji: '👶', description: 'Super colorido e fofo', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
};
