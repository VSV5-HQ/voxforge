import { clamp, processPitchAndSpeedChannel } from './pitchShifter';
import { PresetId } from './presets';

export type ImpulseKind =
  | 'cave'
  | 'giant'
  | 'monster'
  | 'ghost'
  | 'horror'
  | 'demon'
  | 'studio'
  | 'stadium';

/**
 * Generates a deterministic waveshaper curve for overdrive/saturation/soft-clipping.
 */
export function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const nSamples = 4096;
  const buffer = new ArrayBuffer(nSamples * 4);
  const curve = new Float32Array(buffer);
  const k = Math.max(0, amount);
  for (let i = 0; i < nSamples; i++) {
    const x = (i * 2) / nSamples - 1;
    curve[i] =
      ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Generates an asymmetric tube/monster saturation curve (even + odd harmonics).
 */
export function makeAsymmetricDriveCurve(
  drive: number
): Float32Array<ArrayBuffer> {
  const nSamples = 4096;
  const buffer = new ArrayBuffer(nSamples * 4);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, drive);
  for (let i = 0; i < nSamples; i++) {
    const x = (i * 2) / nSamples - 1;
    const biased = x + 0.14;
    curve[i] = clamp(Math.tanh(k * biased) - Math.tanh(k * 0.14), -1, 1);
  }
  return curve;
}

/**
 * Generates a clean soft-clipping ceiling curve to prevent digital harshness.
 */
export function makeSoftLimiterCurve(): Float32Array<ArrayBuffer> {
  const nSamples = 2048;
  const buffer = new ArrayBuffer(nSamples * 4);
  const curve = new Float32Array(buffer);
  for (let i = 0; i < nSamples; i++) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = Math.tanh(x * 1.15) / Math.tanh(1.15);
  }
  return curve;
}

/**
 * Generates deterministic stereo impulse channel samples for ConvolverNode spaces.
 */
export function generateImpulseChannelData(
  kind: ImpulseKind,
  sampleRate: number,
  channel: 0 | 1
): Float32Array {
  const configs: Record<
    ImpulseKind,
    { durationSec: number; decayPower: number; gain: number; earlyEndSec: number; preDelaySec: number }
  > = {
    cave: { durationSec: 2.1, decayPower: 2.4, gain: 0.65, earlyEndSec: 0.12, preDelaySec: 0 },
    giant: { durationSec: 1.4, decayPower: 2.6, gain: 0.58, earlyEndSec: 0.09, preDelaySec: 0.015 },
    monster: { durationSec: 1.1, decayPower: 3.1, gain: 0.52, earlyEndSec: 0.07, preDelaySec: 0.01 },
    demon: { durationSec: 1.35, decayPower: 2.8, gain: 0.55, earlyEndSec: 0.08, preDelaySec: 0.012 },
    ghost: { durationSec: 2.3, decayPower: 1.85, gain: 0.58, earlyEndSec: 0.18, preDelaySec: 0.03 },
    horror: { durationSec: 1.8, decayPower: 2.1, gain: 0.54, earlyEndSec: 0.14, preDelaySec: 0.02 },
    studio: { durationSec: 0.32, decayPower: 4.2, gain: 0.28, earlyEndSec: 0.025, preDelaySec: 0 },
    stadium: { durationSec: 2.7, decayPower: 1.95, gain: 0.68, earlyEndSec: 0.22, preDelaySec: 0.045 },
  };

  const cfg = configs[kind];
  const length = Math.max(64, Math.floor(sampleRate * cfg.durationSec));
  const preDelaySamples = Math.floor(sampleRate * cfg.preDelaySec);
  const data = new Float32Array(length);

  let seed = (channel === 0 ? 12345 : 67891) + kind.length * 997;
  let lpState = 0;
  const lpAlpha =
    kind === 'giant' || kind === 'monster' || kind === 'demon'
      ? 0.25
      : kind === 'ghost'
        ? 0.55
        : 0.72;

  for (let i = preDelaySamples; i < length; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const white = (seed / 0xffffffff) * 2 - 1;
    lpState = lpState + lpAlpha * (white - lpState);

    const normIdx = (i - preDelaySamples) / Math.max(1, length - preDelaySamples);
    const decay = Math.pow(1 - normIdx, cfg.decayPower);
    const early = i - preDelaySamples < sampleRate * cfg.earlyEndSec ? 1.3 : 1.0;

    // Distinct stadium discrete PA echo taps
    let tapBoost = 1.0;
    if (kind === 'stadium') {
      const t = i / sampleRate;
      if (Math.abs(t - 0.14) < 0.008 || Math.abs(t - 0.29) < 0.009) {
        tapBoost = 2.0;
      }
    }

    data[i] = clamp(lpState * decay * early * tapBoost * cfg.gain, -1, 1);
  }
  return data;
}

/**
 * Extra buffer tail duration needed during offline WAV export so reverbs/echoes do not cut off.
 */
