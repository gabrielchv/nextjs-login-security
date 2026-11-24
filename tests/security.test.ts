/**
 * Regression tests for the pure security helpers.
 *
 * Run with `npm test` (node:test; no extra dependency). These cover the parts
 * that a refactor could quietly break — most importantly the guarantee that a
 * login for a missing user costs the same as a wrong password for a real one,
 * because that is what stops the form from enumerating usernames.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateCsrfToken, safeEqual, verifyCsrfToken } from "../src/lib/csrf.ts";
import { hashPassword, verifyPassword, verifyPasswordOrDecoy } from "../src/lib/password.ts";

/** Median of a repeated measurement, in milliseconds. */
async function medianMs(fn: () => void, runs = 9): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint();
    fn();
    samples.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

describe("verifyPasswordOrDecoy", () => {
  const hash = hashPassword("senha123");

  it("accepts the right password", () => {
    assert.equal(verifyPasswordOrDecoy("senha123", hash), true);
  });

  it("rejects the wrong password", () => {
    assert.equal(verifyPasswordOrDecoy("errada", hash), false);
  });

  it("rejects every password for a missing account", () => {
    assert.equal(verifyPasswordOrDecoy("senha123", undefined), false);
    assert.equal(verifyPasswordOrDecoy("senha123", null), false);
    assert.equal(verifyPasswordOrDecoy("senha123", ""), false);
  });

  it("costs the same for a missing account as for a wrong password", async () => {
    // The whole point of the decoy hash. A missing user must still pay one
    // scrypt, or the response time tells an attacker the username is real.
    const missing = await medianMs(() => verifyPasswordOrDecoy("errada", undefined));
    const wrong = await medianMs(() => verifyPasswordOrDecoy("errada", hash));

    assert.ok(
      missing > 1,
      `a missing account answered in ${missing.toFixed(2)}ms — scrypt was skipped`,
    );
    // Generous band: this asserts "same order of magnitude, both running
    // scrypt", not a microbenchmark. The pre-fix ratio was roughly 1:4.
    const ratio = Math.max(missing, wrong) / Math.min(missing, wrong);
    assert.ok(
      ratio < 2,
      `timing differs by ${ratio.toFixed(2)}x (missing ${missing.toFixed(1)}ms, ` +
        `wrong ${wrong.toFixed(1)}ms); a missing account is distinguishable`,
    );
  });
});

describe("verifyPassword", () => {
  it("rejects malformed stored hashes without throwing", () => {
    assert.equal(verifyPassword("x", ""), false);
    assert.equal(verifyPassword("x", "not-a-hash"), false);
    assert.equal(verifyPassword("x", "abcd:ef"), false);
  });

  it("salts each hash independently", () => {
    const a = hashPassword("same");
    const b = hashPassword("same");
    assert.notEqual(a, b);
    assert.equal(verifyPassword("same", a), true);
    assert.equal(verifyPassword("same", b), true);
  });
});

describe("csrf", () => {
  it("mints a 64-character hex token", () => {
    assert.match(generateCsrfToken(), /^[0-9a-f]{64}$/);
  });

  it("gives a fresh token each call", () => {
    assert.notEqual(generateCsrfToken(), generateCsrfToken());
  });

  it("compares without leaking length through an early return", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
    assert.equal(safeEqual("abc", "abcd"), false);
    assert.equal(safeEqual("", ""), true);
  });

  it("rejects a missing or mistyped submitted token", () => {
    const token = generateCsrfToken();
    assert.equal(verifyCsrfToken(token, token), true);
    assert.equal(verifyCsrfToken(token, undefined), false);
    assert.equal(verifyCsrfToken(undefined, token), false);
    assert.equal(verifyCsrfToken("", token), false);
    assert.equal(verifyCsrfToken(123, token), false);
    assert.equal(verifyCsrfToken(generateCsrfToken(), token), false);
  });
});
