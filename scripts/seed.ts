import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const DEMO_USERS = [
  { username: "alice", password: "senha123" },
  { username: "bob", password: "hunter2" },
];

const insert = db.prepare(
  `INSERT INTO users (username, password_hash, password_plain) VALUES (?, ?, ?)
   ON CONFLICT(username) DO UPDATE SET
     password_hash  = excluded.password_hash,
     password_plain = excluded.password_plain`,
);

for (const user of DEMO_USERS) {
  insert.run(user.username, hashPassword(user.password), user.password);
  console.log(`seeded: ${user.username} / ${user.password}`);
}

db.prepare("DELETE FROM login_attempts").run();
db.prepare("DELETE FROM sessions").run();
console.log("cleared: login_attempts, sessions");
