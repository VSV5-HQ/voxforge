import test from 'node:test';
import assert from 'node:assert/strict';
import { getPresetById, PresetId, VOICE_PRESETS } from './presets';

test('all seven voice presets are defined with valid DSP bounds', () => {
  const expectedIds: PresetId[] = [
    'normal',
    'deep',
    'chipmunk',
    'robot',
    'cave',
    'walkie',
    'alien',
  ];

  assert.equal(VOICE_PRESETS.length, 7);
  assert.deepEqual(
    VOICE_PRESETS.map((p) => p.id),
    expectedIds
  );

  for (const preset of VOICE_PRESETS) {
    assert.ok(preset.name.length > 0);
    assert.ok(preset.description.length > 0);
    assert.ok(preset.pitchSemitones >= -12 && preset.pitchSemitones <= 12);
    assert.ok(preset.speed >= 0.5 && preset.speed <= 2.0);
    assert.equal(getPresetById(preset.id).id, preset.id);
  }
});
