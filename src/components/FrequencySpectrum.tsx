import { useEffect, useRef } from 'react';
import { bucketFrequencySpectrum, smoothSpectrumBars } from '../audio/spectrum';

interface FrequencySpectrumProps {
  analyserRef: React.RefObject<AnalyserNode | null>;
  isActive: boolean;
  sampleRate: number;
  monitoringLabel?: string;
}

const BAR_COUNT = 44;

export function FrequencySpectrum({
  analyserRef,
  isActive,
  sampleRate,
  monitoringLabel,
}: FrequencySpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const peaksRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const sizeRef = useRef<{ width: number; height: number }>({ width: 320, height: 80 });
  const gradRef = useRef<{ height: number; gradient: CanvasGradient } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        sizeRef.current = {
          width: Math.max(200, Math.floor(rect.width)),
          height: Math.max(72, Math.floor(rect.height)),
        };
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

    let rafId = 0;
    let freqData: Uint8Array<ArrayBuffer> | null = null;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width, height } = sizeRef.current;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        gradRef.current = null;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const analyser = analyserRef.current;
      let targetBars: number[];

      if (isActive && analyser) {
        if (!freqData || freqData.length !== analyser.frequencyBinCount) {
          freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        }
        analyser.getByteFrequencyData(freqData);
        targetBars = bucketFrequencySpectrum(freqData, BAR_COUNT, sampleRate);
      } else {
        targetBars = new Array(BAR_COUNT).fill(0);
      }

      barsRef.current = smoothSpectrumBars(
        barsRef.current,
        targetBars,
        prefersReducedMotion ? 1 : 0.72,
        prefersReducedMotion ? 0.5 : 0.2
      );

      // Slowly decaying peak-hold caps
      for (let i = 0; i < BAR_COUNT; i++) {
        const current = barsRef.current[i] ?? 0;
        const prevPeak = peaksRef.current[i] ?? 0;
        if (current >= prevPeak) {
          peaksRef.current[i] = current;
        } else {
          peaksRef.current[i] = Math.max(0, prevPeak - 0.015);
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Subtle horizontal reference grid lines (25%, 50%, 75%)
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      for (const ratio of [0.25, 0.5, 0.75]) {
        const y = Math.round(height * ratio) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const gap = width > 500 ? 3 : 2;
      const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT);
      const maxBarH = height - 10;

      if (!gradRef.current || gradRef.current.height !== height) {
        const grad = ctx.createLinearGradient(0, height, 0, 4);
        grad.addColorStop(0, '#1D4ED8');
        grad.addColorStop(0.65, '#2563EB');
        grad.addColorStop(1, '#38BDF8');
        gradRef.current = { height, gradient: grad };
      }
      const grad = gradRef.current.gradient;

      for (let i = 0; i < BAR_COUNT; i++) {
        const amp = barsRef.current[i] ?? 0;
        const barH = Math.max(2, amp * maxBarH);
        const x = i * (barWidth + gap);
        const y = height - barH;

        ctx.fillStyle = amp > 0.01 ? grad : '#E2E8F0';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, Math.min(2, barWidth / 2));
        ctx.fill();

        // Crisp peak indicator cap while signal is active
        const peakAmp = peaksRef.current[i] ?? 0;
        if (peakAmp > 0.04) {
          const peakY = Math.max(2, height - peakAmp * maxBarH - 2);
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(x, peakY, barWidth, 1.5);
        }
      }

      ctx.restore();

      const stillSettling = barsRef.current.some((v) => v > 0.002) ||
        peaksRef.current.some((v) => v > 0.04);

      if (isActive || stillSettling) {
        rafId = requestAnimationFrame(draw);
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [analyserRef, isActive, sampleRate]);

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700">
          Live Frequency Spectrum
        </span>
        <span
          data-testid="spectrum-monitor-label"
          className="font-mono-num text-[11px] text-slate-500"
        >
          {isActive
            ? `Real-time FFT${monitoringLabel ? ` · ${monitoringLabel}` : ' · 60 Hz – 12 kHz'}`
            : monitoringLabel
              ? `Ready · ${monitoringLabel}`
              : 'Ready · Press Play to analyze'}
        </span>
      </div>

      <div className="relative h-20 w-full overflow-hidden rounded-xl border border-slate-200 bg-white px-2 pt-2 pb-1">
        <canvas
          ref={canvasRef}
          data-testid="frequency-spectrum-canvas"
          data-active={isActive ? 'true' : 'false'}
          aria-label="Real-time frequency spectrum analyzer"
          className="h-full w-full block"
        />
      </div>

      <div
        aria-hidden="true"
        className="mt-1 flex justify-between px-1 font-mono-num text-[10px] text-slate-400"
      >
        <span>60 Hz</span>
        <span>250 Hz</span>
        <span>1 kHz</span>
        <span>4 kHz</span>
        <span>12 kHz</span>
      </div>
    </div>
  );
}
