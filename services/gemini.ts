
import { GoogleGenAI, Type } from "@google/genai";
import { SceneDescription } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const PRICING = {
  AUDIO_ANALYSIS: 0.010,
  IMAGE_PRO: 0.040,
  IMAGE_FLASH: 0.002,
  IMAGE_FREE: 0.000,
  VEO_VIDEO: 0.150
};

export const VISUAL_STYLES = {
  cinematic: "Cinematic music video, 35mm lens, professional color grading, anamorphic flares",
  cyberpunk: "Cyberpunk aesthetic, neon lighting, rainy atmosphere, high-tech noir, blade runner style",
  vintage: "1970s vintage film grain, warm Kodak colors, retro cinematic lighting, nostalgic",
  anime: "High-end modern anime style, Makoto Shinkai aesthetics, vibrant sky, detailed backgrounds",
  baby: "Extremely vibrant and colorful, cute 3D Pixar-style characters, toddler-friendly whimsical world, playful and bright, high contrast shapes"
};

// Helper para limpar blocos de código markdown que a IA possa retornar
const cleanJSON = (text: string) => {
  return text.replace(/```json\n?|```/g, '').trim();
};

export const analyzeAudio = async (audioBase64: string, mimeType: string, duration: number, style: string = 'cinematic'): Promise<SceneDescription[]> => {
  const ai = getAI();
  const stylePrompt = VISUAL_STYLES[style as keyof typeof VISUAL_STYLES] || VISUAL_STYLES.cinematic;

  // ESTRATÉGIA DE FALLBACK BLINDADA:
  // 1. Tenta Gemini 3 Flash (Mais inteligente)
  // 2. Tenta Gemini 2.5 Flash Latest (Mais estável para áudio)
  // 3. Tenta Gemini Flash Latest (Genérico, última linha de defesa)
  const modelsToTry = ['gemini-3-flash-preview', 'gemini-2.5-flash-latest', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    // Tenta até 2 vezes por modelo para superar instabilidades de servidor (Erro 500/503)
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            console.log(`Tentando análise com modelo: ${model} (Tentativa ${attempt + 1})`);
            
            const response = await ai.models.generateContent({
                model: model,
                contents: [
                {
                    parts: [
                    { inlineData: { data: audioBase64, mimeType: mimeType } },
                    { text: `Aja como um Diretor de Videoclipes Master. Analise este áudio de ${duration.toFixed(0)} segundos.
                        CONTEXTO VISUAL: O estilo será "${stylePrompt}".
                        REGRA: Crie uma nova cena a cada 5 segundos.
                        Retorne JSON: Array de {t: string (MM:SS), p: string (English prompt), f: string (Descrição PT-BR)}.` }
                    ]
                }
                ],
                config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                    type: Type.OBJECT,
                    properties: {
                        t: { type: Type.STRING },
                        p: { type: Type.STRING },
                        f: { type: Type.STRING }
                    },
                    required: ["t", "p", "f"]
                    }
                }
                }
            });

            if (!response.text) throw new Error("Resposta vazia da IA");

            // Limpa Markdown antes de parsear para evitar erro de sintaxe JSON
            const cleanText = cleanJSON(response.text);
            const parsed = JSON.parse(cleanText);
            
            return parsed.map((scene: any, index: number) => ({
                id: `scene-${index}-${Date.now()}`,
                timestamp: scene.t,
                description: scene.f,
                visualPrompt: scene.p,
                mood: ""
            }));

        } catch (e: any) {
            const errorMsg = e.message || '';
            const isServerError = errorMsg.includes('500') || errorMsg.includes('503') || errorMsg.includes('Internal error') || errorMsg.includes('overloaded');
            
            // Se for erro de servidor e for a primeira tentativa, espera e tenta de novo
            if (isServerError && attempt === 0) {
                console.warn(`⚠️ Instabilidade no modelo ${model}. Aguardando 2s para retry...`);
                await new Promise(r => setTimeout(r, 2000));
                continue; // Tenta o mesmo modelo novamente
            }

            console.warn(`⚠️ Falha definitiva com ${model}: ${errorMsg}`);
            lastError = e;
            // Break do loop de tentativas para ir para o próximo modelo da lista
            break; 
        }
    }
    // Pequeno delay antes de trocar de modelo para evitar rate limit global
    if (modelsToTry.indexOf(model) < modelsToTry.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Se chegou aqui, todos os modelos falharam em todas as tentativas
  throw new Error(`Falha crítica na análise. O Google AI pode estar instável no momento. Detalhe: ${lastError?.message || 'Erro desconhecido'}`);
};

export const generateSceneImage = async (
  prompt: string, 
  style: string = 'cinematic', 
  attempt: number = 0, 
  modelName?: string, 
  aspectRatio: "16:9" | "9:16" = "16:9"
): Promise<{ url: string, model: string, cost: number }> => {
  // --- TIER GRATUITO (FREE) ---
  if (modelName === 'free-tier') {
     try {
       const width = aspectRatio === '16:9' ? 1280 : 720;
       const height = aspectRatio === '16:9' ? 720 : 1280;
       const seed = Math.floor(Math.random() * 100000);
       const styleBase = VISUAL_STYLES[style as keyof typeof VISUAL_STYLES] || VISUAL_STYLES.cinematic;
       
       // Usa Pollinations.ai (Flux Model) que é gratuito e ilimitado
       const encodedPrompt = encodeURIComponent(`${styleBase} ${prompt}`);
       const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
       
       const response = await fetch(imageUrl);
       const blob = await response.blob();
       
       return new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.onloadend = () => resolve({
           url: reader.result as string,
           model: 'Free (Pollinations)',
           cost: PRICING.IMAGE_FREE
         });
         reader.onerror = reject;
         reader.readAsDataURL(blob);
       });
     } catch (err: any) {
        throw new Error(`Erro Free Tier: ${err.message}`);
     }
  }

  // --- TIERS PAGOS (GEMINI) ---
  const ai = getAI();
  const currentModel = modelName || 'gemini-2.5-flash-image';
  const currentCost = currentModel.includes('pro') ? PRICING.IMAGE_PRO : PRICING.IMAGE_FLASH;
  const styleBase = VISUAL_STYLES[style as keyof typeof VISUAL_STYLES] || VISUAL_STYLES.cinematic;

  try {
    const response = await ai.models.generateContent({
      model: currentModel,
      contents: {
        parts: [{ text: `${styleBase}. ${prompt}. High quality, NO TEXT.` }]
      },
      config: {
        imageConfig: { aspectRatio }
      }
    });

    if (response.candidates[0].content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return {
            url: `data:image/png;base64,${part.inlineData.data}`,
            model: currentModel,
            cost: currentCost
          };
        }
      }
    }
    throw new Error("Parte da imagem não encontrada.");
  } catch (err: any) {
    if (attempt < 1 && !modelName) return generateSceneImage(prompt, style, attempt + 1, 'gemini-3-pro-image-preview', aspectRatio);
    throw new Error(err.message);
  }
};

export const generateSceneVideo = async (imageBase64: string, prompt: string, aspectRatio: "16:9" | "9:16" = "16:9"): Promise<string> => {
  const ai = getAI();
  const base64Data = imageBase64.split(',')[1] || imageBase64;
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic animation: ${prompt}`,
      image: { imageBytes: base64Data, mimeType: 'image/png' },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err: any) {
    throw new Error(`Erro Veo: ${err.message}`);
  }
};
