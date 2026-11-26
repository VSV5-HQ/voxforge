import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Download,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Square,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import {
  ABSource,
  describeABMonitorState,
  mapPlaybackPositionOnABSwitch,
  toggleABSource,
} from '../audio/abComparison';
import {
  buildEffectGraph,
  buildPitchSpeedBuffer,
  createDemoClipVariant,
  createDemoVoiceBuffer,
  renderTransformedWav,
} from '../audio/engine';
import {
  buildBatchOutputFilename,
  deduplicateFilenames,
} from '../audio/batch';
import { createZipArchive } from '../audio/zipArchive';
import {
  getPresetById,
  PresetId,
  VOICE_PRESETS,
  VoicePreset,
} from '../audio/presets';
import { clampTrimRange, sliceAudioBuffer } from '../audio/trimmer';
import { computeWaveformPeaks, formatTimecode } from '../audio/waveform';
import { BatchQueueItem, BatchQueuePanel } from './BatchQueuePanel';
import { EffectLibrary } from './EffectLibrary';
import { FrequencySpectrum } from './FrequencySpectrum';
import { WaveformPlayer } from './WaveformPlayer';

type StudioMode = 'single' | 'batch';

interface VoiceStudioProps {
  studioRef?: React.RefObject<HTMLElement | null>;
  demoTrigger?: number;
}

const WAVEFORM_BARS = 84;
const FAVORITES_STORAGE_KEY = 'voxforge_favorite_effects';
const RECENT_STORAGE_KEY = 'voxforge_recent_effects';

function loadStoredPresetIds(key: string): PresetId[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validSet = new Set(VOICE_PRESETS.map((p) => p.id));
    return parsed.filter((id): id is PresetId => validSet.has(id as PresetId));
  } catch {
    return [];
  }
}

