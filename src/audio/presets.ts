export type PresetId =
  | 'normal'
  | 'deep'
  | 'chipmunk'
  | 'robot'
  | 'cave'
  | 'walkie'
  | 'alien'
  // Category A – Funny
  | 'baby'
  | 'helium'
  | 'monster'
  | 'giant'
  | 'cartoon'
  | 'squirrel'
  // Category B – Robot & Sci-Fi
  | 'android'
  | 'cyberpunk'
  | 'ai-assistant'
  | 'glitch'
  | 'space-alien'
  | 'cyborg'
  // Category C – Cinematic & Atmospheric
  | 'demon'
  | 'ghost'
  | 'horror'
  | 'underwater'
  | 'telephone'
  | 'vintage-radio'
  // Category D – Music & Studio
  | 'auto-tune'
  | 'studio-vocal'
  | 'chorus'
  | 'megaphone'
  | 'bass-boost'
  // Category E – Special Effects
  | 'reverse-echo'
  | 'stadium';

export type EffectCategory =
  | 'funny'
  | 'robot-scifi'
  | 'cinematic'
  | 'music-studio'
  | 'special';

export type CategoryFilter = 'all' | EffectCategory;

export type EffectIconId =
  | 'audio-lines'
  | 'baby'
  | 'wind'
  | 'skull'
  | 'mountain'
  | 'smile'
  | 'sparkles'
  | 'bot'
  | 'cpu'
  | 'terminal'
  | 'zap'
  | 'orbit'
  | 'cog'
  | 'flame'
  | 'ghost'
  | 'eye'
  | 'waves'
  | 'phone'
  | 'radio'
  | 'sliders'
  | 'mic'
  | 'layers'
  | 'megaphone'
  | 'speaker'
  | 'rewind'
  | 'building'
  | 'volume-2'
  | 'headphones';

export interface VoicePreset {
  id: PresetId;
  name: string;
  description: string;
  pitchSemitones: number; // -12 to +12
  speed: number; // 0.5 to 2.0
  category: EffectCategory;
  icon: EffectIconId;
  defaultIntensity?: number; // 0 to 1, defaults to 1
}

export const CATEGORY_TABS: Array<{ id: CategoryFilter; label: string }> = [
  { id: 'all', label: 'All Effects' },
  { id: 'funny', label: 'Funny' },
  { id: 'robot-scifi', label: 'Robot & Sci-Fi' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'music-studio', label: 'Music & Studio' },
  { id: 'special', label: 'Special Effects' },
];

