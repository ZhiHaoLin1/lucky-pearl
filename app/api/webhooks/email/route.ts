import { randomUUID } from 'crypto';
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

export async function POST(request: Request) {
  // SendGrid Inbound Parse has no request-signing option, unlike Square's
  // HMAC webhook — this unguessable secret in the URL is the substitute.
  const configuredSecret = process.env.EMAIL_WEBHOOK_SECRET;
  const { searchParams } = new URL(request.url);
  if (!configuredSecret || searchParams.get('key') !== configuredSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const form = await request.formData();
  const from = String(form.get('from') ?? '');
  const subject = String(form.get('subject') ?? '');
  const text = String(form.get('text') ?? '');

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
