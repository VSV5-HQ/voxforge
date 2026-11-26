import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  evaluatePasswordStrength,
  hasFormErrors,
  MAX_EMAIL_LENGTH,
  MAX_FULL_NAME_LENGTH,
  RegisterFormErrors,
  validateRegisterForm,
} from '../auth/validation';
import { RoutePath } from '../seo/routes';

interface RegisterPageProps {
  onNavigate: (path: RoutePath) => void;
  onAuthSuccess?: (message: string) => void;
}

export function RegisterPage({ onNavigate, onAuthSuccess }: RegisterPageProps) {
  const { user, authReady, isConfigured, registerWithEmail, loginWithGoogle } =
    useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const strength = useMemo(
    () => evaluatePasswordStrength(password),
    [password]
  );

  useEffect(() => {
    if (authReady && user && !submitting && !googleSubmitting) {
      onNavigate('/dashboard');
    }
  }, [authReady, user, submitting, googleSubmitting, onNavigate]);

  const strengthColors: Record<number, string> = {
    0: 'bg-slate-200',
    1: 'bg-red-500',
    2: 'bg-amber-500',
    3: 'bg-blue-600',
    4: 'bg-emerald-600',
  };

  const strengthTextColors: Record<number, string> = {
    0: 'text-slate-500',
    1: 'text-red-600',
    2: 'text-amber-700',
    3: 'text-blue-700',
    4: 'text-emerald-700',
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const validationErrors = validateRegisterForm({
      fullName,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    });
    setErrors(validationErrors);
    if (hasFormErrors(validationErrors)) {
      return;
    }

    setSubmitting(true);
    try {
      const { verificationSent } = await registerWithEmail({
        fullName,
        email,
        password,
      });
      const dashboardNote = verificationSent
        ? 'Account created! We sent a verification link to your email address.'
        : 'Account created! You can verify your email anytime from your dashboard.';
      setSuccessMessage('Account created successfully. Opening your dashboard...');
      onAuthSuccess?.(dashboardNote);
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 350);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Unable to create account. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setFormError(null);
    setSuccessMessage(null);
    setGoogleSubmitting(true);
    try {
      await loginWithGoogle();
      setSuccessMessage('Signed in with Google. Redirecting...');
      onAuthSuccess?.('Your VoxNexa account is ready.');
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

  return (
    <section
      aria-labelledby="register-heading"
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-medium text-blue-700">
            Free VoxNexa Profile
          </p>
          <h1
            id="register-heading"
            className="mt-1.5 font-display text-3xl font-bold tracking-tight text-slate-950"
          >
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Set up your VoxNexa creator profile. Voice recordings always remain
            private inside your browser.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {successMessage && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="register-fullname"
                className="block text-sm font-semibold text-slate-800"
              >
                Full Name
              </label>
              <div className="relative mt-1.5">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="register-fullname"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  maxLength={MAX_FULL_NAME_LENGTH}
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) {
                      setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={
                    errors.fullName ? 'register-fullname-error' : undefined
                  }
                  placeholder="Alex Rivera"
                  className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.fullName
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
              </div>
              {errors.fullName && (
                <p
                  id="register-fullname-error"
                  className="mt-1.5 text-xs font-medium text-red-600"
                >
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="block text-sm font-semibold text-slate-800"
              >
                Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={MAX_EMAIL_LENGTH}
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
                    errors.email ? 'register-email-error' : undefined
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
                  id="register-email-error"
                  className="mt-1.5 text-xs font-medium text-red-600"
                >
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="block text-sm font-semibold text-slate-800"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="register-password-strength"
                  placeholder="At least 8 characters"
                  className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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

              {/* Password strength meter */}
              <div id="register-password-strength" className="mt-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Password strength</span>
                  <span
                    className={`font-semibold ${
                      strengthTextColors[strength.score]
                    }`}
                  >
                    {password ? strength.label : 'Minimum 8 characters'}
                  </span>
                </div>
                <div
                  className="mt-1.5 grid grid-cols-4 gap-1.5"
                  aria-hidden="true"
                >
                  {[1, 2, 3, 4].map((segment) => (
                    <div
                      key={segment}
                      className={`h-1.5 rounded-full transition-colors ${
                        strength.score >= segment
                          ? strengthColors[strength.score]
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                  <li className="flex items-center gap-1.5">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        strength.checks.minLength
                          ? 'text-emerald-600'
                          : 'text-slate-300'
                      }`}
                      aria-hidden="true"
                    />
                    <span>8+ characters</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        strength.checks.hasUpper && strength.checks.hasLower
                          ? 'text-emerald-600'
                          : 'text-slate-300'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Upper &amp; lowercase</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        strength.checks.hasNumber
                          ? 'text-emerald-600'
                          : 'text-slate-300'
                      }`}
                      aria-hidden="true"
                    />
                    <span>At least 1 number</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check
                      className={`h-3.5 w-3.5 shrink-0 ${
                        strength.checks.hasSymbol
                          ? 'text-emerald-600'
                          : 'text-slate-300'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Special symbol</span>
                  </li>
                </ul>
              </div>

              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="block text-sm font-semibold text-slate-800"
              >
                Confirm Password
              </label>
              <div className="relative mt-1.5">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  aria-describedby={
                    errors.confirmPassword
                      ? 'register-confirm-password-error'
                      : undefined
                  }
                  placeholder="Re-enter your password"
                  className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    errors.confirmPassword
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                  aria-pressed={showConfirmPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p
                  id="register-confirm-password-error"
                  className="mt-1.5 text-xs font-medium text-red-600"
                >
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700 cursor-pointer">
                <input
                  id="register-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (errors.acceptedTerms) {
                      setErrors((prev) => ({
                        ...prev,
                        acceptedTerms: undefined,
                      }));
                    }
                  }}
                  aria-invalid={Boolean(errors.acceptedTerms)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  I agree to the{' '}
                  <a
                    href="/terms-of-service"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/terms-of-service');
                    }}
                    className="font-semibold text-blue-700 hover:underline underline-offset-4"
                  >
                    Terms of Service
                  </a>{' '}
                  and acknowledge the{' '}
                  <a
                    href="/privacy-policy"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/privacy-policy');
                    }}
                    className="font-semibold text-blue-700 hover:underline underline-offset-4"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {errors.acceptedTerms && (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.acceptedTerms}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] cursor-pointer"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {submitting ? 'Creating Account...' : 'Create Account'}
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
                onClick={handleGoogleSignUp}
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
                    : 'Sign up with Google'}
                </span>
              </button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/login');
              }}
              className="font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-4"
            >
              Login
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
