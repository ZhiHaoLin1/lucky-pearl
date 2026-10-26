import { createHmac, randomInt, randomUUID } from 'crypto';
import { db } from './db';
import { getOpenDuplicateGroups, hashForMatching, normalizeEmail, normalizeName, normalizePhone } from './accountSignals';
import { sameFullName } from './nameMatching';

// ---------------------------------------------------------------------------
// The offer
//   - The new customer makes a first real deposit ($20+) that THEY paid for themselves.
//   - Only then: $10 cash to the referrer and $10 promotional game credit to the new customer.
//   - A referred customer can't cash out until that deposit is verified.
//   - The credit is given by hand, after the customer texts from the phone number on their account.
// Both rewards are handed out by hand (the admin credits the game account / pays the
// referrer), and the admin Referrals tab keeps track of who is owed what.
// ---------------------------------------------------------------------------
export const REFERRER_REWARD_CENTS = 1_000;
export const REFEREE_CREDIT_CENTS = 1_000;
/** A deposit at least this big counts as a "real purchase". */
export const REFERRAL_MIN_PURCHASE_CENTS = 2_000;
/** Most referrer rewards that can be paid to one customer in any rolling 30 days. */
export const REFERRER_MAX_REWARDS_PER_30_DAYS = 5;

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
// Did the new customer pay for their own first deposit?
// ---------------------------------------------------------------------------
type DepositRecord = { amountCents: number; createdAt: string; method: string; payer: string | null };

export type PurchaseAssessment =
  | { status: 'none' } // no deposit of the minimum size yet
  | { status: 'verified'; deposit: DepositRecord } // paid by the customer themselves
  | { status: 'overridden'; deposit: DepositRecord } // admin signed off
  | { status: 'other'; deposit: DepositRecord } // paid by someone with a different name
  | { status: 'unknown'; deposit: DepositRecord }; // can't tell who paid (card/Square/manual entry)

/**
 * Venmo and Zelle payment emails carry the sender's real account name, so those can be checked
 * against the account holder's name. Square notes, manual entries and anything without a payer
 * name can't be verified automatically and wait for the admin.
 */
function assessPurchase(deposits: DepositRecord[], refereeName: string, overridden: boolean): PurchaseAssessment {
  const real = deposits.filter((d) => d.amountCents >= REFERRAL_MIN_PURCHASE_CENTS);
  if (real.length === 0) return { status: 'none' };

  const verdict = (d: DepositRecord): 'self' | 'other' | 'unknown' => {
    if (!d.payer || (d.method !== 'venmo' && d.method !== 'zelle')) return 'unknown';
    return sameFullName(d.payer, refereeName) ? 'self' : 'other';
  };

  const self = real.find((d) => verdict(d) === 'self');
  if (self) return { status: 'verified', deposit: self };
  if (overridden) return { status: 'overridden', deposit: real[0] };
  const first = real[0];
  return { status: verdict(first) === 'other' ? 'other' : 'unknown', deposit: first };
}

const FUNDING_REASON = (assessment: PurchaseAssessment, refereeName: string) => {
  if (assessment.status === 'other') {
    return `The first deposit was paid by “${assessment.deposit.payer}”, not ${refereeName}. The new customer has to fund their own account.`;
  }
  if (assessment.status === 'unknown') {
    return `Can’t tell who paid the first deposit (${assessment.deposit.method}). Check the payment and approve it if ${refereeName} paid it themselves.`;
  }
  return null;
};

async function loadRefereeDeposits(userId: string, since: string): Promise<DepositRecord[]> {
  const result = await db.execute({
    sql: `SELECT d.amount_cents, d.created_at, d.method, COALESCE(d.payer_name, e.parsed_name) AS payer
          FROM deposits d LEFT JOIN email_unmatched_payments e ON e.email_message_id = d.email_message_id
          WHERE d.user_id = ? AND d.created_at >= ? ORDER BY d.created_at ASC`,
    args: [userId, since],
  });
  return result.rows.map((row) => ({
    amountCents: Number(row.amount_cents),
    createdAt: String(row.created_at),
    method: String(row.method ?? ''),
    payer: row.payer ? String(row.payer) : null,
  }));
}

