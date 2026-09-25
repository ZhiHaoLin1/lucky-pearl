import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { parseDepositEmail } from '@/lib/emailDeposit';
import { matchCustomerByName } from '@/lib/nameMatching';

export const dynamic = 'force-dynamic';

async function notifyDiscord(lines: string[]) {
  const webhookUrl = process.env.DISCORD_WITHDRAWAL_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n') }),
  }).catch(() => {});
}

/** Mailgun's classic inbound-route signing scheme: HMAC-SHA256(timestamp + token). */
function verifyMailgunSignature(timestamp: string, token: string, signature: string, signingKey: string): boolean {
  const expected = createHmac('sha256', signingKey).update(timestamp + token).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(request: Request) {
  const form = await request.formData();

  // Two ways to authorize, since different inbound-email providers support
  // different things. Mailgun signs routes (HMAC over timestamp+token) —
  // preferred when available, since it's cryptographically verifiable like
  // Square's webhook. SendGrid's Inbound Parse has no signing option at
  // all, so for that (or anything else without signing) we fall back to an
  // unguessable secret embedded in the destination URL.
  const mailgunSigningKey = process.env.MAILGUN_SIGNING_KEY;
  const timestamp = form.get('timestamp');
  const token = form.get('token');
  const signature = form.get('signature');

  let authorized = false;
  if (mailgunSigningKey && timestamp && token && signature) {
    authorized = verifyMailgunSignature(String(timestamp), String(token), String(signature), mailgunSigningKey);
  } else {
    const configuredSecret = process.env.EMAIL_WEBHOOK_SECRET;
    const { searchParams } = new URL(request.url);
    authorized = Boolean(configuredSecret) && searchParams.get('key') === configuredSecret;
  }
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Field names differ by provider: SendGrid Inbound Parse uses from/subject/text;
  // Mailgun routes use from (or sender)/subject/body-plain (or stripped-text).
  const from = String(form.get('from') ?? form.get('sender') ?? '');
  const subject = String(form.get('subject') ?? '');
  const text = String(form.get('text') ?? form.get('body-plain') ?? form.get('stripped-text') ?? '');

  await ensureSchema();

  const parsed = parseDepositEmail(subject, text);
  if (!parsed) {
    // Doesn't match any known notification pattern — not a payment email.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const queueForReview = async (
    reason: 'unparseable' | 'no_match' | 'ambiguous',
    source: 'venmo' | 'zelle',
    messageId: string,
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
    // Looked like a real notification but a required field was missing —
    // dedup by subject+from since there's no reliable id to key off of.
    const fallbackId = `unparseable-${Buffer.from(from + subject).toString('base64').slice(0, 40)}-${Date.now()}`;
    await queueForReview('unparseable', parsed.source, fallbackId, null, null);
    return NextResponse.json({ ok: true, matched: false });
  }

  const [existingDeposit, existingUnmatched] = await Promise.all([
    db.execute({ sql: 'SELECT id FROM deposits WHERE email_message_id = ?', args: [parsed.messageId] }),
    db.execute({ sql: 'SELECT id FROM email_unmatched_payments WHERE email_message_id = ?', args: [parsed.messageId] }),
  ]);
  if (existingDeposit.rows.length > 0 || existingUnmatched.rows.length > 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const usersResult = await db.execute("SELECT id, full_name, username FROM users WHERE role != 'admin'");
  const match = matchCustomerByName(
    usersResult.rows.map((row) => ({ id: row.id, full_name: row.full_name, username: row.username })),
    parsed.name
  );

  if (match.status !== 'matched') {
    await queueForReview(match.status, parsed.source, parsed.messageId, parsed.amountCents, parsed.name);
    return NextResponse.json({ ok: true, matched: false });
  }

  const userId = String(match.customer.id);
  await db.execute({
    sql: `INSERT INTO deposits (id, user_id, amount_cents, method, email_message_id)
          VALUES (?, ?, ?, ?, ?)`,
    args: [randomUUID(), userId, parsed.amountCents, parsed.source, parsed.messageId],
  });

  return NextResponse.json({ ok: true, matched: true, userId });
}