export const VOICE_PRESETS: VoicePreset[] = [
  // Original 7 core presets (preserved IDs & parameters)
  {
    id: 'normal',
    name: 'Normal',
    description: 'Clean studio pass-through with zero coloration.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'music-studio',
    icon: 'volume-2',
  },
  {
    id: 'deep',
    name: 'Deep Voice',
    description: 'Rich, resonant baritone drop with warm low-end presence.',
    pitchSemitones: -5,
    speed: 0.94,
    category: 'cinematic',
    icon: 'speaker',
  },
  {
    id: 'chipmunk',
    name: 'Chipmunk',
    description: 'Bright, high-pitched cadence with crisp upper harmonics.',
    pitchSemitones: 7,
    speed: 1.15,
    category: 'funny',
    icon: 'sparkles',
  },
  {
    id: 'robot',
    name: 'Robot',
    description: 'Metallic ring-modulated voice with stepped comb resonance.',
    pitchSemitones: -1,
    speed: 1.0,
    category: 'robot-scifi',
    icon: 'bot',
  },
  {
    id: 'cave',
    name: 'Cave Echo',
    description: 'Cavernous multi-tap reflections with deep stone decay.',
    pitchSemitones: -1,
    speed: 0.98,
    category: 'cinematic',
    icon: 'mountain',
  },
  {
    id: 'walkie',
    name: 'Walkie-Talkie Radio',
    description: 'Compressed VHF bandpass grit with tactical radio saturation.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'cinematic',
    icon: 'radio',
  },
  {
    id: 'alien',
    name: 'Alien',
    description: 'Unworldly dual-LFO frequency warble and formant shimmer.',
    pitchSemitones: 3,
    speed: 1.04,
    category: 'robot-scifi',
    icon: 'orbit',
  },

  // CATEGORY A – FUNNY VOICES
  {
    id: 'baby',
    name: 'Baby Voice',
    description: 'Very high-pitched, cute voice with gentle warm formant lift.',
    pitchSemitones: 8.5,
    speed: 1.04,
    category: 'funny',
    icon: 'baby',
  },
  {
    id: 'helium',
    name: 'Helium Voice',
    description: 'Extremely high-pitched, airy helium-balloon vocal shift.',
    pitchSemitones: 11,
    speed: 1.08,
    category: 'funny',
    icon: 'wind',
  },
  {
    id: 'monster',
    name: 'Monster Voice',
    description: 'Deep, scary creature growl with gritty sub-bass resonance.',
    pitchSemitones: -8,
    speed: 0.9,
    category: 'funny',
    icon: 'skull',
  },
  {
    id: 'giant',
    name: 'Giant Voice',
    description: 'Colossal, earth-shaking bass voice with booming hall scale.',
    pitchSemitones: -10.5,
    speed: 0.84,
    category: 'funny',
    icon: 'mountain',
  },
  {
    id: 'cartoon',
    name: 'Cartoon Voice',
    description: 'Exaggerated animated character bounce with playful vibrato.',
    pitchSemitones: 5.5,
    speed: 1.12,
    category: 'funny',
    icon: 'smile',
  },
  {
    id: 'squirrel',
    name: 'Squirrel Voice',
    description: 'Fast, hyper-chattery high-pitched woodland cadence.',
    pitchSemitones: 9.5,
    speed: 1.38,
    category: 'funny',
    icon: 'sparkles',
  },

  // CATEGORY B – ROBOT & SCI-FI
  {
    id: 'android',
    name: 'Android Voice',
    description: 'Futuristic humanoid synth with dual-comb metallic sheen.',
    pitchSemitones: -1.5,
    speed: 1.0,
    category: 'robot-scifi',
    icon: 'bot',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Voice',
    description: 'Neon digital voice with gritty harmonic drive and stereo width.',
    pitchSemitones: -2,
    speed: 1.02,
    category: 'robot-scifi',
    icon: 'cpu',
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant Voice',
    description: 'Crisp synthetic computer voice with glassy formant precision.',
    pitchSemitones: 0.5,
    speed: 1.02,
    category: 'robot-scifi',
    icon: 'terminal',
  },
  {
    id: 'glitch',
    name: 'Glitch Voice',
    description: 'Digital buffer stutters, sample-rate crunch, and micro-cuts.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'robot-scifi',
    icon: 'zap',
  },
  {
    id: 'space-alien',
    name: 'Space Alien Voice',
    description: 'Extraterrestrial stereo phaser sweep with cosmic FM warble.',
    pitchSemitones: 4.5,
    speed: 0.96,
    category: 'robot-scifi',
    icon: 'orbit',
  },
  {
    id: 'cyborg',
    name: 'Cyborg Voice',
    description: 'Heavy mechanical servo resonance blended with dark steel grit.',
    pitchSemitones: -3.5,
    speed: 0.98,
    category: 'robot-scifi',
    icon: 'cog',
  },

  // CATEGORY C – CINEMATIC & ATMOSPHERIC
  {
    id: 'demon',
    name: 'Demon Voice',
    description: 'Dark, distorted underworld growl with sub-octave shadow.',
    pitchSemitones: -9,
    speed: 0.92,
    category: 'cinematic',
    icon: 'flame',
  },
  {
    id: 'ghost',
    name: 'Ghost Voice',
    description: 'Mysterious, haunting whisper with eerie stereo shimmer echo.',
    pitchSemitones: 1.5,
    speed: 0.88,
    category: 'cinematic',
    icon: 'ghost',
  },
  {
    id: 'horror',
    name: 'Horror Voice',
    description: 'Creepy, unsettling pitch drift inside a cold dark chamber.',
    pitchSemitones: -4.5,
    speed: 0.91,
    category: 'cinematic',
    icon: 'eye',
  },
  {
    id: 'underwater',
    name: 'Underwater Voice',
    description: 'Muffled submerged acoustics with bubbling resonant sweep.',
    pitchSemitones: -1,
    speed: 0.95,
    category: 'cinematic',
    icon: 'waves',
  },
  {
    id: 'telephone',
    name: 'Telephone Voice',
    description: 'Classic 300 Hz–3.4 kHz handset frequency response with line snap.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'cinematic',
    icon: 'phone',
  },
  {
    id: 'vintage-radio',
    name: 'Vintage Radio Voice',
    description: 'Warm mid-century AM broadcast tone with gentle tube saturation.',
    pitchSemitones: 0.5,
    speed: 1.0,
    category: 'cinematic',
    icon: 'radio',
  },

  // CATEGORY D – MUSIC & STUDIO
  {
    id: 'auto-tune',
    name: 'Auto-Tune Style',
    description: 'Hard-stepped chromatic pitch snap with bright pop presence.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'music-studio',
    icon: 'sliders',
  },
  {
    id: 'studio-vocal',
    name: 'Studio Vocal',
    description: 'Broadcast condenser sheen with tight compression and air lift.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'music-studio',
    icon: 'mic',
  },
  {
    id: 'chorus',
    name: 'Chorus Voice',
    description: 'Lush multi-voice stereo layering with detuned shimmer.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'music-studio',
    icon: 'layers',
  },
  {
    id: 'megaphone',
    name: 'Megaphone Voice',
    description: 'Punchy horn loudspeaker projection with crisp overdrive bite.',
    pitchSemitones: 0.5,
    speed: 1.0,
    category: 'music-studio',
    icon: 'megaphone',
  },
  {
    id: 'bass-boost',
    name: 'Bass Boost Voice',
    description: 'Deep chesty sub-frequency enhancement with tight punch.',
    pitchSemitones: -2,
    speed: 0.98,
    category: 'music-studio',
    icon: 'headphones',
  },

  // CATEGORY E – SPECIAL EFFECTS
  {
    id: 'reverse-echo',
    name: 'Reverse Echo Voice',
    description: 'Backwards-swelling pre-echo blooms rising into each syllable.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'special',
    icon: 'rewind',
  },
  {
    id: 'stadium',
    name: 'Stadium Voice',
    description: 'Massive arena PA reverberation with wide crowd reflections.',
    pitchSemitones: -0.5,
    speed: 0.97,
    category: 'special',
    icon: 'building',
  },
];

export function getPresetById(id: PresetId): VoicePreset {
  return VOICE_PRESETS.find((p) => p.id === id) ?? VOICE_PRESETS[0];
}

export function getCategoryLabel(category: EffectCategory): string {
  switch (category) {
    case 'funny':
      return 'Funny';
    case 'robot-scifi':
      return 'Robot & Sci-Fi';
    case 'cinematic':
      return 'Cinematic';
    case 'music-studio':
      return 'Music & Studio';
    case 'special':
      return 'Special Effects';
  }
}

export function filterVoicePresets(
  presets: VoicePreset[],
  options: {
    category: CategoryFilter;
    query: string;
    favoritesOnly: boolean;
    favoriteIds: ReadonlySet<PresetId>;
  }
): VoicePreset[] {
  const normalizedQuery = options.query.trim().toLowerCase();
  return presets.filter((preset) => {
    if (options.category !== 'all' && preset.category !== options.category) {
      return false;
    }
    if (options.favoritesOnly && !options.favoriteIds.has(preset.id)) {
      return false;
    }
    if (normalizedQuery) {
      const catLabel = getCategoryLabel(preset.category).toLowerCase();
      const haystack =
        `${preset.name} ${preset.description} ${catLabel}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });
}
