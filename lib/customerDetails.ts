import { db } from './db';
import { getTierForDeposits, VIP_TIERS } from './vip';
import {
  findDuplicateGroups,
  getReviewedKeys,
  normalizePayoutDestination,
  normalizeName,
  describeUserAgent,
} from './accountSignals';

type AccountRef = { id: string; fullName: string };

export type CustomerDetails = {
  basics: {
    createdAt: string;
    birthday: string | null;
    birthdaySetAt: string | null;
    role: string;
    tier: string;
    lifetimeDepositsCents: number;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
  };
  devices: Array<{
    deviceShort: string;
    networkShort: string;
    ip: string | null;
    location: string | null;
    browser: string;
    os: string;
    firstSeenAt: string;
    lastSeenAt: string;
    seenCount: number;
    sameDevice: AccountRef[]; // other accounts that used this exact device
    sameNetwork: AccountRef[]; // other accounts on this network + browser (different device id)
  }>;
  payouts: Array<{ method: string; detail: string; times: number; lastAt: string; sharedWith: AccountRef[] }>;
  payers: Array<{ name: string; deposits: number; sharedWith: AccountRef[] }>;
  linked: Array<{ groupKey: string; strength: 'strong' | 'medium'; reasons: string[]; reviewed: boolean; accounts: AccountRef[] }>;
};

const refs = (rows: Array<Record<string, unknown>>): AccountRef[] =>
  rows.map((row) => ({ id: String(row.id), fullName: String(row.full_name) }));

