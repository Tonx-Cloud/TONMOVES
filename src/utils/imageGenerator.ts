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
  private togetherApiKey: string | null = null;

  constructor() {
    // ✅ Tentar pegar API key do Together AI (opcional)
    this.togetherApiKey = import.meta.env.VITE_TOGETHER_API_KEY || null;
    
    if (this.togetherApiKey) {
      console.log('✅ Together AI configurado (RÁPIDO)');
    } else {
      console.log('ℹ️ Usando Pollinations (GRÁTIS mas lento)');
    }
  }

  async generatePrompts(
    segments: AudioSegment[],
    musicTitle: string,
    theme: Theme = 'cinematic',
    audioAnalysis?: AudioAnalysis
  ): Promise<ImagePrompt[]> {
    console.log('🎨 Creating story context (free)...');
    this.globalContext = this.createGlobalContextFree(
      musicTitle,
      theme,
      audioAnalysis
    );

    console.log('✅ Global context:', this.globalContext);

    const prompts: ImagePrompt[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

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

  private createGlobalContextFree(
    musicTitle: string,
    theme: Theme,
    audioAnalysis?: AudioAnalysis
  ): GlobalContext {
    const themeStyle = THEME_STYLES[theme];
    const narrative = audioAnalysis?.narrative;

    if (narrative && narrative.characters.length > 0) {
      return {
        mainTheme: narrative.story,
        mood: this.getMoodFromNarrative(narrative),
        visualElements: [...narrative.characters, narrative.setting],
        colors: this.getColorsForTheme(theme),
        atmosphere: 'story-driven visual narrative',
        storyboard: narrative.keyMoments.map(m => m.description)
      };
    }

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

    let prompt = '';

    if (narrative && narrative.characters.length > 0) {
      const characters = narrative.characters.slice(0, 3).join(' and ');
      const action = segment.narrativeAction || this.getActionForProgress(progress);
      
      prompt = `${characters} ${action}, ${narrative.setting}, ${themeStyle.keywords}`;
    } 
    else if (segment.transcription) {
      const firstWords = segment.transcription.split(' ').slice(0, 10).join(' ');
      prompt = `Scene illustrating: "${firstWords}", ${context.visualElements[0]}, ${themeStyle.keywords}`;
    }
    else {
      const element = context.visualElements[index % context.visualElements.length];
      const moodDescription = this.getMoodDescription(segment.mood);
      
      prompt = `${moodDescription} scene featuring ${element}, ${themeStyle.keywords}`;
    }

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
    const themeStyle = THEME_STYLES[theme];
    const fullPrompt = `${prompt}, ${themeStyle.keywords}, high quality, detailed, 9:16 aspect ratio, vertical format`;
    
    // ✅ MÉTODO 1: Together AI (RÁPIDO - 1-2s)
    if (this.togetherApiKey) {
      try {
        console.log('🚀 Tentando Together AI (RÁPIDO)...');
        return await this.generateWithTogetherAI(fullPrompt);
      } catch (error) {
        console.warn('⚠️ Together AI falhou, usando Pollinations...', error);
      }
    }
    
    // ✅ MÉTODO 2: Pollinations (GRÁTIS - 3-5s)
    console.log('🎨 Usando Pollinations (grátis)...');
    return await this.generateWithPollinations(fullPrompt);
  }

  // ✅ Together AI - FLUX-1 (RÁPIDO!)
  private async generateWithTogetherAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.togetherApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt: prompt,
        width: 720,
        height: 1280,
        steps: 4, // Schnell = rápido, usa poucos steps
        n: 1,
      })
    });

    if (!response.ok) {
      throw new Error(`Together AI error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Together AI: No image URL returned');
    }

    return data.data[0].url;
  }

  // ✅ Pollinations (FALLBACK)
  private async generateWithPollinations(prompt: string): Promise<string> {
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=720&height=1280&nologo=true&model=flux&enhance=true`;
  }
}
