import { db } from "./db";

export const MAX_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 1000 * 60 * 15; // 15 minutes

export type LockState = { locked: boolean; retryAfterSeconds: number };

type AttemptRow = { username: string; failures: number; locked_until: number | null };

/** Attempts are counted per account, case-insensitively. */
function key(username: string): string {
  return username.trim().toLowerCase();
}

function read(username: string): AttemptRow | undefined {
  return db
    .prepare("SELECT username, failures, locked_until FROM login_attempts WHERE username = ?")
    .get(key(username)) as AttemptRow | undefined;
}

export function checkLock(username: string): LockState {
  const row = read(username);
  const lockedUntil = row?.locked_until ?? 0;
  const remaining = lockedUntil - Date.now();

  if (remaining > 0) {
    return { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

/** How many tries are left before the account locks. */
export function attemptsLeft(username: string): number {
  const row = read(username);
  return Math.max(0, MAX_ATTEMPTS - (row?.failures ?? 0));
}

/**
 * Records one failed login. Locks the account once MAX_ATTEMPTS is reached and
 * resets the counter so the next lock also takes a full MAX_ATTEMPTS tries.
 */
export function registerFailure(username: string): LockState {
  const name = key(username);
  const failures = (read(name)?.failures ?? 0) + 1;

  if (failures >= MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCK_DURATION_MS;
    db.prepare(
      `INSERT INTO login_attempts (username, failures, locked_until) VALUES (?, 0, ?)
       ON CONFLICT(username) DO UPDATE SET failures = 0, locked_until = excluded.locked_until`,
    ).run(name, lockedUntil);
    return { locked: true, retryAfterSeconds: Math.ceil(LOCK_DURATION_MS / 1000) };
  }

  db.prepare(
    `INSERT INTO login_attempts (username, failures, locked_until) VALUES (?, ?, NULL)
     ON CONFLICT(username) DO UPDATE SET failures = excluded.failures`,
  ).run(name, failures);

  return { locked: false, retryAfterSeconds: 0 };
}

export function clearFailures(username: string): void {
  db.prepare("DELETE FROM login_attempts WHERE username = ?").run(key(username));
}