export async function getCustomerDetails(userId: string): Promise<CustomerDetails | null> {
  const userResult = await db.execute({
    sql: `SELECT u.created_at, u.birthday, u.birthday_set_at, u.role, u.tier_override,
                 COALESCE((SELECT SUM(amount_cents) FROM deposits d WHERE d.user_id = u.id), 0) AS lifetime
          FROM users u WHERE u.id = ?`,
    args: [userId],
  });
  const user = userResult.rows[0];
  if (!user) return null;

  const override = user.tier_override ? VIP_TIERS.find((t) => t.name === String(user.tier_override)) : undefined;
  const tier = (override ?? getTierForDeposits(Number(user.lifetime))).name;

  // --- devices & networks ---
  const deviceRows = (
    await db.execute({ sql: 'SELECT * FROM account_devices WHERE user_id = ? ORDER BY last_seen_at DESC', args: [userId] })
  ).rows;
  const devices: CustomerDetails['devices'] = [];
  for (const row of deviceRows) {
    const deviceId = String(row.device_id);
    const ipHash = String(row.ip_hash ?? '');
    const uaHash = String(row.ua_hash ?? '');
    const sameDevice = refs(
      (
        await db.execute({
          sql: `SELECT DISTINCT u.id, u.full_name FROM account_devices a JOIN users u ON u.id = a.user_id
                WHERE a.device_id = ? AND a.user_id != ? LIMIT 10`,
          args: [deviceId, userId],
        })
      ).rows
    );
    const sameNetworkAll =
      ipHash && uaHash
        ? refs(
            (
              await db.execute({
                sql: `SELECT DISTINCT u.id, u.full_name FROM account_devices a JOIN users u ON u.id = a.user_id
                      WHERE a.ip_hash = ? AND a.ua_hash = ? AND a.user_id != ? LIMIT 10`,
                args: [ipHash, uaHash, userId],
              })
            ).rows
          )
        : [];
    const deviceIds = new Set(sameDevice.map((account) => account.id));
    const { browser, os } = describeUserAgent(String(row.user_agent ?? ''));
    devices.push({
      deviceShort: deviceId.slice(0, 8),
      networkShort: ipHash ? ipHash.slice(0, 6) : 'unknown',
      ip: row.ip ? String(row.ip) : null,
      location: [row.city, row.region, row.country].filter(Boolean).map(String).join(', ') || null,
      browser,
      os,
      firstSeenAt: String(row.first_seen_at),
      lastSeenAt: String(row.last_seen_at),
      seenCount: Number(row.seen_count),
      sameDevice,
      sameNetwork: sameNetworkAll.filter((account) => !deviceIds.has(account.id)),
    });
  }

  // --- payout destinations ---
  const allWithdrawals = (
    await db.execute(
      `SELECT w.user_id, w.method, w.payout_detail, w.created_at, u.full_name
       FROM withdrawals w JOIN users u ON u.id = w.user_id`
    )
  ).rows;
  const mine = new Map<string, { method: string; detail: string; times: number; lastAt: string; key: string }>();
  for (const row of allWithdrawals.filter((r) => String(r.user_id) === userId)) {
    const detail = String(row.payout_detail ?? '');
    const id = `${row.method}|${detail}`;
    const existing = mine.get(id);
    const createdAt = String(row.created_at);
    if (existing) {
      existing.times += 1;
      if (createdAt > existing.lastAt) existing.lastAt = createdAt;
    } else {
      mine.set(id, { method: String(row.method ?? ''), detail, times: 1, lastAt: createdAt, key: normalizePayoutDestination(detail) });
    }
  }
  const payouts: CustomerDetails['payouts'] = Array.from(mine.values()).map((entry) => {
    const others = new Map<string, AccountRef>();
    for (const row of allWithdrawals) {
      if (String(row.user_id) === userId || !entry.key) continue;
      if (normalizePayoutDestination(String(row.payout_detail ?? '')) === entry.key) {
        others.set(String(row.user_id), { id: String(row.user_id), fullName: String(row.full_name) });
      }
    }
    return { method: entry.method, detail: entry.detail, times: entry.times, lastAt: entry.lastAt, sharedWith: Array.from(others.values()) };
  });

  // --- payer names ---
  const allPayers = (
    await db.execute(
      `SELECT d.user_id, COALESCE(d.payer_name, e.parsed_name) AS payer, u.full_name
       FROM deposits d
       LEFT JOIN email_unmatched_payments e ON e.email_message_id = d.email_message_id
       JOIN users u ON u.id = d.user_id
       WHERE COALESCE(d.payer_name, e.parsed_name) IS NOT NULL`
    )
  ).rows;
  const myPayers = new Map<string, { name: string; deposits: number }>();
  for (const row of allPayers.filter((r) => String(r.user_id) === userId)) {
    const key = normalizeName(String(row.payer));
    const existing = myPayers.get(key);
    if (existing) existing.deposits += 1;
    else myPayers.set(key, { name: String(row.payer), deposits: 1 });
  }
  const payers: CustomerDetails['payers'] = Array.from(myPayers.entries()).map(([key, entry]) => {
    const others = new Map<string, AccountRef>();
    for (const row of allPayers) {
      if (String(row.user_id) !== userId && normalizeName(String(row.payer)) === key) {
        others.set(String(row.user_id), { id: String(row.user_id), fullName: String(row.full_name) });
      }
    }
    return { name: entry.name, deposits: entry.deposits, sharedWith: Array.from(others.values()) };
  });

  // --- linked accounts (same groups the Duplicates tab shows, including ones marked fine) ---
  const [groups, reviewed] = await Promise.all([findDuplicateGroups(), getReviewedKeys()]);
  const linked: CustomerDetails['linked'] = groups
    .filter((group) => group.accounts.some((account) => account.id === userId))
    .map((group) => ({
      groupKey: group.key,
      strength: group.strength,
      reasons: group.reasons,
      reviewed: reviewed.has(group.key),
      accounts: group.accounts.filter((account) => account.id !== userId).map((account) => ({ id: account.id, fullName: account.fullName })),
    }));

  return {
    basics: {
      createdAt: String(user.created_at),
      birthday: user.birthday ? String(user.birthday) : null,
      birthdaySetAt: user.birthday_set_at ? String(user.birthday_set_at) : null,
      role: String(user.role),
      tier,
      lifetimeDepositsCents: Number(user.lifetime),
      firstSeenAt: deviceRows.length ? deviceRows.map((r) => String(r.first_seen_at)).sort()[0] : null,
      lastSeenAt: deviceRows.length ? deviceRows.map((r) => String(r.last_seen_at)).sort().reverse()[0] : null,
    },
    devices,
    payouts,
    payers,
    linked,
  };
}
