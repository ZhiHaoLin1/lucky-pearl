import { db } from './db';

export type RateRule = { minutes: number; max: number };

/**
 * Counts an attempt against each key and says whether it may go ahead. Every key has one or more
 * rules ("at most 10 in 60 minutes"). If any rule is already full the attempt is refused (and not
 * counted), otherwise it is recorded against all keys. Shares the table used by the chat limiter.
 */
export async function allowAttempt(keys: Array<{ key: string; rules: RateRule[] }>): Promise<boolean> {
  for (const { key, rules } of keys) {
    for (const rule of rules) {
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM chat_rate_events WHERE key = ? AND created_at >= datetime('now', ?)`,
        args: [key, `-${rule.minutes} minutes`],
      });
      if (Number(result.rows[0]?.n ?? 0) >= rule.max) return false;
    }
  }
  for (const { key } of keys) {
    await db.execute({ sql: 'INSERT INTO chat_rate_events (key) VALUES (?)', args: [key] });
  }
  if (Math.random() < 0.05) {
    await db.execute("DELETE FROM chat_rate_events WHERE created_at < datetime('now', '-2 days')");
  }
  return true;
}
