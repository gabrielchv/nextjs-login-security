import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CAPTCHA_COOKIE, CAPTCHA_FIELD, verifyCaptcha } from "@/lib/captcha";
import { CSRF_COOKIE, CSRF_FIELD, verifyCsrfToken } from "@/lib/csrf";
import { db, type UserRow } from "@/lib/db";
import { verifyPasswordOrDecoy } from "@/lib/password";
import { attemptsLeft, checkLock, clearFailures, registerFailure } from "@/lib/ratelimit";
import { createSession } from "@/lib/session";

/**
 * Hardened login. Every defence in the project is applied here, in this order:
 * CSRF -> CAPTCHA -> lockout -> parameterised lookup -> constant-time hash check.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const jar = await cookies();

  // 1. CSRF: the submitted token must match the httpOnly cookie.
  if (!verifyCsrfToken(body?.[CSRF_FIELD], jar.get(CSRF_COOKIE)?.value)) {
    return NextResponse.json(
      { error: "Token CSRF inválido ou ausente." },
      { status: 403 },
    );
  }

  // 2. CAPTCHA: the challenge is single-use, so it is consumed either way.
  const captchaCookie = jar.get(CAPTCHA_COOKIE)?.value;
  jar.delete(CAPTCHA_COOKIE);

  if (!verifyCaptcha(body?.[CAPTCHA_FIELD], captchaCookie)) {
    return NextResponse.json(
      { error: "CAPTCHA incorreto ou expirado." },
      { status: 400 },
    );
  }

  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Usuário e senha são obrigatórios." },
      { status: 400 },
    );
  }

  // 3. Lockout: checked before touching the users table.
  const lock = checkLock(username);
  if (lock.locked) {
    return NextResponse.json(
      {
        error: `Conta bloqueada por excesso de tentativas. Tente de novo em ${Math.ceil(lock.retryAfterSeconds / 60)} min.`,
        retryAfterSeconds: lock.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(lock.retryAfterSeconds) } },
    );
  }

  // 4. Parameterised query: the input is bound, never concatenated into SQL.
  const user = db
    .prepare("SELECT id, username, password_hash, password_plain FROM users WHERE username = ?")
    .get(username) as UserRow | undefined;

  // 5. Constant-time scrypt verification. This runs for every request, even
  //    when the username does not exist: `verifyPasswordOrDecoy` falls back to
  //    a decoy hash, so both branches pay one scrypt. Skipping it for a missing
  //    user would make a bad username answer ~4x faster than a bad password and
  //    turn the form into a username-enumeration oracle (see password.ts).
  const ok = verifyPasswordOrDecoy(password, user?.password_hash);

  if (!ok || !user) {
    const afterFailure = registerFailure(username);
    return NextResponse.json(
      {
        error: "Usuário ou senha inválidos.",
        attemptsLeft: afterFailure.locked ? 0 : attemptsLeft(username),
        locked: afterFailure.locked,
      },
      { status: afterFailure.locked ? 429 : 401 },
    );
  }

  clearFailures(username);
  await createSession(user.id);

  return NextResponse.json({ ok: true, username: user.username });
}
