/**
 * Maps linear FFT magnitude bins from Web Audio AnalyserNode.getByteFrequencyData()
 * onto logarithmically spaced perceptual frequency bars (~60 Hz to ~12 kHz),
 * returning normalized [0..1] bar heights.
 */
export function bucketFrequencySpectrum(
  freqData: Uint8Array,
  barCount: number,
  sampleRate = 44100
): number[] {
  if (barCount <= 0) return [];
  if (freqData.length === 0) return new Array(barCount).fill(0);

  const nyquist = Math.max(4000, sampleRate / 2);
  const minHz = 60;
  const maxHz = Math.min(12500, nyquist * 0.95);
  const logMin = Math.log10(minHz);
  const logMax = Math.log10(Math.max(minHz + 100, maxHz));
  const binHz = nyquist / freqData.length;

  const bars: number[] = new Array(barCount).fill(0);

  for (let i = 0; i < barCount; i++) {
    const fLow = Math.pow(10, logMin + ((logMax - logMin) * i) / barCount);
    const fHigh = Math.pow(10, logMin + ((logMax - logMin) * (i + 1)) / barCount);

    const startBin = Math.max(0, Math.floor(fLow / binHz));
    const endBin = Math.min(
      freqData.length - 1,
      Math.max(startBin, Math.ceil(fHigh / binHz))
    );

    let peak = 0;
    let sum = 0;
    let count = 0;
    for (let b = startBin; b <= endBin; b++) {
      const v = freqData[b] ?? 0;
      if (v > peak) peak = v;
      sum += v;
      count += 1;
    }

    const avg = count > 0 ? sum / count : 0;
    // Blend peak and average for responsive yet balanced bar motion
    const blended = (0.65 * peak + 0.35 * avg) / 255;
    bars[i] = Math.max(0, Math.min(1, blended));
  }

  return bars;
}

/**
 * Applies fast attack and smooth release damping to spectrum bar arrays.
 */
export function smoothSpectrumBars(
  prevBars: number[],
  nextBars: number[],
  attack = 0.65,
  release = 0.22
): number[] {
  const len = nextBars.length;
  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    const prev = prevBars[i] ?? 0;
    const target = nextBars[i] ?? 0;
    const factor = target >= prev ? attack : release;
    const val = prev + (target - prev) * factor;
    out[i] = val < 0.002 ? 0 : Math.min(1, val);
  }
  return out;
}
