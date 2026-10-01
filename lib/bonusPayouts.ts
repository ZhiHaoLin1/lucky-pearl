import { db } from './db';
import { toSqliteDateTime } from './easternDay';
import { getTierForDeposits, VIP_TIERS } from './vip';
import {
  BONUS_PER_DEPOSIT_CENTS,
  MAX_BONUS_DEPOSITS,
  MIN_QUALIFYING_DEPOSIT_CENTS,
  listBirthdayWindows,
  listHolidayWindows,
  type BonusWindow,
} from './bonuses';

// How long after a bonus week ends an unpaid bonus still shows up for the admin.
const LOOKBACK_DAYS = 30;

export type BonusPayoutRow = {
  userId: string;
  fullName: string;
  username: string | null;
  phone: string;
  bonusKey: string;
  kind: 'holiday' | 'birthday';
  title: string;
  emoji: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  qualifyingDeposits: number;
  earnedCents: number;
  paidCents: number;
  owedCents: number;
};

const holidayMinTier = VIP_TIERS.findIndex((tier) => tier.name === 'Gold');
const birthdayMinTier = VIP_TIERS.findIndex((tier) => tier.name === 'Jade');

async function countQualifying(userId: string | null, window: BonusWindow) {
  const sql = `SELECT user_id, COUNT(*) AS n FROM deposits
               WHERE amount_cents >= ? AND created_at >= ? AND created_at < ?
               ${userId ? 'AND user_id = ?' : ''}
               GROUP BY user_id`;
  const args: Array<string | number> = [
    MIN_QUALIFYING_DEPOSIT_CENTS,
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
 * Every customer who earned (or is earning) a holiday/birthday bonus in the
 * current week or the last 30 days, with how much has been credited so far.
 * Pass `onlyUserId` + `onlyKey` to recompute a single row (used when marking paid).
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
        tierIndex: VIP_TIERS.findIndex((t) => t.name === tier.name),
      };
    });

  const rows: BonusPayoutRow[] = [];
  const pushRow = (user: (typeof users)[number], window: BonusWindow, deposits: number) => {
    if (only && window.key !== only.bonusKey) return;
    const qualifyingDeposits = Math.min(MAX_BONUS_DEPOSITS, deposits);
    const earnedCents = qualifyingDeposits * BONUS_PER_DEPOSIT_CENTS;
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
      earnedCents,
      paidCents,
      owedCents: Math.max(0, earnedCents - paidCents),
    });
  };

  for (const window of listHolidayWindows(now, LOOKBACK_DAYS)) {
    if (only && only.bonusKey !== window.key) continue;
    const counts = await countQualifying(only?.userId ?? null, window);
    for (const user of users) {
      if (user.tierIndex >= holidayMinTier) pushRow(user, window, counts.get(user.id) ?? 0);
    }
  }

  for (const user of users) {
    if (user.tierIndex < birthdayMinTier) continue;
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