export function VoiceStudio({ studioRef, demoTrigger = 0 }: VoiceStudioProps) {
  const [studioMode, setStudioMode] = useState<StudioMode>('single');
  const [sourceBuffer, setSourceBuffer] = useState<AudioBuffer | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<PresetId>('normal');
  const [pitchSemitones, setPitchSemitones] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [effectIntensity, setEffectIntensity] = useState<number>(1.0);
  const [abMode, setAbMode] = useState<ABSource>('processed');

  const [favoriteIds, setFavoriteIds] = useState<PresetId[]>(() =>
    loadStoredPresetIds(FAVORITES_STORAGE_KEY)
  );
  const [recentIds, setRecentIds] = useState<PresetId[]>(() =>
    loadStoredPresetIds(RECENT_STORAGE_KEY)
  );
  const [previewingPresetId, setPreviewingPresetId] = useState<PresetId | null>(
    null
  );

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [liveLevels, setLiveLevels] = useState<number[]>([]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Batch queue state
  const [batchItems, setBatchItems] = useState<BatchQueueItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [isDecodingBatch, setIsDecodingBatch] = useState<boolean>(false);
  const [previewingBatchId, setPreviewingBatchId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active playback refs
  const playbackRef = useRef<{
    source: AudioBufferSourceNode;
    stopOscillators: () => void;
    startedAtCtxTime: number;
    offsetAtStart: number;
    duration: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Active recording refs
  const recordingRef = useRef<{
    mediaRecorder: MediaRecorder;
    stream: MediaStream;
    streamSource: MediaStreamAudioSourceNode;
    chunks: Blob[];
    analyser: AnalyserNode;
    timerInterval: number;
    levelRaf: number;
  } | null>(null);

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const getPlaybackAnalyser = useCallback((ctx: AudioContext): AnalyserNode => {
    if (
      !playbackAnalyserRef.current ||
      playbackAnalyserRef.current.context !== ctx
    ) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      analyser.connect(ctx.destination);
      playbackAnalyserRef.current = analyser;
    }
    return playbackAnalyserRef.current;
  }, []);

  // Defer DSP slider updates so dragging trim/pitch/speed/intensity stays smooth on mobile & desktop
  const deferredTrimStart = useDeferredValue(trimStart);
  const deferredTrimEnd = useDeferredValue(trimEnd);
  const deferredPitchSemitones = useDeferredValue(pitchSemitones);
  const deferredSpeed = useDeferredValue(speed);
  const deferredIntensity = useDeferredValue(effectIntensity);

  // Slice active trim region before applying pitch, speed, and voice effects
  const trimmedSourceBuffer = useMemo(() => {
    if (!sourceBuffer) return null;
    return sliceAudioBuffer(null, sourceBuffer, deferredTrimStart, deferredTrimEnd);
  }, [sourceBuffer, deferredTrimStart, deferredTrimEnd]);

  // Precompute processed pitch/speed/pre-DSP AudioBuffer separately from A/B monitor state
  // so toggling between Original (A) and Processed (B) is instantaneous with zero DSP lag
  const processedWetBuffer = useMemo(() => {
    if (!trimmedSourceBuffer) return null;
    return buildPitchSpeedBuffer(
      null,
      trimmedSourceBuffer,
      deferredPitchSemitones,
      deferredSpeed,
      activePreset,
      deferredIntensity
    );
  }, [
    trimmedSourceBuffer,
    deferredPitchSemitones,
    deferredSpeed,
    activePreset,
    deferredIntensity,
  ]);

  const activePlaybackBuffer =
    abMode === 'original' ? trimmedSourceBuffer : processedWetBuffer;

  const effectiveDuration = activePlaybackBuffer?.duration ?? 0;

  const waveformPeaks = useMemo(() => {
    if (!sourceBuffer) return [];
    return computeWaveformPeaks(sourceBuffer.getChannelData(0), WAVEFORM_BARS);
  }, [sourceBuffer]);

  const stopPlayback = useCallback((resetPosition = false) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (playbackRef.current) {
      const { source, stopOscillators } = playbackRef.current;
      playbackRef.current = null;
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch {
        // ignore already stopped
      }
      stopOscillators();
    }
    setIsPlaying(false);
    setPreviewingBatchId(null);
    setPreviewingPresetId(null);
    if (resetPosition) {
      setCurrentTime(0);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback(false);
      if (recordingRef.current) {
        clearInterval(recordingRef.current.timerInterval);
        cancelAnimationFrame(recordingRef.current.levelRaf);
        try {
          recordingRef.current.streamSource.disconnect();
        } catch {
          // ignore disconnect errors
        }
        recordingRef.current.stream.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close();
      }
    };
  }, [stopPlayback]);

  const startPlaybackFrom = useCallback(
    (startOffsetSeconds: number, overrideMode?: ABSource) => {
      const targetMode = overrideMode ?? abMode;
      const targetBuffer =
        targetMode === 'original' ? trimmedSourceBuffer : processedWetBuffer;
      if (!targetBuffer) return;

      stopPlayback(false);
      const ctx = getAudioContext();

      const safeOffset = Math.max(
        0,
        Math.min(startOffsetSeconds, Math.max(0, targetBuffer.duration - 0.05))
      );

      const source = ctx.createBufferSource();
      source.buffer = targetBuffer;

      const effectMode: PresetId = targetMode === 'original' ? 'normal' : activePreset;
      const now = ctx.currentTime;
      const remaining = Math.max(0.05, targetBuffer.duration - safeOffset);
      const analyser = getPlaybackAnalyser(ctx);

      // Brief 12ms fade-in prevents clicks during rapid live A/B switching
      const antiClickGain = ctx.createGain();
      antiClickGain.gain.setValueAtTime(0.01, now);
      antiClickGain.gain.linearRampToValueAtTime(1.0, now + 0.012);
      antiClickGain.connect(analyser);

      const activeGraphIntensity = targetMode === 'original' ? 1.0 : effectIntensity;
      const { cleanup } = buildEffectGraph(
        ctx,
        source,
        antiClickGain,
        effectMode,
        now,
        remaining,
        activeGraphIntensity
      );

      playbackRef.current = {
        source,
        stopOscillators: () => {
          cleanup();
          try {
            antiClickGain.disconnect();
          } catch {
            // ignore disconnect on closed context
          }
        },
        startedAtCtxTime: now,
        offsetAtStart: safeOffset,
        duration: targetBuffer.duration,
      };

      source.onended = () => {
        if (playbackRef.current?.source === source) {
          stopPlayback(true);
        }
      };

      source.start(now, safeOffset);
      setIsPlaying(true);
      setCurrentTime(safeOffset);

      const tick = () => {
        if (!playbackRef.current || !audioCtxRef.current) return;
        const elapsed =
          audioCtxRef.current.currentTime -
          playbackRef.current.startedAtCtxTime;
        const pos = playbackRef.current.offsetAtStart + elapsed;
        if (pos >= playbackRef.current.duration) {
          stopPlayback(true);
          return;
        }
        setCurrentTime(pos);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [
      abMode,
      trimmedSourceBuffer,
      processedWetBuffer,
      activePreset,
      effectIntensity,
      getAudioContext,
      getPlaybackAnalyser,
      stopPlayback,
    ]
  );

  const switchABMode = useCallback(
    (nextMode: ABSource) => {
      if (nextMode === abMode || !trimmedSourceBuffer || !processedWetBuffer) {
        return;
      }

      const prevDuration =
        abMode === 'original'
          ? trimmedSourceBuffer.duration
          : processedWetBuffer.duration;
      const nextDuration =
        nextMode === 'original'
          ? trimmedSourceBuffer.duration
          : processedWetBuffer.duration;

      const livePos =
        isPlaying && playbackRef.current && audioCtxRef.current
          ? playbackRef.current.offsetAtStart +
            (audioCtxRef.current.currentTime -
              playbackRef.current.startedAtCtxTime)
          : currentTime;

      const mappedOffset = mapPlaybackPositionOnABSwitch(
        livePos,
        prevDuration,
        nextDuration
      );

      setAbMode(nextMode);
      if (isPlaying) {
        startPlaybackFrom(mappedOffset, nextMode);
      } else {
        setCurrentTime(mappedOffset);
      }
    },
    [
      abMode,
      trimmedSourceBuffer,
      processedWetBuffer,
      isPlaying,
      currentTime,
      startPlaybackFrom,
    ]
  );

  // Keyboard shortcut: press "C" to flip A/B quickly when audio is loaded
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        studioMode !== 'single' ||
        !sourceBuffer ||
        isRecording ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        switchABMode(toggleABSource(abMode));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studioMode, sourceBuffer, isRecording, abMode, switchABMode]);

  const togglePlayPause = () => {
    if (!activePlaybackBuffer) return;
    if (isPlaying) {
      stopPlayback(false);
    } else {
      const startAt =
        currentTime >= effectiveDuration - 0.05 ? 0 : currentTime;
      startPlaybackFrom(startAt);
    }
  };

  const handleSeek = (timeSeconds: number) => {
    setCurrentTime(timeSeconds);
    if (isPlaying) {
      startPlaybackFrom(timeSeconds);
    }
  };

  // Mark ready batch items as needing re-apply when effect settings change
  const markBatchOutdated = useCallback(() => {
    setBatchItems((prev) =>
      prev.map((item) =>
        item.status === 'ready' ? { ...item, status: 'outdated' } : item
      )
    );
  }, []);

  const handleToggleFavorite = useCallback((presetId: PresetId) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(presetId)
        ? prev.filter((id) => id !== presetId)
        : [presetId, ...prev];
      try {
        window.localStorage.setItem(
          FAVORITES_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const recordRecentPreset = useCallback((presetId: PresetId) => {
    setRecentIds((prev) => {
      const next = [presetId, ...prev.filter((id) => id !== presetId)].slice(
        0,
        6
      );
      try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const handleSelectPreset = useCallback(
    (presetId: PresetId) => {
      const preset = getPresetById(presetId);
      setActivePreset(preset.id);
      setPitchSemitones(preset.pitchSemitones);
      setSpeed(preset.speed);
      setEffectIntensity(preset.defaultIntensity ?? 1.0);
      setAbMode('processed');
      setErrorMessage(null);
      markBatchOutdated();
      recordRecentPreset(preset.id);
      setStatusMessage(`Applied ${preset.name} effect.`);
    },
    [markBatchOutdated, recordRecentPreset]
  );

  const handlePreviewPresetCard = useCallback(
    (preset: VoicePreset) => {
      if (previewingPresetId === preset.id) {
        stopPlayback(false);
        return;
      }

      stopPlayback(false);
      setErrorMessage(null);
      const ctx = getAudioContext();

      let baseClip = trimmedSourceBuffer;
      if (!baseClip) {
        const demo = createDemoVoiceBuffer(ctx);
        setSourceBuffer(demo);
        setSourceName('Studio Demo Voice Clip');
        setTrimStart(0);
        setTrimEnd(Math.round(demo.duration * 100) / 100);
        baseClip = demo;
      }

      const previewBuf = buildPitchSpeedBuffer(
        ctx,
        baseClip,
        preset.pitchSemitones,
        preset.speed,
        preset.id,
        1.0
      );

      const source = ctx.createBufferSource();
      source.buffer = previewBuf;
      const now = ctx.currentTime;
      const analyser = getPlaybackAnalyser(ctx);

      const antiClick = ctx.createGain();
      antiClick.gain.setValueAtTime(0.01, now);
      antiClick.gain.linearRampToValueAtTime(1.0, now + 0.012);
      antiClick.connect(analyser);

      const { cleanup } = buildEffectGraph(
        ctx,
        source,
        antiClick,
        preset.id,
        now,
        previewBuf.duration,
        1.0
      );

      playbackRef.current = {
        source,
        stopOscillators: () => {
          cleanup();
          try {
            antiClick.disconnect();
          } catch {
            // ignore disconnect errors
          }
        },
        startedAtCtxTime: now,
        offsetAtStart: 0,
        duration: previewBuf.duration,
      };

      source.onended = () => {
        if (playbackRef.current?.source === source) {
          stopPlayback(false);
        }
      };

      source.start(now);
      setIsPlaying(true);
      setPreviewingPresetId(preset.id);
      setStatusMessage(`Previewing ${preset.name}...`);
    },
    [
      previewingPresetId,
      trimmedSourceBuffer,
      getAudioContext,
      getPlaybackAnalyser,
      stopPlayback,
    ]
  );

  // If user tweaks preset/sliders/trim while playing, stop playback cleanly so they don't hear stale buffer
  useEffect(() => {
    if (isPlaying || previewingBatchId !== null || previewingPresetId !== null) {
      stopPlayback(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePreset, pitchSemitones, speed, effectIntensity, trimStart, trimEnd]);

  const handleLoadDemo = useCallback(() => {
    stopPlayback(true);
    setErrorMessage(null);
    const ctx = getAudioContext();
    const demo = createDemoVoiceBuffer(ctx);
    setSourceBuffer(demo);
    setSourceName('Studio Demo Voice Clip');
    setTrimStart(0);
    setTrimEnd(Math.round(demo.duration * 100) / 100);
    setAbMode('processed');
    setCurrentTime(0);
    setStatusMessage(
      'Demo voice clip loaded. Pick any preset or press Play Preview.'
    );
  }, [getAudioContext, stopPlayback]);

  useEffect(() => {
    if (demoTrigger > 0) {
      handleLoadDemo();
    }
  }, [demoTrigger, handleLoadDemo]);

  const decodeAudioFile = async (file: File) => {
    stopPlayback(true);
    setErrorMessage(null);
    setStatusMessage(null);

    if (file.size === 0) {
      setErrorMessage('That audio file is empty. Please choose a valid MP3 or WAV recording.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage('File is larger than 100 MB. Please choose a shorter clip.');
      return;
    }

    setIsDecoding(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      setSourceBuffer(decoded);
      setSourceName(file.name);
      setTrimStart(0);
      setTrimEnd(Math.round(decoded.duration * 100) / 100);
      setAbMode('processed');
      setCurrentTime(0);
      setStatusMessage(`Loaded "${file.name}" (${formatTimecode(decoded.duration)}).`);
    } catch {
      setErrorMessage(
        'Could not decode that audio file. Please upload a valid MP3, WAV, OGG, or M4A recording.'
      );
    } finally {
      setIsDecoding(false);
    }
  };

  const addFilesToBatch = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setErrorMessage(null);
    setIsDecodingBatch(true);
    const ctx = getAudioContext();
    const added: BatchQueueItem[] = [];
    const failedNames: string[] = [];

    for (const file of list) {
      if (file.size === 0 || file.size > 100 * 1024 * 1024) {
        failedNames.push(file.name);
        continue;
      }
      try {
        const buf = await file.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf.slice(0));
        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          originalName: file.name,
          sourceBuffer: decoded,
          status: 'queued',
        });
      } catch {
        failedNames.push(file.name);
      }
    }

    if (added.length > 0) {
      setBatchItems((prev) => [...prev, ...added]);
      setStatusMessage(
        `Added ${added.length} ${added.length === 1 ? 'file' : 'files'} to the batch queue.`
      );
    }
    if (failedNames.length > 0) {
      setErrorMessage(
        `Could not decode: ${failedNames.join(', ')}. Please use MP3, WAV, OGG, or M4A.`
      );
    }
    setIsDecodingBatch(false);
  };

  const handleLoadDemoBatch = () => {
    stopPlayback(true);
    setErrorMessage(null);
    const ctx = getAudioContext();
    const demoSpecs: Array<{ name: string; variant: 0 | 1 | 2 }> = [
      { name: '01-intro-greeting.wav', variant: 0 },
      { name: '02-radio-callout.wav', variant: 1 },
      { name: '03-outro-narration.wav', variant: 2 },
    ];
    const items: BatchQueueItem[] = demoSpecs.map((spec) => ({
      id: `demo-${spec.variant}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      originalName: spec.name,
      sourceBuffer: createDemoClipVariant(ctx, spec.variant),
      status: 'queued',
    }));
    setBatchItems(items);
    setStatusMessage(
      'Loaded 3 demo clips into the batch queue. Choose an effect and click Apply Effects to All.'
    );
  };

  const handleProcessBatchAll = async () => {
    if (batchItems.length === 0 || isBatchProcessing) return;
    stopPlayback(true);
    setErrorMessage(null);
    setIsBatchProcessing(true);

    const rawNames = batchItems.map((item) =>
      buildBatchOutputFilename(item.originalName, activePreset)
    );
    const uniqueNames = deduplicateFilenames(rawNames);
    let successCount = 0;

    for (let i = 0; i < batchItems.length; i++) {
      const target = batchItems[i];
      setBatchItems((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? { ...item, status: 'processing', errorMessage: undefined }
            : item
        )
      );

      try {
        const { renderedBuffer, wavBlob } = await renderTransformedWav(
          target.sourceBuffer,
          {
            presetId: activePreset,
            pitchSemitones,
            speed,
            intensity: effectIntensity,
          }
        );
        successCount += 1;
        setBatchItems((prev) =>
          prev.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  status: 'ready',
                  renderedBuffer,
                  wavBlob,
                  outputFilename: uniqueNames[i],
                }
              : item
          )
        );
      } catch {
        setBatchItems((prev) =>
          prev.map((item) =>
            item.id === target.id
              ? {
                  ...item,
                  status: 'error',
                  errorMessage: 'Render failed',
                }
              : item
          )
        );
      }
    }

    setIsBatchProcessing(false);
    setStatusMessage(
      `Processed ${successCount} of ${batchItems.length} files with ${getPresetById(activePreset).name}. Ready to download.`
    );
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadBatchItem = (item: BatchQueueItem) => {
    if (!item.wavBlob) return;
    const filename =
      item.outputFilename ??
      buildBatchOutputFilename(item.originalName, activePreset);
    triggerBlobDownload(item.wavBlob, filename);
    setStatusMessage(`Downloaded ${filename}.`);
  };

  const handleDownloadBatchZip = async () => {
    const ready = batchItems.filter((i) => i.status === 'ready' && i.wavBlob);
    if (ready.length === 0) return;

    const entries = await Promise.all(
      ready.map(async (item) => ({
        filename:
          item.outputFilename ??
          buildBatchOutputFilename(item.originalName, activePreset),
        data: new Uint8Array(await item.wavBlob!.arrayBuffer()),
      }))
    );

    const zipBytes = createZipArchive(entries);
    const zipBlob = new Blob([zipBytes.buffer as ArrayBuffer], {
      type: 'application/zip',
    });
    const zipName = `voxnexa-batch-${activePreset}.zip`;
    triggerBlobDownload(zipBlob, zipName);
    const kb = Math.max(1, Math.round(zipBlob.size / 1024));
    setStatusMessage(`Downloaded ${zipName} (${ready.length} WAVs · ${kb} KB).`);
  };

  const handlePreviewBatchItem = (item: BatchQueueItem) => {
    if (previewingBatchId === item.id) {
      stopPlayback(false);
      return;
    }

    stopPlayback(false);
    const ctx = getAudioContext();
    const analyser = getPlaybackAnalyser(ctx);

    if (item.status === 'ready' && item.renderedBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = item.renderedBuffer;
      source.connect(analyser);
      playbackRef.current = {
        source,
        stopOscillators: () => {},
        startedAtCtxTime: ctx.currentTime,
        offsetAtStart: 0,
        duration: item.renderedBuffer.duration,
      };
      source.onended = () => {
        if (playbackRef.current?.source === source) {
          stopPlayback(false);
        }
      };
      source.start(ctx.currentTime);
      setPreviewingBatchId(item.id);
    } else {
      const shifted = buildPitchSpeedBuffer(
        ctx,
        item.sourceBuffer,
        pitchSemitones,
        speed,
        activePreset,
        effectIntensity
      );
      const source = ctx.createBufferSource();
      source.buffer = shifted;
      const now = ctx.currentTime;
      const { cleanup } = buildEffectGraph(
        ctx,
        source,
        analyser,
        activePreset,
        now,
        shifted.duration,
        effectIntensity
      );
      playbackRef.current = {
        source,
        stopOscillators: cleanup,
        startedAtCtxTime: now,
        offsetAtStart: 0,
        duration: shifted.duration,
      };
      source.onended = () => {
        if (playbackRef.current?.source === source) {
          stopPlayback(false);
        }
      };
      source.start(now);
      setPreviewingBatchId(item.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 1) {
      setStudioMode('batch');
      void addFilesToBatch(files);
    } else if (files?.[0]) {
      if (studioMode === 'batch') {
        void addFilesToBatch(files);
      } else {
        void decodeAudioFile(files[0]);
      }
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 1) {
      setStudioMode('batch');
      void addFilesToBatch(files);
    } else if (files?.[0]) {
      if (studioMode === 'batch') {
        void addFilesToBatch(files);
      } else {
        void decodeAudioFile(files[0]);
      }
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    stopPlayback(true);
    setErrorMessage(null);
    setStatusMessage(null);

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setErrorMessage(
        'Microphone recording is not supported in this browser. You can still upload an MP3/WAV file or try the demo clip.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = getAudioContext();
      const streamSource = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      streamSource.connect(analyser);

      const mimeType =
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder.isTypeSupported === 'function' &&
            MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          streamSource.disconnect();
        } catch {
          // ignore disconnect errors
        }
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length === 0) {
          setErrorMessage('No audio was captured. Please try recording again.');
          return;
        }
        setIsDecoding(true);
        try {
          const blob = new Blob(chunks, {
            type: mediaRecorder.mimeType || 'audio/webm',
          });
          const buf = await blob.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf.slice(0));
          if (decoded.duration < 0.05) {
            setErrorMessage('Recording was too short. Please record for at least half a second.');
            return;
          }
          setSourceBuffer(decoded);
          setSourceName('Microphone Recording');
          setTrimStart(0);
          setTrimEnd(Math.round(decoded.duration * 100) / 100);
          setAbMode('processed');
          setCurrentTime(0);
          setStatusMessage(
            `Recorded ${formatTimecode(decoded.duration)} from microphone.`
          );
        } catch {
          setErrorMessage(
            'Unable to decode the recorded microphone audio in this browser.'
          );
        } finally {
          setIsDecoding(false);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      const startedAt = Date.now();
      const timerInterval = window.setInterval(() => {
        setRecordingSeconds((Date.now() - startedAt) / 1000);
      }, 100);

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      let lastMeterSample = 0;
      const sampleMeter = (timestamp: number) => {
        if (timestamp - lastMeterSample >= 33) {
          lastMeterSample = timestamp;
          analyser.getByteFrequencyData(freqData);
          const bars: number[] = [];
          const step = Math.max(1, Math.floor(freqData.length / 48));
          for (let i = 0; i < 48; i++) {
            const val = freqData[Math.min(freqData.length - 1, i * step)] / 255;
            bars.push(val);
          }
          setLiveLevels(bars);
        }
        if (recordingRef.current) {
          recordingRef.current.levelRaf = requestAnimationFrame(sampleMeter);
        }
      };

      recordingRef.current = {
        mediaRecorder,
        stream,
        streamSource,
        chunks,
        analyser,
        timerInterval,
        levelRaf: 0,
      };
      recordingRef.current.levelRaf = requestAnimationFrame(sampleMeter);
    } catch (err) {
      const errName = (err as { name?: string } | null)?.name ?? '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setErrorMessage(
          'Microphone permission was denied. Allow microphone access in your browser site settings, or upload an MP3/WAV file instead.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMessage(
          'No microphone device was detected. Connect a microphone or upload an MP3/WAV file instead.'
        );
      } else {
        setErrorMessage(
          'Unable to access the microphone. Check browser permissions or upload an audio file instead.'
        );
      }
    }
  };

  const stopRecording = () => {
    if (!recordingRef.current) return;
    const { mediaRecorder, streamSource, timerInterval, levelRaf } = recordingRef.current;
    clearInterval(timerInterval);
    cancelAnimationFrame(levelRaf);
    try {
      streamSource.disconnect();
    } catch {
      // ignore disconnect errors
    }
    recordingRef.current = null;
    setIsRecording(false);
    setLiveLevels([]);
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  const handleExportWav = async () => {
    if (!sourceBuffer || isExporting) return;
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const sliceForExport = sliceAudioBuffer(null, sourceBuffer, trimStart, trimEnd);
      const { wavBlob } = await renderTransformedWav(sliceForExport, {
        presetId: activePreset,
        pitchSemitones,
        speed,
        intensity: effectIntensity,
      });

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      const slug = activePreset;
      a.download = `voxnexa-${slug}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const kb = Math.max(1, Math.round(wavBlob.size / 1024));
      setStatusMessage(`Exported voxnexa-${slug}.wav (${kb} KB).`);
    } catch {
      setErrorMessage('Failed to export WAV file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAudio = () => {
    stopPlayback(true);
    setSourceBuffer(null);
    setSourceName(null);
    setTrimStart(0);
    setTrimEnd(0);
    setAbMode('processed');
    setCurrentTime(0);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const sourceDuration = sourceBuffer?.duration ?? 0;
  const trimStartRatio = sourceDuration > 0 ? trimStart / sourceDuration : 0;
  const trimEndRatio = sourceDuration > 0 ? trimEnd / sourceDuration : 1;
  const isTrimActive =
    sourceDuration > 0 &&
    (trimStart > 0.05 || trimEnd < sourceDuration - 0.05);

  const handleTrimStartChange = (nextStart: number) => {
    if (!sourceBuffer) return;
    const clamped = clampTrimRange(nextStart, trimEnd, sourceBuffer.duration, 0.2);
    setTrimStart(clamped.startSec);
    setTrimEnd(clamped.endSec);
    setCurrentTime(0);
  };

  const handleTrimEndChange = (nextEnd: number) => {
    if (!sourceBuffer) return;
    const clamped = clampTrimRange(trimStart, nextEnd, sourceBuffer.duration, 0.2);
    setTrimStart(clamped.startSec);
    setTrimEnd(clamped.endSec);
    setCurrentTime(0);
  };

  const handleResetTrim = () => {
    if (!sourceBuffer) return;
    setTrimStart(0);
    setTrimEnd(Math.round(sourceBuffer.duration * 100) / 100);
    setCurrentTime(0);
  };

  const activePresetObj = getPresetById(activePreset);
  const isCustomSliders =
    pitchSemitones !== activePresetObj.pitchSemitones ||
    Math.abs(speed - activePresetObj.speed) > 0.005;
  const abDisplay = describeABMonitorState(
    abMode,
    activePresetObj.name,
    pitchSemitones,
    speed
  );

  return (
    <section
      ref={studioRef}
      id="voice-studio"
      aria-label="Voice Changer Studio"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border bg-white p-5 sm:p-7 transition-colors ${
        isDragOver ? 'border-blue-600 bg-blue-50/30' : 'border-slate-200'
      }`}
    >
      {/* Top Studio Input Strip */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 min-w-0">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
              Audio Workbench
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {studioMode === 'single'
                ? 'Record from your mic, upload MP3/WAV, or try the demo clip.'
                : 'Queue multiple audio clips and apply one effect profile to all.'}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Workbench mode"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={studioMode === 'single'}
              onClick={() => {
                stopPlayback(false);
                setStudioMode('single');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                studioMode === 'single'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Single Clip
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={studioMode === 'batch'}
              onClick={() => {
                stopPlayback(false);
                setStudioMode('batch');
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                studioMode === 'batch'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Batch Queue{batchItems.length > 0 ? ` (${batchItems.length})` : ''}
            </button>
          </div>
        </div>

        {studioMode === 'single' && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                Record Voice
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                Stop Recording ({formatTimecode(recordingSeconds)})
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload MP3 or WAV audio file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording || isDecoding}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-slate-600" aria-hidden="true" />
              {isDecoding ? 'Decoding...' : 'Upload MP3 / WAV'}
            </button>

            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isRecording || isDecoding}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Volume2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Try Demo Voice
            </button>

            {sourceBuffer && (
              <button
                type="button"
                onClick={handleClearAudio}
                aria-label="Clear loaded audio"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-200 min-h-[44px] min-w-[44px] cursor-pointer"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline Feedback Banner */}
      {(errorMessage || statusMessage) && (
        <div
          role={errorMessage ? 'alert' : 'status'}
          className={`mt-4 rounded-lg border px-4 py-2.5 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {errorMessage ?? statusMessage}
        </div>
      )}

      {/* Single Waveform Player OR Batch Queue Panel */}
      {studioMode === 'single' ? (
        <div className="mt-5">
          <WaveformPlayer
            peaks={waveformPeaks}
            duration={effectiveDuration}
            currentTime={currentTime}
            isPlaying={isPlaying}
            isRecording={isRecording}
            liveLevels={liveLevels}
            sampleRate={sourceBuffer?.sampleRate ?? null}
            sourceName={sourceName}
            trimStartRatio={trimStartRatio}
            trimEndRatio={trimEndRatio}
            onSeek={handleSeek}
          />

          {/* Simple Audio Trimming Bar */}
          {sourceBuffer && !isRecording && (
            <div
              aria-label="Audio trim controls"
              className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3"
            >
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                  <Scissors className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                  <span>Trim Audio</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    data-testid="trim-selection-readout"
                    className="font-mono-num text-slate-600"
                  >
                    Selected: {formatTimecode(Math.max(0, trimEnd - trimStart))}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetTrim}
                    disabled={!isTrimActive}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline underline-offset-4 disabled:text-slate-400 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    Reset Trim
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <label htmlFor="trim-start-slider" className="font-medium text-slate-700">
                      Start Time
                    </label>
                    <span
                      data-testid="trim-start-readout"
                      className="font-mono-num font-semibold text-slate-900"
                    >
                      {formatTimecode(trimStart)}
                    </span>
                  </div>
                  <input
                    id="trim-start-slider"
                    type="range"
                    min={0}
                    max={Math.max(0.2, Math.round(sourceDuration * 100) / 100)}
                    step={0.01}
                    value={trimStart}
                    onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                    className="studio-slider w-full cursor-pointer"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <label htmlFor="trim-end-slider" className="font-medium text-slate-700">
                      End Time
                    </label>
                    <span
                      data-testid="trim-end-readout"
                      className="font-mono-num font-semibold text-slate-900"
                    >
                      {formatTimecode(trimEnd)}
                    </span>
                  </div>
                  <input
                    id="trim-end-slider"
                    type="range"
                    min={0}
                    max={Math.max(0.2, Math.round(sourceDuration * 100) / 100)}
                    step={0.01}
                    value={trimEnd}
                    onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                    className="studio-slider w-full cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          <FrequencySpectrum
            analyserRef={playbackAnalyserRef}
            isActive={isPlaying}
            sampleRate={
              sourceBuffer?.sampleRate ?? audioCtxRef.current?.sampleRate ?? 44100
            }
            monitoringLabel={
              sourceBuffer && !isRecording ? abDisplay.title : undefined
            }
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={togglePlayPause}
                disabled={!activePlaybackBuffer || isRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                    Pause Preview
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    Play Preview
                  </>
                )}
              </button>

              <div
                role="group"
                aria-label="A/B audio comparison"
                className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 min-h-[44px] shrink-0"
              >
                <button
                  type="button"
                  data-testid="ab-original-btn"
                  onClick={() => switchABMode('original')}
                  disabled={!sourceBuffer || isRecording}
                  aria-pressed={abMode === 'original'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap min-h-[34px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    abMode === 'original'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <span
                    className={`font-mono-num ${
                      abMode === 'original' ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    A
                  </span>
                  <span>Original</span>
                </button>
                <button
                  type="button"
                  data-testid="ab-processed-btn"
                  onClick={() => switchABMode('processed')}
                  disabled={!sourceBuffer || isRecording}
                  aria-pressed={abMode === 'processed'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap min-h-[34px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    abMode === 'processed'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  <span
                    className={`font-mono-num ${
                      abMode === 'processed' ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    B
                  </span>
                  <span>Processed</span>
                </button>
              </div>

              <button
                type="button"
                data-testid="ab-quick-toggle"
                onClick={() => switchABMode(toggleABSource(abMode))}
                disabled={!sourceBuffer || isRecording}
                aria-label="Toggle A/B original and processed audio"
                aria-keyshortcuts="c"
                title="Quick toggle A/B (Shortcut: C)"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:opacity-40 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                <span>A/B</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportWav}
              disabled={!sourceBuffer || isRecording || isExporting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isExporting ? 'Rendering WAV...' : 'Download WAV'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <BatchQueuePanel
            items={batchItems}
            activePresetName={activePresetObj.name}
            pitchSemitones={pitchSemitones}
            speed={speed}
            intensity={effectIntensity}
            isBatchProcessing={isBatchProcessing}
            isDecodingBatch={isDecodingBatch}
            previewingId={previewingBatchId}
            onAddFiles={(files) => void addFilesToBatch(files)}
            onLoadDemoBatch={handleLoadDemoBatch}
            onProcessAll={() => void handleProcessBatchAll()}
            onDownloadItem={handleDownloadBatchItem}
            onDownloadAllZip={() => void handleDownloadBatchZip()}
            onPreviewItem={handlePreviewBatchItem}
            onRemoveItem={(id) => {
              if (previewingBatchId === id) stopPlayback(false);
              setBatchItems((prev) => prev.filter((item) => item.id !== id));
            }}
            onClearQueue={() => {
              stopPlayback(false);
              setBatchItems([]);
              setStatusMessage(null);
            }}
          />

          {previewingBatchId !== null && (
            <FrequencySpectrum
              analyserRef={playbackAnalyserRef}
              isActive={true}
              sampleRate={audioCtxRef.current?.sampleRate ?? 44100}
            />
          )}
        </div>
      )}

      {/* Effect Library & Manual Sliders */}
      <div className="mt-7 grid grid-cols-1 gap-8 border-t border-slate-200 pt-7 lg:grid-cols-12">
        {/* Searchable Categorized 32-Effect Library (8 cols) */}
        <div className="lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Voice Effect Library ({VOICE_PRESETS.length})
            </h3>
            <span className="text-xs text-slate-500">
              Active:{' '}
              <strong className="font-semibold text-slate-800">
                {activePresetObj.name}
              </strong>
              {isCustomSliders ? ' · Tuned' : ''}
            </span>
          </div>

          <EffectLibrary
            activePreset={activePreset}
            previewingPresetId={previewingPresetId}
            favoriteIds={favoriteIds}
            recentIds={recentIds}
            onPreviewPreset={handlePreviewPresetCard}
            onApplyPreset={(preset) => handleSelectPreset(preset.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        {/* Manual Pitch, Speed & Intensity Sliders (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start lg:border-l lg:border-slate-200 lg:pl-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Manual Controls
            </h3>
            <button
              type="button"
              onClick={() => handleSelectPreset(activePreset)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline underline-offset-4 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset to Preset
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <label
                  htmlFor="pitch-slider"
                  className="font-medium text-slate-800"
                >
                  Pitch Shift
                </label>
                <span
                  data-testid="pitch-readout"
                  className="font-mono-num text-sm font-semibold text-slate-900"
                >
                  {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} st
                </span>
              </div>
              <input
                id="pitch-slider"
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={pitchSemitones}
                onChange={(e) => {
                  setAbMode('processed');
                  setPitchSemitones(parseFloat(e.target.value));
                  markBatchOutdated();
                }}
                className="studio-slider w-full cursor-pointer"
              />
              <div className="mt-1.5 flex justify-between font-mono-num text-[11px] text-slate-400">
                <span>-12 st</span>
                <span>0 st</span>
                <span>+12 st</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <label
                  htmlFor="speed-slider"
                  className="font-medium text-slate-800"
                >
                  Playback Speed
                </label>
                <span
                  data-testid="speed-readout"
                  className="font-mono-num text-sm font-semibold text-slate-900"
                >
                  {speed.toFixed(2)}x
                </span>
              </div>
              <input
                id="speed-slider"
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={speed}
                onChange={(e) => {
                  setAbMode('processed');
                  setSpeed(parseFloat(e.target.value));
                  markBatchOutdated();
                }}
                className="studio-slider w-full cursor-pointer"
              />
              <div className="mt-1.5 flex justify-between font-mono-num text-[11px] text-slate-400">
                <span>0.50x</span>
                <span>1.00x</span>
                <span>2.00x</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <label
                  htmlFor="intensity-slider"
                  className="font-medium text-slate-800"
                >
                  Effect Intensity
                </label>
                <span
                  data-testid="intensity-readout"
                  className="font-mono-num text-sm font-semibold text-slate-900"
                >
                  {activePreset === 'normal'
                    ? 'Clean'
                    : `${Math.round(effectIntensity * 100)}%`}
                </span>
              </div>
              <input
                id="intensity-slider"
                type="range"
                min={0}
                max={100}
                step={5}
                disabled={activePreset === 'normal'}
                value={Math.round(effectIntensity * 100)}
                onChange={(e) => {
                  setAbMode('processed');
                  setEffectIntensity(parseFloat(e.target.value) / 100);
                  markBatchOutdated();
                }}
                className="studio-slider w-full cursor-pointer disabled:opacity-40"
              />
              <div className="mt-1.5 flex justify-between font-mono-num text-[11px] text-slate-400">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
              Pitch, speed, and effect intensity process locally via WSOLA
              time-stretching and multi-node Web Audio DSP before 16-bit WAV
              export.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
