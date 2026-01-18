import { logger } from './logger';

export interface AudioSegment {
  startTime: number;
  endTime: number;
  energy: number;
  dominantFrequency: number;
  mood: 'calm' | 'energetic' | 'intense' | 'dark';
  transcription?: string;
  narrativeAction?: string;
}

export interface AudioAnalysis {
  bpm: number;
  energy: number;
  duration: number;
  segments: AudioSegment[];
  fullTranscription?: string;
  narrative?: NarrativeAnalysis;
}

export interface NarrativeAnalysis {
  story: string;
  characters: string[];
  setting: string;
  keyMoments: {
    time: number;
    description: string;
  }[];
}

export type TranscriptionProvider = 'disabled' | 'filename' | 'groq' | 'openai';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;

  async analyzeAudio(
    audioFile: File,
    options: {
      transcribe?: boolean;
      analyzeNarrative?: boolean;
      useFilename?: boolean;
      transcriptionProvider?: TranscriptionProvider;
      transcriptionApiKey?: string;
    } = {}
  ): Promise<AudioAnalysis> {
    try {
      this.audioContext = new AudioContext();

      // Decode audio
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Analyze audio properties
      const analysis = this.analyzeAudioBuffer(audioBuffer);

      // ✅ GRÁTIS: Usar nome do arquivo para contexto
      if (options.useFilename) {
        const filenameContext = this.extractContextFromFilename(audioFile.name);
        if (filenameContext) {
          analysis.narrative = filenameContext;
          analysis.fullTranscription = `[Contexto do arquivo: ${audioFile.name}]`;
        }
      }

      // Transcrever com o provider selecionado
      if (options.transcribe && options.transcriptionProvider && options.transcriptionProvider !== 'disabled' && options.transcriptionProvider !== 'filename') {
        // Validar API key
        const apiKey = options.transcriptionApiKey?.trim();
        if (!apiKey || apiKey.length < 10) {
          const errorMsg = `API Key do ${options.transcriptionProvider === 'groq' ? 'Groq' : 'OpenAI'} não configurada ou inválida. Vá em Configurações e insira uma API Key válida.`;
          logger.error('TRANSCRIPTION', errorMsg);
          throw new Error(errorMsg);
        }

        try {
          let transcription = '';

          if (options.transcriptionProvider === 'groq') {
            logger.info('TRANSCRIPTION', 'Iniciando transcrição com Groq Whisper...', {
              fileSize: `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`,
              fileName: audioFile.name,
            });
            transcription = await this.transcribeWithGroq(audioFile, apiKey);
          } else if (options.transcriptionProvider === 'openai') {
            logger.info('TRANSCRIPTION', 'Iniciando transcrição com OpenAI Whisper...', {
              fileSize: `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`,
              fileName: audioFile.name,
            });
            transcription = await this.transcribeWithOpenAI(audioFile, apiKey);
          }

          if (transcription) {
            logger.info('TRANSCRIPTION', 'Transcrição concluída', {
              length: transcription.length,
              preview: transcription.substring(0, 100),
            });
            analysis.fullTranscription = transcription;
            analysis.segments = this.addTranscriptionToSegments(
              analysis.segments,
              transcription,
              analysis.duration
            );
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('TRANSCRIPTION', 'Erro na transcrição', errorMessage, {
            provider: options.transcriptionProvider,
            fileSize: audioFile.size,
          });

          // Re-throw com mensagem amigável
          if (errorMessage.includes('401') || errorMessage.includes('invalid_api_key') || errorMessage.includes('Invalid API Key')) {
            throw new Error(`❌ API Key do ${options.transcriptionProvider === 'groq' ? 'Groq' : 'OpenAI'} inválida. Verifique sua chave em Configurações.`);
          } else if (errorMessage.includes('429')) {
            throw new Error(`⏳ Limite de requisições excedido. Aguarde alguns minutos e tente novamente.`);
          } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
            throw new Error(`📁 Arquivo muito grande para transcrição. Máximo: 25MB para Groq/OpenAI.`);
          }
          throw error;
        }
      }

      // ✅ GRÁTIS: Análise simples de narrativa (sem IA)
      if (options.analyzeNarrative && analysis.fullTranscription) {
        analysis.narrative = this.analyzeNarrativeSimple(
          analysis.fullTranscription,
          audioFile.name
        );
        
        analysis.segments = this.addNarrativeActionsToSegments(
          analysis.segments,
          analysis.narrative
        );
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing audio:', error);
      throw error;
    }
  }

  // ✅ GRÁTIS: Extrair contexto do nome do arquivo
  private extractContextFromFilename(filename: string): NarrativeAnalysis | null {
    const name = filename.toLowerCase()
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ');

    // Detectar palavras-chave
    const keywords = {
      animals: ['gato', 'cat', 'cachorro', 'dog', 'passaro', 'bird', 'animal'],
      food: ['queijo', 'cheese', 'pao', 'bread', 'comida', 'food'],
      emotions: ['amor', 'love', 'triste', 'sad', 'feliz', 'happy'],
      actions: ['briga', 'fight', 'danca', 'dance', 'corre', 'run'],
      numbers: ['dois', 'two', 'tres', 'three', 'um', 'one']
    };

    const detected: string[] = [];
    
    // Buscar palavras-chave
    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (name.includes(word)) {
          detected.push(word);
        }
      }
    }

    if (detected.length === 0) return null;

    // Criar narrativa baseada em palavras detectadas
    const hasAnimals = detected.some(w => keywords.animals.includes(w));
    const hasFood = detected.some(w => keywords.food.includes(w));
    const hasAction = detected.some(w => keywords.actions.includes(w));

    if (hasAnimals && hasFood && hasAction) {
      return {
        story: `Story about animals and food with action`,
        characters: detected.filter(w => keywords.animals.includes(w) || keywords.numbers.includes(w)),
        setting: 'everyday scenario',
        keyMoments: [
          { time: 0.0, description: 'Introduction of characters' },
          { time: 0.3, description: 'Discovery of food' },
          { time: 0.6, description: 'Action begins' },
          { time: 1.0, description: 'Resolution' }
        ]
      };
    }

    return {
      story: `Musical story featuring: ${detected.join(', ')}`,
      characters: detected,
      setting: 'musical setting',
      keyMoments: [
        { time: 0.0, description: 'Beginning' },
        { time: 0.5, description: 'Middle' },
        { time: 1.0, description: 'End' }
      ]
    };
  }

  // ✅ GRÁTIS: Web Speech API (funciona no Chrome/Edge)
  private async transcribeWithWebSpeech(audioFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if Web Speech API is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      // Create audio element to play the file
      const audio = new Audio(URL.createObjectURL(audioFile));
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'pt-BR';  // Português do Brasil
      
      let transcript = '';
      let startTime: number;

      recognition.onstart = () => {
        console.log('🎤 Transcrição iniciada...');
        startTime = Date.now();
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        reject(new Error(event.error));
      };

      recognition.onend = () => {
        const elapsed = Date.now() - startTime;
        console.log(`✅ Transcrição finalizada em ${elapsed}ms`);
        resolve(transcript.trim());
      };

      // Start recognition and play audio
      audio.play().then(() => {
        recognition.start();
        
        // Stop when audio ends
        audio.onended = () => {
          setTimeout(() => {
            recognition.stop();
          }, 500);
        };
      }).catch(reject);
    });
  }

  // Groq Whisper API (gratuito)
  private async transcribeWithGroq(audioFile: File, apiKey: string): Promise<string> {
    logger.api.request('POST', 'https://api.groq.com/openai/v1/audio/transcriptions', {
      model: 'whisper-large-v3',
      language: 'pt',
      fileSize: `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`,
      apiKeyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
    });

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'pt'); // Portugues
    formData.append('response_format', 'json');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.api.error('https://api.groq.com/openai/v1/audio/transcriptions', response.status, errorText);

      // Parse error para mensagem mais clara
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error?.message || errorText;
      } catch {}

      if (response.status === 401) {
        throw new Error(`Groq API Key inválida. Verifique se a chave está correta em console.groq.com`);
      }
      throw new Error(`Groq API error: ${response.status} - ${errorDetail}`);
    }

    const data = await response.json();
    logger.info('TRANSCRIPTION', 'Groq Whisper concluído', {
      textLength: data.text?.length || 0,
      preview: data.text?.substring(0, 100),
    });
    return data.text || '';
  }

  // OpenAI Whisper API (pago)
  private async transcribeWithOpenAI(audioFile: File, apiKey: string): Promise<string> {
    logger.api.request('POST', 'https://api.openai.com/v1/audio/transcriptions', {
      model: 'whisper-1',
      language: 'pt',
      fileSize: `${(audioFile.size / 1024 / 1024).toFixed(2)} MB`,
      apiKeyPreview: `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`,
    });

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt'); // Portugues
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.api.error('https://api.openai.com/v1/audio/transcriptions', response.status, errorText);

      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error?.message || errorText;
      } catch {}

      if (response.status === 401) {
        throw new Error(`OpenAI API Key inválida. Verifique se a chave está correta em platform.openai.com`);
      }
      throw new Error(`OpenAI API error: ${response.status} - ${errorDetail}`);
    }

    const data = await response.json();
    logger.info('TRANSCRIPTION', 'OpenAI Whisper concluído', {
      textLength: data.text?.length || 0,
      preview: data.text?.substring(0, 100),
    });
    return data.text || '';
  }

  // Análise narrativa simples (sem IA)
  private analyzeNarrativeSimple(
    transcription: string,
    filename: string
  ): NarrativeAnalysis {
    const text = transcription.toLowerCase();
    
    // Detectar personagens (substantivos comuns)
    const commonCharacters = [
      'gato', 'gata', 'gatinho', 'cat',
      'cachorro', 'dog', 'passaro', 'bird',
      'menino', 'menina', 'crianca', 'boy', 'girl',
      'homem', 'mulher', 'man', 'woman',
      'rei', 'rainha', 'king', 'queen'
    ];
    
    const characters: string[] = [];
    for (const char of commonCharacters) {
      if (text.includes(char)) {
        characters.push(char);
      }
    }

    // Detectar números (dois, três, etc)
    const numbers = ['um', 'dois', 'tres', 'quatro', 'cinco', 'one', 'two', 'three'];
    for (const num of numbers) {
      if (text.includes(num)) {
        characters.push(num);
      }
    }

    // Detectar objetos importantes
    const objects = [
      'queijo', 'cheese', 'pao', 'bread',
      'bola', 'ball', 'casa', 'house'
    ];
    
    for (const obj of objects) {
      if (text.includes(obj)) {
        characters.push(obj);
      }
    }

    // Detectar ações
    const actions = [
      'briga', 'brigou', 'fight',
      'danca', 'dancou', 'dance',
      'corre', 'correu', 'run',
      'pula', 'pulou', 'jump',
      'come', 'comeu', 'eat'
    ];
    
    let mainAction = 'interact';
    for (const action of actions) {
      if (text.includes(action)) {
        mainAction = action;
        break;
      }
    }

    // Detectar cenário
    const settings = [
      'casa', 'home', 'rua', 'street',
      'floresta', 'forest', 'praia', 'beach',
      'cidade', 'city', 'campo', 'field'
    ];
    
    let setting = 'outdoor setting';
    for (const set of settings) {
      if (text.includes(set)) {
        setting = set;
        break;
      }
    }

    // Criar história resumida
    const story = characters.length > 0
      ? `Story about ${characters.slice(0, 3).join(', ')} ${mainAction} in ${setting}`
      : `Musical narrative in ${setting}`;

    return {
      story,
      characters: [...new Set(characters)].slice(0, 5),
      setting,
      keyMoments: [
        { time: 0.0, description: `Characters: ${characters.join(', ')}` },
        { time: 0.33, description: `Action: ${mainAction}` },
        { time: 0.66, description: `Conflict develops` },
        { time: 1.0, description: `Resolution` }
      ]
    };
  }

  private analyzeAudioBuffer(audioBuffer: AudioBuffer): AudioAnalysis {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;

    const bpm = this.detectBPM(channelData, sampleRate);

    let totalEnergy = 0;
    for (let i = 0; i < channelData.length; i++) {
      totalEnergy += Math.abs(channelData[i]);
    }
    const energy = totalEnergy / channelData.length;

    const segmentDuration = 5;
    const segments: AudioSegment[] = [];
    const numSegments = Math.ceil(duration / segmentDuration);

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, duration);
      const segment = this.analyzeSegment(
        channelData,
        sampleRate,
        startTime,
        endTime
      );
      segments.push(segment);
    }

    return {
      bpm,
      energy,
      duration,
      segments
    };
  }

  private analyzeSegment(
    channelData: Float32Array,
    sampleRate: number,
    startTime: number,
    endTime: number
  ): AudioSegment {
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);

    let segmentEnergy = 0;
    let dominantFrequency = 0;

    for (let i = startSample; i < endSample && i < channelData.length; i++) {
      segmentEnergy += Math.abs(channelData[i]);
    }

    const numSamples = endSample - startSample;
    segmentEnergy = numSamples > 0 ? segmentEnergy / numSamples : 0;
    dominantFrequency = segmentEnergy > 0.1 ? 200 : 100;

    let mood: AudioSegment['mood'];
    if (segmentEnergy < 0.05) mood = 'calm';
    else if (segmentEnergy < 0.15) mood = 'energetic';
    else if (segmentEnergy < 0.25) mood = 'intense';
    else mood = 'dark';

    return {
      startTime,
      endTime,
      energy: segmentEnergy,
      dominantFrequency,
      mood
    };
  }

  private detectBPM(channelData: Float32Array, sampleRate: number): number {
    const windowSize = Math.floor(sampleRate * 0.1);
    let maxEnergy = 0;
    let peakCount = 0;

    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += Math.abs(channelData[i + j]);
      }
      if (energy > maxEnergy * 0.7) {
        peakCount++;
        maxEnergy = Math.max(maxEnergy, energy);
      }
    }

    const duration = channelData.length / sampleRate;
    return Math.round((peakCount / duration) * 60);
  }

  private addTranscriptionToSegments(
    segments: AudioSegment[],
    fullTranscription: string,
    duration: number
  ): AudioSegment[] {
    const words = fullTranscription.split(/\s+/);
    const wordsPerSegment = Math.ceil(words.length / segments.length);

    return segments.map((segment, index) => {
      const startWord = index * wordsPerSegment;
      const endWord = Math.min((index + 1) * wordsPerSegment, words.length);
      const segmentWords = words.slice(startWord, endWord);

      return {
        ...segment,
        transcription: segmentWords.join(' ')
      };
    });
  }

  private addNarrativeActionsToSegments(
    segments: AudioSegment[],
    narrative: NarrativeAnalysis
  ): AudioSegment[] {
    return segments.map((segment, index) => {
      const progress = index / segments.length;
      
      let closestMoment = narrative.keyMoments[0];
      let minDiff = Math.abs(progress - (closestMoment?.time || 0));

      for (const moment of narrative.keyMoments) {
        const diff = Math.abs(progress - moment.time);
        if (diff < minDiff) {
          minDiff = diff;
          closestMoment = moment;
        }
      }

      return {
        ...segment,
        narrativeAction: closestMoment?.description || ''
      };
    });
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
