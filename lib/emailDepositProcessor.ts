import { randomUUID } from 'crypto';
import { db, ensureSchema } from './db';
import { parseDepositEmail } from './emailDeposit';
import { matchCustomerByName } from './nameMatching';

async function notifyDiscord(lines: string[]) {
  const webhookUrl = process.env.DISCORD_WITHDRAWAL_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n') }),
  }).catch(() => {});
}

export type ProcessedEmailResult =
  | { status: 'ignored' }
  | { status: 'duplicate' }
  | { status: 'queued'; reason: string }
  | { status: 'matched'; userId: string };

/**
 * Shared handling for a Venmo/Zelle notification email regardless of how it
 * reached us (a forwarding webhook like Mailgun, or Gmail polling) — parses
 * it, checks for a duplicate, matches it to a customer, and either credits
 * the deposit or queues it for manual review.
 *
 * Dedup is entirely our own database (email_message_id), never anything on
 * the mail provider's side (no read/unread flag, no label) — the Gmail
 * poller in particular deliberately never mutates the mailbox, since
 * another, independent system also reads this same inbox and must not be
 * affected by ours.
 */
export async function processDepositEmail({
  from,
  subject,
  text,
}: {
  from: string;
  subject: string;
  text: string;
}): Promise<ProcessedEmailResult> {
  await ensureSchema();

  const parsed = parseDepositEmail(subject, text);
  if (!parsed) {
    return { status: 'ignored' };
  }

  // Deterministic either way, so re-seeing the same email (which will
  // happen for an 'unparseable' one, since nothing marks it as handled)
  // dedupes cleanly instead of queuing a fresh copy every poll.
  const messageId =
    parsed.status === 'unparseable'
      ? `unparseable-${Buffer.from(from + subject).toString('base64').slice(0, 60)}`
      : parsed.messageId;

  const [existingDeposit, existingUnmatched] = await Promise.all([
    db.execute({ sql: 'SELECT id FROM deposits WHERE email_message_id = ?', args: [messageId] }),
    db.execute({ sql: 'SELECT id FROM email_unmatched_payments WHERE email_message_id = ?', args: [messageId] }),
  ]);
  if (existingDeposit.rows.length > 0 || existingUnmatched.rows.length > 0) {
    return { status: 'duplicate' };
  }

  const queueForReview = async (
    reason: 'unparseable' | 'no_match' | 'ambiguous',
    source: 'venmo' | 'zelle',
    amountCents: number | null,
    parsedName: string | null
  ) => {
    await db.execute({
      sql: `INSERT INTO email_unmatched_payments
            (id, email_message_id, source, amount_cents, sender_email, subject, parsed_name, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), messageId, source, amountCents, from, subject, parsedName, reason],
    });
    await notifyDiscord([
      '⚠️ Payment email needs manual matching',
      `Source: ${source}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      `Reason: ${reason.replace('_', ' ')}`,
      'Resolve it: https://www.luckypearl.app/admin',
    ]);
  };

  if (parsed.status === 'unparseable') {
    await queueForReview('unparseable', parsed.source, null, null);
    return { status: 'queued', reason: 'unparseable' };
  }

  const usersResult = await db.execute("SELECT id, full_name, username FROM users WHERE role != 'admin'");
  const match = matchCustomerByName(
    usersResult.rows.map((row) => ({ id: row.id, full_name: row.full_name, username: row.username })),
    parsed.name
  );

  if (match.status !== 'matched') {
    await queueForReview(match.status, parsed.source, parsed.amountCents, parsed.name);
    return { status: 'queued', reason: match.status };
  }

  const userId = String(match.customer.id);
  await db.execute({
    sql: `INSERT INTO deposits (id, user_id, amount_cents, method, email_message_id)
          VALUES (?, ?, ?, ?, ?)`,
    args: [randomUUID(), userId, parsed.amountCents, parsed.source, messageId],
  });

  return { status: 'matched', userId };
}
