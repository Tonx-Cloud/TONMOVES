/**
 * Logger Utility - Sistema de logging detalhado para debugging
 *
 * USO:
 * import { logger } from './utils/logger';
 * logger.info('Mensagem', { dados: valor });
 * logger.error('Erro', error, { contexto: 'valor' });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error | string;
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#9ca3af',
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
};

const LOG_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '📘',
  warn: '⚠️',
  error: '❌',
};

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;
  private enabled = true;

  private formatTimestamp(): string {
    const now = new Date();
    return `${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  }

  private log(level: LogLevel, category: string, message: string, data?: any, error?: Error | string): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      category,
      message,
      data,
      error: error instanceof Error ? error.message : error,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const icon = LOG_ICONS[level];
    const color = LOG_COLORS[level];
    const prefix = `[${entry.timestamp}] ${icon} [${category}]`;

    if (level === 'error') {
      console.error(
        `%c${prefix}%c ${message}`,
        `color: ${color}; font-weight: bold`,
        'color: inherit',
        data ? data : '',
        error ? `\n${error}` : ''
      );
    } else if (level === 'warn') {
      console.warn(
        `%c${prefix}%c ${message}`,
        `color: ${color}; font-weight: bold`,
        'color: inherit',
        data || ''
      );
    } else {
      console.log(
        `%c${prefix}%c ${message}`,
        `color: ${color}; font-weight: bold`,
        'color: inherit',
        data || ''
      );
    }
  }

  debug(category: string, message: string, data?: any): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, error?: Error | string, data?: any): void {
    this.log('error', category, message, data, error);
  }

  // Categorias específicas
  image = {
    generating: (prompt: string, provider: string) =>
      this.info('IMAGE', `Gerando imagem com ${provider}`, { prompt: prompt.substring(0, 100) }),
    generated: (url: string, provider: string) =>
      this.info('IMAGE', `Imagem gerada com ${provider}`, { url: url.substring(0, 80) }),
    error: (error: Error | string, context?: any) =>
      this.error('IMAGE', 'Erro ao gerar imagem', error, context),
    loading: (id: string, url: string) =>
      this.debug('IMAGE', `Carregando imagem ${id}`, { url: url.substring(0, 80) }),
    loaded: (id: string) =>
      this.debug('IMAGE', `Imagem carregada: ${id}`),
    loadError: (id: string, url: string) =>
      this.error('IMAGE', `Erro ao carregar imagem ${id}`, url),
  };

  video = {
    starting: (provider: string, imageUrl: string) =>
      this.info('VIDEO', `Iniciando geração de vídeo com ${provider}`, { imageUrl: imageUrl.substring(0, 80) }),
    taskCreated: (taskId: string, provider: string) =>
      this.info('VIDEO', `Tarefa criada: ${taskId}`, { provider }),
    polling: (taskId: string, attempt: number, status: string) =>
      this.debug('VIDEO', `Polling tarefa ${taskId}`, { attempt, status }),
    completed: (taskId: string, videoUrl: string) =>
      this.info('VIDEO', `Vídeo gerado: ${taskId}`, { videoUrl: videoUrl?.substring(0, 80) }),
    error: (error: Error | string, context?: any) =>
      this.error('VIDEO', 'Erro ao gerar vídeo', error, context),
  };

  api = {
    request: (method: string, url: string, body?: any) =>
      this.debug('API', `${method} ${url}`, body ? { bodyPreview: JSON.stringify(body).substring(0, 200) } : undefined),
    response: (url: string, status: number, data?: any) =>
      this.debug('API', `Resposta ${status} de ${url}`, data ? { preview: JSON.stringify(data).substring(0, 200) } : undefined),
    error: (url: string, status: number, error: string) =>
      this.error('API', `Erro ${status} de ${url}`, error),
  };

  storage = {
    saving: (id: string, type: string) =>
      this.debug('STORAGE', `Salvando ${type}: ${id}`),
    saved: (id: string, type: string) =>
      this.info('STORAGE', `Salvo ${type}: ${id}`),
    loading: (type: string, count?: number) =>
      this.debug('STORAGE', `Carregando ${type}`, count ? { count } : undefined),
    loaded: (type: string, count: number) =>
      this.info('STORAGE', `Carregados ${count} itens de ${type}`),
    error: (operation: string, error: Error | string) =>
      this.error('STORAGE', `Erro em ${operation}`, error),
  };

  recovery = {
    checkpointFound: (progress: number) =>
      this.info('RECOVERY', `Checkpoint encontrado`, { progress }),
    recovering: (step: string, imagesCount: number) =>
      this.info('RECOVERY', `Recuperando de ${step}`, { images: imagesCount }),
    recovered: (imagesCount: number) =>
      this.info('RECOVERY', `Recuperação completa`, { images: imagesCount }),
    error: (error: Error | string) =>
      this.error('RECOVERY', 'Erro na recuperação', error),
  };

  // Exportar logs para análise
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Obter logs recentes
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Limpar logs
  clearLogs(): void {
    this.logs = [];
    this.info('LOGGER', 'Logs limpos');
  }

  // Habilitar/desabilitar logging
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const logger = new Logger();

// Disponibilizar no console para debugging
if (typeof window !== 'undefined') {
  (window as any).tonmovesLogger = logger;
  console.log('%c🎵 TONMOVES Logger ativo - Use window.tonmovesLogger para acessar', 'color: #667eea; font-weight: bold');
}