// ---------------------------------------------------------------------------
// What a referred customer sees (dashboard banner) and the cash-out lock
// ---------------------------------------------------------------------------
export type RefereeStatus = {
  referred: boolean;
  /** The $10 credit is on offer to this customer (eligible referral). */
  eligible: boolean;
  /** Their first deposit has been verified as their own. */
  purchaseVerified: boolean;
  creditGiven: boolean;
  locked: boolean;
  message: string | null;
};

const NOT_REFERRED: RefereeStatus = { referred: false, eligible: false, purchaseVerified: false, creditGiven: false, locked: false, message: null };

export async function getRefereeStatus(userId: string): Promise<RefereeStatus> {
  const result = await db.execute({
    sql: `SELECT r.created_at, r.eligibility, r.referee_credit_given_at, r.payout_override_at, u.full_name
          FROM referrals r JOIN users u ON u.id = r.referee_user_id WHERE r.referee_user_id = ?`,
    args: [userId],
  });
  const row = result.rows[0];
  // No referral, or it was rejected (no promo credit given): nothing to lock.
  if (!row || String(row.eligibility) === 'rejected') return NOT_REFERRED;

  const deposits = await loadRefereeDeposits(userId, String(row.created_at));
  const assessment = assessPurchase(deposits, String(row.full_name), Boolean(row.payout_override_at));
  const verified = assessment.status === 'verified' || assessment.status === 'overridden';

  return {
    referred: true,
    eligible: String(row.eligibility) === 'eligible',
    purchaseVerified: verified,
    creditGiven: Boolean(row.referee_credit_given_at),
    locked: !verified,
    message: verified
      ? null
      : `Because you joined through a friend’s invite, cashouts unlock after your first deposit of $${REFERRAL_MIN_PURCHASE_CENTS / 100} or more, paid from your own account. Already made it? Text us at (407) 796-8311 and we’ll confirm it.`,
  };
}

