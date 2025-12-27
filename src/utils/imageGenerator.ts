import Groq from 'groq-sdk';
import type { AudioSegment } from './audioAnalyzer';

export interface ImagePrompt {
  prompt: string;
  segment: AudioSegment;
  index: number;
}

export class ImageGenerator {
  private groq: Groq;

  constructor(apiKey: string) {
    this.groq = new Groq({ 
      apiKey,
      dangerouslyAllowBrowser: true 
    });
  }

  async generatePrompts(
    segments: AudioSegment[],
    musicTitle: string
  ): Promise<ImagePrompt[]> {
    const prompts: ImagePrompt[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const prompt = await this.createPromptForSegment(segment, i, musicTitle);
      
      prompts.push({
        prompt,
        segment,
        index: i
      });
    }

    return prompts;
  }

  private async createPromptForSegment(
    segment: AudioSegment,
    index: number,
    musicTitle: string
  ): Promise<string> {
    const systemPrompt = `You are a visual artist creating scene descriptions for a music video.
Generate concise, vivid image prompts that match the music's mood and energy.
Keep prompts under 100 words. Focus on atmosphere, colors, and visual metaphors.`;

    const userPrompt = `Create a visual scene for segment ${index + 1} of "${musicTitle}":
- Mood: ${segment.mood}
- Energy level: ${(segment.energy * 100).toFixed(0)}%
- Time: ${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s

Generate a single image prompt that captures this moment.`;

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 150
      });

      return response.choices[0]?.message?.content || this.getFallbackPrompt(segment);
    } catch (error) {
      console.error('Error generating prompt with Groq:', error);
      return this.getFallbackPrompt(segment);
    }
  }

  private getFallbackPrompt(segment: AudioSegment): string {
    const moodPrompts = {
      calm: 'serene landscape with soft colors, peaceful atmosphere, gentle lighting',
      energetic: 'vibrant dynamic scene with bold colors, motion and energy',
      intense: 'dramatic powerful imagery with high contrast, strong emotions',
      dark: 'moody atmospheric scene with deep shadows, mysterious ambiance'
    };

    return moodPrompts[segment.mood];
  }

  async generateImage(prompt: string): Promise<string> {
    // Using Pollinations.ai - free AI image generation
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1280&height=720&nologo=true`;
  }
}
