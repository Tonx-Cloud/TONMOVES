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
export type ImageProvider = 'pollinations' | 'pexels' | 'together' | 'openai' | 'gemini';

// Pexels search keywords mapping por tema
const PEXELS_KEYWORDS: Record<Theme, string[]> = {
  cinematic: ['cinematic', 'movie scene', 'dramatic landscape', 'film noir', 'epic view', 'sunset dramatic', 'moody lighting'],
  neon: ['neon lights', 'cyberpunk', 'night city', 'neon sign', 'futuristic', 'purple lights', 'tokyo night'],
  nature: ['nature', 'landscape', 'forest', 'mountain', 'ocean', 'flowers', 'wildlife', 'sunset nature'],
  abstract: ['abstract', 'colorful abstract', 'geometric', 'art', 'texture', 'pattern', 'modern art'],
  minimal: ['minimal', 'minimalist', 'simple', 'white background', 'clean design', 'negative space'],
  baby: ['baby', 'cute', 'colorful toys', 'rainbow', 'balloons', 'happy children', 'teddy bear', 'cartoon']
};

export interface ProviderConfig {
  provider: ImageProvider;
  apiKey?: string;
}

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
    keywords: 'colorful, vibrant rainbow colors, cute kawaii style, cartoon style, soft rounded shapes, smiling characters, sparkles, fluffy clouds, bubbles, balloons, playful cheerful mood',
  },
};

// Elementos variados para evitar repeticao
const SCENE_VARIATIONS = [
  'wide establishing shot', 'close-up detail', 'medium shot', 'birds eye view',
  'low angle perspective', 'silhouette composition', 'golden hour lighting',
  'blue hour atmosphere', 'dramatic shadows', 'soft diffused light',
  'backlit scene', 'side lighting', 'spotlight focus', 'ambient glow',
  'misty atmosphere', 'crystal clear', 'dreamy blur', 'sharp focus',
  'layered depth', 'foreground interest', 'leading lines', 'symmetrical',
  'rule of thirds', 'centered composition', 'diagonal movement', 'curved flow',
  'texture emphasis', 'pattern repetition', 'contrast play', 'color harmony',
  'warm tones dominant', 'cool tones dominant', 'complementary colors', 'monochromatic',
  'high key bright', 'low key moody', 'balanced exposure', 'artistic overexposure',
  'reflections visible', 'water elements', 'sky prominent', 'ground level view'
];

const SUBJECTS_BY_THEME: Record<Theme, string[]> = {
  cinematic: [
    'epic mountain landscape', 'city skyline at dusk', 'lone figure walking',
    'vintage car on road', 'rain on window', 'sunrise over ocean',
    'old building facade', 'street at night', 'forest path', 'desert dunes',
    'bridge silhouette', 'train tracks', 'lighthouse beam', 'castle ruins',
    'canyon vista', 'waterfall cascade', 'storm clouds gathering', 'moonlit scene'
  ],
  neon: [
    'cyberpunk street', 'holographic display', 'neon signs reflection',
    'futuristic vehicle', 'robot character', 'digital rain', 'laser beams',
    'glowing portal', 'cyber cafe', 'virtual reality', 'android face',
    'space station', 'neon jungle', 'electric storm', 'data streams',
    'chrome surfaces', 'LED patterns', 'arcade machines'
  ],
  nature: [
    'blooming flowers', 'butterfly on leaf', 'deer in forest',
    'river flowing', 'autumn leaves', 'spring meadow', 'winter snow',
    'bird in flight', 'sunset clouds', 'morning dew', 'mushroom cluster',
    'tree canopy', 'coral reef', 'mountain peak', 'lavender field',
    'cherry blossoms', 'tropical beach', 'northern lights'
  ],
  abstract: [
    'geometric patterns', 'fluid shapes', 'spiral formation',
    'fractal design', 'color explosion', 'wave interference', 'crystal structure',
    'smoke trails', 'ink in water', 'light prism', 'mosaic tiles',
    'origami folds', 'kaleidoscope', 'circuit board art', 'mandala pattern',
    'marble texture', 'liquid metal', 'bubble clusters'
  ],
  minimal: [
    'single object', 'empty room', 'horizon line',
    'geometric shadow', 'white on white', 'black silhouette', 'floating element',
    'subtle gradient', 'thin lines', 'dot pattern', 'negative space art',
    'zen garden', 'single flower', 'paper fold', 'water droplet',
    'feather detail', 'stone balance', 'simple window'
  ],
  baby: [
    'teddy bear smiling', 'colorful balloons', 'rainbow over clouds',
    'cute bunny', 'happy sun character', 'magic unicorn', 'friendly dragon',
    'toy train', 'building blocks', 'ice cream cone', 'cupcake celebration',
    'stars and moon', 'friendly robot', 'dancing flowers', 'baby animals playing',
    'candy land', 'bubble world', 'pillow fort'
  ]
};

