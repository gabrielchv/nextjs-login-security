import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { appSecret } from "./secret";

export const CAPTCHA_COOKIE = "captcha_challenge";
export const CAPTCHA_FIELD = "captcha";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 lookalikes
const CODE_LENGTH = 5;
const TTL_MS = 1000 * 60 * 2;
const WIDTH = 180;
const HEIGHT = 60;

export type Captcha = { svg: string; cookieValue: string };

function sign(code: string): string {
  return createHmac("sha256", appSecret()).update(code.toUpperCase()).digest("hex");
}

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

function renderSvg(code: string): string {
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="captcha">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#f1f5f9"/>`,
  );

  // Noise drawn behind the glyphs.
  for (let i = 0; i < 6; i++) {
    parts.push(
      `<line x1="${randomInt(WIDTH)}" y1="${randomInt(HEIGHT)}" x2="${randomInt(WIDTH)}" y2="${randomInt(HEIGHT)}" stroke="#94a3b8" stroke-width="${1 + randomInt(2)}" opacity="0.7"/>`,
    );
  }
  for (let i = 0; i < 40; i++) {
    parts.push(
      `<circle cx="${randomInt(WIDTH)}" cy="${randomInt(HEIGHT)}" r="${1 + randomInt(2)}" fill="#94a3b8" opacity="0.6"/>`,
    );
  }

  const step = WIDTH / (CODE_LENGTH + 1);
  for (let i = 0; i < code.length; i++) {
    const x = step * (i + 1) + randomInt(-5, 6);
    const y = HEIGHT / 2 + 10 + randomInt(-6, 7);
    const rotation = randomInt(-28, 29);
    const hue = randomInt(200, 280);
    parts.push(
      `<text x="${x}" y="${y}" font-family="monospace" font-size="34" font-weight="bold"` +
        ` fill="hsl(${hue} 45% 30%)" text-anchor="middle"` +
        ` transform="rotate(${rotation} ${x} ${y})">${code[i]}</text>`,
    );
  }

  // A couple of strokes on top so the glyphs cannot be cleanly segmented.
  for (let i = 0; i < 2; i++) {
    parts.push(
      `<line x1="0" y1="${randomInt(HEIGHT)}" x2="${WIDTH}" y2="${randomInt(HEIGHT)}" stroke="#64748b" stroke-width="1.5" opacity="0.8"/>`,
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

/**
 * Builds a challenge. The plaintext code never leaves the server: the cookie
 * carries only "hmac.expiresAt", so the client cannot read the answer and
 * cannot forge a cookie for a code of its choosing.
 */
export function createCaptcha(): Captcha {
  const code = randomCode();
  return {
    svg: renderSvg(code),
    cookieValue: `${sign(code)}.${Date.now() + TTL_MS}`,
  };
}

export function verifyCaptcha(input: unknown, cookieValue: string | undefined): boolean {
  if (typeof input !== "string" || input.trim().length !== CODE_LENGTH) return false;
  if (!cookieValue) return false;

  const [expectedHmac, expiresAt] = cookieValue.split(".");
  if (!expectedHmac || !expiresAt) return false;
  if (Number(expiresAt) < Date.now()) return false;

  const actual = Buffer.from(sign(input.trim()), "hex");
  const expected = Buffer.from(expectedHmac, "hex");
  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}
