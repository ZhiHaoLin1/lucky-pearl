import { db } from './db';
import { getTierForDeposits, VIP_TIERS } from './vip';
import { getEasternDayRangeUtc, toSqliteDateTime } from './easternDay';

export async function getTierOverride(userId: string): Promise<string | null> {
  const result = await db.execute({ sql: 'SELECT tier_override FROM users WHERE id = ?', args: [userId] });
  const value = result.rows[0]?.tier_override;
  return value ? String(value) : null;
}

export async function getLifetimeDepositsCents(userId: string): Promise<number> {
  const result = await db.execute({
    sql: 'SELECT COALESCE(SUM(amount_cents), 0) AS total FROM deposits WHERE user_id = ?',
    args: [userId],
  });
  return Number(result.rows[0]?.total ?? 0);
}

export async function getTodaysWithdrawnCents(userId: string): Promise<number> {
  const { startUtc, endUtc } = getEasternDayRangeUtc();
  const result = await db.execute({
    sql: `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM withdrawals
          WHERE user_id = ? AND status != 'denied' AND created_at >= ? AND created_at < ?`,
    args: [userId, toSqliteDateTime(startUtc), toSqliteDateTime(endUtc)],
  });
  return Number(result.rows[0]?.total ?? 0);
}

export async function getFinanceSummary(userId: string) {
  const [lifetimeDepositsCents, todaysWithdrawnCents, tierOverride] = await Promise.all([
    getLifetimeDepositsCents(userId),
    getTodaysWithdrawnCents(userId),
    getTierOverride(userId),
  ]);
  const overriddenTier = tierOverride ? VIP_TIERS.find((t) => t.name === tierOverride) : undefined;
  const tier = overriddenTier ?? getTierForDeposits(lifetimeDepositsCents);
  const remainingTodayCents = Math.max(0, tier.dailyLimitCents - todaysWithdrawnCents);
  return { lifetimeDepositsCents, todaysWithdrawnCents, tier, remainingTodayCents, tierOverride };
}
