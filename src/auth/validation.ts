export const MAX_FULL_NAME_LENGTH = 100;
export const MIN_FULL_NAME_LENGTH = 2;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const UID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type PasswordStrengthLabel =
  | 'Empty'
  | 'Too weak'
  | 'Weak'
  | 'Fair'
  | 'Good'
  | 'Strong';

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: PasswordStrengthLabel;
  meetsMinLength: boolean;
  checks: {
    minLength: boolean;
    hasLower: boolean;
    hasUpper: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export interface RegisterFormValues {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface RegisterFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
}

export function sanitizeFullName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_FULL_NAME_LENGTH);
}

export function sanitizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
}

export function validateFullName(raw: string): string | undefined {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return 'Full name is required.';
  }
  if (cleaned.length < MIN_FULL_NAME_LENGTH) {
    return `Full name must be at least ${MIN_FULL_NAME_LENGTH} characters.`;
  }
  if (cleaned.length > MAX_FULL_NAME_LENGTH) {
    return `Full name cannot exceed ${MAX_FULL_NAME_LENGTH} characters.`;
  }
  return undefined;
}

export function validateEmail(raw: string): string | undefined {
  const cleaned = raw.trim();
  if (!cleaned) {
    return 'Email address is required.';
  }
  if (cleaned.length > MAX_EMAIL_LENGTH) {
    return `Email address cannot exceed ${MAX_EMAIL_LENGTH} characters.`;
  }
  if (!EMAIL_REGEX.test(cleaned)) {
    return 'Enter a valid email address (for example, name@example.com).';
  }
  return undefined;
}

export function validateLoginPassword(password: string): string | undefined {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= MIN_PASSWORD_LENGTH,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      meetsMinLength: false,
      checks,
    };
  }

  let points = 0;
  if (checks.minLength) points += 1;
  if (password.length >= 12) points += 1;
  if (checks.hasLower && checks.hasUpper) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSymbol) points += 1;

  if (!checks.minLength) {
    return {
      score: 1,
      label: 'Too weak',
      meetsMinLength: false,
      checks,
    };
  }

  if (points <= 2) {
    return { score: 1, label: 'Weak', meetsMinLength: true, checks };
  }
  if (points === 3) {
    return { score: 2, label: 'Fair', meetsMinLength: true, checks };
  }
  if (points === 4) {
    return { score: 3, label: 'Good', meetsMinLength: true, checks };
  }
  return { score: 4, label: 'Strong', meetsMinLength: true, checks };
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const emailErr = validateEmail(values.email);
  if (emailErr) errors.email = emailErr;

  const passwordErr = validateLoginPassword(values.password);
  if (passwordErr) errors.password = passwordErr;

  return errors;
}

export function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  const nameErr = validateFullName(values.fullName);
  if (nameErr) errors.fullName = nameErr;

  const emailErr = validateEmail(values.email);
  if (emailErr) errors.email = emailErr;

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (values.password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `Password cannot exceed ${MAX_PASSWORD_LENGTH} characters.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = 'You must agree to the Terms of Service and Privacy Policy.';
  }

  return errors;
}

export function hasFormErrors<T extends object>(errors: T): boolean {
  return Object.values(errors).some((val) => Boolean(val));
}

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Double-check your credentials or reset your password.';
    case 'auth/invalid-email':
      return 'That email address is not formatted properly.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return `Choose a stronger password with at least ${MIN_PASSWORD_LENGTH} characters.`;
    case 'auth/too-many-requests':
      return 'Too many attempts detected. Please wait a few minutes and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support if you need help.';
    case 'auth/user-token-expired':
    case 'auth/requires-recent-login':
      return 'Your session expired. Please sign in again to continue.';
    case 'auth/network-request-failed':
      return 'Network error while reaching authentication servers. Check your connection and retry.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In window was closed before completing sign-in.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google Sign-In popup. Allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in Firebase Console (Authentication -> Sign-in method).';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.';
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return 'Authentication failed. Please try again.';
  }
}
