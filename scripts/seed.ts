import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const DEMO_USERS = [
  { username: "alice", password: "senha123" },
  { username: "bob", password: "hunter2" },
];

/**
 * Rows are cleared with DELETE rather than by unlinking data/app.db, so the
 * script is safe to run while the dev server holds an open connection —
 * removing the file underneath a running server leaves it on a stale handle
 * and every later query fails with "disk I/O error".
 */
const reset = db.transaction(() => {
  db.prepare("DELETE FROM sessions").run();
  db.prepare("DELETE FROM login_attempts").run();
  db.prepare("DELETE FROM users").run();

  const insert = db.prepare(
    "INSERT INTO users (username, password_hash, password_plain) VALUES (?, ?, ?)",
  );
  for (const user of DEMO_USERS) {
    insert.run(user.username, hashPassword(user.password), user.password);
  }
});

reset();

for (const user of DEMO_USERS) {
  console.log(`seeded: ${user.username} / ${user.password}`);
}
console.log("cleared: sessions, login_attempts");
