import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import type { User } from "../types.js";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
}

function userFromRow(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

export function createUser(email: string, passwordHash: string, name: string | null): User {
  const user: User = { id: randomUUID(), email, name, createdAt: new Date().toISOString() };
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, created_at)
     VALUES (@id, @email, @passwordHash, @name, @createdAt)`,
  ).run({ ...user, passwordHash });
  return user;
}

/** Includes the password hash -- for login verification only, never returned from an API route. */
export function getUserRowByEmail(email: string): (User & { passwordHash: string }) | undefined {
  const row = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRow | undefined;
  return row ? { ...userFromRow(row), passwordHash: row.password_hash } : undefined;
}

export function getUserById(id: string): User | undefined {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  return row ? userFromRow(row) : undefined;
}

export function updateUserName(id: string, name: string): User | undefined {
  db.prepare(`UPDATE users SET name = ? WHERE id = ?`).run(name, id);
  return getUserById(id);
}

/** Deletes the user row -- every owned trip/wardrobe/packing-list row (and everything under them) cascades via ON DELETE CASCADE. Doesn't touch files on disk; see authService.deleteAccount for that. */
export function deleteUser(id: string): void {
  db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
}
