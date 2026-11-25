import { useEffect, useRef, useState } from 'react';
import { formatTimecode } from '../audio/waveform';

interface WaveformPlayerProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isRecording: boolean;
  liveLevels: number[];
  sampleRate: number | null;
  sourceName: string | null;
  trimStartRatio?: number;
  trimEndRatio?: number;
  onSeek: (timeSeconds: number) => void;
}

export function WaveformPlayer({
  peaks,
  duration,
  currentTime,
  isPlaying,
  isRecording,
  liveLevels,
  sampleRate,
  sourceName,
  trimStartRatio = 0,
  trimEndRatio = 1,
  onSeek,
}: WaveformPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: 640,
    height: 112,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const w = Math.max(200, Math.floor(rect.width));
        const h = Math.max(96, Math.floor(rect.height));
        setCanvasSize((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h }
        );
      }
    };
    updateSize();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateSize)
        : null;
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { width, height } = canvasSize;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const startR = Math.max(0, Math.min(1, trimStartRatio));
    const endR = Math.max(startR, Math.min(1, trimEndRatio));
    const isTrimmed = !isRecording && (startR > 0.002 || endR < 0.998);

    // Subtle shaded masks outside active trim range
    if (isTrimmed && peaks.length > 0) {
      ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
      if (startR > 0) {
        ctx.fillRect(0, 0, startR * width, height);
      }
      if (endR < 1) {
        ctx.fillRect(endR * width, 0, (1 - endR) * width, height);
      }
    }

    // Center hairline
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const data = isRecording ? liveLevels : peaks;
    if (data.length > 0) {
      const barCount = data.length;
      const gap = Math.max(1.5, width / barCount > 6 ? 2.5 : 1.5);
      const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
      const localProgress =
        !isRecording && duration > 0
          ? Math.max(0, Math.min(1, currentTime / duration))
          : 0;
      const globalProgress = startR + localProgress * (endR - startR);

      for (let i = 0; i < barCount; i++) {
        const amp = Math.max(0.06, Math.min(1, data[i] ?? 0));
        const barH = Math.max(4, amp * (height - 18));
        const x = i * (barWidth + gap);
        const y = (height - barH) / 2;
        const barCenterRatio = (x + barWidth / 2) / width;
        const inTrimWindow =
          isRecording || (barCenterRatio >= startR && barCenterRatio <= endR);

        if (isRecording) {
          ctx.fillStyle = '#DC2626';
        } else if (!inTrimWindow) {
          ctx.fillStyle = '#CBD5E1';
        } else if (
          barCenterRatio <= globalProgress &&
          (currentTime > 0 || isPlaying)
        ) {
          ctx.fillStyle = '#1D4ED8';
        } else {
          ctx.fillStyle = '#94A3B8';
        }

        ctx.beginPath();
        const radius = Math.min(2, barWidth / 2);
        ctx.roundRect(x, y, barWidth, barH, radius);
        ctx.fill();
      }

      // Trim boundary lines
      if (isTrimmed) {
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        for (const r of [startR, endR]) {
          const tx = Math.max(1, Math.min(width - 1, r * width));
          ctx.beginPath();
          ctx.moveTo(tx, 2);
          ctx.lineTo(tx, height - 2);
          ctx.stroke();
        }
      }

      // Playhead line
      if (!isRecording && duration > 0) {
        const playheadX = globalProgress * width;
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(playheadX, 6);
        ctx.lineTo(playheadX, height - 6);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [
    peaks,
    duration,
    currentTime,
    isPlaying,
    isRecording,
    liveLevels,
    trimStartRatio,
    trimEndRatio,
    canvasSize,
  ]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRecording || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const startR = Math.max(0, Math.min(1, trimStartRatio));
    const endR = Math.max(startR + 0.001, Math.min(1, trimEndRatio));
    const localRatio = Math.max(0, Math.min(1, (clickRatio - startR) / (endR - startR)));
    onSeek(localRatio * duration);
  };

  const hasAudio = !isRecording && peaks.length > 0 && duration > 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-medium">
          {isRecording ? (
            <span className="inline-flex items-center gap-2 text-red-700 font-semibold">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-red-600 animate-pulse"
              />
              Recording live microphone input
            </span>
          ) : sourceName ? (
            <span className="text-slate-800 font-semibold truncate max-w-[240px] sm:max-w-md">
              {sourceName}
            </span>
          ) : (
            <span>No audio clip loaded</span>
          )}
          {sampleRate && !isRecording && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="font-mono-num text-slate-500">
                {(sampleRate / 1000).toFixed(1)} kHz
              </span>
            </>
          )}
        </div>

        <div className="font-mono-num text-xs font-medium text-slate-700">
          <span>{formatTimecode(currentTime)}</span>
          <span className="mx-1 text-slate-400">/</span>
          <span className="text-slate-500">{formatTimecode(duration)}</span>
        </div>
      </div>

      <div className="relative h-28 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
        <canvas
          ref={canvasRef}
          data-testid="waveform-canvas"
          onClick={handleCanvasClick}
          role={hasAudio ? 'slider' : undefined}
          aria-label={hasAudio ? 'Audio playback scrubber' : 'Audio waveform display'}
          aria-valuemin={hasAudio ? 0 : undefined}
          aria-valuemax={hasAudio ? Math.round(duration * 10) / 10 : undefined}
          aria-valuenow={hasAudio ? Math.round(currentTime * 10) / 10 : undefined}
          className={`h-full w-full block ${
            hasAudio ? 'cursor-pointer' : 'cursor-default'
          }`}
        />

        {!hasAudio && !isRecording && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
            <p className="text-sm font-medium text-slate-500">
              No audio loaded yet — record, upload MP3/WAV, or try the demo clip.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
