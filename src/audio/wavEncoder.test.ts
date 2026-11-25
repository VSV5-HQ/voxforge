import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from './wavEncoder';

test('encodeWav writes valid RIFF/WAVE header and exact PCM16 payload size', () => {
  const sampleRate = 44100;
  const length = 100;
  const ch0 = new Float32Array(length);
  const ch1 = new Float32Array(length);
  ch0[0] = 1.0;
  ch0[1] = -1.0;
  ch1[0] = 0.5;
  ch1[1] = -0.5;

  const wav = encodeWav({
    sampleRate,
    numberOfChannels: 2,
    length,
    getChannelData: (c) => (c === 0 ? ch0 : ch1),
  });

  // 44 byte header + 100 frames * 2 channels * 2 bytes
  assert.equal(wav.byteLength, 44 + 400);

  const ascii = (start: number, len: number) =>
    String.fromCharCode(...wav.slice(start, start + len));
  assert.equal(ascii(0, 4), 'RIFF');
  assert.equal(ascii(8, 4), 'WAVE');
  assert.equal(ascii(12, 4), 'fmt ');
  assert.equal(ascii(36, 4), 'data');

  const view = new DataView(wav.buffer);
  assert.equal(view.getUint16(20, true), 1); // PCM
  assert.equal(view.getUint16(22, true), 2); // Stereo
  assert.equal(view.getUint32(24, true), sampleRate);
  assert.equal(view.getUint16(34, true), 16); // 16-bit
  assert.equal(view.getUint32(40, true), 400); // Data bytes

  // First frame samples
  assert.equal(view.getInt16(44, true), 32767);
  assert.equal(view.getInt16(46, true), 16384);
  // Second frame samples
  assert.equal(view.getInt16(48, true), -32768);
  assert.equal(view.getInt16(50, true), -16384);
});

test('encodeWav clamps out-of-range float samples cleanly', () => {
  const ch = new Float32Array([2.5, -3.2]);
  const wav = encodeWav({
    sampleRate: 48000,
    numberOfChannels: 1,
    length: 2,
    getChannelData: () => ch,
  });
  const view = new DataView(wav.buffer);
  assert.equal(view.getInt16(44, true), 32767);
  assert.equal(view.getInt16(46, true), -32768);
});
