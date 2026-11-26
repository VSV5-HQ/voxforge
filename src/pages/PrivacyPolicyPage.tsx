export function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-blue-700">
          Effective Date: November 2026
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          VoxNexa is engineered around local-first audio processing. Your voice
          recordings and uploaded audio files never leave your browser.
        </p>
      </header>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-700 sm:text-base">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900">
            1. Zero Audio Uploads or Cloud Storage
          </h2>
          <p className="mt-2">
            All audio decoding, pitch shifting, speed scaling, effect filtering,
            and WAV file encoding take place entirely inside your browser using
            the Web Audio API and local device memory. VoxNexa does not transmit
            microphone streams or uploaded MP3/WAV files to any remote server.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            2. Microphone Permission Usage
          </h2>
          <p className="mt-2">
            Microphone access is requested only when you click{' '}
            <strong>Record Voice</strong>. Your browser displays a standard
            permission prompt, and audio capture stops immediately when you
            click <strong>Stop Recording</strong> or close the tab. Once you
            refresh or leave the page, in-memory audio buffers are discarded.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            3. Contact Form Submissions
          </h2>
          <p className="mt-2">
            If you choose to reach out through the Contact Us page, the name,
            email address, and message you enter are used solely to respond to
            your inquiry. We do not sell, rent, or share personal contact
            information with third parties.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            4. Browser Storage &amp; Cookies
          </h2>
          <p className="mt-2">
            VoxNexa does not use advertising trackers or third-party behavioral
            profiling cookies. Standard browser caching may store static site
            assets locally so the studio loads quickly on repeat visits.
          </p>
        </section>

        <section className="border-t border-slate-200 pt-7">
          <h2 className="font-display text-xl font-bold text-slate-900">
            5. Optional Account Profiles
          </h2>
          <p className="mt-2">
            Using the Voice Studio does not require an account. If you choose to
            create a VoxNexa account, authentication is handled by Firebase
            Authentication and only your user ID, full name, email address, and
            account creation timestamp are stored in your private Firestore
            profile. Passwords are never stored in Firestore, and audio files
            are still never uploaded.
          </p>
        </section>
      </div>
    </article>
  );
}
