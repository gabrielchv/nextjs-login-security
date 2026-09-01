import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CSRF_COOKIE, CSRF_FIELD, verifyCsrfToken } from "@/lib/csrf";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

/**
 * ############################################################################
 * # INTENTIONALLY VULNERABLE — DO NOT COPY THIS INTO REAL CODE.              #
 * ############################################################################
 *
 * This handler exists to demonstrate SQL injection. It differs from
 * /api/login in exactly three ways, each of them a deliberate flaw:
 *
 *   1. the username and password are concatenated straight into the SQL string;
 *   2. the password is compared against a plaintext column;
 *   3. there is no lockout and no CAPTCHA, so the attack can be automated.
 *
 * CSRF protection is kept so that the only interesting difference against the
 * hardened route is the query construction itself.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const jar = await cookies();

  if (!verifyCsrfToken(body?.[CSRF_FIELD], jar.get(CSRF_COOKIE)?.value)) {
    return NextResponse.json(
      { error: "Token CSRF inválido ou ausente." },
      { status: 403 },
    );
  }

  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // VULNERABLE: raw string interpolation.
  const sql =
    `SELECT id, username FROM users ` +
    `WHERE username = '${username}' AND password_plain = '${password}'`;

  let user: { id: number; username: string } | undefined;
  try {
    user = db.prepare(sql).get() as { id: number; username: string } | undefined;
  } catch (error) {
    // A malformed payload breaks the query — that error is itself a signal to
    // an attacker that the input reaches the SQL parser.
    return NextResponse.json(
      { error: `Erro de SQL: ${(error as Error).message}`, sql },
      { status: 400 },
    );
  }

  if (!user) {
    return NextResponse.json({ error: "Usuário ou senha inválidos.", sql }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true, username: user.username, sql });
}