export function getEffectTailSeconds(presetId: PresetId | 'custom'): number {
  switch (presetId) {
    case 'stadium':
      return 2.4;
    case 'cave':
    case 'ghost':
      return 1.85;
    case 'horror':
      return 1.6;
    case 'demon':
    case 'giant':
      return 1.25;
    case 'monster':
      return 0.95;
    case 'reverse-echo':
      return 0.85;
    case 'chorus':
    case 'cyberpunk':
    case 'space-alien':
      return 0.3;
    default:
      return 0.15;
  }
}

/**
 * Glitch Voice DSP: deterministic micro-stutters + sample-rate hold + bit-quantization.
 */
function applyGlitchChannel(
  input: Float32Array,
  sampleRate: number,
  intensity: number
): Float32Array {
  const out = new Float32Array(input);
  if (input.length === 0 || intensity <= 0.02) return out;

  const chunkSamples = Math.max(256, Math.round(sampleRate * 0.045)); // 45ms stutter grain
  const cycleSamples = Math.max(chunkSamples * 3, Math.round(sampleRate * 0.28));
  const holdStep = Math.max(1, Math.round(1 + intensity * 5)); // sample-rate decimation
  const quantLevels = Math.max(10, Math.round(64 - intensity * 46)); // bit crush

  let holdVal = 0;
  for (let i = 0; i < input.length; i++) {
    const posInCycle = i % cycleSamples;
    let sample = input[i];

    // Stutter repeat window for 2nd & 3rd micro-grains inside cycle
    if (
      intensity > 0.25 &&
      posInCycle >= chunkSamples &&
      posInCycle < chunkSamples * 2
    ) {
      const stutterIdx = i - chunkSamples;
      if (stutterIdx >= 0) {
        sample = input[stutterIdx];
      }
    } else if (
      intensity > 0.55 &&
      posInCycle >= chunkSamples * 2 &&
      posInCycle < Math.floor(chunkSamples * 2.5)
    ) {
      const stutterIdx = i - chunkSamples * 2;
      if (stutterIdx >= 0) {
        sample = input[stutterIdx] * 0.85;
      }
    }

    // Brief digital micro-dropouts
    if (
      intensity > 0.35 &&
      posInCycle >= Math.floor(chunkSamples * 2.6) &&
      posInCycle < Math.floor(chunkSamples * 2.95)
    ) {
      sample *= 0.08;
    }

    // Sample-and-hold + bit quantization
    if (i % holdStep === 0) {
      holdVal = Math.round(sample * quantLevels) / quantLevels;
    }

    out[i] = clamp(input[i] * (1 - intensity) + holdVal * intensity, -1, 1);
  }
  return out;
}

/**
 * Reverse Echo Voice DSP: computes true reverse-reverb pre-echo swells
 * by reversing the signal, running multi-tap feedback diffusion, and reversing back.
 */
function applyReverseEchoChannel(
  input: Float32Array,
  sampleRate: number,
  intensity: number
): Float32Array {
  const out = new Float32Array(input);
  if (input.length === 0 || intensity <= 0.02) return out;

  const len = input.length;
  const rev = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    rev[i] = input[len - 1 - i];
  }

  const tap1 = Math.max(1, Math.round(sampleRate * 0.085));
  const tap2 = Math.max(1, Math.round(sampleRate * 0.145));
  const tap3 = Math.max(1, Math.round(sampleRate * 0.23));
  const wetRev = new Float32Array(len);

  let lp = 0;
  for (let i = 0; i < len; i++) {
    const t1 = i >= tap1 ? rev[i - tap1] + wetRev[i - tap1] * 0.52 : 0;
    const t2 = i >= tap2 ? rev[i - tap2] + wetRev[i - tap2] * 0.38 : 0;
    const t3 = i >= tap3 ? rev[i - tap3] * 0.35 : 0;
    const raw = (t1 * 0.5 + t2 * 0.35 + t3 * 0.25);
    lp = lp + 0.35 * (raw - lp);
    wetRev[i] = clamp(lp, -1, 1);
  }

  // Flip wet reverb backwards so echoes swell forward into each spoken phrase
  const wetMix = 0.72 * intensity;
  const dryMix = 1 - 0.18 * intensity;
  for (let i = 0; i < len; i++) {
    const swell = wetRev[len - 1 - i];
    out[i] = clamp(input[i] * dryMix + swell * wetMix, -1, 1);
  }
  return out;
}

/**
 * Sub-harmonic octave blend for Monster, Giant, and Demon voices.
 */
function applySubOctaveLayer(
  input: Float32Array,
  sampleRate: number,
  intensity: number,
  subRatio: number
): Float32Array {
  const out = new Float32Array(input);
  if (input.length < 256 || intensity <= 0.02) return out;

  const subShifted = processPitchAndSpeedChannel(input, sampleRate, -12, 1.0);
  const subMix = subRatio * intensity;
  const dryMix = 1 - 0.12 * intensity;

  let lp = 0;
  for (let i = 0; i < input.length; i++) {
    const subSample = i < subShifted.length ? subShifted[i] : 0;
    lp = lp + 0.12 * (subSample - lp); // Keep sub layer deep and focused
    out[i] = clamp(input[i] * dryMix + lp * subMix, -1, 1);
  }
  return out;
}

