import { PresetId } from './presets';
import { processPitchAndSpeedChannel } from './pitchShifter';
import { encodeWav } from './wavEncoder';

export interface EffectSettings {
  presetId: PresetId | 'custom';
  pitchSemitones: number;
  speed: number;
}

/**
 * Generates a realistic 3.2-second synthetic human-cadence vocal sample
 * using formant-filtered glottal harmonics and syllable envelopes.
 * Allows instant testing of all presets without requiring a physical microphone.
 */
export function createDemoClipVariant(
  ctx: BaseAudioContext,
  variant: 0 | 1 | 2 = 0
): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const variantConfigs = [
    {
      duration: 3.2,
      syllables: [
        { start: 0.12, dur: 0.36, f0Start: 138, f0End: 156, f1: 720, f2: 1240 },
        { start: 0.56, dur: 0.42, f0Start: 152, f0End: 132, f1: 520, f2: 1850 },
        { start: 1.08, dur: 0.48, f0Start: 145, f0End: 168, f1: 640, f2: 1520 },
        { start: 1.72, dur: 0.38, f0Start: 160, f0End: 140, f1: 460, f2: 2050 },
        { start: 2.22, dur: 0.68, f0Start: 148, f0End: 118, f1: 690, f2: 1180 },
      ],
    },
    {
      duration: 2.1,
      syllables: [
        { start: 0.1, dur: 0.32, f0Start: 175, f0End: 192, f1: 680, f2: 1740 },
        { start: 0.52, dur: 0.45, f0Start: 188, f0End: 164, f1: 540, f2: 1920 },
        { start: 1.12, dur: 0.65, f0Start: 170, f0End: 146, f1: 610, f2: 1480 },
      ],
    },
    {
      duration: 2.5,
      syllables: [
        { start: 0.15, dur: 0.42, f0Start: 118, f0End: 128, f1: 650, f2: 1120 },
        { start: 0.7, dur: 0.52, f0Start: 126, f0End: 112, f1: 490, f2: 1450 },
        { start: 1.38, dur: 0.78, f0Start: 122, f0End: 102, f1: 620, f2: 1190 },
      ],
    },
  ];
  const cfg = variantConfigs[variant] ?? variantConfigs[0];
  const duration = cfg.duration;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (const syl of cfg.syllables) {
    const startIdx = Math.floor(syl.start * sampleRate);
    const sylLen = Math.floor(syl.dur * sampleRate);
    let phase = 0;

    for (let i = 0; i < sylLen; i++) {
      const idx = startIdx + i;
      if (idx >= length) break;
      const tNorm = i / sylLen;
      const env =
        Math.sin(Math.PI * Math.pow(tNorm, 0.75)) *
        (0.85 + 0.15 * Math.sin(2 * Math.PI * 5 * (i / sampleRate)));

      const f0 = syl.f0Start + (syl.f0End - syl.f0Start) * tNorm;
      phase += (2 * Math.PI * f0) / sampleRate;

      // Rich glottal-like harmonic spectrum shaped by two vocal formants
      let sig = 0;
      const maxHarmonic = 16;
      for (let h = 1; h <= maxHarmonic; h++) {
        const freq = f0 * h;
        const form1 = Math.exp(-Math.pow((freq - syl.f1) / 140, 2));
        const form2 = 0.65 * Math.exp(-Math.pow((freq - syl.f2) / 190, 2));
        const rolloff = 1 / Math.pow(h, 0.65);
        sig += (0.15 * rolloff + form1 + form2) * Math.sin(phase * h);
      }

      // Subtle breathiness on syllable onset
      const breath =
        tNorm < 0.14 ? (Math.sin(idx * 12.9898) * 43758.5453 % 1) * 0.08 * (1 - tNorm / 0.14) : 0;

      data[idx] += (sig * 0.18 + breath) * env;
    }
  }

  // Normalize gently to -2dB peak
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 1e-4) {
    const gain = 0.78 / peak;
    for (let i = 0; i < length; i++) {
      data[i] *= gain;
    }
  }

  return buffer;
}

export function createDemoVoiceBuffer(ctx: BaseAudioContext): AudioBuffer {
  return createDemoClipVariant(ctx, 0);
}

/**
 * Applies independent pitch and speed processing to produce a transformed AudioBuffer
 * ready to be routed through the preset's Web Audio effect chain.
 */
