import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  hasFormErrors,
  mapFirebaseAuthError,
  sanitizeEmail,
  sanitizeFullName,
  validateEmail,
  validateFullName,
  validateLoginForm,
  validateRegisterForm,
} from './validation.ts';

describe('Auth validation helpers', () => {
  it('validates full name boundaries matching blueprint schema', () => {
    assert.ok(validateFullName(''));
    assert.ok(validateFullName('A'));
    assert.equal(validateFullName('Ada Lovelace'), undefined);
    assert.ok(validateFullName('x'.repeat(101)));
    assert.equal(sanitizeFullName('  Ada   Lovelace  '), 'Ada Lovelace');
  });

  it('validates email formatting and sanitization', () => {
    assert.ok(validateEmail(''));
    assert.ok(validateEmail('not-an-email'));
    assert.ok(validateEmail('user@domain'));
    assert.equal(validateEmail('User@Example.COM'), undefined);
    assert.equal(sanitizeEmail('  User@Example.COM '), 'user@example.com');
  });

  it('evaluates password strength accurately', () => {
    assert.equal(evaluatePasswordStrength('').score, 0);
    assert.equal(evaluatePasswordStrength('short').meetsMinLength, false);
    assert.equal(evaluatePasswordStrength('short').label, 'Too weak');
    assert.equal(evaluatePasswordStrength('password123').meetsMinLength, true);
    const strong = evaluatePasswordStrength('VoxNexa!2026Audio');
    assert.equal(strong.score, 4);
    assert.equal(strong.label, 'Strong');
  });

  it('validates login form inputs', () => {
    const invalid = validateLoginForm({ email: 'bad', password: '123' });
    assert.equal(hasFormErrors(invalid), true);
    assert.ok(invalid.email);
    assert.ok(invalid.password);

    const valid = validateLoginForm({
      email: 'creator@voxnexa.app',
      password: 'Password123!',
    });
    assert.equal(hasFormErrors(valid), false);
  });

  it('validates registration form matching passwords and terms checkbox', () => {
    const mismatch = validateRegisterForm({
      fullName: 'Alex Rivera',
      email: 'alex@voxnexa.app',
      password: 'Password123!',
      confirmPassword: 'Password123',
      acceptedTerms: false,
    });
    assert.equal(mismatch.confirmPassword, 'Passwords do not match.');
    assert.ok(mismatch.acceptedTerms);

    const valid = validateRegisterForm({
      fullName: 'Alex Rivera',
      email: 'alex@voxnexa.app',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      acceptedTerms: true,
    });
    assert.equal(hasFormErrors(valid), false);
  });

  it('maps Firebase auth error codes to clear messages', () => {
    assert.match(
      mapFirebaseAuthError({ code: 'auth/email-already-in-use' }),
      /already exists/i
    );
    assert.match(
      mapFirebaseAuthError({ code: 'auth/operation-not-allowed' }),
      /Firebase Console/i
    );
    assert.match(
      mapFirebaseAuthError({ code: 'auth/invalid-credential' }),
      /Incorrect email or password/i
    );
  });
});
