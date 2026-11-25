import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeABMonitorState,
  mapPlaybackPositionOnABSwitch,
  toggleABSource,
} from './abComparison';

test('toggleABSource flips cleanly between processed and original', () => {
  assert.equal(toggleABSource('processed'), 'original');
  assert.equal(toggleABSource('original'), 'processed');
});

test('mapPlaybackPositionOnABSwitch preserves proportional playhead across speed changes', () => {
  // Halfway through a 2.0s processed clip -> halfway through a 4.0s original clip
  assert.equal(mapPlaybackPositionOnABSwitch(1.0, 2.0, 4.0), 2.0);
  // Clamps safely inside target buffer tail margin
  const nearEnd = mapPlaybackPositionOnABSwitch(2.0, 2.0, 2.0);
  assert.ok(Math.abs(nearEnd - 1.95) < 1e-6);
  // Handles zero/invalid durations safely
  assert.equal(mapPlaybackPositionOnABSwitch(1.2, 0, 3.0), 0);
  assert.equal(mapPlaybackPositionOnABSwitch(1.2, 3.0, 0), 0);
});

test('describeABMonitorState formats Original and Processed summaries accurately', () => {
  const dry = describeABMonitorState('original', 'Deep Voice', -5, 0.94);
  assert.equal(dry.tag, 'A');
  assert.equal(dry.title, 'A · Original (Dry)');
  assert.equal(dry.detail, 'Bypassed · 0 st · 1.00x');

  const wet = describeABMonitorState('processed', 'Chipmunk', 7, 1.15);
  assert.equal(wet.tag, 'B');
  assert.equal(wet.title, 'B · Chipmunk');
  assert.equal(wet.detail, '+7 st · 1.15x');
});
