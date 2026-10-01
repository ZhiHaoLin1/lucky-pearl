import { db } from './db';
import { toSqliteDateTime } from './easternDay';
import { getTierForDeposits, VIP_TIERS } from './vip';
import { listBirthdayWindows, listHolidayWindows, type BonusWindow } from './bonuses';
import { getEventWindows } from './events';

// How long after a bonus week ends an unpaid bonus still shows up for the admin.
const LOOKBACK_DAYS = 30;

export type BonusPayoutRow = {
  userId: string;
  fullName: string;
  username: string | null;
  phone: string;
  bonusKey: string;
  kind: 'holiday' | 'birthday' | 'event';
  title: string;
  emoji: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  qualifyingDeposits: number;
  maxDeposits: number;
  earnedCents: number;
  paidCents: number;
  owedCents: number;
};

const tierIndexByName = (name: string) => VIP_TIERS.findIndex((tier) => tier.name === name);

async function countQualifying(userId: string | null, window: BonusWindow) {
  const sql = `SELECT user_id, COUNT(*) AS n FROM deposits
               WHERE amount_cents >= ? AND created_at >= ? AND created_at < ?
               ${userId ? 'AND user_id = ?' : ''}
               GROUP BY user_id`;
  const args: Array<string | number> = [
    window.minDepositCents,
    toSqliteDateTime(window.startUtc),
    toSqliteDateTime(window.endUtc),
  ];
  if (userId) args.push(userId);
  const result = await db.execute({ sql, args });
  const counts = new Map<string, number>();
  for (const row of result.rows) counts.set(String(row.user_id), Number(row.n));
  return counts;
}

/**
 * Every customer who earned (or is earning) a holiday, birthday or event bonus in
 * the current week or the last 30 days, with how much has been credited so far.
 * Pass `only` to recompute a single row (used when marking paid).
 */
export async function getBonusPayoutRows(
  now: Date = new Date(),
  only?: { userId: string; bonusKey: string }
): Promise<BonusPayoutRow[]> {
  const usersResult = await db.execute(
    `SELECT u.id, u.full_name, u.username, u.phone, u.birthday, u.birthday_set_at, u.tier_override,
            COALESCE((SELECT SUM(amount_cents) FROM deposits d WHERE d.user_id = u.id), 0) AS lifetime
     FROM users u WHERE u.role != 'admin'`
  );
  const payoutsResult = await db.execute('SELECT user_id, bonus_key, paid_cents FROM bonus_payouts');
  const paid = new Map<string, number>();
  for (const row of payoutsResult.rows) paid.set(`${row.user_id}|${row.bonus_key}`, Number(row.paid_cents));

  const users = usersResult.rows
    .filter((row) => !only || String(row.id) === only.userId)
    .map((row) => {
      const override = row.tier_override ? VIP_TIERS.find((t) => t.name === String(row.tier_override)) : undefined;
      const tier = override ?? getTierForDeposits(Number(row.lifetime));
      return {
        id: String(row.id),
        fullName: String(row.full_name),
        username: row.username ? String(row.username) : null,
        phone: String(row.phone),
        birthday: row.birthday ? String(row.birthday) : null,
        birthdaySetAt: row.birthday_set_at ? String(row.birthday_set_at) : null,
        tierIndex: tierIndexByName(tier.name),
      };
    });

  const rows: BonusPayoutRow[] = [];
  const pushRow = (user: (typeof users)[number], window: BonusWindow, deposits: number) => {
    if (user.tierIndex < tierIndexByName(window.minTier)) return;
    const qualifyingDeposits = Math.min(window.maxDeposits, deposits);
    const earnedCents = qualifyingDeposits * window.perDepositCents;
    const paidCents = paid.get(`${user.id}|${window.key}`) ?? 0;
    if (earnedCents === 0 && paidCents === 0) return;
    rows.push({
      userId: user.id,
      fullName: user.fullName,
      username: user.username,
      phone: user.phone,
      bonusKey: window.key,
      kind: window.kind,
      title: window.title,
      emoji: window.emoji,
      startsAt: window.startUtc.toISOString(),
      endsAt: window.endUtc.toISOString(),
      isActive: window.endUtc > now,
      qualifyingDeposits,
      maxDeposits: window.maxDeposits,
      earnedCents,
      paidCents,
      owedCents: Math.max(0, earnedCents - paidCents),
    });
  };

  // Holidays and events apply to everyone, so one grouped query per window.
  const sharedWindows = [...listHolidayWindows(now, LOOKBACK_DAYS), ...(await getEventWindows(now, LOOKBACK_DAYS))];
  for (const window of sharedWindows) {
    if (only && only.bonusKey !== window.key) continue;
    const counts = await countQualifying(only?.userId ?? null, window);
    for (const user of users) pushRow(user, window, counts.get(user.id) ?? 0);
  }

  // Birthdays are per customer.
  for (const user of users) {
    for (const window of listBirthdayWindows(user.birthday, user.birthdaySetAt, now, LOOKBACK_DAYS)) {
      if (only && only.bonusKey !== window.key) continue;
      const counts = await countQualifying(user.id, window);
      pushRow(user, window, counts.get(user.id) ?? 0);
    }
  }

  // Unpaid first, then most recent.
  return rows.sort((a, b) => {
    if ((a.owedCents > 0) !== (b.owedCents > 0)) return a.owedCents > 0 ? -1 : 1;
    return b.endsAt.localeCompare(a.endsAt);
  });
}
