/**
 * Video Generator - APIs de geração de vídeo com IA
 * Suporta: RunwayML Gen-3, Luma Dream Machine, Stability AI
 */

export type VideoAIProvider = 'runwayml' | 'lumaai' | 'stability';

export interface GeneratedVideo {
  url: string;
  duration: number;
  provider: VideoAIProvider;
}

export interface VideoGenerationOptions {
  prompt?: string;
  duration?: number; // em segundos
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

// ===== RUNWAY ML GEN-3 =====
// Documentação: https://docs.runwayml.com/

export async function generateVideoRunwayML(
  imageUrl: string,
  apiKey: string,
  options: VideoGenerationOptions = {}
): Promise<GeneratedVideo> {
  const { prompt = '', duration = 4 } = options;

  console.log('🎬 RunwayML: Iniciando geração de vídeo...');

  // 1. Criar tarefa de geração
  const createResponse = await fetch('https://api.runwayml.com/v1/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      promptImage: imageUrl,
      promptText: prompt || 'smooth cinematic motion, high quality',
      duration: duration, // 5 ou 10 segundos
      watermark: false,
      seed: Math.floor(Math.random() * 1000000),
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`RunwayML erro: ${createResponse.status} - ${error}`);
  }

  const createData = await createResponse.json();
  const taskId = createData.id;

  console.log(`🎬 RunwayML: Tarefa criada (${taskId}), aguardando...`);

  // 2. Polling para verificar status
  let attempts = 0;
  const maxAttempts = 60; // 5 minutos máximo

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos

    const statusResponse = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`RunwayML status erro: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status === 'SUCCEEDED') {
      console.log('✅ RunwayML: Vídeo gerado com sucesso!');
      return {
        url: statusData.output[0],
        duration: duration,
        provider: 'runwayml',
      };
    } else if (statusData.status === 'FAILED') {
      throw new Error(`RunwayML falhou: ${statusData.failure || 'Erro desconhecido'}`);
    }

    attempts++;
    console.log(`⏳ RunwayML: Aguardando... (${attempts}/${maxAttempts})`);
  }

  throw new Error('RunwayML timeout: Geração demorou muito');
}

// ===== LUMA AI DREAM MACHINE =====
// Documentação: https://docs.lumalabs.ai/

export async function generateVideoLumaAI(
  imageUrl: string,
  apiKey: string,
  options: VideoGenerationOptions = {}
): Promise<GeneratedVideo> {
  const { prompt = '', aspectRatio = '16:9' } = options;

  console.log('🌙 Luma AI: Iniciando geração de vídeo...');

  // 1. Criar geração
  const createResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt || 'cinematic smooth motion, high quality video',
      keyframes: {
        frame0: {
          type: 'image',
          url: imageUrl,
        },
      },
      aspect_ratio: aspectRatio,
      loop: false,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Luma AI erro: ${createResponse.status} - ${error}`);
  }

  const createData = await createResponse.json();
  const generationId = createData.id;

  console.log(`🌙 Luma AI: Geração criada (${generationId}), aguardando...`);

  // 2. Polling para verificar status
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Luma AI status erro: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.state === 'completed') {
      console.log('✅ Luma AI: Vídeo gerado com sucesso!');
      return {
        url: statusData.assets.video,
        duration: 5, // Luma gera vídeos de ~5 segundos
        provider: 'lumaai',
      };
    } else if (statusData.state === 'failed') {
      throw new Error(`Luma AI falhou: ${statusData.failure_reason || 'Erro desconhecido'}`);
    }

    attempts++;
    console.log(`⏳ Luma AI: Aguardando... (${attempts}/${maxAttempts})`);
  }

  throw new Error('Luma AI timeout: Geração demorou muito');
}

// ===== STABILITY AI - STABLE VIDEO DIFFUSION =====
// Documentação: https://platform.stability.ai/docs/api-reference

export async function generateVideoStabilityAI(
  imageUrl: string,
  apiKey: string,
  options: VideoGenerationOptions = {}
): Promise<GeneratedVideo> {
  console.log('🎞️ Stability AI: Iniciando geração de vídeo...');

  // 1. Baixar a imagem e converter para base64
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  const imageBase64 = await blobToBase64(imageBlob);

  // 2. Criar geração de vídeo
  const formData = new FormData();
  formData.append('image', dataURItoBlob(imageBase64), 'image.png');
  formData.append('seed', '0');
  formData.append('cfg_scale', '2.5');
  formData.append('motion_bucket_id', '40');

  const createResponse = await fetch('https://api.stability.ai/v2beta/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Stability AI erro: ${createResponse.status} - ${error}`);
  }

  const createData = await createResponse.json();
  const generationId = createData.id;

  console.log(`🎞️ Stability AI: Geração criada (${generationId}), aguardando...`);

  // 3. Polling para verificar status
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(`https://api.stability.ai/v2beta/image-to-video/result/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'video/*',
      },
    });

    if (statusResponse.status === 202) {
      // Ainda processando
      attempts++;
      console.log(`⏳ Stability AI: Aguardando... (${attempts}/${maxAttempts})`);
      continue;
    }

    if (statusResponse.ok) {
      // Vídeo pronto - retorna o blob diretamente
      const videoBlob = await statusResponse.blob();
      const videoUrl = URL.createObjectURL(videoBlob);

      console.log('✅ Stability AI: Vídeo gerado com sucesso!');
      return {
        url: videoUrl,
        duration: 4, // Stability gera vídeos de ~4 segundos
        provider: 'stability',
      };
    }

    throw new Error(`Stability AI status erro: ${statusResponse.status}`);
  }

  throw new Error('Stability AI timeout: Geração demorou muito');
}

// ===== FUNÇÃO PRINCIPAL =====
export async function generateVideoFromImage(
  imageUrl: string,
  provider: VideoAIProvider,
  apiKey: string,
  options: VideoGenerationOptions = {}
): Promise<GeneratedVideo> {
  switch (provider) {
    case 'runwayml':
      return generateVideoRunwayML(imageUrl, apiKey, options);
    case 'lumaai':
      return generateVideoLumaAI(imageUrl, apiKey, options);
    case 'stability':
      return generateVideoStabilityAI(imageUrl, apiKey, options);
    default:
      throw new Error(`Provider desconhecido: ${provider}`);
  }
}

// ===== HELPERS =====
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

// ===== VERIFICAR DISPONIBILIDADE =====
export function isVideoAIAvailable(provider: VideoAIProvider, apiKey: string): boolean {
  return !!apiKey && apiKey.length > 10;
}

// ===== ESTIMATIVA DE CUSTO =====
export function estimateCost(provider: VideoAIProvider, count: number): string {
  const costs: Record<VideoAIProvider, number> = {
    runwayml: 0.05, // ~$0.05 por segundo de vídeo
    lumaai: 0.03,   // ~$0.03 por geração
    stability: 0.02, // ~$0.02 por geração
  };

  const total = costs[provider] * count;
  return `~$${total.toFixed(2)}`;
}
