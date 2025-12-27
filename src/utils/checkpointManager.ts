// ✅ Sistema de Checkpoint para não perder progresso

export interface Checkpoint {
  timestamp: number;
  step: string;
  progress: number;
  data: {
    audioAnalysis?: any;
    globalContext?: any;
    narrative?: any;
    generatedImages?: any[];
    aspectRatio?: string;
    theme?: string;
    audioFileName?: string;
  };
}

export class CheckpointManager {
  private storageKey = 'tonmoves_checkpoint';

  // Salvar checkpoint
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(checkpoint));
      console.log('💾 Checkpoint salvo:', checkpoint.step, checkpoint.progress + '%');
    } catch (error) {
      console.error('Erro ao salvar checkpoint:', error);
    }
  }

  // Carregar último checkpoint
  async loadCheckpoint(): Promise<Checkpoint | null> {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const checkpoint = JSON.parse(saved);
        console.log('📂 Checkpoint carregado:', checkpoint.step);
        return checkpoint;
      }
    } catch (error) {
      console.error('Erro ao carregar checkpoint:', error);
    }
    return null;
  }

  // Limpar checkpoint
  async clearCheckpoint(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('🗑️ Checkpoint limpo');
    } catch (error) {
      console.error('Erro ao limpar checkpoint:', error);
    }
  }

  // Verificar se existe checkpoint recente (menos de 1 hora)
  async hasRecentCheckpoint(): Promise<boolean> {
    const checkpoint = await this.loadCheckpoint();
    if (!checkpoint) return false;

    const oneHour = 60 * 60 * 1000;
    const isRecent = (Date.now() - checkpoint.timestamp) < oneHour;
    
    return isRecent && checkpoint.progress < 100;
  }

  // Auto-save a cada progresso
  async autoSave(
    step: string,
    progress: number,
    data: Checkpoint['data']
  ): Promise<void> {
    await this.saveCheckpoint({
      timestamp: Date.now(),
      step,
      progress,
      data
    });
  }
}
