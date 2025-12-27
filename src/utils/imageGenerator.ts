import type { AudioSegment, AudioAnalysis, NarrativeAnalysis } from './audioAnalyzer';

export interface ImagePrompt {
  prompt: string;
  segment: AudioSegment;
  index: number;
  globalContext?: GlobalContext;
  narrativeContext?: string;
}

export interface GlobalContext {
  mainTheme: string;
  mood: string;
  visualElements: string[];
  colors: string[];
  atmosphere: string;
  storyboard?: string[];
}

export type Theme = 'cinematic' | 'neon' | 'nature' | 'abstract' | 'minimal' | 'baby';

const THEME_STYLES = {
  cinematic: {
    description: 'Cinematic, dramatic lighting, film-like quality',
    keywords: 'cinematic lighting, dramatic colors, film grain, high contrast, professional cinematography, movie scene',
  },
  neon: {
    description: 'Neon lights, cyberpunk, futuristic aesthetic',
    keywords: 'neon lights, vibrant glowing colors, cyberpunk aesthetic, futuristic city, purple and pink tones, electric glow',
  },
  nature: {
    description: 'Natural landscapes, organic, earthy tones',
    keywords: 'natural lighting, organic landscapes, lush greenery, peaceful nature scenes, earthy tones, botanical',
  },
  abstract: {
    description: 'Abstract art, geometric shapes, vibrant colors',
    keywords: 'abstract art, geometric shapes, vibrant colors, modern art style, flowing patterns, artistic',
  },
  minimal: {
    description: 'Minimalist, clean lines, elegant simplicity',
    keywords: 'minimalist design, clean lines, negative space, elegant simplicity, monochromatic palette, simple',
  },
  baby: {
    description: 'Colorful, cute, playful baby-friendly aesthetic',
    keywords: 'extremely colorful, vibrant rainbow colors, super cute kawaii style, adorable cartoon style, soft rounded shapes, smiling characters, sparkles and stars, fluffy clouds, bubbles, balloons, playful cheerful mood, happy innocent energy, bright pink blue yellow orange green',
  },
};

export class ImageGenerator {
  private globalContext: GlobalContext | null = null;

  constructor() {
    // Não precisa de API key!
  }

  async generatePrompts(
    segments: AudioSegment[],
    musicTitle: string,
    theme: Theme = 'cinematic',
    audioAnalysis?: AudioAnalysis
  ): Promise<ImagePrompt[]> {
    // ✅ GRÁTIS: Criar contexto global sem IA
    console.log('🎨 Creating story context (free)...');
    this.globalContext = this.createGlobalContextFree(
      musicTitle,
      theme,
      audioAnalysis
    );

    console.log('✅ Global context:', this.globalContext);

    // ✅ GRÁTIS: Gerar prompts baseados em template
    console.log('🎨 Generating prompts (template-based)...');
    const prompts: ImagePrompt[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const previousSegment = i > 0 ? segments[i - 1] : null;

      const prompt = this.createTemplatePrompt(
        segment,
        i,
        theme,
        segments.length,
        audioAnalysis?.narrative
      );
      
      prompts.push({
        prompt,
        segment,
        index: i,
        globalContext: this.globalContext,
        narrativeContext: segment.narrativeAction
      });

      console.log(`✅ Prompt ${i + 1}/${segments.length}: ${prompt.substring(0, 80)}...`);
    }

    return prompts;
  }

  // ✅ GRÁTIS: Criar contexto global sem IA
  private createGlobalContextFree(
    musicTitle: string,
    theme: Theme,
    audioAnalysis?: AudioAnalysis
  ): GlobalContext {
    const themeStyle = THEME_STYLES[theme];
    const narrative = audioAnalysis?.narrative;

    if (narrative && narrative.characters.length > 0) {
      // Usar narrativa detectada
      return {
        mainTheme: narrative.story,
        mood: this.getMoodFromNarrative(narrative),
        visualElements: [...narrative.characters, narrative.setting],
        colors: this.getColorsForTheme(theme),
        atmosphere: 'story-driven visual narrative',
        storyboard: narrative.keyMoments.map(m => m.description)
      };
    }

    // Fallback: usar tema apenas
    const themeContexts = {
      cinematic: {
        mainTheme: 'Epic cinematic visual journey',
        mood: 'dramatic, powerful, emotional',
        visualElements: ['sweeping landscapes', 'dramatic lighting', 'cinematic scenes'],
        colors: ['#1a1a2e', '#16213e', '#e94560'],
        atmosphere: 'grand cinematic experience'
      },
      neon: {
        mainTheme: 'Futuristic neon-lit adventure',
        mood: 'energetic, vibrant, electric',
        visualElements: ['neon signs', 'glowing lights', 'futuristic cityscape'],
        colors: ['#ff006e', '#8338ec', '#3a86ff'],
        atmosphere: 'electric cyberpunk world'
      },
      nature: {
        mainTheme: 'Natural landscape journey',
        mood: 'calm, peaceful, organic',
        visualElements: ['lush forests', 'flowing water', 'mountains'],
        colors: ['#2d6a4f', '#40916c', '#74c69d'],
        atmosphere: 'serene natural beauty'
      },
      abstract: {
        mainTheme: 'Abstract artistic exploration',
        mood: 'creative, dynamic, flowing',
        visualElements: ['geometric shapes', 'color gradients', 'patterns'],
        colors: ['#f72585', '#7209b7', '#4361ee'],
        atmosphere: 'artistic expression'
      },
      minimal: {
        mainTheme: 'Minimalist visual study',
        mood: 'clean, elegant, simple',
        visualElements: ['simple forms', 'negative space', 'clean lines'],
        colors: ['#ffffff', '#f8f9fa', '#495057'],
        atmosphere: 'refined simplicity'
      },
      baby: {
        mainTheme: 'Colorful magical toy world',
        mood: 'joyful, playful, innocent',
        visualElements: ['cute toys', 'fluffy clouds', 'smiling stars', 'rainbow', 'balloons'],
        colors: ['#FFB6D9', '#B4E7FF', '#FFF5BA', '#FFCBC1'],
        atmosphere: 'magical cheerful wonderland'
      }
    };

    return themeContexts[theme];
  }

