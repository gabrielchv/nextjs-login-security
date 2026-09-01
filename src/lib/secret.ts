import { createHash } from "node:crypto";

/**
 * HMAC key used to sign the CAPTCHA cookie.
 *
 * A real application must read this from the environment and fail to boot when
 * it is missing. This demo derives a stable fallback so it runs with zero setup.
 */
export function appSecret(): Buffer {
  const fromEnv = process.env.APP_SECRET;
  if (fromEnv) return Buffer.from(fromEnv, "utf8");
  return createHash("sha256").update("nextjs-login-security-dev-secret").digest();
}
