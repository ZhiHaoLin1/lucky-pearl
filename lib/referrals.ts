import { createHmac, randomInt, randomUUID } from 'crypto';
import { db } from './db';
import { getOpenDuplicateGroups, hashForMatching, normalizeEmail, normalizeName, normalizePhone } from './accountSignals';

// ---------------------------------------------------------------------------
// The offer
//   - Referrer: $10 cash once the friend makes a real purchase.
//   - New customer: $10 promotional game credit.
//   - A referred customer can't cash out until they've made a real purchase.
// Both rewards are handed out by hand (the admin credits the game account / pays the
// referrer), and the admin Referrals tab keeps track of who is owed what.
// ---------------------------------------------------------------------------
export const REFERRER_REWARD_CENTS = 1_000;
export const REFEREE_CREDIT_CENTS = 1_000;
/** A deposit at least this big counts as a "real purchase". */
export const REFERRAL_MIN_PURCHASE_CENTS = 2_500;
/** Most referrer rewards that can be paid to one customer in any rolling 30 days. */
export const REFERRER_MAX_REWARDS_PER_30_DAYS = 10;

export const REFERRAL_BASE_URL = process.env.REFERRAL_BASE_URL || 'https://referral.luckypearl.app';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const CODE_PATTERN = /^[A-Z2-9]{8}$/;

export const normalizeReferralCode = (value: unknown) => String(value ?? '').trim().toUpperCase();
export const isReferralCode = (value: string) => CODE_PATTERN.test(value);

const sqliteDate = (value: string) => new Date(value.replace(' ', 'T') + 'Z');

// ---------------------------------------------------------------------------
// Remembering past customers so a deleted account can't just come back as "new"
// ---------------------------------------------------------------------------
const identityHash = (kind: 'phone' | 'email', value: string) =>
  createHmac('sha256', process.env.SESSION_SECRET ?? 'dev-insecure-secret-change-me').update(`${kind}:${value}`).digest('hex').slice(0, 32);

/** Saves scrambled copies of an account's phone and email. Call at signup and before deleting an account. */
export async function rememberIdentity(userId: string) {
  const result = await db.execute({ sql: 'SELECT phone, email FROM users WHERE id = ?', args: [userId] });
  const row = result.rows[0];
  if (!row) return;
  const entries: Array<['phone' | 'email', string]> = [];
  const phone = normalizePhone(String(row.phone));
  if (phone) entries.push(['phone', phone]);
  entries.push(['email', normalizeEmail(String(row.email))]);
  for (const [kind, value] of entries) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO identity_history (kind, value_hash, user_id) VALUES (?, ?, ?)',
      args: [kind, identityHash(kind, value), userId],
    });
  }
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------
export async function createReferralLink(referrerUserId: string, label: string | null, adminId: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    let code = '';
    for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    try {
      await db.execute({
        sql: 'INSERT INTO referral_links (id, code, referrer_user_id, label, created_by_admin_id) VALUES (?, ?, ?, ?, ?)',
        args: [randomUUID(), code, referrerUserId, label, adminId],
      });
      return code;
    } catch {
      // code collision: try another
    }
  }
  throw new Error('Could not generate a unique code.');
}

export type ActiveLink = { id: string; code: string; referrerUserId: string; referrerFirstName: string };