/** Kept for the withdrawal endpoint: locked while a referred customer has no verified first deposit. */
export async function getCashoutLock(userId: string): Promise<{ locked: boolean; message: string | null }> {
  const status = await getRefereeStatus(userId);
  return { locked: status.locked, message: status.message };
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
  overridden: boolean;
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
  const [linksResult, visitsResult, referralsResult, depositsResult, { strongByUser }] = await Promise.all([
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
       ORDER BY r.created_at ASC`
    ),
    db.execute(
      `SELECT d.user_id, d.amount_cents, d.created_at, d.method, COALESCE(d.payer_name, e.parsed_name) AS payer
       FROM deposits d
       JOIN referrals r ON r.referee_user_id = d.user_id
       LEFT JOIN email_unmatched_payments e ON e.email_message_id = d.email_message_id
       WHERE d.created_at >= r.created_at
       ORDER BY d.created_at ASC`
    ),
    getOpenDuplicateGroups(),
  ]);

  const depositsByUser = new Map<string, DepositRecord[]>();
  for (const row of depositsResult.rows) {
    const id = String(row.user_id);
    const list = depositsByUser.get(id) ?? [];
    list.push({
      amountCents: Number(row.amount_cents),
      createdAt: String(row.created_at),
      method: String(row.method ?? ''),
      payer: row.payer ? String(row.payer) : null,
    });
    depositsByUser.set(id, list);
  }

  const referrals: ReferralRow[] = referralsResult.rows.map((row) => {
    const refereeId = String(row.referee_user_id);
    const referrerId = String(row.referrer_user_id);
    const refereeName = String(row.referee_name);
    const eligibility = String(row.eligibility) as ReferralRow['eligibility'];
    const manuallyReviewed = Boolean(row.reviewed_at);
    const overridden = Boolean(row.payout_override_at);
    const paid = Boolean(row.referrer_paid_at);
    const assessment = assessPurchase(depositsByUser.get(refereeId) ?? [], refereeName, overridden);
    const purchase = assessment.status === 'none' ? null : assessment.deposit;

    let state: ReferralState;
    let blockReason: string | null = null;
    if (eligibility === 'rejected') state = 'rejected';
    else if (eligibility === 'review') state = 'review';
    else if (assessment.status === 'none') state = paid ? 'paid' : 'waiting';
    else if (assessment.status === 'other' || assessment.status === 'unknown') {
      state = paid ? 'paid' : 'blocked';
      blockReason = paid ? null : FUNDING_REASON(assessment, refereeName);
    } else {
      state = paid ? 'paid' : 'owed';
      const links = strongByUser.get(refereeId);
      if (!paid && !overridden && links) {
        state = 'blocked';
        blockReason = `Now linked to ${links.accounts.map((account) => account.fullName).join(', ')} (${links.reasons.join('; ')}). Approve it first if this is fine.`;
      }
    }

    return {
      id: String(row.id),
      createdAt: String(row.created_at),
      refereeId,
      refereeName,
      refereePhone: String(row.referee_phone),
      referrerId,
      referrerName: String(row.referrer_name),
      linkCode: String(row.code),
      eligibility,
      reason: row.eligibility_reason ? String(row.eligibility_reason) : null,
      manuallyReviewed,
      overridden,
      state,
      blockReason,
      purchaseCents: purchase?.amountCents ?? null,
      purchasedAt: purchase?.createdAt ?? null,
      // The $10 credit only becomes due once the customer's own first deposit is verified.
      promoToGive: eligibility === 'eligible' && (state === 'owed' || state === 'paid') && !row.referee_credit_given_at,
      promoGivenAt: row.referee_credit_given_at ? String(row.referee_credit_given_at) : null,
      referrerPaidAt: row.referrer_paid_at ? String(row.referrer_paid_at) : null,
    };
  });
  // Monthly cap per referrer, applied in the order the purchases happened. Rewards already paid always
  // count; an admin sign-off on a held payment skips the cap.
  const byReferrer = new Map<string, ReferralRow[]>();
  for (const referral of referrals) {
    if ((referral.state === 'owed' || referral.state === 'paid') && referral.purchasedAt) {
      byReferrer.set(referral.referrerId, [...(byReferrer.get(referral.referrerId) ?? []), referral]);
    }
  }
  for (const list of Array.from(byReferrer.values())) {
    list.sort((a, b) => (a.purchasedAt as string).localeCompare(b.purchasedAt as string));
    const counted: number[] = [];
    for (const referral of list) {
      const when = sqliteDate(referral.purchasedAt as string).getTime();
      const recent = counted.filter((time) => when - time < 30 * 24 * 60 * 60 * 1000);
      if (referral.state === 'owed' && !referral.overridden && recent.length >= REFERRER_MAX_REWARDS_PER_30_DAYS) {
        referral.state = 'blocked';
        referral.promoToGive = false;
        referral.blockReason = `${referral.referrerName} already has ${REFERRER_MAX_REWARDS_PER_30_DAYS} rewards in the last 30 days (the monthly limit). Approve it if you want to make an exception.`;
      } else {
        counted.push(when);
      }
    }
  }
  referrals.reverse(); // newest first for display

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
      purchased: mine.filter((r) => (r.state === 'owed' || r.state === 'paid')).length,
      owedCents: mine.filter((r) => r.state === 'owed').length * REFERRER_REWARD_CENTS,
      paidCents: mine.filter((r) => r.state === 'paid').length * REFERRER_REWARD_CENTS,
      promoToGive: mine.filter((r) => r.promoToGive).length,
    };
  });

  return { links, referrals };
}

/** Number of things waiting on the admin (for the tab badge). */
export function countReferralActions(referrals: ReferralRow[]) {
  return referrals.filter((r) => r.state === 'owed' || r.state === 'review' || r.state === 'blocked' || r.promoToGive).length;
}
