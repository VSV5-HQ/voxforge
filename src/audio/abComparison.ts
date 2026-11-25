export type ABSource = 'original' | 'processed';

export function toggleABSource(current: ABSource): ABSource {
  return current === 'processed' ? 'original' : 'processed';
}

/**
 * Proportionally maps the current playhead timestamp when switching between
 * Original (1.0x) and Processed (speed-scaled) buffers so playback continues
 * at the equivalent syllable without stopping.
 */
export function mapPlaybackPositionOnABSwitch(
  currentTimeSec: number,
  fromDurationSec: number,
  toDurationSec: number
): number {
  if (
    !Number.isFinite(fromDurationSec) ||
    !Number.isFinite(toDurationSec) ||
    fromDurationSec <= 0 ||
    toDurationSec <= 0
  ) {
    return 0;
  }

  const clampedTime = Math.max(0, Math.min(fromDurationSec, currentTimeSec));
  const progress = clampedTime / fromDurationSec;
  const maxSafeOffset = Math.max(0, toDurationSec - 0.05);
  return Math.max(0, Math.min(maxSafeOffset, progress * toDurationSec));
}

export interface ABMonitorDisplay {
  tag: 'A' | 'B';
  title: string;
  detail: string;
}

export function describeABMonitorState(
  source: ABSource,
  presetName: string,
  pitchSemitones: number,
  speed: number
): ABMonitorDisplay {
  if (source === 'original') {
    return {
      tag: 'A',
      title: 'A · Original (Dry)',
      detail: 'Bypassed · 0 st · 1.00x',
    };
  }

  const pitchLabel =
    pitchSemitones > 0 ? `+${pitchSemitones} st` : `${pitchSemitones} st`;

  return {
    tag: 'B',
    title: `B · ${presetName}`,
    detail: `${pitchLabel} · ${speed.toFixed(2)}x`,
  };
}
