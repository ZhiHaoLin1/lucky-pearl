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
        db.execute(
          `CREATE TABLE IF NOT EXISTS deposits (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount_cents INTEGER NOT NULL,
            method TEXT,
            note TEXT,
            recorded_by_admin_id TEXT,
            square_payment_id TEXT,
            square_charged_cents INTEGER,
            platform TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        ),
        db.execute(
          `CREATE TABLE IF NOT EXISTS square_unmatched_payments (
            id TEXT PRIMARY KEY,
            square_payment_id TEXT NOT NULL UNIQUE,
            amount_cents INTEGER NOT NULL,
            square_charged_cents INTEGER,
            platform TEXT,
            parsed_name TEXT,
            note TEXT,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            resolved_at TEXT,
            resolved_user_id TEXT,
            resolved_by_admin_id TEXT
          )`
        ),
        db.execute(
          `CREATE TABLE IF NOT EXISTS withdrawals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            amount_cents INTEGER NOT NULL,
            method TEXT,
            payout_detail TEXT,
            fee_cents INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            processed_at TEXT,
            processed_by_admin_id TEXT
          )`
        ),
      ]);

      // Migration for databases created before the payout columns existed.
      const withdrawalColumns = await db.execute('PRAGMA table_info(withdrawals)');
      const withdrawalColumnNames = new Set(withdrawalColumns.rows.map((row) => String(row.name)));
      if (!withdrawalColumnNames.has('method')) {
        await db.execute('ALTER TABLE withdrawals ADD COLUMN method TEXT');
      }
      if (!withdrawalColumnNames.has('payout_detail')) {
        await db.execute('ALTER TABLE withdrawals ADD COLUMN payout_detail TEXT');
      }
      if (!withdrawalColumnNames.has('fee_cents')) {
        await db.execute('ALTER TABLE withdrawals ADD COLUMN fee_cents INTEGER NOT NULL DEFAULT 0');
      }

      // Migration for databases created before the Square integration columns existed.
      const depositColumns = await db.execute('PRAGMA table_info(deposits)');
      const depositColumnNames = new Set(depositColumns.rows.map((row) => String(row.name)));
      if (!depositColumnNames.has('square_payment_id')) {
        await db.execute('ALTER TABLE deposits ADD COLUMN square_payment_id TEXT');
      }
      if (!depositColumnNames.has('square_charged_cents')) {
        await db.execute('ALTER TABLE deposits ADD COLUMN square_charged_cents INTEGER');
      }
      if (!depositColumnNames.has('platform')) {
        await db.execute('ALTER TABLE deposits ADD COLUMN platform TEXT');
      }
    })();
  }
  return schemaReady;
}
