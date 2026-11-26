import { useState } from 'react';
import { CheckCircle2, Mail, Send } from 'lucide-react';

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('General Feedback');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (name.trim().length < 2) {
      next.name = 'Please enter your name (at least 2 characters).';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    if (message.trim().length < 10) {
      next.message = 'Please include a message of at least 10 characters.';
    }
    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const referenceId = `VN-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedRef(referenceId);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setTopic('General Feedback');
    setMessage('');
    setErrors({});
    setSubmittedRef(null);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-medium text-blue-700">
          Support & Feedback
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Have a feature suggestion for a new voice preset or need help with
          browser microphone permissions? Send us a note below.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {submittedRef ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Message received
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    Thank you, <strong>{name}</strong>. Your inquiry under{' '}
                    <strong>{topic}</strong> has been logged with reference{' '}
                    <span className="font-mono-num font-semibold text-slate-900">
                      {submittedRef}
                    </span>
                    . We will reply to <strong>{email}</strong> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    Send another message
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Full Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-2 focus:outline-blue-700/20"
                />
                {errors.name && (
                  <p id="contact-name-error" className="mt-1.5 text-xs font-medium text-red-700">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-2 focus:outline-blue-700/20"
                />
                {errors.email && (
                  <p id="contact-email-error" className="mt-1.5 text-xs font-medium text-red-700">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-topic"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-2 focus:outline-blue-700/20"
                >
                  <option value="General Feedback">General Feedback</option>
                  <option value="Preset Request">Voice Preset Request</option>
                  <option value="Bug Report">Audio / Browser Bug Report</option>
                  <option value="Privacy Inquiry">Privacy Inquiry</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you are working on or how we can help..."
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-2 focus:outline-blue-700/20"
                />
                {errors.message && (
                  <p id="contact-message-error" className="mt-1.5 text-xs font-medium text-red-700">
                    {errors.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 min-h-[44px] cursor-pointer"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                Send Message
              </button>
            </form>
          )}
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-slate-900">
              Direct Support
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Prefer sending an email directly? Reach our audio engineering team
              anytime.
            </p>
            <a
              href="mailto:support@voxnexa.audio"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline underline-offset-4"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              support@voxnexa.audio
            </a>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-slate-900">
              Troubleshooting Tip
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              If your microphone does not appear in the browser, check site
              microphone permissions in your address bar or try uploading a WAV
              or MP3 file directly into the studio workbench.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
