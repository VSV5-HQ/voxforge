import { RoutePath } from '../seo/routes';

interface HowItWorksPageProps {
  onNavigate: (path: RoutePath) => void;
}

export function HowItWorksPage({ onNavigate }: HowItWorksPageProps) {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-blue-700">
          Signal Processing · Web Audio Architecture
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl [text-wrap:balance]">
          How VoxNexa transforms your voice locally
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          VoxNexa uses your browser&apos;s native Web Audio API and an offline
          digital signal processing pipeline. No cloud servers, paid APIs, or
          audio uploads are ever required.
        </p>
      </header>

      <section className="mt-10 space-y-8">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            01. Independent Pitch & Speed Engine
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            Changing playback rate alone alters pitch and tempo simultaneously.
            VoxNexa separates them using Waveform Similarity Overlap-Add
            (WSOLA) time-stretching paired with linear resampling. You can lower
            pitch by up to 12 semitones without slowing speech down, or double
            speed without creating a chipmunk effect.
          </p>
        </div>

        <div className="border-t border-slate-200 pt-8">
          <h2 className="font-display text-xl font-bold text-slate-900">
            02. Preset Effect Signal Chains
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Deep Voice & Chipmunk</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Combines semitone shifting with targeted low-shelf warmth,
                gentle analog saturation, or upper-mid presence filters to keep
                speech natural and intelligible.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Robot & Alien</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Uses sawtooth ring-modulation oscillators, short comb-filter
                delays, and dual-LFO formant sweeps to synthesize metallic and
                extraterrestrial timbres.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Cave Echo</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Routes audio through damped stereo feedback delays alongside a
                synthesized 2.1-second acoustic impulse response via{' '}
                <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
                  ConvolverNode
                </code>
                .
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Walkie-Talkie Radio</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Applies steep 480 Hz–2.6 kHz bandpass filtering, mid-band
                vocal peaking, and waveshaper overdrive for authentic handheld
                transceiver grit.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8">
          <h2 className="font-display text-xl font-bold text-slate-900">
            03. Offline WAV Rendering
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            When you click Download WAV, VoxNexa rebuilds the exact same filter
            graph inside an{' '}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              OfflineAudioContext
            </code>
            , renders the signal faster than real time with a mastering safety
            limiter, and packs the samples into a standard 16-bit PCM RIFF/WAVE
            file.
          </p>
        </div>
      </section>

      <div className="mt-12 rounded-xl border border-slate-200 bg-white p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Ready to test the effects?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Jump into the studio and try your mic or the built-in demo voice.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Open Voice Studio
        </button>
      </div>
    </article>
  );
}
