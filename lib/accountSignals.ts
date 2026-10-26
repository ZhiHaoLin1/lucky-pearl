import { createHash, createHmac, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { db } from './db';
import { getTierForDeposits, VIP_TIERS } from './vip';

// ---------------------------------------------------------------------------
// Collecting signals
//
// On signup and login we remember, per account: a random device id kept in a
// first-party cookie, a hash of the IP address, and a hash of the browser's
// user-agent. IPs are stored only as keyed hashes (enough to match, not to
// look up where someone is). Anyone who clears cookies or uses a private window
// gets a fresh device id, so these are hints for a human to review, not proof.
// ---------------------------------------------------------------------------

export const DEVICE_COOKIE = 'lp_device';
const DEVICE_TOKEN_PATTERN = /^[a-f0-9]{48}$/;
const DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;

const hashKey = () => process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me';
const keyedHash = (value: string) => createHmac('sha256', hashKey()).update(value).digest('hex').slice(0, 32);

export function clientIp(request: Request): string | null {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
}

const DEVICE_RETENTION_DAYS = 365;

export function isValidDeviceId(value: string | null | undefined): value is string {
  return Boolean(value) && DEVICE_TOKEN_PATTERN.test(value as string);
}

export function newDeviceId() {
  return randomBytes(24).toString('hex');
}

export function setDeviceCookie(response: NextResponse, deviceId: string) {
  response.cookies.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEVICE_MAX_AGE_SECONDS,
  });
}

/** Country / region / city from Vercel's edge headers (absent when running locally). */
function requestLocation(request: Request) {
  const header = (name: string) => {
    const value = request.headers.get(name);
    if (!value) return null;
    try {
      return decodeURIComponent(value).slice(0, 80);
    } catch {
      return value.slice(0, 80);
    }
  };
  return { country: header('x-vercel-ip-country'), region: header('x-vercel-ip-country-region'), city: header('x-vercel-ip-city') };
}

/** Records (or refreshes) this device/network for the account. Never throws. */
export async function recordAccountSignals(request: Request, response: NextResponse, userId: string) {
  try {
    let deviceId = cookies().get(DEVICE_COOKIE)?.value ?? '';
    if (!isValidDeviceId(deviceId)) deviceId = newDeviceId();
    setDeviceCookie(response, deviceId);

    const ip = clientIp(request);
    const { country, region, city } = requestLocation(request);
    const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 300);
    await db.execute({
      sql: `INSERT INTO account_devices (user_id, device_id, ip_hash, ua_hash, user_agent, ip, country, region, city)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, device_id, ip_hash) DO UPDATE SET
              last_seen_at = datetime('now'), seen_count = seen_count + 1, ua_hash = excluded.ua_hash, user_agent = excluded.user_agent,
              ip = excluded.ip, country = excluded.country, region = excluded.region, city = excluded.city`,
      args: [userId, deviceId, ip ? keyedHash(ip) : '', userAgent ? keyedHash(userAgent) : '', userAgent, ip, country, region, city],
    });

    // Retention: drop device/IP history nobody has used for a year.
    if (Math.random() < 0.02) {
      await db.execute({
        sql: `DELETE FROM account_devices WHERE last_seen_at < datetime('now', ?)`,
        args: [`-${DEVICE_RETENTION_DAYS} days`],
      });
    }
  } catch {
    // Tracking must never block a login or signup.
  }
}

/** Rough, human-readable browser + system from a user-agent string, for the admin Details view. */
export function describeUserAgent(userAgent: string): { browser: string; os: string } {
  if (!userAgent) return { browser: 'Unknown browser', os: 'Unknown system' };
  const os = /iPhone|iPad|iPod/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
    ? 'Android'
    : /Windows/.test(userAgent)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(userAgent)
    ? 'macOS'
    : /Linux/.test(userAgent)
    ? 'Linux'
    : 'Unknown system';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\/|Opera/.test(userAgent)
    ? 'Opera'
    : /Firefox\//.test(userAgent) || /FxiOS/.test(userAgent)
    ? 'Firefox'
    : /Chrome\/|CriOS/.test(userAgent)
    ? 'Chrome'
    : /Safari\//.test(userAgent)
    ? 'Safari'
    : 'Unknown browser';
  return { browser, os };
}