export class ImageGenerator {
  private globalContext: GlobalContext | null = null;
  private providerConfig: ProviderConfig;

  constructor(config?: ProviderConfig) {
    // Carregar config do localStorage ou usar padrao
    const savedConfig = this.loadConfig();
    this.providerConfig = config || savedConfig || { provider: 'pollinations' };

    console.log(`Provider ativo: ${this.providerConfig.provider}`);
  }

  private loadConfig(): ProviderConfig | null {
    try {
      const saved = localStorage.getItem('tonmoves_image_provider');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  static saveConfig(config: ProviderConfig): void {
    localStorage.setItem('tonmoves_image_provider', JSON.stringify(config));
  }

  static getConfig(): ProviderConfig {
    try {
      const saved = localStorage.getItem('tonmoves_image_provider');
      return saved ? JSON.parse(saved) : { provider: 'pollinations' };
    } catch {
      return { provider: 'pollinations' };
    }
  }

  setProvider(config: ProviderConfig): void {
    this.providerConfig = config;
    ImageGenerator.saveConfig(config);
  }

  async generatePrompts(
    segments: AudioSegment[],
    musicTitle: string,
    theme: Theme = 'cinematic',
    audioAnalysis?: AudioAnalysis
  ): Promise<ImagePrompt[]> {
    console.log('Criando contexto visual...');
    this.globalContext = this.createGlobalContextFree(musicTitle, theme, audioAnalysis);

    const prompts: ImagePrompt[] = [];
    const subjects = SUBJECTS_BY_THEME[theme];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      // CORRECAO: Cada imagem tem prompt UNICO
      const prompt = this.createUniquePrompt(
        segment,
        i,
        theme,
        segments.length,
        subjects,
        audioAnalysis?.narrative
      );

      prompts.push({
        prompt,
        segment,
        index: i,
        globalContext: this.globalContext,
        narrativeContext: segment.narrativeAction
      });

      console.log(`Prompt ${i + 1}/${segments.length}: ${prompt.substring(0, 60)}...`);
    }

    return prompts;
  }

  // NOVO: Criar prompt unico para cada imagem
  private createUniquePrompt(
    segment: AudioSegment,
    index: number,
    theme: Theme,
    totalSegments: number,
    subjects: string[],
    narrative?: NarrativeAnalysis
  ): string {
    const themeStyle = THEME_STYLES[theme];
    const progress = index / totalSegments;

    // Selecionar subject unico (nao cicla, usa random com seed baseado no index)
    const subjectIndex = (index * 7 + 3) % subjects.length; // Distribuicao pseudo-aleatoria
    const subject = subjects[subjectIndex];

    // Selecionar variacao de cena unica
    const variationIndex = (index * 11 + 5) % SCENE_VARIATIONS.length;
    const variation = SCENE_VARIATIONS[variationIndex];

    // Adicionar numero da cena para garantir unicidade
    const sceneNumber = `scene ${index + 1} of ${totalSegments}`;

    // Mood baseado no segmento
    const moodWord = this.getMoodDescription(segment.mood);

    // Criar prompt unico
    let prompt = '';

    if (narrative && narrative.characters.length > 0) {
      const character = narrative.characters[index % narrative.characters.length];
      const action = segment.narrativeAction || this.getActionForProgress(progress);
      prompt = `${character} ${action}, ${subject}, ${variation}`;
    } else if (segment.transcription && segment.transcription.length > 5) {
      const words = segment.transcription.split(' ').slice(0, 5).join(' ');
      prompt = `Visual of "${words}", ${subject}, ${variation}`;
    } else {
      prompt = `${moodWord} ${subject}, ${variation}, ${sceneNumber}`;
    }

    // Adicionar estilo do tema (simplificado para evitar prompts muito longos)
    const shortKeywords = themeStyle.keywords.split(',').slice(0, 3).join(',');
    prompt += `, ${shortKeywords}`;

    return prompt;
  }

  private createGlobalContextFree(
    musicTitle: string,
    theme: Theme,
    audioAnalysis?: AudioAnalysis
  ): GlobalContext {
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

    const themeContexts: Record<Theme, GlobalContext> = {
      cinematic: {
        mainTheme: 'Epic cinematic visual journey',
        mood: 'dramatic, powerful, emotional',
        visualElements: ['landscapes', 'lighting', 'atmosphere'],
        colors: ['#1a1a2e', '#16213e', '#e94560'],
        atmosphere: 'grand cinematic experience'
      },
      neon: {
        mainTheme: 'Futuristic neon-lit adventure',
        mood: 'energetic, vibrant, electric',
        visualElements: ['neon', 'glow', 'cyber'],
        colors: ['#ff006e', '#8338ec', '#3a86ff'],
        atmosphere: 'electric cyberpunk world'
      },
      nature: {
        mainTheme: 'Natural landscape journey',
        mood: 'calm, peaceful, organic',
        visualElements: ['flora', 'fauna', 'elements'],
        colors: ['#2d6a4f', '#40916c', '#74c69d'],
        atmosphere: 'serene natural beauty'
      },
      abstract: {
        mainTheme: 'Abstract artistic exploration',
        mood: 'creative, dynamic, flowing',
        visualElements: ['shapes', 'colors', 'patterns'],
        colors: ['#f72585', '#7209b7', '#4361ee'],
        atmosphere: 'artistic expression'
      },
      minimal: {
        mainTheme: 'Minimalist visual study',
        mood: 'clean, elegant, simple',
        visualElements: ['forms', 'space', 'lines'],
        colors: ['#ffffff', '#f8f9fa', '#495057'],
        atmosphere: 'refined simplicity'
      },
      baby: {
        mainTheme: 'Colorful magical toy world',
        mood: 'joyful, playful, innocent',
        visualElements: ['toys', 'colors', 'magic'],
        colors: ['#FFB6D9', '#B4E7FF', '#FFF5BA'],
        atmosphere: 'magical cheerful wonderland'
      }
    };

    return themeContexts[theme];
  }

  private getActionForProgress(progress: number): string {
    if (progress < 0.2) return 'beginning the journey';
    if (progress < 0.4) return 'exploring the scene';
    if (progress < 0.6) return 'in the middle of action';
    if (progress < 0.8) return 'reaching the climax';
    return 'at the conclusion';
  }

  private getMoodDescription(mood: string): string {
    const descriptions: Record<string, string> = {
      calm: 'peaceful serene',
      energetic: 'dynamic vibrant',
      intense: 'powerful dramatic',
      dark: 'mysterious moody'
    };
    return descriptions[mood] || 'expressive';
  }

  private getMoodFromNarrative(narrative: NarrativeAnalysis): string {
    const story = narrative.story.toLowerCase();

    if (story.includes('fight') || story.includes('briga')) return 'dynamic, energetic';
    if (story.includes('love') || story.includes('amor')) return 'romantic, tender';
    if (story.includes('sad') || story.includes('triste')) return 'melancholic, emotional';

    return 'expressive, engaging';
  }

  private getColorsForTheme(theme: Theme): string[] {
    const colorPalettes: Record<Theme, string[]> = {
      cinematic: ['#1a1a2e', '#16213e', '#0f3460', '#e94560'],
      neon: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607'],
      nature: ['#2d6a4f', '#40916c', '#52b788', '#74c69d'],
      abstract: ['#f72585', '#7209b7', '#3a0ca3', '#4361ee'],
      minimal: ['#ffffff', '#f8f9fa', '#e9ecef', '#495057'],
      baby: ['#FFB6D9', '#B4E7FF', '#FFF5BA', '#FFCBC1']
    };

    return colorPalettes[theme];
  }

  async generateImage(prompt: string, theme: Theme = 'cinematic'): Promise<string> {
    const { provider, apiKey } = this.providerConfig;

    // Adicionar timestamp para evitar cache
    const uniquePrompt = `${prompt}, unique variation ${Date.now()}`;

    switch (provider) {
      case 'pexels':
        if (!apiKey) throw new Error('Pexels requer API key');
        return this.searchPexelsPhoto(prompt, theme, apiKey);

      case 'together':
        if (!apiKey) throw new Error('Together AI requer API key');
        return this.generateWithTogetherAI(uniquePrompt, apiKey);

      case 'openai':
        if (!apiKey) throw new Error('OpenAI requer API key');
        return this.generateWithOpenAI(uniquePrompt, apiKey);

      case 'gemini':
        if (!apiKey) throw new Error('Gemini requer API key');
        return this.generateWithGemini(uniquePrompt, apiKey);

      case 'pollinations':
      default:
        return this.generateWithPollinations(uniquePrompt);
    }
  }

  private async generateWithTogetherAI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt: prompt,
        width: 720,
        height: 1280,
        steps: 4,
        n: 1,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let message = `Together AI error: ${response.status}`;
      if (response.status === 401) {
        message += ' - Verifique sua API Key.';
      } else if (response.status >= 500) {
        message += ' - O serviço pode estar temporariamente fora do ar.';
      } else {
        message += ` - ${errorText}`;
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data.data?.[0]?.url) {
      throw new Error('Together AI: Resposta inválida, sem URL da imagem.');
    }
    return data.data[0].url;
  }

