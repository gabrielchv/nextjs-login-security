import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CSRF_COOKIE, CSRF_FIELD, verifyCsrfToken } from "@/lib/csrf";
import { destroySession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const jar = await cookies();

  if (!verifyCsrfToken(body?.[CSRF_FIELD], jar.get(CSRF_COOKIE)?.value)) {
    return NextResponse.json({ error: "Token CSRF inválido." }, { status: 403 });
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}
