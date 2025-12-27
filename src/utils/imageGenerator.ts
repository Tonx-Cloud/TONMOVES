import Groq from 'groq-sdk';
import type { AudioSegment, AudioAnalysis } from './audioAnalyzer';

export interface ImagePrompt {
  prompt: string;
  segment: AudioSegment;
  index: number;
  globalContext?: GlobalContext;
}

export interface GlobalContext {
  mainTheme: string;
  mood: string;
  visualElements: string[];
  colors: string[];
  atmosphere: string;
}

export type Theme = 'cinematic' | 'neon' | 'nature' | 'abstract' | 'minimal' | 'baby';

const THEME_STYLES = {
  cinematic: {
    description: 'Cinematic, dramatic lighting, film-like quality',
    keywords: 'cinematic lighting, dramatic colors, film grain, high contrast, professional cinematography',
  },
  neon: {
    description: 'Neon lights, cyberpunk, futuristic aesthetic',
    keywords: 'neon lights, vibrant glowing colors, cyberpunk aesthetic, futuristic city, purple and pink tones',
  },
  nature: {
    description: 'Natural landscapes, organic, earthy tones',
    keywords: 'natural lighting, organic landscapes, lush greenery, peaceful nature scenes, earthy tones',
  },
  abstract: {
    description: 'Abstract art, geometric shapes, vibrant colors',
    keywords: 'abstract art, geometric shapes, vibrant colors, modern art style, flowing patterns',
  },
  minimal: {
    description: 'Minimalist, clean lines, elegant simplicity',
    keywords: 'minimalist design, clean lines, negative space, elegant simplicity, monochromatic palette',
  },
  baby: {
    description: 'Colorful, cute, playful baby-friendly aesthetic',
    keywords: 'extremely colorful, vibrant rainbow colors, super cute kawaii style, baby toys aesthetic, bright pink blue yellow orange green, playful cheerful mood, adorable cartoon style, soft rounded shapes, smiling characters, sparkles and stars, fluffy clouds, bubbles, balloons, nursery rhyme vibes, happy innocent energy',
  },
};

export class ImageGenerator {
  private groq: Groq;
  private globalContext: GlobalContext | null = null;

  constructor(apiKey: string) {
    this.groq = new Groq({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
  }

  async generatePrompts(
    segments: AudioSegment[],
    musicTitle: string,
    theme: Theme = 'cinematic',
    audioAnalysis?: AudioAnalysis
  ): Promise<ImagePrompt[]> {
    // STEP 1: Global Context Analysis
    console.log('🎨 Step 1: Analyzing global context...');
    this.globalContext = await this.analyzeGlobalContext(
      musicTitle,
      theme,
      audioAnalysis || {
        bpm: 120,
        energy: 0.5,
        duration: segments.length * 5,
        segments
      }
    );

    console.log('✅ Global context:', this.globalContext);

    // STEP 2: Generate segment-specific prompts
    console.log('🎨 Step 2: Generating segment prompts...');
    const prompts: ImagePrompt[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const previousSegment = i > 0 ? segments[i - 1] : null;
      const nextSegment = i < segments.length - 1 ? segments[i + 1] : null;

      const prompt = await this.createPromptForSegment(
        segment,
        i,
        theme,
        previousSegment,
        nextSegment
      );
      
      prompts.push({
        prompt,
        segment,
        index: i,
        globalContext: this.globalContext
      });

      console.log(`✅ Prompt ${i + 1}/${segments.length}: ${prompt.substring(0, 60)}...`);
    }

    return prompts;
  }

  private async analyzeGlobalContext(
    musicTitle: string,
    theme: Theme,
    audioAnalysis: AudioAnalysis
  ): Promise<GlobalContext> {
    const themeStyle = THEME_STYLES[theme];
    
    const systemPrompt = `You are a creative director planning a music video. Analyze the music and create a cohesive visual theme.`;

    const userPrompt = `Create a GLOBAL VISUAL THEME for this music video:

Music: "${musicTitle}"
Duration: ${audioAnalysis.duration.toFixed(0)}s (${audioAnalysis.segments.length} scenes)
BPM: ${audioAnalysis.bpm}
Energy: ${(audioAnalysis.energy * 100).toFixed(0)}%
Visual Style: ${theme} - ${themeStyle.description}

Based on this, create a cohesive visual concept with:
1. Main theme (one sentence describing the overall story/concept)
2. Mood/atmosphere (adjectives)
3. Key visual elements (objects/characters to feature)
4. Color palette (3-5 specific colors)

Return ONLY valid JSON in this exact format:
{
  "mainTheme": "one sentence theme",
  "mood": "comma, separated, adjectives",
  "visualElements": ["element1", "element2", "element3"],
  "colors": ["color1", "color2", "color3"],
  "atmosphere": "descriptive atmosphere"
}`;

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          mainTheme: parsed.mainTheme || 'Abstract visual journey',
          mood: parsed.mood || 'dynamic, colorful',
          visualElements: parsed.visualElements || ['abstract shapes', 'flowing patterns'],
          colors: parsed.colors || ['#667eea', '#764ba2', '#f093fb'],
          atmosphere: parsed.atmosphere || 'vibrant and energetic'
        };
      }
    } catch (error) {
      console.error('Error analyzing global context:', error);
    }

