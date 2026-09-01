export const CSRF_COOKIE = "csrf_token";
export const CSRF_FIELD = "csrfToken";

/**
 * Synchronizer-token CSRF protection.
 *
 * The token lives in an httpOnly cookie AND is rendered into a hidden form
 * field by the server component. A request is accepted only when both copies
 * match: a cross-origin attacker can forge the request, but cannot read the
 * cookie to fill in the matching field.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent, constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function verifyCsrfToken(
  submitted: unknown,
  fromCookie: string | undefined,
): boolean {
  if (typeof submitted !== "string" || !submitted) return false;
  if (!fromCookie) return false;
  return safeEqual(submitted, fromCookie);
}