/**
 * Lightweight monophonic autocorrelation pitch-quantizer for Auto-Tune Style vocals.
 * Detects per-frame pitch (80-520 Hz), snaps it to the nearest chromatic semitone,
 * and crossfades quantized grains to create clean stepped vocal pitch correction.
 */
function applyAutoTuneChannel(
  input: Float32Array,
  sampleRate: number,
  intensity: number
): Float32Array {
  const out = new Float32Array(input);
  if (input.length < 1024 || intensity <= 0.02) return out;

  const frameSize = Math.max(512, Math.round(sampleRate * 0.04)); // 40ms frames
  const hop = frameSize >> 1;
  const minLag = Math.max(20, Math.floor(sampleRate / 520));
  const maxLag = Math.min(frameSize >> 1, Math.ceil(sampleRate / 80));

  const hann = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
  }

  const wet = new Float32Array(input.length);
  const norm = new Float32Array(input.length);

  for (let start = 0; start < input.length; start += hop) {
    const available = Math.min(frameSize, input.length - start);
    if (available < maxLag * 2) {
      for (let i = 0; i < available; i++) {
        wet[start + i] += input[start + i] * hann[i];
        norm[start + i] += hann[i];
      }
      continue;
    }

    // Frame energy check
    let energy = 0;
    for (let i = 0; i < available; i += 2) {
      energy += input[start + i] * input[start + i];
    }
    const rms = Math.sqrt(energy / (available / 2));

    let pitchRatio = 1.0;
    if (rms > 0.012) {
      // Normalized autocorrelation pitch estimate
      let bestLag = 0;
      let bestCorr = -Infinity;
      for (let lag = minLag; lag <= maxLag; lag++) {
        let corr = 0;
        let denomA = 0;
        let denomB = 0;
        for (let j = 0; j < available - lag; j += 2) {
          const a = input[start + j];
          const b = input[start + j + lag];
          corr += a * b;
          denomA += a * a;
          denomB += b * b;
        }
        const denom = Math.sqrt(denomA * denomB) + 1e-8;
        const score = corr / denom;
        if (score > bestCorr) {
          bestCorr = score;
          bestLag = lag;
        }
      }

      if (bestCorr > 0.45 && bestLag > 0) {
        const detectedFreq = sampleRate / bestLag;
        // Snap strongly to nearest semitone relative to A4=440Hz
        const midi = 69 + 12 * Math.log2(detectedFreq / 440);
        // Quantize to C major / chromatic vocal scale for unmistakable pop correction
        const snappedMidi = Math.round(midi);
        const targetFreq = 440 * Math.pow(2, (snappedMidi - 69) / 12);
        const rawRatio = targetFreq / detectedFreq;
        // Exaggerate snap slightly at high intensity so stepping is audible even on gentle speech
        const deltaSemis = Math.round(12 * Math.log2(rawRatio)) || (midi % 1 > 0.5 ? 0.45 : -0.45);
        pitchRatio = clamp(Math.pow(2, (deltaSemis * intensity) / 12), 0.88, 1.14);
      }
    }

    for (let i = 0; i < available; i++) {
      const readPos = i * pitchRatio;
      const idx0 = Math.floor(readPos);
      const frac = readPos - idx0;
      const s0 = input[Math.min(input.length - 1, start + (idx0 % available))];
      const s1 = input[Math.min(input.length - 1, start + ((idx0 + 1) % available))];
      const sample = s0 + (s1 - s0) * frac;
      wet[start + i] += sample * hann[i];
      norm[start + i] += hann[i];
    }
  }

  for (let i = 0; i < input.length; i++) {
    const corrected = norm[i] > 1e-4 ? wet[i] / norm[i] : input[i];
    out[i] = clamp(input[i] * (1 - intensity) + corrected * intensity, -1, 1);
  }
  return out;
}

/**
 * Sample-accurate channel pre-DSP pass applied after pitch/speed stretching
 * for effects requiring non-causal or frame-level synthesis.
 */
export function applyBufferPreEffectChannel(
  input: Float32Array,
  sampleRate: number,
  presetId: PresetId | 'custom',
  intensity = 1.0
): Float32Array {
  const safeIntensity = clamp(intensity, 0, 1);
  if (input.length === 0 || safeIntensity <= 0.01) {
    return new Float32Array(input);
  }

  switch (presetId) {
    case 'glitch':
      return applyGlitchChannel(input, sampleRate, safeIntensity);
    case 'reverse-echo':
      return applyReverseEchoChannel(input, sampleRate, safeIntensity);
    case 'auto-tune':
      return applyAutoTuneChannel(input, sampleRate, safeIntensity);
    case 'giant':
      return applySubOctaveLayer(input, sampleRate, safeIntensity, 0.48);
    case 'demon':
      return applySubOctaveLayer(input, sampleRate, safeIntensity, 0.55);
    case 'monster':
      return applySubOctaveLayer(input, sampleRate, safeIntensity, 0.4);
    default:
      return new Float32Array(input);
  }
}
