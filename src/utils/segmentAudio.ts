import type { AudioAnalysis } from './audioAnalyzer';

export type Segment = { start: number; end: number; prompt?: string };

export function segmentForShortClips(analysis: AudioAnalysis, clipDuration = 6): Segment[] {
  const segments: Segment[] = [];
  const total = analysis?.segments?.length ? analysis.segments[analysis.segments.length - 1].end : 0;
  if (!total || total <= 0) return segments;

  const maxDuration = clipDuration;
  for (let t = 0; t < total; t += maxDuration) {
    const end = Math.min(t + maxDuration, total);
    segments.push({ start: t, end });
  }
  return segments;
}