export function buildPitchSpeedBuffer(
  ctx: BaseAudioContext | null,
  source: AudioBuffer,
  pitchSemitones: number,
  speed: number
): AudioBuffer {
  const numChannels = source.numberOfChannels;
  const sampleRate = source.sampleRate;

  const processedChannels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    processedChannels.push(
      processPitchAndSpeedChannel(
        source.getChannelData(ch),
        sampleRate,
        pitchSemitones,
        speed
      )
    );
  }

  const outLength = Math.max(1, processedChannels[0]?.length ?? 1);
  const outBuffer = ctx
    ? ctx.createBuffer(numChannels, outLength, sampleRate)
    : new AudioBuffer({
        numberOfChannels: numChannels,
        length: outLength,
        sampleRate,
      });
  for (let ch = 0; ch < numChannels; ch++) {
    outBuffer.getChannelData(ch).set(processedChannels[ch]);
  }
  return outBuffer;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const nSamples = 4096;
  const buffer = new ArrayBuffer(nSamples * 4);
  const curve = new Float32Array(buffer);
  const k = amount;
  for (let i = 0; i < nSamples; i++) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function createCaveImpulseResponse(ctx: BaseAudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 2.1);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    let seed = ch === 0 ? 12345 : 67891;
    for (let i = 0; i < length; i++) {
      // Deterministic PRNG so offline renders are reproducible
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed / 0xffffffff) * 2 - 1;
      const decay = Math.pow(1 - i / length, 2.4);
      // Early reflections boost
      const early = i < sampleRate * 0.12 ? 1.35 : 1.0;
      data[i] = noise * decay * early * 0.65;
    }
  }
  return impulse;
}

/**
 * Connects a source AudioNode through the Web Audio DSP graph for the active preset
 * into the destination node. Returns any active oscillator nodes so callers can stop them.
 */
export function buildEffectGraph(
  ctx: BaseAudioContext,
  sourceNode: AudioNode,
  destination: AudioNode,
  presetId: PresetId | 'custom',
  startTime: number,
  durationSeconds: number
): { stopOscillators: () => void } {
  const oscillators: OscillatorNode[] = [];

  // Final safety limiter before output
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-6, startTime);
  compressor.knee.setValueAtTime(12, startTime);
  compressor.ratio.setValueAtTime(6, startTime);
  compressor.attack.setValueAtTime(0.003, startTime);
  compressor.release.setValueAtTime(0.15, startTime);
  compressor.connect(destination);

  const outputGain = ctx.createGain();
  outputGain.gain.setValueAtTime(1.0, startTime);
  outputGain.connect(compressor);

  const effectMode: PresetId = presetId === 'custom' ? 'normal' : presetId;

  if (effectMode === 'normal') {
    sourceNode.connect(outputGain);
  } else if (effectMode === 'deep') {
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.setValueAtTime(220, startTime);
    lowShelf.gain.setValueAtTime(7.5, startTime);

    const highCut = ctx.createBiquadFilter();
    highCut.type = 'lowpass';
    highCut.frequency.setValueAtTime(4600, startTime);

    const warmth = ctx.createWaveShaper();
    warmth.curve = makeDistortionCurve(8);
    warmth.oversample = '2x';

    sourceNode.connect(lowShelf);
    lowShelf.connect(warmth);
    warmth.connect(highCut);
    highCut.connect(outputGain);
  } else if (effectMode === 'chipmunk') {
    const highPass = ctx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.setValueAtTime(240, startTime);

    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.setValueAtTime(3200, startTime);
    presence.Q.setValueAtTime(1.1, startTime);
    presence.gain.setValueAtTime(5.5, startTime);

    sourceNode.connect(highPass);
    highPass.connect(presence);
    presence.connect(outputGain);
  } else if (effectMode === 'robot') {
    // Metallic ring modulation + short comb delay
    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(52, startTime);
    carrier.start(startTime);
    carrier.stop(startTime + durationSeconds + 0.25);
    oscillators.push(carrier);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(0.0, startTime);
    carrier.connect(modGain.gain);

    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(0.35, startTime);

    const wetShaper = ctx.createWaveShaper();
    wetShaper.curve = makeDistortionCurve(18);

    const combDelay = ctx.createDelay(0.1);
    combDelay.delayTime.setValueAtTime(0.011, startTime);
    const combFeedback = ctx.createGain();
    combFeedback.gain.setValueAtTime(0.48, startTime);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1150, startTime);
    bandpass.Q.setValueAtTime(0.85, startTime);

    sourceNode.connect(modGain);
    sourceNode.connect(dryGain);
    modGain.connect(wetShaper);
    wetShaper.connect(bandpass);
    dryGain.connect(combDelay);
    combDelay.connect(combFeedback);
    combFeedback.connect(combDelay);
    combDelay.connect(outputGain);
    bandpass.connect(outputGain);
  } else if (effectMode === 'cave') {
    const dry = ctx.createGain();
    dry.gain.setValueAtTime(0.75, startTime);

    const delay1 = ctx.createDelay(1.0);
    delay1.delayTime.setValueAtTime(0.24, startTime);
    const delay2 = ctx.createDelay(1.0);
    delay2.delayTime.setValueAtTime(0.41, startTime);

    const fb1 = ctx.createGain();
    fb1.gain.setValueAtTime(0.42, startTime);

    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.setValueAtTime(2800, startTime);

    const convolver = ctx.createConvolver();
    convolver.buffer = createCaveImpulseResponse(ctx);
    const reverbWet = ctx.createGain();
    reverbWet.gain.setValueAtTime(0.65, startTime);

    sourceNode.connect(dry);
    dry.connect(outputGain);

    sourceNode.connect(delay1);
    delay1.connect(damp);
    damp.connect(fb1);
    fb1.connect(delay2);
    delay2.connect(delay1);
    delay1.connect(outputGain);
    delay2.connect(outputGain);

    sourceNode.connect(convolver);
    convolver.connect(reverbWet);
    reverbWet.connect(outputGain);
  } else if (effectMode === 'walkie') {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(480, startTime);
    hp.Q.setValueAtTime(1.2, startTime);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, startTime);
    lp.Q.setValueAtTime(1.4, startTime);

    const peak = ctx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.setValueAtTime(1450, startTime);
    peak.Q.setValueAtTime(2.0, startTime);
    peak.gain.setValueAtTime(6.0, startTime);

    const drive = ctx.createWaveShaper();
    drive.curve = makeDistortionCurve(45);
    drive.oversample = '2x';

    const radioGain = ctx.createGain();
    radioGain.gain.setValueAtTime(1.15, startTime);

    sourceNode.connect(hp);
    hp.connect(drive);
    drive.connect(lp);
    lp.connect(peak);
    peak.connect(radioGain);
    radioGain.connect(outputGain);
  } else if (effectMode === 'alien') {
    // Dual LFO vibrato delay + FM shimmer
    const delay = ctx.createDelay(0.2);
    delay.delayTime.setValueAtTime(0.025, startTime);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(7.5, startTime);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.setValueAtTime(0.008, startTime);
    lfo.connect(lfoDepth);
    lfoDepth.connect(delay.delayTime);
    lfo.start(startTime);
    lfo.stop(startTime + durationSeconds + 0.25);
    oscillators.push(lfo);

    const ringOsc = ctx.createOscillator();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(28, startTime);
    const ringDepth = ctx.createGain();
    ringDepth.gain.setValueAtTime(0.45, startTime);
    ringOsc.connect(ringDepth);
    ringOsc.start(startTime);
    ringOsc.stop(startTime + durationSeconds + 0.25);
    oscillators.push(ringOsc);

    const amGain = ctx.createGain();
    amGain.gain.setValueAtTime(0.85, startTime);
    ringDepth.connect(amGain.gain);

    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(1600, startTime);
    formant.Q.setValueAtTime(1.4, startTime);

    const lfoFilter = ctx.createOscillator();
    lfoFilter.type = 'triangle';
    lfoFilter.frequency.setValueAtTime(4.2, startTime);
    const lfoFilterDepth = ctx.createGain();
    lfoFilterDepth.gain.setValueAtTime(550, startTime);
    lfoFilter.connect(lfoFilterDepth);
    lfoFilterDepth.connect(formant.frequency);
    lfoFilter.start(startTime);
    lfoFilter.stop(startTime + durationSeconds + 0.25);
    oscillators.push(lfoFilter);

    const dry = ctx.createGain();
    dry.gain.setValueAtTime(0.4, startTime);

    sourceNode.connect(delay);
    delay.connect(amGain);
    amGain.connect(formant);
    formant.connect(outputGain);
    delay.connect(dry);
    dry.connect(outputGain);
  }

  return {
    stopOscillators: () => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // ignore if already stopped
        }
      }
    },
  };
}

