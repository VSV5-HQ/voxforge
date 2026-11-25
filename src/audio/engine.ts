import {
  applyBufferPreEffectChannel,
  generateImpulseChannelData,
  getEffectTailSeconds,
  ImpulseKind,
  makeAsymmetricDriveCurve,
  makeDistortionCurve,
  makeSoftLimiterCurve,
} from './dspEffects';
import { clamp, processPitchAndSpeedChannel } from './pitchShifter';
import { PresetId } from './presets';
import { encodeWav } from './wavEncoder';

export interface EffectSettings {
  presetId: PresetId | 'custom';
  pitchSemitones: number;
  speed: number;
  intensity?: number; // 0 to 1, defaults to 1.0
}

export interface EffectGraphHandle {
  stopOscillators: () => void;
  cleanup: () => void;
}

// Per-context cache of synthesized Convolver impulse buffers to avoid allocation churn
const impulseCache = new WeakMap<BaseAudioContext, Map<ImpulseKind, AudioBuffer>>();

function getImpulseBuffer(ctx: BaseAudioContext, kind: ImpulseKind): AudioBuffer {
  let ctxMap = impulseCache.get(ctx);
  if (!ctxMap) {
    ctxMap = new Map();
    impulseCache.set(ctx, ctxMap);
  }
  const existing = ctxMap.get(kind);
  if (existing) return existing;

  const sampleRate = ctx.sampleRate || 44100;
  const left = generateImpulseChannelData(kind, sampleRate, 0);
  const right = generateImpulseChannelData(kind, sampleRate, 1);
  const impulse = ctx.createBuffer(2, left.length, sampleRate);
  impulse.getChannelData(0).set(left);
  impulse.getChannelData(1).set(right);
  ctxMap.set(kind, impulse);
  return impulse;
}

/**
 * Generates a realistic synthetic human-cadence vocal sample
 * using formant-filtered glottal harmonics and syllable envelopes.
 * Allows instant testing of all 32 effects without requiring a physical microphone.
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

      let sig = 0;
      const maxHarmonic = 16;
      for (let h = 1; h <= maxHarmonic; h++) {
        const freq = f0 * h;
        const form1 = Math.exp(-Math.pow((freq - syl.f1) / 140, 2));
        const form2 = 0.65 * Math.exp(-Math.pow((freq - syl.f2) / 190, 2));
        const rolloff = 1 / Math.pow(h, 0.65);
        sig += (0.15 * rolloff + form1 + form2) * Math.sin(phase * h);
      }

      const breath =
        tNorm < 0.14
          ? ((Math.sin(idx * 12.9898) * 43758.5453) % 1) *
            0.08 *
            (1 - tNorm / 0.14)
          : 0;

      data[idx] += (sig * 0.18 + breath) * env;
    }
  }

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
 * Applies independent pitch/speed processing and sample-level effect synthesis
 * (such as Glitch stutters, Reverse Echo swell, Auto-Tune stepping, or sub-octave)
 * to produce an AudioBuffer ready for the Web Audio node graph.
 */
