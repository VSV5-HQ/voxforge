import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketFrequencySpectrum, smoothSpectrumBars } from './spectrum';

test('bucketFrequencySpectrum maps FFT bins into requested normalized bar count', () => {
  const fft = new Uint8Array(512);
  // Put energy around ~430 Hz (bin ~10 at 44.1kHz / 1024 FFT)
  fft[10] = 255;
  fft[11] = 200;

  const bars = bucketFrequencySpectrum(fft, 32, 44100);
  assert.equal(bars.length, 32);
  assert.ok(bars.every((b) => b >= 0 && b <= 1));

  // Low-mid bars should contain the energy while top bars remain silent
  const lowMidEnergy = Math.max(...bars.slice(4, 18));
  const topEnergy = Math.max(...bars.slice(24));
  assert.ok(lowMidEnergy > 0.5);
  assert.equal(topEnergy, 0);
});

test('bucketFrequencySpectrum handles empty input gracefully', () => {
  assert.deepEqual(bucketFrequencySpectrum(new Uint8Array(0), 12), new Array(12).fill(0));
  assert.deepEqual(bucketFrequencySpectrum(new Uint8Array(64), 0), []);
});

test('smoothSpectrumBars applies faster attack than release and decays to zero', () => {
  const risen = smoothSpectrumBars([0, 0], [1, 0.5], 0.7, 0.2);
  assert.ok(Math.abs(risen[0] - 0.7) < 1e-6);
  assert.ok(Math.abs(risen[1] - 0.35) < 1e-6);

  const fallen = smoothSpectrumBars([1, 0.5], [0, 0], 0.7, 0.2);
  assert.ok(Math.abs(fallen[0] - 0.8) < 1e-6);
  assert.ok(Math.abs(fallen[1] - 0.4) < 1e-6);
});
