import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBufferPreEffectChannel,
  generateImpulseChannelData,
  getEffectTailSeconds,
  ImpulseKind,
  makeAsymmetricDriveCurve,
  makeDistortionCurve,
  makeSoftLimiterCurve,
} from './dspEffects.ts';
import { processPitchAndSpeedChannel } from './pitchShifter.ts';
import { VOICE_PRESETS } from './presets.ts';

function makeTestVoiceSignal(sampleRate = 44100, seconds = 0.6): Float32Array {
  const len = Math.floor(sampleRate * seconds);
  const data = new Float32Array(len);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const f0 = 145 + 25 * Math.sin(2 * Math.PI * 2.5 * t);
    phase += (2 * Math.PI * f0) / sampleRate;
    const env = Math.sin(Math.PI * (i / len));
    data[i] =
      (0.45 * Math.sin(phase) +
        0.25 * Math.sin(phase * 2) +
        0.15 * Math.sin(phase * 3)) *
      env;
  }
  return data;
}

function rmsDiff(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / Math.max(1, n));
}

test('buffer pre-DSP effects modify signal cleanly without NaN or clipping', () => {
  const sr = 44100;
  const dry = makeTestVoiceSignal(sr, 0.7);
  const preDspEffects = [
    'glitch',
    'reverse-echo',
    'auto-tune',
    'giant',
    'demon',
    'monster',
  ] as const;

  for (const id of preDspEffects) {
    const processed = applyBufferPreEffectChannel(dry, sr, id, 1.0);
    assert.equal(processed.length, dry.length);
    for (let i = 0; i < processed.length; i++) {
      assert.ok(Number.isFinite(processed[i]), `${id} produced non-finite sample`);
      assert.ok(
        processed[i] >= -1 && processed[i] <= 1,
        `${id} clipped beyond [-1, 1]`
      );
    }
    const diff = rmsDiff(dry, processed);
    assert.ok(diff > 0.005, `${id} should audibly transform signal (diff=${diff})`);

    // Zero intensity cleanly bypasses pre-DSP
    const bypassed = applyBufferPreEffectChannel(dry, sr, id, 0);
    assert.equal(rmsDiff(dry, bypassed), 0);
  }
});

test('all 32 presets run safely through pitch/speed + pre-DSP channel pipeline', () => {
  const sr = 22050;
  const dry = makeTestVoiceSignal(sr, 0.5);

  for (const preset of VOICE_PRESETS) {
    const shifted = processPitchAndSpeedChannel(
      dry,
      sr,
      preset.pitchSemitones,
      preset.speed
    );
    const out = applyBufferPreEffectChannel(shifted, sr, preset.id, 1.0);
    assert.ok(out.length > 0, `${preset.id} output empty`);
    for (let i = 0; i < out.length; i++) {
      assert.ok(Number.isFinite(out[i]), `${preset.id} has NaN/Inf`);
    }
    assert.ok(getEffectTailSeconds(preset.id) >= 0.15);
  }
});

test('deterministic acoustic impulse responses and waveshaper curves stay within [-1, 1]', () => {
  const kinds: ImpulseKind[] = [
    'cave',
    'giant',
    'monster',
    'ghost',
    'horror',
    'demon',
    'studio',
    'stadium',
  ];

  for (const kind of kinds) {
    const ch0 = generateImpulseChannelData(kind, 44100, 0);
    const ch1 = generateImpulseChannelData(kind, 44100, 1);
    assert.ok(ch0.length > 1000);
    assert.equal(ch0.length, ch1.length);
    let maxAbs = 0;
    for (let i = 0; i < ch0.length; i++) {
      assert.ok(Number.isFinite(ch0[i]));
      maxAbs = Math.max(maxAbs, Math.abs(ch0[i]));
    }
    assert.ok(maxAbs > 0.05 && maxAbs <= 1.0);
  }

  for (const curve of [
    makeDistortionCurve(35),
    makeAsymmetricDriveCurve(3.5),
    makeSoftLimiterCurve(),
  ]) {
    assert.ok(curve.length >= 2048);
    for (let i = 0; i < curve.length; i++) {
      assert.ok(curve[i] >= -1 && curve[i] <= 1);
    }
  }
});
