/**
 * Shared validation helpers used by both client components and server API
 * routes so client-side checks always match what the server enforces.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Loose international phone: digits, leading +, spaces, dashes, parens, dots.
// Must contain at least 7 digits.
export const PHONE_RE = /^[+()\-\s.\d]{7,25}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  const digits = trimmed.replace(/\D/g, "")
  return PHONE_RE.test(trimmed) && digits.length >= 7
}

export function isNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}