  private async generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1792',
        quality: 'standard',
      })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: 'Resposta de erro inválida' } }));
      let message = `OpenAI DALL-E error: ${response.status}`;
      if (response.status === 401) {
        message += ' - Verifique sua API Key.';
      } else if (response.status === 429) {
        message += ' - Limite de taxa excedido. Tente novamente mais tarde.';
      } else {
        message += ` - ${errorBody.error?.message || 'Erro desconhecido'}`;
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data.data?.[0]?.url) {
      throw new Error('OpenAI: Resposta inválida, sem URL da imagem.');
    }
    return data.data[0].url;
  }

  private async generateWithGemini(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '9:16',
          }
        })
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: { message: 'Resposta de erro inválida' } }));
      let message = `Gemini Imagen error: ${response.status}`;
      if (response.status === 400) {
        message += ' - API Key inválida ou problema na requisição.';
      } else if (response.status >= 500) {
        message += ' - O serviço do Google pode estar temporariamente fora do ar.';
      } else {
        message += ` - ${errorBody.error?.message || 'Erro desconhecido'}`;
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data.predictions?.[0]?.bytesBase64Encoded) {
      throw new Error('Gemini: Resposta inválida, sem imagem retornada.');
    }
    return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
  }

  private generateWithPollinations(prompt: string): string {
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=720&height=1280&nologo=true&model=flux`;
  }

  private async searchPexelsPhoto(prompt: string, theme: Theme, apiKey: string): Promise<string> {
    const keywords = this.extractKeywordsForPexels(prompt, theme);
    const query = encodeURIComponent(keywords);

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&orientation=portrait&per_page=15&size=large`,
      {
        headers: { 'Authorization': apiKey }
      }
    );

    if (!response.ok) {
      let message = `Pexels API error: ${response.status}`;
      if (response.status === 401) {
        message += ' - Verifique sua API Key do Pexels.';
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data.photos || data.photos.length === 0) {
      console.log(`Pexels: Nenhum resultado para "${keywords}", tentando tema "${theme}"...`);
      return this.searchPexelsFallback(theme, apiKey);
    }
    
    const randomIndex = Math.floor(Math.random() * data.photos.length);
    const photo = data.photos[randomIndex];
    return photo.src.portrait || photo.src.large || photo.src.original;
  }

  // Fallback: buscar por keywords do tema
  private async searchPexelsFallback(theme: Theme, apiKey: string): Promise<string> {
    const themeKeywords = PEXELS_KEYWORDS[theme];
    const randomKeyword = themeKeywords[Math.floor(Math.random() * themeKeywords.length)];
    const query = encodeURIComponent(randomKeyword);

    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&orientation=portrait&per_page=15&size=large`,
      {
        headers: {
          'Authorization': apiKey,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels fallback error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.photos || data.photos.length === 0) {
      // Ultimo fallback: fotos curadas
      return this.getPexelsCurated(apiKey);
    }

    const randomIndex = Math.floor(Math.random() * data.photos.length);
    return data.photos[randomIndex].src.portrait || data.photos[randomIndex].src.large;
  }

  // Ultimo fallback: fotos curadas do Pexels
  private async getPexelsCurated(apiKey: string): Promise<string> {
    const page = Math.floor(Math.random() * 10) + 1; // Paginas 1-10

    const response = await fetch(
      `https://api.pexels.com/v1/curated?per_page=15&page=${page}`,
      {
        headers: {
          'Authorization': apiKey,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels curated error: ${response.status}`);
    }

    const data = await response.json();
    const randomIndex = Math.floor(Math.random() * data.photos.length);
    return data.photos[randomIndex].src.portrait || data.photos[randomIndex].src.large;
  }

  // Extrair palavras-chave relevantes do prompt para busca no Pexels
  private extractKeywordsForPexels(prompt: string, theme: Theme): string {
    // Remover palavras comuns e manter apenas substantivos/adjetivos relevantes
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'scene', 'shot', 'view', 'image', 'visual', 'unique', 'variation', 'style', 'aesthetic',
      'cinematic', 'lighting', 'dramatic', 'vibrant', 'glow', 'mood', 'atmosphere',
      'de', 'da', 'do', 'para', 'com', 'em', 'uma', 'um', 'o', 'a', 'e'
    ];

    // Limpar e extrair palavras
    const words = prompt
      .toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    // Pegar as 3 primeiras palavras mais relevantes
    const relevantWords = words.slice(0, 3);

    // Se muito poucas palavras, adicionar keyword do tema
    if (relevantWords.length < 2) {
      const themeKeyword = PEXELS_KEYWORDS[theme][0];
      relevantWords.push(themeKeyword);
    }

    return relevantWords.join(' ');
  }
}

// Exportar funcao para buscar videos do Pexels (para uso no videoComposer)
export async function searchPexelsVideos(
  query: string,
  apiKey: string,
  count: number = 5
): Promise<{ url: string; duration: number }[]> {
  const response = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=${count}&size=medium`,
    {
      headers: {
        'Authorization': apiKey,
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Pexels Videos API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.videos || data.videos.length === 0) {
    throw new Error('Nenhum video encontrado no Pexels');
  }

  return data.videos.map((video: any) => {
    // Pegar o video file de melhor qualidade em HD
    const videoFile = video.video_files.find((f: any) => f.quality === 'hd' && f.height >= 720)
      || video.video_files[0];

    return {
      url: videoFile.link,
      duration: video.duration
    };
  });
}

// Buscar videos populares/curados do Pexels
export async function getPexelsPopularVideos(
  apiKey: string,
  count: number = 5
): Promise<{ url: string; duration: number }[]> {
  const response = await fetch(
    `https://api.pexels.com/videos/popular?per_page=${count}&min_duration=3&max_duration=30`,
    {
      headers: {
        'Authorization': apiKey,
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Pexels Popular Videos error: ${response.status}`);
  }

  const data = await response.json();

  return data.videos.map((video: any) => {
    const videoFile = video.video_files.find((f: any) => f.quality === 'hd') || video.video_files[0];
    return {
      url: videoFile.link,
      duration: video.duration
    };
  });
}
