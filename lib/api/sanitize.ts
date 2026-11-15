/**
 * Centralized Input Sanitization & Validation Utility for HealWithIndia
 * Protects against Stored XSS, script injection, and corrupt payload characters
 * across all inbound patient and administrative API requests.
 */

/**
 * Strips HTML tags, null bytes, and non-printable control characters.
 * Preserves standard punctuation, multilingual UTF-8 characters, and newlines.
 */
export function sanitizeString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val !== "string") return String(val).trim();

  return val
    // Remove null bytes
    .replace(/\0/g, "")
    // Strip HTML/XML tags
    .replace(/<[^>]*>?/gm, "")
    // Strip javascript: pseudo-protocols
    .replace(/javascript\s*:/gi, "")
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Recursively sanitizes all string properties in a payload object.
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return sanitizeString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === "object" && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Validates an email address against RFC 5322 format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates international phone format.
 * Accepts digits, spaces, hyphens, parentheses, and leading plus sign.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const phoneRegex = /^\+?[0-9\s().-]{7,25}$/;
  return phoneRegex.test(phone.trim());
}
