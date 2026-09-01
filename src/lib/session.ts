import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

export type SessionUser = { id: number; username: string };

/** Creates a session row and sets the httpOnly cookie that points at it. */
export async function createSession(userId: number): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const now = Date.now();

  db.prepare(
    "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(id, userId, now, now + SESSION_TTL_MS);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return id;
}

/** Reads the current session cookie and resolves it to a user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const row = db
    .prepare(
      `SELECT users.id AS id, users.username AS username, sessions.expires_at AS expires_at
         FROM sessions
         JOIN users ON users.id = sessions.user_id
        WHERE sessions.id = ?`,
    )
    .get(id) as { id: number; username: string; expires_at: number } | undefined;

  if (!row) return null;

  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    return null;
  }

  return { id: row.id, username: row.username };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
  jar.delete(SESSION_COOKIE);
}
