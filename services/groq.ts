import Groq from "groq-sdk";
import { SceneDescription } from "../types";

// GROQ e 100% GRATUITO!
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

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
    prompt: "extremely colorful, vibrant rainbow colors, super cute kawaii style, baby toys, bright pink blue yellow orange green purple, playful cheerful mood, adorable cartoon style, soft rounded shapes, smiling characters, sparkles stars, fluffy clouds, bubbles, balloons, happy energy, cute animals, candy colors",
  },
};

export const analyzeAudio = async (
  audioBase64: string,
  mimeType: string,
  duration: number,
  style: string = 'cinematic'
): Promise<SceneDescription[]> => {
  const selectedStyle = VISUAL_STYLES[style as keyof typeof VISUAL_STYLES] || VISUAL_STYLES.cinematic;
  
  const prompt = `You are a creative video director. Create vivid visual scene descriptions for a music video.

Style: ${selectedStyle.name} - ${selectedStyle.description}
Visual Keywords: ${selectedStyle.prompt}

Return ONLY valid JSON array:
[
  {
    "timestamp": 0,
    "description": "Detailed visual with ${selectedStyle.name} style",
    "mood": "joyful/energetic/calm/playful/dramatic",
    "intensity": 0.8
  }
]

${style === 'baby' ? 'Make SUPER colorful with toys, animals, rainbows, stars!' : 'Create cinematic scenes.'}

Create 6 scenes:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You create visual scene descriptions. Respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.9,
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return generateDefaultScenes(selectedStyle, style);
  } catch (error) {
    console.error("GROQ error:", error);
    return generateDefaultScenes(selectedStyle, style);
  }
};

function generateDefaultScenes(selectedStyle: any, style: string): SceneDescription[] {
  const templates = style === 'baby' ? [
    { mood: "joyful", desc: "Colorful toy blocks floating in rainbow sky with smiling clouds" },
    { mood: "playful", desc: "Cute animals dancing on fluffy pink clouds with balloons" },
    { mood: "happy", desc: "Sparkling stars and bubbles surrounding cheerful baby toys" },
    { mood: "energetic", desc: "Vibrant carousel spinning with rainbow colors and confetti" },
    { mood: "cheerful", desc: "Adorable teddy bears playing in candy-colored wonderland" },
    { mood: "magical", desc: "Flying unicorns over pastel rainbow with twinkling stars" },
  ] : [
    { mood: "dramatic", desc: `${selectedStyle.prompt} - opening scene with impact` },
    { mood: "energetic", desc: `${selectedStyle.prompt} - dynamic movement` },
    { mood: "calm", desc: `${selectedStyle.prompt} - peaceful transition` },
    { mood: "intense", desc: `${selectedStyle.prompt} - climactic moment` },
    { mood: "reflective", desc: `${selectedStyle.prompt} - contemplative scene` },
    { mood: "uplifting", desc: `${selectedStyle.prompt} - triumphant finale` },
  ];

  return templates.map((t, i) => ({
    timestamp: i * 10,
    description: t.desc,
    mood: t.mood,
    intensity: 0.7 + (Math.random() * 0.3),
  }));
}

export default { analyzeAudio, VISUAL_STYLES };
