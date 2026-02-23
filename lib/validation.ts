/**
 * Centralized input validation helpers.
 *
 * These functions enforce basic OWASP-style checks:
 * - Type safety
 * - Length limits
 * - Simple format checks (e.g. email)
 * - Rejection of obviously invalid or unexpected input
 */

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginCredentials(input: {
  email: unknown;
  password: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (typeof input.email !== 'string') {
    errors.push('Email must be a string.');
  } else {
    const email = input.email.trim();
    if (!email) {
      errors.push('Email is required.');
    } else {
      if (email.length > EMAIL_MAX_LENGTH) {
        errors.push('Email is too long.');
      }
      if (!emailRegex.test(email)) {
        errors.push('Email format is invalid.');
      }
    }
  }

  if (typeof input.password !== 'string') {
    errors.push('Password must be a string.');
  } else {
    const password = input.password;
    if (!password) {
      errors.push('Password is required.');
    } else {
      if (password.length < PASSWORD_MIN_LENGTH) {
        errors.push('Password must be at least 8 characters.');
      }
      if (password.length > PASSWORD_MAX_LENGTH) {
        errors.push('Password is too long.');
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}

