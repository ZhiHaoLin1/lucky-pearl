import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient(
  authToken ? { url, authToken } : { url }
);

let schemaReady: Promise<void> | null = null;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.execute(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT NOT NULL,
          preferred_game TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`
      );

      // Migration for databases created before the `role` column existed.
      const columns = await db.execute('PRAGMA table_info(users)');
      const hasRole = columns.rows.some((row) => String(row.name) === 'role');
      if (!hasRole) {
        await db.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
      }

      await Promise.all([
        db.execute(
          `CREATE TABLE IF NOT EXISTS password_resets (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        ),
        db.execute(
          `CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            sender_admin_id TEXT,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            read_at TEXT
          )`
        ),
      ]);
    })();
  }
  return schemaReady;
}
