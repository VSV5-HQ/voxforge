/**
 * Pure audio trimming utilities for clamping start/end bounds and
 * sample-accurate slicing of Float32Array channels and AudioBuffers.
 */

export interface TrimRange {
  startSec: number;
  endSec: number;
}

export function clampTrimRange(
  startSec: number,
  endSec: number,
  durationSec: number,
  minSpanSec = 0.2
): TrimRange {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return { startSec: 0, endSec: 0 };
  }

  const effectiveMinSpan = Math.min(minSpanSec, durationSec);
  let start = Number.isFinite(startSec) ? Math.max(0, startSec) : 0;
  let end = Number.isFinite(endSec) ? Math.min(durationSec, endSec) : durationSec;

  if (start > durationSec - effectiveMinSpan) {
    start = Math.max(0, durationSec - effectiveMinSpan);
  }
  if (end < start + effectiveMinSpan) {
    end = Math.min(durationSec, start + effectiveMinSpan);
  }
  if (end - start < effectiveMinSpan) {
    start = Math.max(0, end - effectiveMinSpan);
  }

  return {
    startSec: Math.round(start * 100) / 100,
    endSec: Math.round(end * 100) / 100,
  };
}

export function sliceAudioChannel(
  channel: Float32Array,
  sampleRate: number,
  startSec: number,
  endSec: number
): Float32Array {
  if (channel.length === 0 || sampleRate <= 0) {
    return new Float32Array(0);
  }

  const durationSec = channel.length / sampleRate;
  const { startSec: s, endSec: e } = clampTrimRange(
    startSec,
    endSec,
    durationSec,
    1 / sampleRate
  );

  const startIdx = Math.max(0, Math.min(channel.length - 1, Math.round(s * sampleRate)));
  const endIdx = Math.max(startIdx + 1, Math.min(channel.length, Math.round(e * sampleRate)));

  return channel.slice(startIdx, endIdx);
}

export function sliceAudioBuffer(
  ctx: BaseAudioContext | null,
  source: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const { startSec: s, endSec: e } = clampTrimRange(
    startSec,
    endSec,
    source.duration,
    0.05
  );

  if (s <= 0.005 && e >= source.duration - 0.005) {
    return source;
  }

  const numChannels = source.numberOfChannels;
  const sampleRate = source.sampleRate;
  const firstSlice = sliceAudioChannel(source.getChannelData(0), sampleRate, s, e);
  const outLength = Math.max(1, firstSlice.length);
  const outBuffer = ctx
    ? ctx.createBuffer(numChannels, outLength, sampleRate)
    : new AudioBuffer({
        numberOfChannels: numChannels,
        length: outLength,
        sampleRate,
      });

  outBuffer.getChannelData(0).set(firstSlice);
  for (let ch = 1; ch < numChannels; ch++) {
    const chSlice = sliceAudioChannel(source.getChannelData(ch), sampleRate, s, e);
    outBuffer.getChannelData(ch).set(chSlice.subarray(0, outLength));
  }

  return outBuffer;
}
