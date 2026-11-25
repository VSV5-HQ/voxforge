/**
 * Computes normalized peak amplitudes [0..1] for rendering audio waveforms.
 */
export function computeWaveformPeaks(
  channelData: Float32Array,
  barCount: number
): number[] {
  if (barCount <= 0) return [];
  if (channelData.length === 0) {
    return new Array(barCount).fill(0);
  }

  const peaks: number[] = new Array(barCount).fill(0);
  const blockSize = Math.max(1, Math.floor(channelData.length / barCount));

  let globalMax = 0;
  for (let i = 0; i < barCount; i++) {
    const start = Math.floor((i * channelData.length) / barCount);
    const end = Math.min(channelData.length, start + blockSize);
    let maxAmp = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > maxAmp) maxAmp = abs;
    }
    peaks[i] = maxAmp;
    if (maxAmp > globalMax) globalMax = maxAmp;
  }

  if (globalMax > 1e-4) {
    const scale = 1 / globalMax;
    for (let i = 0; i < barCount; i++) {
      peaks[i] = Math.min(1, peaks[i] * scale);
    }
  }

  return peaks;
}

/**
 * Formats seconds as M:SS.d (e.g., 0:04.2 or 1:12.0).
 */
export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00.0';
  const mins = Math.floor(seconds / 60);
  const rem = seconds - mins * 60;
  const wholeSecs = Math.floor(rem);
  const tenths = Math.floor((rem - wholeSecs) * 10);
  return `${mins}:${wholeSecs.toString().padStart(2, '0')}.${tenths}`;
}