/**
 * Renders the complete transformed audio offline via OfflineAudioContext
 * and returns both the rendered AudioBuffer and encoded WAV Blob.
 */
export async function renderTransformedWav(
  sourceBuffer: AudioBuffer,
  settings: EffectSettings
): Promise<{ renderedBuffer: AudioBuffer; wavBlob: Blob }> {
  const sampleRate = sourceBuffer.sampleRate;
  const baseCtx = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    1,
    sampleRate
  );

  const pitchSpeedBuffer = buildPitchSpeedBuffer(
    baseCtx,
    sourceBuffer,
    settings.pitchSemitones,
    settings.speed
  );

  // Add tail for Cave Echo reverb/delay decay
  const tailSeconds = settings.presetId === 'cave' ? 1.8 : 0.15;
  const tailSamples = Math.floor(sampleRate * tailSeconds);
  const renderLength = pitchSpeedBuffer.length + tailSamples;

  const offlineCtx = new OfflineAudioContext(
    Math.max(1, pitchSpeedBuffer.numberOfChannels),
    renderLength,
    sampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = pitchSpeedBuffer;

  buildEffectGraph(
    offlineCtx,
    sourceNode,
    offlineCtx.destination,
    settings.presetId,
    0,
    pitchSpeedBuffer.duration
  );

  sourceNode.start(0);
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBytes = encodeWav(renderedBuffer);
  const wavBlob = new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });

  return { renderedBuffer, wavBlob };
}
