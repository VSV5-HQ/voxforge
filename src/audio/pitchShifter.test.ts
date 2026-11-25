import test from 'node:test';
import assert from 'node:assert/strict';
import { processPitchAndSpeedChannel } from './pitchShifter';

function makeSine(sampleRate: number, seconds: number, freq: number): Float32Array {
  const len = Math.round(sampleRate * seconds);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = 0.6 * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return out;
}

test('neutral pitch (0) and speed (1.0) preserves length and waveform', () => {
  const input = makeSine(44100, 0.5, 220);
  const out = processPitchAndSpeedChannel(input, 44100, 0, 1.0);
  assert.equal(out.length, input.length);
  assert.ok(Math.abs(out[100] - input[100]) < 1e-6);
});

test('pitch shift changes pitch without changing duration', () => {
  const sr = 44100;
  const input = makeSine(sr, 0.6, 220);
  const high = processPitchAndSpeedChannel(input, sr, 7, 1.0);
  const low = processPitchAndSpeedChannel(input, sr, -5, 1.0);

  assert.equal(high.length, input.length);
  assert.equal(low.length, input.length);

  for (let i = 0; i < high.length; i++) {
    assert.ok(Number.isFinite(high[i]));
    assert.ok(high[i] >= -1 && high[i] <= 1);
    assert.ok(Number.isFinite(low[i]));
    assert.ok(low[i] >= -1 && low[i] <= 1);
  }
});

test('speed multiplier scales duration accurately', () => {
  const sr = 44100;
  const input = makeSine(sr, 1.0, 220);

  const fast = processPitchAndSpeedChannel(input, sr, 0, 2.0);
  assert.equal(fast.length, Math.round(input.length / 2));

  const slow = processPitchAndSpeedChannel(input, sr, 0, 0.5);
  assert.equal(slow.length, Math.round(input.length * 2));
});
