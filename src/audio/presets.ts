export type PresetId =
  | 'normal'
  | 'deep'
  | 'chipmunk'
  | 'robot'
  | 'cave'
  | 'walkie'
  | 'alien';

export interface VoicePreset {
  id: PresetId;
  name: string;
  description: string;
  pitchSemitones: number; // -12 to +12
  speed: number; // 0.5 to 2.0
  category: 'clean' | 'character' | 'space' | 'synth';
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Clean studio pass-through with zero coloration.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'clean',
  },
  {
    id: 'deep',
    name: 'Deep Voice',
    description: 'Rich, resonant baritone drop with warm low-end presence.',
    pitchSemitones: -5,
    speed: 0.94,
    category: 'character',
  },
  {
    id: 'chipmunk',
    name: 'Chipmunk',
    description: 'Bright, high-pitched cadence with crisp upper harmonics.',
    pitchSemitones: 7,
    speed: 1.15,
    category: 'character',
  },
  {
    id: 'robot',
    name: 'Robot',
    description: 'Metallic ring-modulated voice with stepped comb resonance.',
    pitchSemitones: -1,
    speed: 1.0,
    category: 'synth',
  },
  {
    id: 'cave',
    name: 'Cave Echo',
    description: 'Cavernous multi-tap reflections with deep stone decay.',
    pitchSemitones: -1,
    speed: 0.98,
    category: 'space',
  },
  {
    id: 'walkie',
    name: 'Walkie-Talkie Radio',
    description: 'Compressed VHF bandpass grit with tactical radio saturation.',
    pitchSemitones: 0,
    speed: 1.0,
    category: 'space',
  },
  {
    id: 'alien',
    name: 'Alien',
    description: 'Unworldly dual-LFO frequency warble and formant shimmer.',
    pitchSemitones: 3,
    speed: 1.04,
    category: 'synth',
  },
];

export function getPresetById(id: PresetId): VoicePreset {
  return VOICE_PRESETS.find((p) => p.id === id) ?? VOICE_PRESETS[0];
}