export async function getActiveLink(code: string): Promise<ActiveLink | null> {
  if (!isReferralCode(code)) return null;
  const result = await db.execute({
    sql: `SELECT l.id, l.code, l.referrer_user_id, u.full_name
          FROM referral_links l JOIN users u ON u.id = l.referrer_user_id
          WHERE l.code = ? AND l.active = 1`,
    args: [code],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    code: String(row.code),
    referrerUserId: String(row.referrer_user_id),
    referrerFirstName: String(row.full_name).split(' ')[0],
  };
}

// ---------------------------------------------------------------------------
// Is this signup a genuinely new customer?
// ---------------------------------------------------------------------------
export type Verdict = { eligibility: 'eligible' | 'review' | 'rejected'; reason: string | null };

export async function evaluateReferralSignup(input: {
  referrerUserId: string;
  fullName: string;
  email: string;
  phone: string;
  adultConfirmed: boolean;
  deviceId: string | null;
  ip: string | null;
  userAgent: string | null;
}): Promise<Verdict> {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.fullName);

  if (!input.adultConfirmed) {
    return { eligibility: 'rejected', reason: 'Did not confirm they are 18 or older' };
  }

  const usersResult = await db.execute("SELECT id, full_name, email, phone FROM users WHERE role != 'admin'");
  const referrer = usersResult.rows.find((row) => String(row.id) === input.referrerUserId);

  // Self-referral: same phone, email or name as the person who sent the link.
  if (referrer) {
    const sameName = name.length >= 4 && normalizeName(String(referrer.full_name)) === name;
    if ((phone && normalizePhone(String(referrer.phone)) === phone) || normalizeEmail(String(referrer.email)) === email || sameName) {
      return { eligibility: 'rejected', reason: 'Looks like a self-referral (same phone, email or name as the referrer)' };
    }
  }

  // Existing customer registering again.
  for (const row of usersResult.rows) {
    if ((phone && normalizePhone(String(row.phone)) === phone) || normalizeEmail(String(row.email)) === email) {
      return { eligibility: 'rejected', reason: `Phone or email already belongs to an existing account (${row.full_name})` };
    }
  }
  const history = await db.execute({
    sql: "SELECT 1 FROM identity_history WHERE (kind = 'phone' AND value_hash = ?) OR (kind = 'email' AND value_hash = ?) LIMIT 1",
    args: [phone ? identityHash('phone', phone) : '-', identityHash('email', email)],
  });
  if (history.rows.length > 0) {
    return { eligibility: 'rejected', reason: 'Phone or email was used by a previous (deleted) account' };
  }

  // Same device as another account.
  if (input.deviceId) {
    const device = await db.execute({
      sql: 'SELECT user_id FROM account_devices WHERE device_id = ? LIMIT 1',
      args: [input.deviceId],
    });
    if (device.rows.length > 0) {
      const sameAsReferrer = String(device.rows[0].user_id) === input.referrerUserId;
      return {
        eligibility: 'rejected',
        reason: sameAsReferrer ? 'Signed up from the referrer’s own device' : 'This device is already used by an existing account',
      };
    }
  }

  // Same network (and browser): could be a household, so a person decides.
  if (input.ip) {
    const ipHash = hashForMatching(input.ip);
    const uaHash = input.userAgent ? hashForMatching(input.userAgent) : '';
    const network = await db.execute({
      sql: `SELECT user_id, ua_hash FROM account_devices WHERE ip_hash = ? LIMIT 20`,
      args: [ipHash],
    });
    if (network.rows.some((row) => String(row.user_id) === input.referrerUserId)) {
      return { eligibility: 'review', reason: 'Signed up from the same network as the referrer' };
    }
    if (uaHash && network.rows.some((row) => String(row.ua_hash) === uaHash)) {
      return { eligibility: 'review', reason: 'Same network and browser as an existing account' };
    }
  }

  return { eligibility: 'eligible', reason: null };
}

