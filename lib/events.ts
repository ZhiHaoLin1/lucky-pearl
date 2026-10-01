import { db } from './db';
import { toSqliteDateTime } from './easternDay';
import type { BonusWindow } from './bonuses';

export type EventRecord = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  startsAt: string; // ISO, UTC
  endsAt: string; // ISO, UTC
  bonusPerDepositCents: number;
  minDepositCents: number;
  maxDeposits: number;
  minTier: string;
};

const sqliteToDate = (value: string) => new Date(value.replace(' ', 'T') + 'Z');

export async function listEvents(): Promise<EventRecord[]> {
  const result = await db.execute('SELECT * FROM events ORDER BY starts_at DESC');
  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    emoji: String(row.emoji || '🎉'),
    description: row.description ? String(row.description) : null,
    startsAt: sqliteToDate(String(row.starts_at)).toISOString(),
    endsAt: sqliteToDate(String(row.ends_at)).toISOString(),
    bonusPerDepositCents: Number(row.bonus_per_deposit_cents),
    minDepositCents: Number(row.min_deposit_cents),
    maxDeposits: Number(row.max_deposits),
    minTier: String(row.min_tier),
  }));
}

/**
 * Events that have started and haven't ended more than `lookbackDays` ago, as bonus
 * windows. With lookbackDays = 0 that's just the events open right now.
 */
export async function getEventWindows(now: Date = new Date(), lookbackDays = 0): Promise<BonusWindow[]> {
  const cutoff = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const result = await db.execute({
    sql: 'SELECT * FROM events WHERE starts_at <= ? AND ends_at > ? ORDER BY starts_at ASC',
    args: [toSqliteDateTime(now), toSqliteDateTime(cutoff)],
  });
  return result.rows.map((row) => ({
    key: `event:${row.id}`,
    kind: 'event' as const,
    title: String(row.name),
    emoji: String(row.emoji || '🎉'),
    description: row.description ? String(row.description) : undefined,
    startUtc: sqliteToDate(String(row.starts_at)),
    endUtc: sqliteToDate(String(row.ends_at)),
    perDepositCents: Number(row.bonus_per_deposit_cents),
    minDepositCents: Number(row.min_deposit_cents),
    maxDeposits: Number(row.max_deposits),
    minTier: String(row.min_tier),
  }));
}
