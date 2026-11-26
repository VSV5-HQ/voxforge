import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  hasFormErrors,
  LoginFormErrors,
  validateEmail,
  validateLoginForm,
} from '../auth/validation';
import { RoutePath } from '../seo/routes';

interface LoginPageProps {
  onNavigate: (path: RoutePath) => void;
  onAuthSuccess?: (message: string) => void;
  redirectNotice?: string | null;
}

export function LoginPage({
  onNavigate,
  onAuthSuccess,
  redirectNotice,
}: LoginPageProps) {
  const {
    user,
    authReady,
    isConfigured,
    sessionNotice,
    clearSessionNotice,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (authReady && user && !submitting && !googleSubmitting) {
      onNavigate('/dashboard');
    }
  }, [authReady, user, submitting, googleSubmitting, onNavigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    clearSessionNotice();

    const validationErrors = validateLoginForm({ email, password });
    setErrors(validationErrors);
    if (hasFormErrors(validationErrors)) {
      return;
    }

    setSubmitting(true);
    try {
      await loginWithEmail({ email, password, rememberMe });
      const msg = 'Login successful. Redirecting to your dashboard...';
      setSuccessMessage(msg);
      onAuthSuccess?.('Welcome back! You are now signed in to VoxNexa.');
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 350);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to sign in. Please retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    setSuccessMessage(null);
    clearSessionNotice();
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      setSuccessMessage('Signed in with Google. Redirecting...');
      onAuthSuccess?.('Signed in with Google successfully.');
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 250);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Google Sign-In could not be completed.'
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const emailErr = validateEmail(resetEmail);
    if (emailErr) {
      setResetError(emailErr);
      return;
    }

    setResetSubmitting(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(
        'If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.'
      );
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : 'Could not send password reset email.'
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  const activeNotice = formError || sessionNotice || redirectNotice;

  return (
    <section
      aria-labelledby="auth-heading"
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-blue-700">VoxNexa Account</p>
          <h1
            id="auth-heading"
            className="mt-1.5 font-display text-3xl font-bold tracking-tight text-slate-950"
          >
            {resetMode ? 'Reset your password' : 'Sign in to VoxNexa'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {resetMode
              ? 'Enter your account email and we will send a secure password reset link.'
              : 'Access your personalized dashboard while keeping all audio processing local in your browser.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {!resetMode ? (
            <>
              {successMessage && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {activeNotice && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{activeNotice}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    Email address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? 'login-email-error' : undefined
                      }
                      placeholder="you@example.com"
                      className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        errors.email
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                          : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p
                      id="login-email-error"
                      className="mt-1.5 text-xs font-medium text-red-600"
                    >
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setResetError(null);
                        setResetSuccess(null);
                        setResetMode(true);
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-4 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }
                      }}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? 'login-password-error' : undefined
                      }
                      placeholder="Enter your password"
                      className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        errors.password
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                          : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      aria-pressed={showPassword}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="login-password-error"
                      className="mt-1.5 text-xs font-medium text-red-600"
                    >
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
                    <input
                      id="login-remember"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span>Remember Me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting || googleSubmitting}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
                >
                  {submitting && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {submitting ? 'Signing in...' : 'Login'}
                </button>
              </form>

              {isConfigured && (
                <>
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      or
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={submitting || googleSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
                  >
                    {googleSubmitting ? (
                      <Loader2
                        className="h-4 w-4 animate-spin text-slate-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                        />
                      </svg>
                    )}
                    <span>
                      {googleSubmitting
                        ? 'Connecting to Google...'
                        : 'Continue with Google'}
                    </span>
                  </button>
                </>
              )}

              <p className="mt-6 text-center text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <a
                  href="/register"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/register');
                  }}
                  className="font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-4"
                >
                  Create Account
                </a>
              </p>
            </>
          ) : (
            <div>
              {resetSuccess && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-semibold text-slate-800"
                  >
                    Account email address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (resetError) setResetError(null);
                      }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 min-h-[44px] cursor-pointer"
                >
                  {resetSubmitting && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {resetSubmitting ? 'Sending reset link...' : 'Send Reset Link'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-950 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