    // Fallback based on theme
    return this.getFallbackGlobalContext(theme, audioAnalysis);
  }

  private getFallbackGlobalContext(theme: Theme, audioAnalysis: AudioAnalysis): GlobalContext {
    const contexts = {
      cinematic: {
        mainTheme: 'Epic cinematic journey through dramatic landscapes',
        mood: 'dramatic, powerful, emotional',
        visualElements: ['sweeping landscapes', 'dramatic skies', 'cinematic lighting'],
        colors: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
        atmosphere: 'grand and cinematic'
      },
      neon: {
        mainTheme: 'Futuristic cyberpunk adventure in neon-lit city',
        mood: 'energetic, futuristic, vibrant',
        visualElements: ['neon signs', 'city lights', 'futuristic architecture'],
        colors: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607'],
        atmosphere: 'electric and vibrant'
      },
      nature: {
        mainTheme: 'Peaceful journey through natural landscapes',
        mood: 'calm, organic, serene',
        visualElements: ['forests', 'mountains', 'flowing water', 'wildlife'],
        colors: ['#2d6a4f', '#40916c', '#52b788', '#74c69d'],
        atmosphere: 'natural and peaceful'
      },
      abstract: {
        mainTheme: 'Abstract exploration of shapes, colors and patterns',
        mood: 'creative, artistic, flowing',
        visualElements: ['geometric shapes', 'flowing patterns', 'color gradients'],
        colors: ['#f72585', '#7209b7', '#3a0ca3', '#4361ee'],
        atmosphere: 'artistic and abstract'
      },
      minimal: {
        mainTheme: 'Minimalist study of form and negative space',
        mood: 'clean, elegant, simple',
        visualElements: ['simple shapes', 'negative space', 'clean lines'],
        colors: ['#ffffff', '#f8f9fa', '#e9ecef', '#495057'],
        atmosphere: 'minimal and refined'
      },
      baby: {
        mainTheme: 'Colorful magical world filled with toys and wonder',
        mood: 'joyful, playful, innocent, cheerful',
        visualElements: ['cute toys', 'fluffy clouds', 'colorful balloons', 'smiling stars', 'rainbow', 'bubbles'],
        colors: ['#FFB6D9', '#B4E7FF', '#FFF5BA', '#FFCBC1', '#C1FFD7', '#E7C6FF'],
        atmosphere: 'magical, cheerful and adorable'
      }
    };

    return contexts[theme];
  }

  private async createPromptForSegment(
    segment: AudioSegment,
    index: number,
    theme: Theme,
    previousSegment: AudioSegment | null,
    nextSegment: AudioSegment | null
  ): Promise<string> {
    const themeStyle = THEME_STYLES[theme];
    const context = this.globalContext!;

    const systemPrompt = `You are creating image prompts for a music video. Keep prompts concise (under 80 words) and visually descriptive.`;

    const userPrompt = `Create an image prompt for scene ${index + 1}:

GLOBAL THEME: ${context.mainTheme}
OVERALL MOOD: ${context.mood}
VISUAL STYLE: ${theme} - ${themeStyle.keywords}
KEY ELEMENTS: ${context.visualElements.join(', ')}
COLOR PALETTE: ${context.colors.join(', ')}

THIS SCENE (${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s):
- Mood: ${segment.mood}
- Energy: ${(segment.energy * 100).toFixed(0)}%
${previousSegment ? `- Previous scene was: ${previousSegment.mood}` : ''}
${nextSegment ? `- Next scene will be: ${nextSegment.mood}` : ''}

Create ONE concise image prompt (max 80 words) that:
1. Matches the ${theme} visual style
2. Uses the global color palette and elements
3. Captures the ${segment.mood} mood of this specific moment
4. Fits the overall theme: "${context.mainTheme}"

Return ONLY the prompt text, no explanations.`;

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 120
      });

      const generatedPrompt = response.choices[0]?.message?.content?.trim() || '';
      
      // Ensure theme keywords are included
      return `${generatedPrompt}, ${themeStyle.keywords}`;
      
    } catch (error) {
      console.error('Error generating prompt with Groq:', error);
      return this.getFallbackPrompt(segment, theme);
    }
  }

  private getFallbackPrompt(segment: AudioSegment, theme: Theme): string {
    const themeStyle = THEME_STYLES[theme];
    const context = this.globalContext!;
    
    const moodDescriptions = {
      calm: 'peaceful and serene',
      energetic: 'dynamic and vibrant',
      intense: 'powerful and dramatic',
      dark: 'mysterious and moody'
    };

    return `${moodDescriptions[segment.mood]} scene featuring ${context.visualElements[0]}, ${themeStyle.keywords}, ${context.colors.slice(0, 3).join(' and ')} color palette`;
  }

  async generateImage(prompt: string, theme: Theme = 'cinematic'): Promise<string> {
    // Using Pollinations.ai - free AI image generation
    const themeStyle = THEME_STYLES[theme];
    const fullPrompt = `${prompt}, ${themeStyle.keywords}`;
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1280&height=720&nologo=true&model=flux`;
  }
}