  // ✅ GRÁTIS: Criar prompt usando templates
  private createTemplatePrompt(
    segment: AudioSegment,
    index: number,
    theme: Theme,
    totalSegments: number,
    narrative?: NarrativeAnalysis
  ): string {
    const themeStyle = THEME_STYLES[theme];
    const context = this.globalContext!;
    const progress = index / totalSegments;

    // Template base
    let prompt = '';

    // Se tem narrativa, usar personagens e ação
    if (narrative && narrative.characters.length > 0) {
      const characters = narrative.characters.slice(0, 3).join(' and ');
      const action = segment.narrativeAction || this.getActionForProgress(progress);
      
      prompt = `${characters} ${action}, ${narrative.setting}, ${themeStyle.keywords}`;
    } 
    // Se tem transcrição no segmento
    else if (segment.transcription) {
      const firstWords = segment.transcription.split(' ').slice(0, 10).join(' ');
      prompt = `Scene illustrating: "${firstWords}", ${context.visualElements[0]}, ${themeStyle.keywords}`;
    }
    // Fallback: usar mood e elementos
    else {
      const element = context.visualElements[index % context.visualElements.length];
      const moodDescription = this.getMoodDescription(segment.mood);
      
      prompt = `${moodDescription} scene featuring ${element}, ${themeStyle.keywords}`;
    }

    // Adicionar cores do tema
    const colors = context.colors.slice(0, 3).join(' and ');
    prompt += `, color palette: ${colors}`;

    return prompt;
  }

  private getActionForProgress(progress: number): string {
    if (progress < 0.25) return 'at the beginning of the story';
    if (progress < 0.5) return 'in the middle of action';
    if (progress < 0.75) return 'during the climax';
    return 'at the resolution';
  }

  private getMoodDescription(mood: string): string {
    const descriptions = {
      calm: 'peaceful and serene',
      energetic: 'dynamic and vibrant',
      intense: 'powerful and dramatic',
      dark: 'mysterious and moody'
    };
    return descriptions[mood as keyof typeof descriptions] || 'expressive';
  }

  private getMoodFromNarrative(narrative: NarrativeAnalysis): string {
    const story = narrative.story.toLowerCase();
    
    if (story.includes('fight') || story.includes('briga')) {
      return 'dynamic, playful, energetic';
    }
    if (story.includes('love') || story.includes('amor')) {
      return 'romantic, emotional, tender';
    }
    if (story.includes('sad') || story.includes('triste')) {
      return 'melancholic, emotional, touching';
    }
    
    return 'expressive, narrative, engaging';
  }

  private getColorsForTheme(theme: Theme): string[] {
    const colorPalettes = {
      cinematic: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
      neon: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607'],
      nature: ['#2d6a4f', '#40916c', '#52b788', '#74c69d'],
      abstract: ['#f72585', '#7209b7', '#3a0ca3', '#4361ee'],
      minimal: ['#ffffff', '#f8f9fa', '#e9ecef', '#495057'],
      baby: ['#FFB6D9', '#B4E7FF', '#FFF5BA', '#FFCBC1', '#C1FFD7', '#E7C6FF']
    };
    
    return colorPalettes[theme];
  }

  async generateImage(prompt: string, theme: Theme = 'cinematic'): Promise<string> {
    // ✅ GRÁTIS: Pollinations.ai (100% grátis!)
    const themeStyle = THEME_STYLES[theme];
    const fullPrompt = `${prompt}, ${themeStyle.keywords}, high quality, detailed`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    
    // Usar modelo Flux (melhor qualidade)
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=720&height=1280&nologo=true&model=flux&enhance=true`;
  }
}
