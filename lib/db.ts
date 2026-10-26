import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(
  authToken ? { url, authToken } : { url }
);

// Serverless functions sometimes reuse a connection that Turso has already closed, which
// surfaces as "fetch failed ... other side closed". Reads are safe to repeat, so retry those
// a couple of times (writes are never retried, to avoid doing them twice).
const TRANSIENT_NETWORK_ERROR = /fetch failed|other side closed|UND_ERR_SOCKET|ECONNRESET|socket hang up/i;
const isReadOnlyStatement = (statement: unknown) => {
  const sql = typeof statement === 'string' ? statement : String((statement as { sql?: string })?.sql ?? '');
  return /^\s*(select|pragma|with)\b/i.test(sql);
};
const executeOnce = client.execute.bind(client) as (statement: never) => Promise<unknown>;
client.execute = (async (statement: never) => {
  const attempts = isReadOnlyStatement(statement) ? 3 : 1;
  for (let attempt = 1; ; attempt++) {
    try {
      return await executeOnce(statement);
    } catch (error) {
      const text = `${(error as Error)?.message ?? ''} ${(error as { cause?: { message?: string; code?: string } })?.cause?.message ?? ''} ${
        (error as { cause?: { code?: string } })?.cause?.code ?? ''
      }`;
      if (attempt >= attempts || !TRANSIENT_NETWORK_ERROR.test(text)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
}) as typeof client.execute;

export const db = client;

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
      const columnNames = new Set(columns.rows.map((row) => String(row.name)));
      if (!columnNames.has('role')) {
        await db.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
      }
      // Optional platform username (e.g. a game account handle), for matching
      // payment notes that reference a username instead of the customer's name.
      if (!columnNames.has('username')) {
        await db.execute('ALTER TABLE users ADD COLUMN username TEXT');
      }
      // Admin-set VIP tier override (one of the VIP_TIERS names). NULL means
      // the tier is auto-derived from lifetime deposits as usual.
      if (!columnNames.has('tier_override')) {
        await db.execute('ALTER TABLE users ADD COLUMN tier_override TEXT');
      }
      // Birthday as "MM-DD" (no year), set once, for the birthday bonus.
      // birthday_set_at lets us require it was saved before the window opens.
      if (!columnNames.has('birthday')) {
        await db.execute('ALTER TABLE users ADD COLUMN birthday TEXT');
      }
      if (!columnNames.has('birthday_set_at')) {
        await db.execute('ALTER TABLE users ADD COLUMN birthday_set_at TEXT');
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
          `CREATE TABLE IF NOT EXISTS email_unmatched_payments (
            id TEXT PRIMARY KEY,
            email_message_id TEXT NOT NULL UNIQUE,
            source TEXT NOT NULL,
            amount_cents INTEGER,
            sender_email TEXT,
            subject TEXT,
            parsed_name TEXT,
            reason TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            resolved_at TEXT,
            resolved_user_id TEXT,
            resolved_by_admin_id TEXT
          )`
        ),
        // Devices / networks each account has logged in or signed up from (hashed), for spotting duplicates.
        db.execute(
          `CREATE TABLE IF NOT EXISTS account_devices (
            user_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            ip_hash TEXT NOT NULL DEFAULT '',
            ua_hash TEXT NOT NULL DEFAULT '',
            user_agent TEXT,
            first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
            seen_count INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (user_id, device_id, ip_hash)
          )`
        ),
        // Duplicate-account groups an admin has reviewed and cleared.
        db.execute(
          `CREATE TABLE IF NOT EXISTS duplicate_reviews (
            group_key TEXT PRIMARY KEY,
            reviewed_by_admin_id TEXT,
            reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        ),
        // Recent chat sends, used to throttle spam from guests.
        db.execute(
          `CREATE TABLE IF NOT EXISTS chat_rate_events (
            key TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        ),
        // Admin-created special events with their own deposit-bonus rules.
        db.execute(
          `CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '🎉',
            description TEXT,
            starts_at TEXT NOT NULL,
            ends_at TEXT NOT NULL,
            bonus_per_deposit_cents INTEGER NOT NULL,
            min_deposit_cents INTEGER NOT NULL,
            max_deposits INTEGER NOT NULL,
            min_tier TEXT NOT NULL,
            created_by_admin_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`
        ),
        // Which holiday/birthday bonuses the admin has already credited, and how much.
        db.execute(
          `CREATE TABLE IF NOT EXISTS bonus_payouts (
            user_id TEXT NOT NULL,
            bonus_key TEXT NOT NULL,
            paid_cents INTEGER NOT NULL DEFAULT 0,
            paid_at TEXT,
            paid_by_admin_id TEXT,
            PRIMARY KEY (user_id, bonus_key)
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
      // Lets a customer dismiss a completed withdrawal from their own dashboard
      // view without deleting the underlying record admins still rely on.
      if (!withdrawalColumnNames.has('hidden_from_customer_at')) {
        await db.execute('ALTER TABLE withdrawals ADD COLUMN hidden_from_customer_at TEXT');
      }

      // Migration for databases created before the Square integration columns existed.
      // Real IP and coarse location (from Vercel's headers) per device row, for admin review.
      const deviceColumns = await db.execute('PRAGMA table_info(account_devices)');
      const deviceColumnNames = new Set(deviceColumns.rows.map((row) => String(row.name)));
      for (const column of ['ip', 'country', 'region', 'city']) {
        if (!deviceColumnNames.has(column)) {
          await db.execute(`ALTER TABLE account_devices ADD COLUMN ${column} TEXT`);
        }
      }

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
      // For deposits auto-matched from a Venmo/Zelle notification email —
      // dedup key, parallel to square_payment_id.
      // The payer name parsed from a Venmo/Zelle email, kept so accounts paid by the same person can be spotted.
      if (!depositColumnNames.has('payer_name')) {
        await db.execute('ALTER TABLE deposits ADD COLUMN payer_name TEXT');
      }
      if (!depositColumnNames.has('email_message_id')) {
        await db.execute('ALTER TABLE deposits ADD COLUMN email_message_id TEXT');
      }
    })();
  }
  return schemaReady;
}
