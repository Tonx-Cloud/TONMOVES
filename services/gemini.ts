import { GoogleGenAI } from "@google/genai";
import { SceneDescription } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const PRICING = {
  AUDIO_ANALYSIS: 0.010,
  IMAGE_PRO: 0.040,
  IMAGE_FLASH: 0.002,
  VIDEO_5S: 0.050,
  VIDEO_10S: 0.100,
};

export const VISUAL_STYLES = {
  cinematic: {
    name: "Cinematic",
    emoji: "ðŸŽ¬",
    description: "Estilo cinematografico com cores vibrantes e dramaticas",
    prompt: "cinematic lighting, dramatic colors, film grain, high contrast, professional cinematography",
  },
  neon: {
    name: "Neon",
    emoji: "ðŸ’œ",
    description: "Luzes neon vibrantes, cyberpunk, futurista",
    prompt: "neon lights, vibrant glowing colors, cyberpunk aesthetic, futuristic city",
  },
  nature: {
    name: "Nature",
    emoji: "ðŸŒ¿",
    description: "Natureza, paisagens organicas, verde exuberante",
    prompt: "natural lighting, organic landscapes, lush greenery, peaceful nature scenes",
  },
  abstract: {
    name: "Abstract",
    emoji: "ðŸŽ¨",
    description: "Formas abstratas, cores vibrantes, arte moderna",
    prompt: "abstract art, geometric shapes, vibrant colors, modern art style",
  },
  minimal: {
    name: "Minimal",
    emoji: "âšª",
    description: "Minimalista, clean, espacos vazios, elegante",
    prompt: "minimalist design, clean lines, negative space, elegant simplicity",
  },
  baby: {
    name: "Baby",
    emoji: "ðŸ‘¶",
    description: "Super colorido, fofo, alegre - perfeito para criancas!",
    prompt: "extremely colorful, vibrant rainbow colors, super cute kawaii style, baby toys aesthetic, bright pink blue yellow orange green purple, playful cheerful mood, adorable cartoon style, soft rounded shapes, smiling characters, sparkles stars, fluffy clouds, bubbles, balloons, happy energy, cute animals, candy colors",
  },
};

export const analyzeAudio = async (
  audioBase64: string,
  mimeType: string,
  duration: number,
  style: string = 'cinematic'
): Promise<SceneDescription[]> => {
  const ai = getAI();
  const selectedStyle = VISUAL_STYLES[style as keyof typeof VISUAL_STYLES] || VISUAL_STYLES.cinematic;
  
  const prompt = `Analyze this audio and create visual scene descriptions.
Style: ${selectedStyle.name}
Keywords: ${selectedStyle.prompt}

Return ONLY valid JSON array:
[{"timestamp": 0, "description": "...", "mood": "...", "intensity": 0.8}]

Create 5-8 scenes matching ${selectedStyle.name} style.`;

  const result = await ai.models.generate({
    model: "gemini-2.0-flash-exp",
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: prompt }
      ]
    }]
  });

  const text = result.response.text();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error("Could not parse scenes");
};

export default { analyzeAudio, VISUAL_STYLES, PRICING };
