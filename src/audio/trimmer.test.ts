import test from 'node:test';
import assert from 'node:assert/strict';
import { clampTrimRange, sliceAudioChannel } from './trimmer';

test('clampTrimRange enforces bounds and minimum span', () => {
  assert.deepEqual(clampTrimRange(-1, 10, 4.0, 0.2), {
    startSec: 0,
    endSec: 4.0,
  });

  // Start pushed past end leaves at least 0.2s span
  assert.deepEqual(clampTrimRange(2.5, 2.55, 4.0, 0.2), {
    startSec: 2.5,
    endSec: 2.7,
  });

  // Start near end of clip clamps cleanly
  assert.deepEqual(clampTrimRange(3.95, 4.0, 4.0, 0.2), {
    startSec: 3.8,
    endSec: 4.0,
  });

  // Zero-duration clip returns 0..0
  assert.deepEqual(clampTrimRange(0.5, 1.0, 0, 0.2), {
    startSec: 0,
    endSec: 0,
  });
});

test('sliceAudioChannel slices exact sample window', () => {
  const sampleRate = 1000;
  const data = new Float32Array(2000);
  for (let i = 0; i < data.length; i++) {
    data[i] = i / 2000;
  }

  const sliced = sliceAudioChannel(data, sampleRate, 0.5, 1.5);
  assert.equal(sliced.length, 1000);
  assert.ok(Math.abs(sliced[0] - data[500]) < 1e-6);
  assert.ok(Math.abs(sliced[sliced.length - 1] - data[1499]) < 1e-6);
});
