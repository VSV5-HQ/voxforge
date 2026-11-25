import { FormEvent, useEffect, useState } from 'react';
import {
  AlertCircle,
  AudioWaveform,
  Calendar,
  CheckCircle2,
  Edit3,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  MAX_FULL_NAME_LENGTH,
  validateFullName,
} from '../auth/validation';
import { RoutePath } from '../seo/routes';

interface DashboardPageProps {
  onNavigate: (path: RoutePath) => void;
  onUnauthenticatedRedirect: (notice: string) => void;
  flashMessage: string | null;
  onClearFlash: () => void;
}

export function DashboardPage({
  onNavigate,
  onUnauthenticatedRedirect,
  flashMessage,
  onClearFlash,
}: DashboardPageProps) {
  const {
    user,
    profile,
    authReady,
    logout,
    resendVerificationEmail,
    refreshAuthUser,
    resetPassword,
    updateFullName,
  } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (authReady && !user) {
      onUnauthenticatedRedirect(
        'Please sign in to access your VoxForge account dashboard.'
      );
      onNavigate('/login');
    }
  }, [authReady, user, onNavigate, onUnauthenticatedRedirect]);

  useEffect(() => {
    const resolvedName = profile?.fullName || user?.displayName || '';
    if (!editingName) {
      setNameInput(resolvedName);
    }
  }, [profile?.fullName, user?.displayName, editingName]);

  if (!authReady) {
    return (
      <section
        aria-label="Loading dashboard"
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12"
      >
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-56 rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-72 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2" />
            <div className="h-72 rounded-xl border border-slate-200 bg-white p-6" />
          </div>
        </div>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    profile?.fullName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Creator';
  const displayEmail = profile?.email || user.email || 'No email on file';

  const createdDate =
    profile?.createdAt ||
    (user.metadata.creationTime ? new Date(user.metadata.creationTime) : null);

  const formattedCreatedDate =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(createdDate)
      : 'Unavailable';

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const usesPasswordProvider = user.providerData.some(
    (p) => p.providerId === 'password'
  );
  const providerLabel = usesPasswordProvider
    ? 'Email & Password'
    : user.providerData.some((p) => p.providerId === 'google.com')
      ? 'Google Account'
      : 'Firebase Authentication';

  const handleSaveName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNameError(null);
    setActionMessage(null);
    setActionError(null);

    const err = validateFullName(nameInput);
    if (err) {
      setNameError(err);
      return;
    }

    setSavingName(true);
    try {
      await updateFullName(nameInput);
      setEditingName(false);
      setActionMessage('Your profile name has been updated.');
    } catch (updateErr) {
      setNameError(
        updateErr instanceof Error
          ? updateErr.message
          : 'Could not update your name.'
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleResendVerification = async () => {
    setActionError(null);
    setActionMessage(null);
    setSendingVerification(true);
    try {
      await resendVerificationEmail();
      setActionMessage(
        `Verification email sent to ${displayEmail}. Check your inbox and spam folder.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not send verification email.'
      );
    } finally {
      setSendingVerification(false);
    }
  };

  const handleRefreshVerification = async () => {
    setActionError(null);
    setActionMessage(null);
    setRefreshingStatus(true);
    try {
      const verified = await refreshAuthUser();
      if (verified) {
        setActionMessage('Your email address is verified.');
      } else {
        setActionMessage(
          'Email is not verified yet. Click the link in your inbox, then refresh again.'
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to refresh account status.'
      );
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!displayEmail) return;
    setActionError(null);
    setActionMessage(null);
    setSendingReset(true);
    try {
      await resetPassword(displayEmail);
      setActionMessage(`Password reset link sent to ${displayEmail}.`);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Unable to send password reset email.'
      );
    } finally {
      setSendingReset(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      onClearFlash();
      onNavigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <section
      aria-labelledby="dashboard-heading"
      className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12"
    >
      {/* Top Bar Contract: Breadcrumb + Title on left, Studio + Logout actions on right */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            VoxForge / Account Dashboard
          </p>
          <h1
            id="dashboard-heading"
            className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
          >
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{displayEmail}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer"
          >
            <AudioWaveform className="h-4 w-4" aria-hidden="true" />
            Return to Voice Studio
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-4 w-4" aria-hidden="true" />
            )}
            Logout
          </button>
        </div>
      </div>

      {/* Notifications */}
      {(flashMessage || actionMessage) && (
        <div
          role="status"
          className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{actionMessage || flashMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionMessage(null);
              onClearFlash();
            }}
            className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {!user.emailVerified && (
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Verify your email address
              </p>
              <p className="mt-0.5 text-xs text-amber-900 sm:text-sm">
                Confirm ownership of <span className="font-medium">{displayEmail}</span> using
                the verification link sent to your inbox.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={sendingVerification}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
            >
              {sendingVerification && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Resend Verification
            </button>
            <button
              type="button"
              onClick={handleRefreshVerification}
              disabled={refreshingStatus}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-950 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshingStatus ? 'animate-spin' : ''
                }`}
              />
              Check Status
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-700 font-display text-base font-bold text-white"
              >
                {initials || <UserIcon className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Profile Information
                </h2>
                <p className="text-xs text-slate-500">
                  Private account details protected by owner-only Firestore rules
                </p>
              </div>
            </div>

            {!editingName && (
              <button
                type="button"
                onClick={() => {
                  setNameInput(displayName);
                  setNameError(null);
                  setEditingName(true);
                }}
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer sm:self-auto"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                Edit Name
              </button>
            )}
          </div>

          {editingName && (
            <form
              onSubmit={handleSaveName}
              className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <label
                htmlFor="dashboard-edit-name"
                className="block text-xs font-semibold text-slate-700"
              >
                Update Full Name
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="dashboard-edit-name"
                  type="text"
                  maxLength={MAX_FULL_NAME_LENGTH}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingName}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60 cursor-pointer"
                  >
                    {savingName && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setNameError(null);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {nameError && (
                <p className="mt-1.5 text-xs font-medium text-red-600">
                  {nameError}
                </p>
              )}
            </form>
          )}

          <dl className="mt-5 divide-y divide-slate-100 text-sm">
            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 font-medium text-slate-500">
                <UserIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Full Name
              </dt>
              <dd className="font-semibold text-slate-900">{displayName}</dd>
            </div>

            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 font-medium text-slate-500">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Email Address
              </dt>
              <dd className="font-medium text-slate-900 break-all">
                {displayEmail}
              </dd>
            </div>

            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 font-medium text-slate-500">
                <ShieldCheck
                  className="h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                Verification Status
              </dt>
              <dd
                className={`font-semibold ${
                  user.emailVerified ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {user.emailVerified ? 'Verified' : 'Pending verification'}
              </dd>
            </div>

            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 font-medium text-slate-500">
                <Calendar
                  className="h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                Account Created
              </dt>
              <dd className="font-mono-num text-slate-900">
                {formattedCreatedDate}
              </dd>
            </div>

            <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2 font-medium text-slate-500">
                <KeyRound
                  className="h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                Sign-in Provider
              </dt>
              <dd className="font-medium text-slate-900">{providerLabel}</dd>
            </div>

            <div className="flex flex-col gap-1 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-medium text-slate-500">User ID</dt>
              <dd className="font-mono-num text-xs text-slate-600 break-all">
                {user.uid}
              </dd>
            </div>
          </dl>
        </div>

        {/* Studio & Security Column */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Voice Studio Access
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Launch the VoxForge Voice Studio to record microphone audio, upload
              MP3/WAV files, trim clips, run batch exports, and download 16-bit
              WAV audio locally.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 min-h-[44px] cursor-pointer"
            >
              <AudioWaveform className="h-4 w-4" aria-hidden="true" />
              Open VoxForge Voice Studio
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Account Security
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Passwords are managed exclusively by Firebase Authentication and
              never stored in Firestore.
            </p>
            <div className="mt-4 space-y-2.5">
              {usesPasswordProvider && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={sendingReset}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 min-h-[44px] cursor-pointer"
                >
                  {sendingReset && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  Send Password Reset Email
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 min-h-[44px] cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {loggingOut ? 'Signing out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
