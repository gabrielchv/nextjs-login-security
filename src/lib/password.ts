import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** Returns "salt:derivedKey", both hex encoded. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/** Constant-time comparison against a stored "salt:derivedKey" string. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}

/**
 * A hash of a password nobody can supply, used to spend the same scrypt cost
 * when the username does not exist.
 *
 * Without it, a login for a missing account skips scrypt entirely and answers
 * several times faster than a wrong password for a real one — a timing oracle
 * that turns the login form into a username enumeration endpoint. The value is
 * computed once at module load so the first miss is not slower than the rest.
 */
const DECOY_HASH = hashPassword(randomBytes(32).toString("hex"));

/**
 * Verifies a password against a hash that may be absent, at the same cost
 * either way. Returns false when there is no user, so callers can keep the
 * "bad user" and "bad password" branches identical.
 */
export function verifyPasswordOrDecoy(
  password: string,
  stored: string | null | undefined,
): boolean {
  const ok = verifyPassword(password, stored ?? DECOY_HASH);
  return stored ? ok : false;
}