// ---------------------------------------------------------------------------
// Normalising identity fields so trivial tricks don't hide a duplicate
// ---------------------------------------------------------------------------

export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};

export function normalizeEmail(email: string) {
  const [rawLocal, rawDomain] = email.trim().toLowerCase().split('@');
  if (!rawLocal || !rawDomain) return email.trim().toLowerCase();
  let local = rawLocal.split('+')[0];
  let domain = rawDomain;
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

export const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');

/** A payout destination in a comparable form: cashtags lowercase without "$", phones as 10 digits, emails normalised. */
export function normalizePayoutDestination(detail: string) {
  const value = detail.trim().toLowerCase();
  if (!value) return '';
  if (value.includes('@')) return normalizeEmail(value);
  const phone = normalizePhone(value);
  if (phone) return `phone:${phone}`;
  return value.replace(/^\$/, '');
}

// ---------------------------------------------------------------------------
// Finding groups of accounts that look like the same person
// ---------------------------------------------------------------------------

export type DuplicateAccount = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  username: string | null;
  createdAt: string;
  tier: string;
  lifetimeDepositsCents: number;
  lastSeenAt: string | null;
};

export type DuplicateGroup = {
  key: string;
  strength: 'strong' | 'medium';
  accounts: DuplicateAccount[];
  reasons: string[];
};

type Edge = { a: string; b: string; reason: string; strong: boolean };

