import { RoutePath } from '../seo/routes';
import { VoiceStudio } from '../components/VoiceStudio';

interface HomePageProps {
  studioRef: React.RefObject<HTMLElement | null>;
  demoTrigger: number;
  onNavigate: (path: RoutePath) => void;
}

export function HomePage({ studioRef, demoTrigger, onNavigate }: HomePageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      {/* Focused Hero Header */}
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-medium text-blue-700">
          VoxNexa Audio Studio · Your Voice. Your Creativity. Unlimited Possibilities.
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl [text-wrap:balance]">
          Transform your voice in seconds, right in your browser.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
          Record from your microphone or drop an MP3 or WAV file. Apply instant
          VoxNexa studio presets, dial in pitch and speed independently, preview
          the waveform, and export clean 16-bit WAV audio locally.
        </p>
      </div>

      {/* Interactive Voice Studio Workbench */}
      <VoiceStudio studioRef={studioRef} demoTrigger={demoTrigger} />

      {/* Workflow Overview Section */}
      <section aria-labelledby="workflow-heading" className="mt-16 border-t border-slate-200 pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="workflow-heading"
              className="font-display text-2xl font-bold tracking-tight text-slate-950"
            >
              Three steps from raw audio to studio export
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Every filter, delay line, and pitch-shift window executes inside your device memory.
            </p>
          </div>
          <a
            href="/how-it-works"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/how-it-works');
            }}
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-4 whitespace-nowrap"
          >
            Read technical overview
          </a>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono-num text-xs font-semibold text-blue-700">01</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
              Capture or Upload Audio
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Use your microphone for instant recording with live level metering,
              or import existing MP3, WAV, OGG, and M4A tracks.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono-num text-xs font-semibold text-blue-700">02</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
              Shape Pitch & Character
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Switch between Deep Voice, Chipmunk, Robot, Cave Echo,
              Walkie-Talkie Radio, and Alien presets, or fine-tune pitch and
              speed manually.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-mono-num text-xs font-semibold text-blue-700">03</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
              Preview & Download WAV
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Scrub across the interactive waveform, compare dry against
              processed audio, and render a lossless 16-bit PCM WAV download.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
