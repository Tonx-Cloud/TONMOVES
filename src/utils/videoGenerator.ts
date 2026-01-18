/**
 * Video Generator - APIs de geração de vídeo com IA
 * Suporta: RunwayML Gen-4, Luma Dream Machine, Stability AI
 */

import { logger } from './logger';

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

// ===== RUNWAY ML GEN-4 =====
// Documentação: https://docs.dev.runwayml.com/api/

export async function generateVideoRunwayML(
  imageUrl: string,
  apiKey: string,
  options: VideoGenerationOptions = {}
): Promise<GeneratedVideo> {
  const { prompt = '', duration = 5, aspectRatio = '16:9' } = options;

  logger.video.starting('RunwayML', imageUrl);

  // Mapear aspect ratio para formato Runway
  const ratioMap: Record<string, string> = {
    '16:9': '1280:720',
    '9:16': '720:1280',
    '1:1': '960:960',
  };
  const ratio = ratioMap[aspectRatio] || '1280:720';

  // Verificar se a imagem é uma URL válida ou precisa ser convertida para base64
  let promptImageValue: string | { uri: string; position: string };

  if (imageUrl.startsWith('data:image/')) {
    // Já é base64
    promptImageValue = imageUrl;
  } else if (imageUrl.startsWith('https://')) {
    // URL HTTPS válida - usar formato de objeto com position
    promptImageValue = {
      uri: imageUrl,
      position: 'first',
    };
  } else if (imageUrl.startsWith('blob:')) {
    // Blob URL - precisa converter para base64
    logger.debug('VIDEO', 'Convertendo blob para base64...');
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    promptImageValue = base64;
  } else {
    const errorMsg = `RunwayML: Formato de imagem não suportado: ${imageUrl.substring(0, 50)}...`;
    logger.video.error(errorMsg, { imageUrl: imageUrl.substring(0, 100) });
    throw new Error(errorMsg);
  }

  // 1. Criar tarefa de geração
  // Endpoint correto: /v1/image_to_video (underscore, não hífen)
  const requestBody = {
    model: 'gen4_turbo',
    promptImage: promptImageValue,
    promptText: prompt || 'smooth cinematic motion, high quality, professional video',
    ratio: ratio,
    duration: Math.min(Math.max(duration, 2), 10), // 2-10 segundos
    seed: Math.floor(Math.random() * 4294967295),
  };

  logger.api.request('POST', 'https://api.dev.runwayml.com/v1/image_to_video', {
    model: requestBody.model,
    ratio: requestBody.ratio,
    duration: requestBody.duration,
    promptText: requestBody.promptText?.substring(0, 50),
  });

  const createResponse = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify(requestBody),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    logger.api.error('https://api.dev.runwayml.com/v1/image_to_video', createResponse.status, error);
    logger.video.error(`RunwayML erro: ${createResponse.status}`, { response: error });
    throw new Error(`RunwayML erro: ${createResponse.status} - ${error}`);
  }

  const createData = await createResponse.json();
  const taskId = createData.id;

  logger.video.taskCreated(taskId, 'RunwayML');

  // 2. Polling para verificar status (mínimo 5 segundos entre checks)
  let attempts = 0;
  const maxAttempts = 60; // 5 minutos máximo

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos

    const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
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
      logger.video.completed(taskId, statusData.output?.[0] || 'no-url');
      return {
        url: statusData.output[0],
        duration: duration,
        provider: 'runwayml',
      };
    } else if (statusData.status === 'FAILED') {
      const errorMsg = statusData.failure || statusData.failureCode || 'Erro desconhecido';
      logger.video.error(`RunwayML falhou: ${errorMsg}`, { taskId, statusData });
      throw new Error(`RunwayML falhou: ${errorMsg}`);
    }

    attempts++;
    logger.video.polling(taskId, attempts, statusData.status);
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

  logger.video.starting('Luma AI', imageUrl);

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
    logger.api.error('https://api.lumalabs.ai/dream-machine/v1/generations', createResponse.status, error);
    logger.video.error(`Luma AI erro: ${createResponse.status}`, { response: error });
    throw new Error(`Luma AI erro: ${createResponse.status} - ${error}`);
  }

  const createData = await createResponse.json();
  const generationId = createData.id;

  logger.video.taskCreated(generationId, 'Luma AI');

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
      logger.video.completed(generationId, statusData.assets?.video || 'no-url');
      return {
        url: statusData.assets.video,
        duration: 5, // Luma gera vídeos de ~5 segundos
        provider: 'lumaai',
      };
    } else if (statusData.state === 'failed') {
      const errorMsg = statusData.failure_reason || 'Erro desconhecido';
      logger.video.error(`Luma AI falhou: ${errorMsg}`, { generationId, statusData });
      throw new Error(`Luma AI falhou: ${errorMsg}`);
    }

    attempts++;
    logger.video.polling(generationId, attempts, statusData.state);
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
  logger.video.starting('Stability AI', imageUrl);

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
    logger.api.error('https://api.stability.ai/v2beta/image-to-video', createResponse.status, error);
    logger.video.error(`Stability AI erro: ${createResponse.status}`, { response: error });
    throw new Error(`Stability AI erro: ${createResponse.status} - ${error}`);
  }

  const createData = await createResponse.json();
  const generationId = createData.id;

  logger.video.taskCreated(generationId, 'Stability AI');

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
      logger.video.polling(generationId, attempts, 'processing');
      continue;
    }

    if (statusResponse.ok) {
      // Vídeo pronto - retorna o blob diretamente
      const videoBlob = await statusResponse.blob();
      const videoUrl = URL.createObjectURL(videoBlob);

      logger.video.completed(generationId, videoUrl);
      return {
        url: videoUrl,
        duration: 4, // Stability gera vídeos de ~4 segundos
        provider: 'stability',
      };
    }

    logger.api.error(`https://api.stability.ai/v2beta/image-to-video/result/${generationId}`, statusResponse.status, 'Status check failed');
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