export async function createReferralRecord(input: {
  refereeUserId: string;
  link: ActiveLink;
  adultConfirmed: boolean;
  verdict: Verdict;
}) {
  await db.execute({
    sql: `INSERT OR IGNORE INTO referrals
            (id, referee_user_id, link_id, referrer_user_id, adult_confirmed, eligibility, eligibility_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      input.refereeUserId,
      input.link.id,
      input.link.referrerUserId,
      input.adultConfirmed ? 1 : 0,
      input.verdict.eligibility,
      input.verdict.reason,
    ],
  });
}

// ---------------------------------------------------------------------------
// Cash-out lock for referred customers
// ---------------------------------------------------------------------------
export async function getCashoutLock(userId: string): Promise<{ locked: boolean; message: string | null }> {
  const referral = await db.execute({
    sql: 'SELECT created_at, eligibility FROM referrals WHERE referee_user_id = ?',
    args: [userId],
  });
  const row = referral.rows[0];
  // No referral, or the referral was rejected (no promo credit given): nothing to lock.
  if (!row || String(row.eligibility) === 'rejected') return { locked: false, message: null };

  const purchase = await db.execute({
    sql: 'SELECT 1 FROM deposits WHERE user_id = ? AND amount_cents >= ? AND created_at >= ? LIMIT 1',
    args: [userId, REFERRAL_MIN_PURCHASE_CENTS, String(row.created_at)],
  });
  if (purchase.rows.length > 0) return { locked: false, message: null };
  return {
    locked: true,
    message: `Because you joined through a friend’s invite, cashouts unlock after your first deposit of $${REFERRAL_MIN_PURCHASE_CENTS / 100} or more.`,
  };
}

// ---------------------------------------------------------------------------
// Admin overview
// ---------------------------------------------------------------------------
export type ReferralState = 'rejected' | 'review' | 'waiting' | 'owed' | 'blocked' | 'paid';

export type ReferralRow = {
  id: string;
  createdAt: string;
  refereeId: string;
  refereeName: string;
  refereePhone: string;
  referrerId: string;
  referrerName: string;
  linkCode: string;
  eligibility: 'eligible' | 'review' | 'rejected';
  reason: string | null;
  manuallyReviewed: boolean;
  state: ReferralState;
  blockReason: string | null;
  purchaseCents: number | null;
  purchasedAt: string | null;
  promoToGive: boolean;
  promoGivenAt: string | null;
  referrerPaidAt: string | null;
};

export type LinkStat = {
  id: string;
  code: string;
  url: string;
  label: string | null;
  referrerId: string;
  referrerName: string;
  active: boolean;
  createdAt: string;
  visits: number;
  signups: number;
  eligible: number;
  review: number;
  rejected: number;
  purchased: number;
  owedCents: number;
  paidCents: number;
  promoToGive: number;
};

export async function getReferralOverview(): Promise<{ links: LinkStat[]; referrals: ReferralRow[] }> {
  const [linksResult, visitsResult, referralsResult, purchasesResult, { strongByUser }] = await Promise.all([
    db.execute(
      `SELECT l.id, l.code, l.label, l.active, l.created_at, l.referrer_user_id, u.full_name
       FROM referral_links l JOIN users u ON u.id = l.referrer_user_id ORDER BY l.created_at DESC`
    ),
    db.execute('SELECT link_id, COUNT(DISTINCT visitor_id) AS n FROM referral_visits GROUP BY link_id'),
    db.execute(
      `SELECT r.*, l.code, ref.full_name AS referee_name, ref.phone AS referee_phone, rr.full_name AS referrer_name
       FROM referrals r
       JOIN referral_links l ON l.id = r.link_id
       JOIN users ref ON ref.id = r.referee_user_id
       JOIN users rr ON rr.id = r.referrer_user_id
       ORDER BY r.created_at DESC`
    ),
    db.execute({
      sql: `SELECT d.user_id, d.amount_cents, d.created_at
            FROM deposits d JOIN referrals r ON r.referee_user_id = d.user_id
            WHERE d.amount_cents >= ? AND d.created_at >= r.created_at
            ORDER BY d.created_at ASC`,
      args: [REFERRAL_MIN_PURCHASE_CENTS],
    }),
    getOpenDuplicateGroups(),
  ]);

  const firstPurchase = new Map<string, { cents: number; at: string }>();
  for (const row of purchasesResult.rows) {
    const id = String(row.user_id);
    if (!firstPurchase.has(id)) firstPurchase.set(id, { cents: Number(row.amount_cents), at: String(row.created_at) });
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const paidRecently = new Map<string, number>();
  for (const row of referralsResult.rows) {
    if (row.referrer_paid_at && sqliteDate(String(row.referrer_paid_at)).getTime() >= thirtyDaysAgo) {
      paidRecently.set(String(row.referrer_user_id), (paidRecently.get(String(row.referrer_user_id)) ?? 0) + 1);
    }
  }

  const referrals: ReferralRow[] = referralsResult.rows.map((row) => {
    const refereeId = String(row.referee_user_id);
    const eligibility = String(row.eligibility) as ReferralRow['eligibility'];
    const manuallyReviewed = Boolean(row.reviewed_at);
    const purchase = firstPurchase.get(refereeId) ?? null;
    const paid = Boolean(row.referrer_paid_at);

    let state: ReferralState;
    let blockReason: string | null = null;
    if (eligibility === 'rejected') state = 'rejected';
    else if (eligibility === 'review') state = 'review';
    else if (paid) state = 'paid';
    else if (!purchase) state = 'waiting';
    else {
      state = 'owed';
      const links = strongByUser.get(refereeId);
      if (!manuallyReviewed && links) {
        state = 'blocked';
        blockReason = `Now linked to ${links.accounts.map((account) => account.fullName).join(', ')} (${links.reasons.join('; ')}). Approve it first if this is fine.`;
      } else if ((paidRecently.get(String(row.referrer_user_id)) ?? 0) >= REFERRER_MAX_REWARDS_PER_30_DAYS) {
        state = 'blocked';
        blockReason = `This referrer already received ${REFERRER_MAX_REWARDS_PER_30_DAYS} rewards in the last 30 days.`;
      }
    }

    return {
      id: String(row.id),
      createdAt: String(row.created_at),
      refereeId,
      refereeName: String(row.referee_name),
      refereePhone: String(row.referee_phone),
      referrerId: String(row.referrer_user_id),
      referrerName: String(row.referrer_name),
      linkCode: String(row.code),
      eligibility,
      reason: row.eligibility_reason ? String(row.eligibility_reason) : null,
      manuallyReviewed,
      state,
      blockReason,
      purchaseCents: purchase?.cents ?? null,
      purchasedAt: purchase?.at ?? null,
      promoToGive: eligibility === 'eligible' && !row.referee_credit_given_at,
      promoGivenAt: row.referee_credit_given_at ? String(row.referee_credit_given_at) : null,
      referrerPaidAt: row.referrer_paid_at ? String(row.referrer_paid_at) : null,
    };
  });

  const visitsByLink = new Map(visitsResult.rows.map((row) => [String(row.link_id), Number(row.n)]));
  const links: LinkStat[] = linksResult.rows.map((row) => {
    const id = String(row.id);
    const mine = referrals.filter((referral) => referral.linkCode === String(row.code));
    return {
      id,
      code: String(row.code),
      url: `${REFERRAL_BASE_URL}/c/${row.code}`,
      label: row.label ? String(row.label) : null,
      referrerId: String(row.referrer_user_id),
      referrerName: String(row.full_name),
      active: Number(row.active) === 1,
      createdAt: String(row.created_at),
      visits: visitsByLink.get(id) ?? 0,
      signups: mine.length,
      eligible: mine.filter((r) => r.eligibility === 'eligible').length,
      review: mine.filter((r) => r.eligibility === 'review').length,
      rejected: mine.filter((r) => r.eligibility === 'rejected').length,
      purchased: mine.filter((r) => r.purchasedAt && r.eligibility !== 'rejected').length,
      owedCents: mine.filter((r) => r.state === 'owed').length * REFERRER_REWARD_CENTS,
      paidCents: mine.filter((r) => r.state === 'paid').length * REFERRER_REWARD_CENTS,
      promoToGive: mine.filter((r) => r.promoToGive).length,
    };
  });

  return { links, referrals };
}

/** Number of things waiting on the admin (for the tab badge). */
export function countReferralActions(referrals: ReferralRow[]) {
  return referrals.filter((r) => r.state === 'owed' || r.state === 'review' || r.promoToGive).length;
}
