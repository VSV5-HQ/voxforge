import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORY_TABS,
  filterVoicePresets,
  getPresetById,
  PresetId,
  VOICE_PRESETS,
} from './presets.ts';

test('all 32 voice presets (7 core + 25 new) are defined with valid DSP bounds', () => {
  const expectedIds: PresetId[] = [
    // 7 original presets
    'normal',
    'deep',
    'chipmunk',
    'robot',
    'cave',
    'walkie',
    'alien',
    // 25 new presets
    'baby',
    'helium',
    'monster',
    'giant',
    'cartoon',
    'squirrel',
    'android',
    'cyberpunk',
    'ai-assistant',
    'glitch',
    'space-alien',
    'cyborg',
    'demon',
    'ghost',
    'horror',
    'underwater',
    'telephone',
    'vintage-radio',
    'auto-tune',
    'studio-vocal',
    'chorus',
    'megaphone',
    'bass-boost',
    'reverse-echo',
    'stadium',
  ];

  assert.equal(VOICE_PRESETS.length, 32);
  assert.deepEqual(
    VOICE_PRESETS.map((p) => p.id),
    expectedIds
  );

  for (const preset of VOICE_PRESETS) {
    assert.ok(preset.name.length > 0);
    assert.ok(preset.description.length > 0);
    assert.ok(preset.icon.length > 0);
    assert.ok(preset.pitchSemitones >= -12 && preset.pitchSemitones <= 12);
    assert.ok(preset.speed >= 0.5 && preset.speed <= 2.0);
    assert.equal(getPresetById(preset.id).id, preset.id);
  }
});

test('category tabs and search filter work accurately across all 32 effects', () => {
  assert.deepEqual(
    CATEGORY_TABS.map((c) => c.label),
    [
      'All Effects',
      'Funny',
      'Robot & Sci-Fi',
      'Cinematic',
      'Music & Studio',
      'Special Effects',
    ]
  );

  const favs = new Set<PresetId>(['robot', 'demon']);

  const all = filterVoicePresets(VOICE_PRESETS, {
    category: 'all',
    query: '',
    favoritesOnly: false,
    favoriteIds: favs,
  });
  assert.equal(all.length, 32);

  const funny = filterVoicePresets(VOICE_PRESETS, {
    category: 'funny',
    query: '',
    favoritesOnly: false,
    favoriteIds: favs,
  });
  assert.equal(funny.length, 7);

  const searchCyber = filterVoicePresets(VOICE_PRESETS, {
    category: 'all',
    query: 'cyberpunk',
    favoritesOnly: false,
    favoriteIds: favs,
  });
  assert.equal(searchCyber.length, 1);
  assert.equal(searchCyber[0].id, 'cyberpunk');

  const favOnly = filterVoicePresets(VOICE_PRESETS, {
    category: 'all',
    query: '',
    favoritesOnly: true,
    favoriteIds: favs,
  });
  assert.deepEqual(
    favOnly.map((p) => p.id),
    ['robot', 'demon']
  );
});
