import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWaveformPeaks, formatTimecode } from './waveform';

test('computeWaveformPeaks returns requested bar count normalized to [0, 1]', () => {
  const data = new Float32Array([0.1, -0.5, 0.2, 0.8, -0.4, 0.0, 0.3, -0.2]);
  const peaks = computeWaveformPeaks(data, 4);
  assert.equal(peaks.length, 4);
  assert.ok(Math.abs(peaks[1] - 1.0) < 1e-5); // max peak 0.8 normalized to 1.0
  assert.ok(peaks.every((p) => p >= 0 && p <= 1));
});

test('computeWaveformPeaks handles silence safely', () => {
  const silence = new Float32Array(128);
  const peaks = computeWaveformPeaks(silence, 16);
  assert.equal(peaks.length, 16);
  assert.ok(peaks.every((p) => p === 0));
});

test('formatTimecode formats seconds cleanly', () => {
  assert.equal(formatTimecode(0), '0:00.0');
  assert.equal(formatTimecode(3.26), '0:03.2');
  assert.equal(formatTimecode(65.45), '1:05.4');
  assert.equal(formatTimecode(-2), '0:00.0');
});
