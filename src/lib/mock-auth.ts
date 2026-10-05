/**
 * Mock authentication for the hackathon prototype.
 * Frontend only — these credentials are the demo entry point, not real security.
 */

export const AUTHORITY_DEMO = {
  email: "authority@civicpulse.ai",
  password: "civicpulse123",
  officer: "A. Kulkarni · Public Works & Engineering",
} as const;

export type AuthFieldErrors = { email?: string; password?: string };

export function validateAuthorityLoginForm(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (!email.trim()) errors.email = "Enter your official email or authority ID.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export function hasFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function verifyAuthorityCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === AUTHORITY_DEMO.email && password === AUTHORITY_DEMO.password
  );
}

/** Resolves after a short pause so the prototype feels like a real sign-in round trip. */
export function mockLatency(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