export function buildPitchSpeedBuffer(
  ctx: BaseAudioContext | null,
  source: AudioBuffer,
  pitchSemitones: number,
  speed: number,
  presetId: PresetId | 'custom' = 'normal',
  intensity = 1.0
): AudioBuffer {
  const numChannels = source.numberOfChannels;
  const sampleRate = source.sampleRate;
  const safeIntensity = clamp(intensity, 0, 1);

  const processedChannels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const shifted = processPitchAndSpeedChannel(
      source.getChannelData(ch),
      sampleRate,
      pitchSemitones,
      speed
    );
    const enhanced = applyBufferPreEffectChannel(
      shifted,
      sampleRate,
      presetId,
      safeIntensity
    );
    processedChannels.push(enhanced);
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

/**
 * Connects a source AudioNode through the Web Audio DSP graph for any of the 32 presets
 * into the destination node, returning oscillator stop + node cleanup handles.
 */
export function buildEffectGraph(
  ctx: BaseAudioContext,
  sourceNode: AudioNode,
  destination: AudioNode,
  presetId: PresetId | 'custom',
  startTime: number,
  durationSeconds: number,
  intensity = 1.0
): EffectGraphHandle {
  const oscillators: OscillatorNode[] = [];
  const createdNodes: AudioNode[] = [];
  const safeIntensity = clamp(intensity, 0, 1);

  const track = <T extends AudioNode>(node: T): T => {
    createdNodes.push(node);
    return node;
  };

  const spawnOsc = (
    type: OscillatorType,
    freq: number
  ): OscillatorNode => {
    const osc = track(ctx.createOscillator());
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    osc.start(startTime);
    osc.stop(startTime + durationSeconds + 0.35);
    oscillators.push(osc);
    return osc;
  };

  const makeFilter = (
    type: BiquadFilterType,
    frequency: number,
    Q = 1.0,
    gain = 0
  ): BiquadFilterNode => {
    const f = track(ctx.createBiquadFilter());
    f.type = type;
    f.frequency.setValueAtTime(frequency, startTime);
    f.Q.setValueAtTime(Q, startTime);
    f.gain.setValueAtTime(gain, startTime);
    return f;
  };

  const makeGain = (val = 1.0): GainNode => {
    const g = track(ctx.createGain());
    g.gain.setValueAtTime(val, startTime);
    return g;
  };

  const makeDelay = (seconds: number, maxTime = 1.5): DelayNode => {
    const d = track(ctx.createDelay(Math.max(maxTime, seconds + 0.05)));
    d.delayTime.setValueAtTime(seconds, startTime);
    return d;
  };

  const makePan = (pan: number): StereoPannerNode | null => {
    if (typeof ctx.createStereoPanner !== 'function') return null;
    const p = track(ctx.createStereoPanner());
    p.pan.setValueAtTime(clamp(pan, -1, 1), startTime);
    return p;
  };

  const connectSafe = (from: AudioNode, to: AudioNode) => {
    from.connect(to);
  };

  // Master safety stage: soft limiter + DynamicsCompressor prevents digital clipping
  const softLimiter = track(ctx.createWaveShaper());
  softLimiter.curve = makeSoftLimiterCurve();
  softLimiter.oversample = '2x';

  const compressor = track(ctx.createDynamicsCompressor());
  compressor.threshold.setValueAtTime(-5, startTime);
  compressor.knee.setValueAtTime(10, startTime);
  compressor.ratio.setValueAtTime(7, startTime);
  compressor.attack.setValueAtTime(0.002, startTime);
  compressor.release.setValueAtTime(0.14, startTime);

  softLimiter.connect(compressor);
  compressor.connect(destination);

  const outputGain = makeGain(1.0);
  outputGain.connect(softLimiter);

  const effectMode: PresetId = presetId === 'custom' ? 'normal' : presetId;

  // For non-normal effects, blend dry & wet bus according to user Intensity slider
  const wetMix = effectMode === 'normal' ? 1 : safeIntensity;
  const dryBypassMix = effectMode === 'normal' ? 0 : 1 - safeIntensity;

  const wetOut = makeGain(wetMix);
  wetOut.connect(outputGain);

  if (dryBypassMix > 0.001) {
    const dryBypass = makeGain(dryBypassMix);
    sourceNode.connect(dryBypass);
    dryBypass.connect(outputGain);
  }

  switch (effectMode) {
    case 'normal': {
      sourceNode.connect(wetOut);
      break;
    }

    case 'deep': {
      const lowShelf = makeFilter('lowshelf', 220, 1, 7.5);
      const highCut = makeFilter('lowpass', 4600, 0.8);
      const warmth = track(ctx.createWaveShaper());
      warmth.curve = makeDistortionCurve(8);
      warmth.oversample = '2x';
      sourceNode.connect(lowShelf);
      lowShelf.connect(warmth);
      warmth.connect(highCut);
      highCut.connect(wetOut);
      break;
    }

    case 'chipmunk': {
      const hp = makeFilter('highpass', 240, 0.9);
      const presence = makeFilter('peaking', 3200, 1.1, 5.5);
      sourceNode.connect(hp);
      hp.connect(presence);
      presence.connect(wetOut);
      break;
    }

    case 'robot': {
      const carrier = spawnOsc('sawtooth', 52);
      const modGain = makeGain(0.0);
      carrier.connect(modGain.gain);
      const dryGain = makeGain(0.35);
      const wetShaper = track(ctx.createWaveShaper());
      wetShaper.curve = makeDistortionCurve(18);
      const combDelay = makeDelay(0.011, 0.1);
      const combFb = makeGain(0.48);
      const bandpass = makeFilter('bandpass', 1150, 0.85);

      sourceNode.connect(modGain);
      sourceNode.connect(dryGain);
      modGain.connect(wetShaper);
      wetShaper.connect(bandpass);
      dryGain.connect(combDelay);
      combDelay.connect(combFb);
      combFb.connect(combDelay);
      combDelay.connect(wetOut);
      bandpass.connect(wetOut);
      break;
    }

    case 'cave': {
      const dry = makeGain(0.72);
      const delay1 = makeDelay(0.24, 1.0);
      const delay2 = makeDelay(0.41, 1.0);
      const fb1 = makeGain(0.42);
      const damp = makeFilter('lowpass', 2800);
      const convolver = track(ctx.createConvolver());
      convolver.buffer = getImpulseBuffer(ctx, 'cave');
      const reverbWet = makeGain(0.65);

      sourceNode.connect(dry);
      dry.connect(wetOut);
      sourceNode.connect(delay1);
      delay1.connect(damp);
      damp.connect(fb1);
      fb1.connect(delay2);
      delay2.connect(delay1);
      delay1.connect(wetOut);
      delay2.connect(wetOut);
      sourceNode.connect(convolver);
      convolver.connect(reverbWet);
      reverbWet.connect(wetOut);
      break;
    }

    case 'walkie': {
      const hp = makeFilter('highpass', 480, 1.2);
      const lp = makeFilter('lowpass', 2600, 1.4);
      const peak = makeFilter('peaking', 1450, 2.0, 6.0);
      const drive = track(ctx.createWaveShaper());
      drive.curve = makeDistortionCurve(45);
      drive.oversample = '2x';
      const g = makeGain(1.1);
      sourceNode.connect(hp);
      hp.connect(drive);
      drive.connect(lp);
      lp.connect(peak);
      peak.connect(g);
      g.connect(wetOut);
      break;
    }

    case 'alien': {
      const delay = makeDelay(0.025, 0.2);
      const lfo = spawnOsc('sine', 7.5);
      const lfoDepth = makeGain(0.008);
      lfo.connect(lfoDepth);
      lfoDepth.connect(delay.delayTime);

      const ringOsc = spawnOsc('sine', 28);
      const ringDepth = makeGain(0.45);
      ringOsc.connect(ringDepth);
      const amGain = makeGain(0.85);
      ringDepth.connect(amGain.gain);

      const formant = makeFilter('bandpass', 1600, 1.4);
      const lfoFilter = spawnOsc('triangle', 4.2);
      const lfoFilterDepth = makeGain(550);
      lfoFilter.connect(lfoFilterDepth);
      lfoFilterDepth.connect(formant.frequency);

      const dry = makeGain(0.4);
      sourceNode.connect(delay);
      delay.connect(amGain);
      amGain.connect(formant);
      formant.connect(wetOut);
      delay.connect(dry);
      dry.connect(wetOut);
      break;
    }

    // --- CATEGORY A: FUNNY VOICES ---
    case 'baby': {
      const hp = makeFilter('highpass', 280, 0.9);
      const cuteWarm = makeFilter('peaking', 1100, 1.0, 3.0);
      const bright = makeFilter('peaking', 2650, 1.2, 5.5);
      const air = makeFilter('highshelf', 5800, 0.7, 3.5);
      sourceNode.connect(hp);
      hp.connect(cuteWarm);
      cuteWarm.connect(bright);
      bright.connect(air);
      air.connect(wetOut);
      break;
    }

    case 'helium': {
      const hp = makeFilter('highpass', 380, 1.1);
      const peak = makeFilter('peaking', 3800, 1.3, 7.0);
      const air = makeFilter('highshelf', 6800, 0.8, 5.0);
      const tight = track(ctx.createDynamicsCompressor());
      tight.threshold.setValueAtTime(-16, startTime);
      tight.ratio.setValueAtTime(4, startTime);
      sourceNode.connect(hp);
      hp.connect(peak);
      peak.connect(air);
      air.connect(tight);
      tight.connect(wetOut);
      break;
    }

    case 'monster': {
      const lowShelf = makeFilter('lowshelf', 160, 0.9, 8.5);
      const growlShaper = track(ctx.createWaveShaper());
      growlShaper.curve = makeAsymmetricDriveCurve(2.8);
      growlShaper.oversample = '2x';
      const lp = makeFilter('lowpass', 2900, 1.0);

      const throatOsc = spawnOsc('sine', 32);
      const throatDepth = makeGain(0.28);
      throatOsc.connect(throatDepth);
      const am = makeGain(0.95);
      throatDepth.connect(am.gain);

      const conv = track(ctx.createConvolver());
      conv.buffer = getImpulseBuffer(ctx, 'monster');
      const convWet = makeGain(0.45);
      const direct = makeGain(0.85);

      sourceNode.connect(lowShelf);
      lowShelf.connect(growlShaper);
      growlShaper.connect(lp);
      lp.connect(am);
      am.connect(direct);
      direct.connect(wetOut);
      am.connect(conv);
      conv.connect(convWet);
      convWet.connect(wetOut);
      break;
    }

    case 'giant': {
      const boom = makeFilter('lowshelf', 135, 0.85, 10.0);
      const darkCut = makeFilter('lowpass', 2200, 0.85);
      const conv = track(ctx.createConvolver());
      conv.buffer = getImpulseBuffer(ctx, 'giant');
      const convWet = makeGain(0.55);
      const slap = makeDelay(0.048, 0.25);
      const slapGain = makeGain(0.32);
      const direct = makeGain(0.9);

      sourceNode.connect(boom);
      boom.connect(darkCut);
      darkCut.connect(direct);
      direct.connect(wetOut);
      darkCut.connect(slap);
      slap.connect(slapGain);
      slapGain.connect(wetOut);
      darkCut.connect(conv);
      conv.connect(convWet);
      convWet.connect(wetOut);
      break;
    }

    case 'cartoon': {
      const hp = makeFilter('highpass', 260, 1.0);
      const nasal = makeFilter('peaking', 2200, 1.8, 7.0);
      const vibDelay = makeDelay(0.012, 0.1);
      const lfo = spawnOsc('sine', 8.5);
      const lfoDepth = makeGain(0.0032);
      lfo.connect(lfoDepth);
      lfoDepth.connect(vibDelay.delayTime);
      const comicDrive = track(ctx.createWaveShaper());
      comicDrive.curve = makeDistortionCurve(14);
      sourceNode.connect(hp);
      hp.connect(nasal);
      nasal.connect(vibDelay);
      vibDelay.connect(comicDrive);
      comicDrive.connect(wetOut);
      break;
    }

    case 'squirrel': {
      const hp = makeFilter('highpass', 340, 1.1);
      const chirp = makeFilter('peaking', 3600, 1.4, 6.5);
      const lfo = spawnOsc('sine', 9.0);
      const lfoGain = makeGain(0.18);
      lfo.connect(lfoGain);
      const flutter = makeGain(0.92);
      lfoGain.connect(flutter.gain);
      sourceNode.connect(hp);
      hp.connect(chirp);
      chirp.connect(flutter);
      flutter.connect(wetOut);
      break;
    }

    // --- CATEGORY B: ROBOT & SCI-FI ---
    case 'android': {
      const carrier = spawnOsc('square', 68);
      const ringDepth = makeGain(0.35);
      carrier.connect(ringDepth);
      const am = makeGain(0.75);
      ringDepth.connect(am.gain);

      const combA = makeDelay(0.0075, 0.1);
      const fbA = makeGain(0.56);
      const combB = makeDelay(0.013, 0.1);
      const fbB = makeGain(0.52);
      const formant = makeFilter('bandpass', 1750, 1.1);

      sourceNode.connect(am);
      am.connect(combA);
      combA.connect(fbA);
      fbA.connect(combA);
      am.connect(combB);
      combB.connect(fbB);
      fbB.connect(combB);

      combA.connect(formant);
      combB.connect(formant);
      formant.connect(wetOut);
      break;
    }

    case 'cyberpunk': {
      const hp = makeFilter('highpass', 150, 0.9);
      const drive = track(ctx.createWaveShaper());
      drive.curve = makeDistortionCurve(28);
      drive.oversample = '2x';
      const sheen = makeFilter('peaking', 2900, 1.4, 5.5);

      const delayL = makeDelay(0.014, 0.1);
      const delayR = makeDelay(0.021, 0.1);
      const lfo = spawnOsc('sine', 1.8);
      const lfoD = makeGain(0.004);
      lfo.connect(lfoD);
      lfoD.connect(delayL.delayTime);
      lfoD.connect(delayR.delayTime);

      const panL = makePan(-0.65);
      const panR = makePan(0.65);
      const center = makeGain(0.65);
      const sideL = makeGain(0.55);
      const sideR = makeGain(0.55);

      sourceNode.connect(hp);
      hp.connect(drive);
      drive.connect(sheen);
      sheen.connect(center);
      center.connect(wetOut);

      sheen.connect(delayL);
      delayL.connect(sideL);
      if (panL) {
        sideL.connect(panL);
        panL.connect(wetOut);
      } else {
        sideL.connect(wetOut);
      }

      sheen.connect(delayR);
      delayR.connect(sideR);
      if (panR) {
        sideR.connect(panR);
        panR.connect(wetOut);
      } else {
        sideR.connect(wetOut);
      }
      break;
    }

    case 'ai-assistant': {
      const hp = makeFilter('highpass', 210, 1.0);
      const f1 = makeFilter('peaking', 1100, 2.5, 4.5);
      const f2 = makeFilter('peaking', 3400, 2.2, 5.0);
      const tightComb = makeDelay(0.0055, 0.1);
      const tightFb = makeGain(0.34);
      const comp = track(ctx.createDynamicsCompressor());
      comp.threshold.setValueAtTime(-18, startTime);
      comp.ratio.setValueAtTime(6, startTime);

      const conv = track(ctx.createConvolver());
      conv.buffer = getImpulseBuffer(ctx, 'studio');
      const convWet = makeGain(0.24);
      const dry = makeGain(0.85);

      sourceNode.connect(hp);
      hp.connect(f1);
      f1.connect(f2);
      f2.connect(comp);
      comp.connect(dry);
      dry.connect(wetOut);
      comp.connect(tightComb);
      tightComb.connect(tightFb);
      tightFb.connect(tightComb);
      tightComb.connect(wetOut);
      comp.connect(conv);
      conv.connect(convWet);
      convWet.connect(wetOut);
      break;
    }

    case 'glitch': {
      const hp = makeFilter('highpass', 180, 0.9);
      const edge = makeFilter('peaking', 1950, 1.8, 5.5);
      const microComb = makeDelay(0.009, 0.1);
      const microFb = makeGain(0.42);
      const pan = makePan(0);
      if (pan) {
        const panOsc = spawnOsc('triangle', 6.5);
        const panDepth = makeGain(0.65);
        panOsc.connect(panDepth);
        panDepth.connect(pan.pan);
      }

      sourceNode.connect(hp);
      hp.connect(edge);
      edge.connect(microComb);
      microComb.connect(microFb);
      microFb.connect(microComb);

      if (pan) {
        edge.connect(pan);
        microComb.connect(pan);
        pan.connect(wetOut);
      } else {
        edge.connect(wetOut);
        microComb.connect(wetOut);
      }
      break;
    }

    case 'space-alien': {
      const ringOsc = spawnOsc('sine', 38);
      const ringDepth = makeGain(0.42);
      ringOsc.connect(ringDepth);
      const am = makeGain(0.8);
      ringDepth.connect(am.gain);

      const phaser1 = makeFilter('allpass', 650, 2.5);
      const phaser2 = makeFilter('allpass', 1800, 2.5);
      const sweepOsc = spawnOsc('sine', 1.6);
      const sweepDepth = makeGain(950);
      sweepOsc.connect(sweepDepth);
      sweepDepth.connect(phaser1.frequency);
      sweepDepth.connect(phaser2.frequency);

      const cosmicDelay = makeDelay(0.032, 0.25);
      const delayFb = makeGain(0.4);
      const pan = makePan(0);
      if (pan) {
        const panOsc = spawnOsc('sine', 1.4);
        const panDepth = makeGain(0.7);
        panOsc.connect(panDepth);
        panDepth.connect(pan.pan);
      }

      sourceNode.connect(am);
      am.connect(phaser1);
      phaser1.connect(phaser2);
      phaser2.connect(cosmicDelay);
      cosmicDelay.connect(delayFb);
      delayFb.connect(cosmicDelay);

      if (pan) {
        phaser2.connect(pan);
        cosmicDelay.connect(pan);
        pan.connect(wetOut);
      } else {
        phaser2.connect(wetOut);
        cosmicDelay.connect(wetOut);
      }
      break;
    }

    case 'cyborg': {
      const servoOsc = spawnOsc('sawtooth', 82);
      const servoDepth = makeGain(0.36);
      servoOsc.connect(servoDepth);
      const am = makeGain(0.75);
      servoDepth.connect(am.gain);

      const shaper = track(ctx.createWaveShaper());
      shaper.curve = makeAsymmetricDriveCurve(3.2);
      const comb = makeDelay(0.014, 0.15);
      const combFb = makeGain(0.5);
      const subBoost = makeFilter('lowshelf', 180, 1.0, 5.5);

      sourceNode.connect(subBoost);
      subBoost.connect(am);
      am.connect(shaper);
      shaper.connect(comb);
      comb.connect(combFb);
      combFb.connect(comb);
      shaper.connect(wetOut);
      comb.connect(wetOut);
      break;
    }

    // --- CATEGORY C: CINEMATIC & ATMOSPHERIC ---
    case 'demon': {
      const darkShelf = makeFilter('lowshelf', 165, 0.9, 8.0);
      const drive = track(ctx.createWaveShaper());
      drive.curve = makeAsymmetricDriveCurve(4.4);
      drive.oversample = '2x';
      const lp = makeFilter('lowpass', 3100, 0.9);

      const growlLfo = spawnOsc('sine', 24);
      const growlDepth = makeGain(0.3);
      growlLfo.connect(growlDepth);
      const am = makeGain(0.9);
      growlDepth.connect(am.gain);

      const conv = track(ctx.createConvolver());
      conv.buffer = getImpulseBuffer(ctx, 'demon');
      const convWet = makeGain(0.55);
      const direct = makeGain(0.8);

      sourceNode.connect(darkShelf);
      darkShelf.connect(drive);
      drive.connect(lp);
      lp.connect(am);
      am.connect(direct);
      direct.connect(wetOut);
      am.connect(conv);
      conv.connect(convWet);
      convWet.connect(wetOut);
      break;
    }

    case 'ghost': {
      const hp = makeFilter('highpass', 360, 0.9);
      const eerieBand = makeFilter('bandpass', 1650, 0.9);
      const conv = track(ctx.createConvolver());
      conv.buffer = getImpulseBuffer(ctx, 'ghost');
      const reverbWet = makeGain(0.82);

      const echoL = makeDelay(0.13, 0.5);
      const echoR = makeDelay(0.21, 0.5);
      const fbL = makeGain(0.38);
      const fbR = makeGain(0.35);
      const panL = makePan(-0.65);
      const panR = makePan(0.65);
      const dry = makeGain(0.55);

      sourceNode.connect(hp);
      hp.connect(dry);
      dry.connect(wetOut);

      hp.connect(eerieBand);
      eerieBand.connect(conv);
      conv.connect(reverbWet);
      reverbWet.connect(wetOut);

      eerieBand.connect(echoL);
      echoL.connect(fbL);
      fbL.connect(echoL);
      if (panL) {
        echoL.connect(panL);
        panL.connect(wetOut);
      } else {
        echoL.connect(wetOut);
      }

      eerieBand.connect(echoR);
      echoR.connect(fbR);
      fbR.connect(echoR);
      if (panR) {
        echoR.connect(panR);
        panR.connect(wetOut);
      } else {
        echoR.connect(wetOut);
      }
      break;
    }

    case 'horror': {
      const coldHp = makeFilter('highpass', 320, 1.0);
      const darkLp = makeFilter('lowpass', 2900, 0.9);
      const driftDelay = makeDelay(0.022, 0.15);
      const driftLfo = spawnOsc('sine', 4.6);
      const driftDepth = makeGain(0.0055);
      driftLfo.connect(driftDepth);
      driftDepth.connect(driftDelay.delayTime);

      const whisperOsc = spawnOsc('sine', 19);
      const whisperDepth = makeGain(0.26);
      whisperOsc.connect(whisperDepth);
      const am = makeGain(0.85);
      whisperDepth.connect(am.gain);

      const conv = track(ctx.createConvolver());
      conv.buffer = getImpulseBuffer(ctx, 'horror');
      const convWet = makeGain(0.68);
      const dry = makeGain(0.75);

      sourceNode.connect(coldHp);
      coldHp.connect(driftDelay);
      driftDelay.connect(am);
      am.connect(darkLp);
      darkLp.connect(dry);
      dry.connect(wetOut);
      darkLp.connect(conv);
      conv.connect(convWet);
      convWet.connect(wetOut);
      break;
    }

    case 'underwater': {
      const bodyBoost = makeFilter('lowshelf', 190, 1.0, 5.5);
      const lp1 = makeFilter('lowpass', 520, 4.2);
      const lp2 = makeFilter('lowpass', 640, 1.4);
      const bubbleLfo = spawnOsc('sine', 0.85);
      const bubbleDepth = makeGain(220);
      bubbleLfo.connect(bubbleDepth);
      bubbleDepth.connect(lp1.frequency);

      const liquidDelay = makeDelay(0.015, 0.1);
      const wobbleLfo = spawnOsc('sine', 2.2);
      const wobbleDepth = makeGain(0.004);
      wobbleLfo.connect(wobbleDepth);
      wobbleDepth.connect(liquidDelay.delayTime);

      sourceNode.connect(bodyBoost);
      bodyBoost.connect(lp1);
      lp1.connect(lp2);
      lp2.connect(liquidDelay);
      liquidDelay.connect(wetOut);
      break;
    }

    case 'telephone': {
      const hp = makeFilter('highpass', 360, 1.5);
      const lp = makeFilter('lowpass', 3200, 1.7);
      const peak = makeFilter('peaking', 1350, 1.9, 6.5);
      const lineDrive = track(ctx.createWaveShaper());
      lineDrive.curve = makeDistortionCurve(16);
      const leveler = track(ctx.createDynamicsCompressor());
      leveler.threshold.setValueAtTime(-18, startTime);
      leveler.ratio.setValueAtTime(5, startTime);
      sourceNode.connect(hp);
      hp.connect(peak);
      peak.connect(lineDrive);
      lineDrive.connect(lp);
      lp.connect(leveler);
      leveler.connect(wetOut);
      break;
    }

    case 'vintage-radio': {
      const hp = makeFilter('highpass', 260, 1.2);
      const midHump = makeFilter('peaking', 950, 1.3, 5.5);
      const lp = makeFilter('lowpass', 3800, 1.2);
      const tube = track(ctx.createWaveShaper());
      tube.curve = makeAsymmetricDriveCurve(1.9);
      tube.oversample = '2x';
      const room = track(ctx.createConvolver());
      room.buffer = getImpulseBuffer(ctx, 'studio');
      const roomWet = makeGain(0.22);
      const dry = makeGain(0.9);

      sourceNode.connect(hp);
      hp.connect(midHump);
      midHump.connect(tube);
      tube.connect(lp);
      lp.connect(dry);
      dry.connect(wetOut);
      lp.connect(room);
      room.connect(roomWet);
      roomWet.connect(wetOut);
      break;
    }

    // --- CATEGORY D: MUSIC & STUDIO ---
    case 'auto-tune': {
      const hp = makeFilter('highpass', 120, 0.8);
      const sheen = makeFilter('peaking', 3500, 1.2, 4.5);
      const air = makeFilter('highshelf', 8500, 0.7, 3.0);
      const popComp = track(ctx.createDynamicsCompressor());
      popComp.threshold.setValueAtTime(-16, startTime);
      popComp.ratio.setValueAtTime(6.5, startTime);

      const lockDelay = makeDelay(0.0042, 0.05);
      const lockFb = makeGain(0.22);
      const dry = makeGain(0.82);

      sourceNode.connect(hp);
      hp.connect(sheen);
      sheen.connect(air);
      air.connect(popComp);
      popComp.connect(dry);
      dry.connect(wetOut);
      popComp.connect(lockDelay);
      lockDelay.connect(lockFb);
      lockFb.connect(lockDelay);
      lockDelay.connect(wetOut);
      break;
    }

    case 'studio-vocal': {
      const hp = makeFilter('highpass', 95, 0.8);
      const deMud = makeFilter('peaking', 280, 1.2, -2.8);
      const presence = makeFilter('peaking', 3200, 1.1, 3.8);
      const airShelf = makeFilter('highshelf', 9000, 0.7, 4.0);
      const optoComp = track(ctx.createDynamicsCompressor());
      optoComp.threshold.setValueAtTime(-15, startTime);
      optoComp.knee.setValueAtTime(14, startTime);
      optoComp.ratio.setValueAtTime(4.2, startTime);

      const studioConv = track(ctx.createConvolver());
      studioConv.buffer = getImpulseBuffer(ctx, 'studio');
      const roomWet = makeGain(0.22);
      const dry = makeGain(0.95);

      sourceNode.connect(hp);
      hp.connect(deMud);
      deMud.connect(presence);
      presence.connect(airShelf);
      airShelf.connect(optoComp);
      optoComp.connect(dry);
      dry.connect(wetOut);
      optoComp.connect(studioConv);
      studioConv.connect(roomWet);
      roomWet.connect(wetOut);
      break;
    }

    case 'chorus': {
      const dry = makeGain(0.72);
      const sheen = makeFilter('highshelf', 4500, 0.7, 2.5);

      const delayL = makeDelay(0.016, 0.1);
      const lfoL = spawnOsc('sine', 1.15);
      const depthL = makeGain(0.0045);
      lfoL.connect(depthL);
      depthL.connect(delayL.delayTime);
      const panL = makePan(-0.72);
      const gainL = makeGain(0.55);

      const delayR = makeDelay(0.023, 0.1);
      const lfoR = spawnOsc('sine', 1.48);
      const depthR = makeGain(0.0048);
      lfoR.connect(depthR);
      depthR.connect(delayR.delayTime);
      const panR = makePan(0.72);
      const gainR = makeGain(0.55);

      sourceNode.connect(sheen);
      sheen.connect(dry);
      dry.connect(wetOut);

      sheen.connect(delayL);
      delayL.connect(gainL);
      if (panL) {
        gainL.connect(panL);
        panL.connect(wetOut);
      } else {
        gainL.connect(wetOut);
      }

      sheen.connect(delayR);
      delayR.connect(gainR);
      if (panR) {
        gainR.connect(panR);
        panR.connect(wetOut);
      } else {
        gainR.connect(wetOut);
      }
      break;
    }

    case 'megaphone': {
      const hp = makeFilter('highpass', 620, 1.4);
      const hornPeak = makeFilter('peaking', 1750, 2.2, 9.0);
      const lp = makeFilter('lowpass', 3100, 1.5);
      const crunch = track(ctx.createWaveShaper());
      crunch.curve = makeDistortionCurve(58);
      crunch.oversample = '2x';
      const slap = makeDelay(0.042, 0.2);
      const slapGain = makeGain(0.28);
      const direct = makeGain(0.92);

      sourceNode.connect(hp);
      hp.connect(hornPeak);
      hornPeak.connect(crunch);
      crunch.connect(lp);
      lp.connect(direct);
      direct.connect(wetOut);
      lp.connect(slap);
      slap.connect(slapGain);
      slapGain.connect(wetOut);
      break;
    }

    case 'bass-boost': {
      const subShelf = makeFilter('lowshelf', 115, 0.85, 11.0);
      const chest = makeFilter('peaking', 210, 1.1, 4.5);
      const warm = track(ctx.createWaveShaper());
      warm.curve = makeDistortionCurve(10);
      warm.oversample = '2x';
      const tight = track(ctx.createDynamicsCompressor());
      tight.threshold.setValueAtTime(-12, startTime);
      tight.ratio.setValueAtTime(5, startTime);

      sourceNode.connect(subShelf);
      subShelf.connect(chest);
      chest.connect(warm);
      warm.connect(tight);
      tight.connect(wetOut);
      break;
    }

    // --- CATEGORY E: SPECIAL EFFECTS ---
    case 'reverse-echo': {
      const dry = makeGain(0.88);
      const echoL = makeDelay(0.11, 0.4);
      const echoR = makeDelay(0.175, 0.4);
      const fbL = makeGain(0.32);
      const fbR = makeGain(0.32);
      const panL = makePan(-0.55);
      const panR = makePan(0.55);

      const shimmer = track(ctx.createConvolver());
      shimmer.buffer = getImpulseBuffer(ctx, 'ghost');
      const shimmerWet = makeGain(0.28);

      sourceNode.connect(dry);
      dry.connect(wetOut);
      sourceNode.connect(shimmer);
      shimmer.connect(shimmerWet);
      shimmerWet.connect(wetOut);

      sourceNode.connect(echoL);
      echoL.connect(fbL);
      fbL.connect(echoL);
      if (panL) {
        echoL.connect(panL);
        panL.connect(wetOut);
      } else {
        echoL.connect(wetOut);
      }

      sourceNode.connect(echoR);
      echoR.connect(fbR);
      fbR.connect(echoR);
      if (panR) {
        echoR.connect(panR);
        panR.connect(wetOut);
      } else {
        echoR.connect(wetOut);
      }
      break;
    }

    case 'stadium': {
      const paHorn = makeFilter('peaking', 2350, 1.1, 3.8);
      const hp = makeFilter('highpass', 120, 0.8);
      const dry = makeGain(0.75);

      const slapL = makeDelay(0.14, 0.6);
      const slapR = makeDelay(0.24, 0.6);
      const fbL = makeGain(0.32);
      const fbR = makeGain(0.3);
      const panL = makePan(-0.68);
      const panR = makePan(0.68);

      const stadiumConv = track(ctx.createConvolver());
      stadiumConv.buffer = getImpulseBuffer(ctx, 'stadium');
      const convWet = makeGain(0.78);

      sourceNode.connect(hp);
      hp.connect(paHorn);
      paHorn.connect(dry);
      dry.connect(wetOut);

      paHorn.connect(stadiumConv);
      stadiumConv.connect(convWet);
      convWet.connect(wetOut);

      paHorn.connect(slapL);
      slapL.connect(fbL);
      fbL.connect(slapL);
      if (panL) {
        slapL.connect(panL);
        panL.connect(wetOut);
      } else {
        slapL.connect(wetOut);
      }

      paHorn.connect(slapR);
      slapR.connect(fbR);
      fbR.connect(slapR);
      if (panR) {
        slapR.connect(panR);
        panR.connect(wetOut);
      } else {
        slapR.connect(wetOut);
      }
      break;
    }
  }

  // Silence unused helper warning if connectSafe isn't needed externally
  void connectSafe;

  const stopOscillators = () => {
    for (const osc of oscillators) {
      try {
        osc.stop();
      } catch {
        // ignore if already stopped
      }
    }
  };

  const cleanup = () => {
    stopOscillators();
    for (const node of createdNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore already disconnected nodes
      }
    }
  };

  return { stopOscillators, cleanup };
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
  const intensity = settings.intensity ?? 1.0;

  const baseCtx = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    1,
    sampleRate
  );

  const pitchSpeedBuffer = buildPitchSpeedBuffer(
    baseCtx,
    sourceBuffer,
    settings.pitchSemitones,
    settings.speed,
    settings.presetId,
    intensity
  );

  const tailSeconds = getEffectTailSeconds(settings.presetId);
  const tailSamples = Math.floor(sampleRate * tailSeconds);
  const renderLength = pitchSpeedBuffer.length + tailSamples;

  // Stereo output ensures StereoPannerNode effects and stereo reverbs render faithfully
  const outChannels = Math.max(2, pitchSpeedBuffer.numberOfChannels);
  const offlineCtx = new OfflineAudioContext(
    outChannels,
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
    pitchSpeedBuffer.duration,
    intensity
  );

  sourceNode.start(0);
  const renderedBuffer = await offlineCtx.startRendering();
  const wavBytes = encodeWav(renderedBuffer);
  const wavBlob = new Blob([wavBytes.buffer as ArrayBuffer], {
    type: 'audio/wav',
  });

  return { renderedBuffer, wavBlob };
}
