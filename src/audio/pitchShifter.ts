/**
 * Pure TypeScript WSOLA (Waveform Similarity Overlap-Add) time-stretcher
 * paired with linear resampling for independent Pitch (-12..+12 semitones)
 * and Speed (0.5x..2.0x) processing on Float32Array audio channels.
 */

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Resamples a Float32Array to a new length using linear interpolation.
 */
export function resampleLinear(
  input: Float32Array,
  targetLength: number
): Float32Array {
  if (input.length === 0 || targetLength <= 0) {
    return new Float32Array(0);
  }
  if (targetLength === input.length) {
    return new Float32Array(input);
  }
  const output = new Float32Array(targetLength);
  const ratio = (input.length - 1) / Math.max(1, targetLength - 1);

  for (let i = 0; i < targetLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
    output[i] = s0 + (s1 - s0) * frac;
  }
  return output;
}

/**
 * Time-stretches a mono Float32Array without changing pitch using WSOLA.
 * stretchFactor > 1 makes audio longer (slower), < 1 makes it shorter (faster).
 */
export function timeStretchWSOLA(
  input: Float32Array,
  stretchFactor: number,
  sampleRate: number
): Float32Array {
  if (input.length === 0) return new Float32Array(0);
  if (Math.abs(stretchFactor - 1) < 0.005) {
    return new Float32Array(input);
  }

  const safeStretch = clamp(stretchFactor, 0.25, 4.0);
  const outputLength = Math.max(1, Math.round(input.length * safeStretch));

  // Window size ~46ms at 44.1kHz (~2048 samples), scaled gently with sampleRate
  const winSize = Math.max(
    256,
    Math.min(4096, Math.round((sampleRate / 44100) * 2048) & ~1)
  );
  const halfWin = winSize >> 1;
  const synthesisHop = halfWin;
  const analysisHop = synthesisHop / safeStretch;
  const searchRadius = Math.max(32, Math.round(winSize * 0.2));

  // Precompute Hann window
  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
  }

  const output = new Float32Array(outputLength);
  const norm = new Float32Array(outputLength);

  // Copy initial half-window cleanly
  let prevAnalysisCenter = 0;

  for (let outPos = 0; outPos < outputLength; outPos += synthesisHop) {
    const nominalInPos = Math.round(outPos / safeStretch);

    let bestOffset = 0;
    if (outPos > 0 && nominalInPos > searchRadius && nominalInPos + winSize + searchRadius < input.length) {
      // Find best cross-correlation alignment in the overlap region
      const refStart = prevAnalysisCenter + synthesisHop;
      if (refStart >= 0 && refStart + halfWin < input.length) {
        let bestCorr = -Infinity;
        // Stride by 4 for fast deterministic search
        for (let delta = -searchRadius; delta <= searchRadius; delta += 4) {
          const candStart = nominalInPos + delta;
          if (candStart < 0 || candStart + halfWin >= input.length) continue;
          let corr = 0;
          for (let j = 0; j < halfWin; j += 2) {
            corr += input[refStart + j] * input[candStart + j];
          }
          if (corr > bestCorr) {
            bestCorr = corr;
            bestOffset = delta;
          }
        }
      }
    }

    const inPos = clamp(
      nominalInPos + bestOffset,
      0,
      Math.max(0, input.length - 1)
    );
    prevAnalysisCenter = inPos;

    for (let i = 0; i < winSize; i++) {
      const outIdx = outPos + i;
      if (outIdx >= outputLength) break;
      const inIdx = inPos + i;
      const sample = inIdx < input.length ? input[inIdx] : 0;
      const w = hann[i];
      output[outIdx] += sample * w;
      norm[outIdx] += w;
    }
  }

  for (let i = 0; i < outputLength; i++) {
    const n = norm[i];
    if (n > 1e-4) {
      output[i] = clamp(output[i] / n, -1, 1);
    }
  }

  return output;
}

/**
 * Applies independent pitch shift (in semitones) and speed multiplier
 * to a mono Float32Array.
 *
 * - pitchSemitones: -12 to +12 (0 = unchanged)
 * - speed: 0.5 to 2.0 (1.0 = unchanged; >1 is faster/shorter, <1 is slower/longer)
 */
export function processPitchAndSpeedChannel(
  input: Float32Array,
  sampleRate: number,
  pitchSemitones: number,
  speed: number
): Float32Array {
  if (input.length === 0) return new Float32Array(0);

  const safePitch = clamp(pitchSemitones, -12, 12);
  const safeSpeed = clamp(speed, 0.5, 2.0);

  // Bypass if neutral
  if (Math.abs(safePitch) < 0.01 && Math.abs(safeSpeed - 1) < 0.005) {
    return new Float32Array(input);
  }

  const pitchRatio = Math.pow(2, safePitch / 12);
  // Step 1: Time-stretch so that after resampling by pitchRatio, final length = input.length / safeSpeed
  // Resampling by 1 / pitchRatio changes pitch by pitchRatio and scales length by 1 / pitchRatio.
  // Therefore WSOLA stretchFactor = pitchRatio / safeSpeed.
  const stretchFactor = pitchRatio / safeSpeed;
  const stretched = timeStretchWSOLA(input, stretchFactor, sampleRate);

  // Step 2: Resample to target output length (input.length / safeSpeed)
  const finalLength = Math.max(1, Math.round(input.length / safeSpeed));
  return resampleLinear(stretched, finalLength);
}
