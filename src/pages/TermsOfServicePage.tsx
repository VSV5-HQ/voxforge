export function TermsOfServicePage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-blue-700">
          Effective Date: November 2026
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          By accessing or using VoxNexa, you agree to the following terms
          governing browser-based audio transformation and WAV exports.
        </p>
      </header>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-700 sm:text-base">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900">
            1. Permitted Use
          </h2>
          <p className="mt-2">
            VoxNexa is provided for creative, educational, gaming, podcasting,
            and personal audio experimentation. You may freely download and use
            the WAV files you generate for personal or commercial projects,
            provided you own or hold the necessary rights to the source audio.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            2. Prohibited Conduct
          </h2>
          <p className="mt-2">
            You agree not to use VoxNexa to impersonate individuals for fraud,
            harassment, defamation, bypass voice-biometric authentication, or
            violate applicable privacy, wiretapping, or copyright laws.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            3. Ownership of Content
          </h2>
          <p className="mt-2">
            You retain 100% ownership and copyright over all recordings you make
            and audio files you process in VoxNexa. Because processing runs
            locally in your browser, VoxNexa claims no license or ownership
            rights over your audio.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            4. Service Availability & Disclaimer
          </h2>
          <p className="mt-2">
            VoxNexa is provided &ldquo;as is&rdquo; without warranties of
            uninterrupted availability. Audio codec support (such as MP3, WAV,
            OGG, or WebM) depends on your browser&apos;s built-in Web Audio API
            decoders.
          </p>
        </section>
      </div>
    </article>
  );
}
