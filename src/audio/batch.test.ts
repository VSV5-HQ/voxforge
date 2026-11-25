import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBatchOutputFilename,
  deduplicateFilenames,
  sanitizeBaseFilename,
  summarizeBatchStatus,
} from './batch';
import { crc32, createZipArchive } from './zipArchive';

test('sanitizeBaseFilename and buildBatchOutputFilename produce clean wav names', () => {
  assert.equal(sanitizeBaseFilename('My Voice Take (1).mp3'), 'my-voice-take-1');
  assert.equal(sanitizeBaseFilename('   .wav'), 'audio-clip');
  assert.equal(
    buildBatchOutputFilename('Podcast Intro.wav', 'walkie'),
    'podcast-intro-walkie.wav'
  );
});

test('deduplicateFilenames appends numeric suffixes on collisions', () => {
  assert.deepEqual(
    deduplicateFilenames(['take-robot.wav', 'take-robot.wav', 'take-robot.wav']),
    ['take-robot.wav', 'take-robot-2.wav', 'take-robot-3.wav']
  );
});

test('summarizeBatchStatus aggregates queue counts accurately', () => {
  const summary = summarizeBatchStatus([
    'queued',
    'ready',
    'outdated',
    'processing',
    'error',
    'ready',
  ]);
  assert.equal(summary.total, 6);
  assert.equal(summary.queued, 1);
  assert.equal(summary.ready, 2);
  assert.equal(summary.outdated, 1);
  assert.equal(summary.processing, 1);
  assert.equal(summary.error, 1);
  assert.equal(summary.pendingCount, 2);
});

test('crc32 computes standard IEEE 802.3 checksum', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xcbf43926);
});

test('createZipArchive writes valid local headers and EOCD record', () => {
  const a = new TextEncoder().encode('hello');
  const b = new TextEncoder().encode('world!');
  const zip = createZipArchive([
    { filename: 'a.txt', data: a },
    { filename: 'b.txt', data: b },
  ]);

  const view = new DataView(zip.buffer);
  // First local header signature PK\x03\x04
  assert.equal(view.getUint32(0, true), 0x04034b50);
  // EOCD signature PK\x05\x06 at the end (22 bytes from end)
  const eocdOffset = zip.length - 22;
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  assert.equal(view.getUint16(eocdOffset + 8, true), 2);
  assert.equal(view.getUint16(eocdOffset + 10, true), 2);
});