export async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  const usersResult = await db.execute(
    `SELECT u.id, u.full_name, u.email, u.phone, u.username, u.birthday, u.created_at, u.tier_override,
            COALESCE((SELECT SUM(amount_cents) FROM deposits d WHERE d.user_id = u.id), 0) AS lifetime,
            (SELECT MAX(last_seen_at) FROM account_devices ad WHERE ad.user_id = u.id) AS last_seen
     FROM users u WHERE u.role != 'admin'`
  );
  const devicesResult = await db.execute('SELECT user_id, device_id, ip_hash, ua_hash FROM account_devices');
  const payoutsResult = await db.execute('SELECT user_id, payout_detail FROM withdrawals');
  // Payer names come from the payment emails (stored on the deposit, or still on the review queue entry).
  const payersResult = await db.execute(
    `SELECT d.user_id, COALESCE(d.payer_name, e.parsed_name) AS payer
     FROM deposits d LEFT JOIN email_unmatched_payments e ON e.email_message_id = d.email_message_id
     WHERE COALESCE(d.payer_name, e.parsed_name) IS NOT NULL`
  );

  const users = usersResult.rows.map((row) => {
    const override = row.tier_override ? VIP_TIERS.find((t) => t.name === String(row.tier_override)) : undefined;
    return {
      id: String(row.id),
      fullName: String(row.full_name),
      email: String(row.email),
      phone: String(row.phone),
      username: row.username ? String(row.username) : null,
      birthday: row.birthday ? String(row.birthday) : null,
      createdAt: String(row.created_at),
      tier: (override ?? getTierForDeposits(Number(row.lifetime))).name,
      lifetimeDepositsCents: Number(row.lifetime),
      lastSeenAt: row.last_seen ? String(row.last_seen) : null,
    };
  });

  const edges: Edge[] = [];
  // Link every pair of users that share a value for some signal.
  const link = (buckets: Map<string, string[]>, reason: string, strong: boolean) => {
    for (const ids of Array.from(buckets.values())) {
      const unique = Array.from(new Set(ids));
      if (unique.length < 2 || unique.length > 12) continue; // huge buckets = shared network, not a person
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) edges.push({ a: unique[i], b: unique[j], reason, strong });
      }
    }
  };
  const bucketBy = (items: Array<{ key: string; id: string }>) => {
    const map = new Map<string, string[]>();
    for (const { key, id } of items) {
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), id]);
    }
    return map;
  };

  link(bucketBy(users.map((u) => ({ key: normalizePhone(u.phone), id: u.id }))), 'Same phone number', true);
  link(bucketBy(users.map((u) => ({ key: normalizeEmail(u.email), id: u.id }))), 'Same email (ignoring dots and +tags)', true);
  link(
    bucketBy(users.map((u) => ({ key: u.birthday && normalizeName(u.fullName) ? `${normalizeName(u.fullName)}|${u.birthday}` : '', id: u.id }))),
    'Same name and birthday',
    true
  );

  const devices = devicesResult.rows.map((row) => ({
    userId: String(row.user_id),
    deviceId: String(row.device_id),
    ipHash: String(row.ip_hash),
    uaHash: String(row.ua_hash),
  }));
  link(bucketBy(devices.map((d) => ({ key: d.deviceId, id: d.userId }))), 'Used the same device', true);
  // Money trail: the same cash-out destination, or the same person paying for several accounts.
  link(
    bucketBy(payoutsResult.rows.map((row) => ({ key: normalizePayoutDestination(String(row.payout_detail ?? '')), id: String(row.user_id) }))),
    'Cashes out to the same account',
    true
  );
  link(
    bucketBy(
      payersResult.rows.map((row) => {
        const name = normalizeName(String(row.payer ?? ''));
        // One short or one-word name is too common to mean anything.
        return { key: name.length >= 6 && String(row.payer).trim().includes(' ') ? name : '', id: String(row.user_id) };
      })
    ),
    'Paid from the same payer name',
    false
  );
  // Same network AND same browser is a decent hint even without a shared cookie; IP alone is not
  // (households, cafes and mobile carriers share addresses), so it never forms a group by itself.
  link(
    bucketBy(devices.map((d) => ({ key: d.ipHash && d.uaHash ? `${d.ipHash}|${d.uaHash}` : '', id: d.userId }))),
    'Same network and browser',
    false
  );

  // Union-find over the edges.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };
  for (const edge of edges) parent.set(find(edge.a), find(edge.b));

  const groupsByRoot = new Map<string, Set<string>>();
  for (const edge of edges) {
    const root = find(edge.a);
    const set = groupsByRoot.get(root) ?? new Set<string>();
    set.add(edge.a);
    set.add(edge.b);
    groupsByRoot.set(root, set);
  }

  const userById = new Map(users.map((u) => [u.id, u]));
  const groups: DuplicateGroup[] = [];
  for (const members of Array.from(groupsByRoot.values())) {
    const ids = Array.from(members).sort();
    const groupEdges = edges.filter((edge) => members.has(edge.a));
    groups.push({
      key: createHash('sha1').update(ids.join(',')).digest('hex').slice(0, 16),
      strength: groupEdges.some((edge) => edge.strong) ? 'strong' : 'medium',
      accounts: ids.map((id) => userById.get(id)).filter((u): u is NonNullable<typeof u> => Boolean(u)).map(({ birthday: _b, ...rest }) => rest),
      reasons: Array.from(new Set(groupEdges.map((edge) => edge.reason))),
    });
  }

  // Strongest first, then bigger groups.
  return groups.sort((x, y) => (x.strength === y.strength ? y.accounts.length - x.accounts.length : x.strength === 'strong' ? -1 : 1));
}

/** Groups an admin has already looked at and marked as fine (e.g. a family sharing a phone). */
export async function getReviewedKeys(): Promise<Set<string>> {
  const result = await db.execute('SELECT group_key FROM duplicate_reviews');
  return new Set(result.rows.map((row) => String(row.group_key)));
}

/** Open (unreviewed) groups, plus a per-user lookup used to warn on the Bonuses tab. */
export async function getOpenDuplicateGroups() {
  const [groups, reviewed] = await Promise.all([findDuplicateGroups(), getReviewedKeys()]);
  const open = groups.filter((group) => !reviewed.has(group.key));
  const byUser = new Map<string, DuplicateGroup>();
  for (const group of open) for (const account of group.accounts) byUser.set(account.id, group);
  return { open, byUser };
}
