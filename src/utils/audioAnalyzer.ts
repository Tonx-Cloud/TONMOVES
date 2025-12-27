export interface AudioAnalysis {
  bpm: number;
  energy: number;
  segments: AudioSegment[];
  duration: number;
}

export interface AudioSegment {
  startTime: number;
  endTime: number;
  energy: number;
  dominantFrequency: number;
  mood: 'calm' | 'energetic' | 'intense' | 'dark';
}

export class AudioAnalyzer {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;

  constructor() {
    this.audioContext = new AudioContext();
  }

  async analyzeAudio(file: File): Promise<AudioAnalysis> {
    // Load audio file
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    // Analyze
    const bpm = await this.detectBPM();
    const energy = this.calculateEnergy();
    const segments = this.createSegments();

    return {
      bpm,
      energy,
      segments,
      duration: this.audioBuffer.duration
    };
  }

  private async detectBPM(): Promise<number> {
    if (!this.audioBuffer) return 120;

    const channelData = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    
    // Simple peak detection for BPM
    const peakThreshold = 0.5;
    const peaks: number[] = [];
    
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > peakThreshold) {
        peaks.push(i / sampleRate);
      }
    }

    // Calculate average interval between peaks
    if (peaks.length < 2) return 120;
    
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = 60 / avgInterval;
    
    return Math.round(Math.max(60, Math.min(180, bpm)));
  }

  private calculateEnergy(): number {
    if (!this.audioBuffer) return 0.5;

    const channelData = this.audioBuffer.getChannelData(0);
    let sum = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    
    const rms = Math.sqrt(sum / channelData.length);
    return Math.min(1, rms * 10); // Normalize to 0-1
  }

  private createSegments(): AudioSegment[] {
    if (!this.audioBuffer) return [];

    const duration = this.audioBuffer.duration;
    const segmentDuration = 2; // 2 seconds per segment
    const numSegments = Math.ceil(duration / segmentDuration);
    const segments: AudioSegment[] = [];

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, duration);
      
      const segmentEnergy = this.getSegmentEnergy(startTime, endTime);
      const dominantFrequency = this.getDominantFrequency(startTime, endTime);
      
      segments.push({
        startTime,
        endTime,
        energy: segmentEnergy,
        dominantFrequency,
        mood: this.determineMood(segmentEnergy, dominantFrequency)
      });
    }

    return segments;
  }

  private getSegmentEnergy(startTime: number, endTime: number): number {
    if (!this.audioBuffer) return 0.5;

    const channelData = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    
    let sum = 0;
    for (let i = startSample; i < endSample; i++) {
      sum += channelData[i] * channelData[i];
    }
    
    const rms = Math.sqrt(sum / (endSample - startSample));
    return Math.min(1, rms * 10);
  }

  private getDominantFrequency(startTime: number, endTime: number): number {
    // Simplified: return a value between 0-1 representing low to high frequencies
    const energy = this.getSegmentEnergy(startTime, endTime);
    return energy * 0.7 + Math.random() * 0.3; // Add some variation
  }

  private determineMood(energy: number, frequency: number): AudioSegment['mood'] {
    if (energy > 0.7 && frequency > 0.6) return 'intense';
    if (energy > 0.5) return 'energetic';
    if (frequency < 0.4) return 'dark';
    return 'calm';
  }

  cleanup() {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
