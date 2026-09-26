import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { verifySquareSignature, parseSquareNote, matchCustomerByName } from '@/lib/square';

export const dynamic = 'force-dynamic';

type SquarePayment = {
  id: string;
  status: string;
  note?: string;
  amount_money?: { amount: number };
  location_id?: string;
};

async function notifyDiscord(lines: string[]) {
  const webhookUrl = process.env.DISCORD_MANUAL_MATCH_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n') }),
  }).catch(() => {});
}

export async function POST(request: Request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_NOTIFICATION_URL || 'https://www.luckypearl.app/api/webhooks/square';
  const signatureHeader = request.headers.get('x-square-hmacsha256-signature');
  const rawBody = await request.text();

  if (!signatureKey || !verifySquareSignature(notificationUrl, rawBody, signatureHeader, signatureKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { data?: { object?: { payment?: SquarePayment } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payment = event.data?.object?.payment;
  if (!payment || payment.status !== 'COMPLETED') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // The Square subscription sends events from every location on the
  // account; this narrows it to the location(s) actually meant to be
  // tracked. Unset means no filter (track everything), for backward
  // compatibility if this ever gets cleared.
  const trackedLocationIds = (process.env.SQUARE_TRACKED_LOCATION_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (trackedLocationIds.length > 0 && !trackedLocationIds.includes(String(payment.location_id ?? ''))) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'untracked_location' });
  }

  await ensureSchema();

  const paymentId = String(payment.id);
  const [existingDeposit, existingUnmatched] = await Promise.all([
    db.execute({ sql: 'SELECT id FROM deposits WHERE square_payment_id = ?', args: [paymentId] }),
    db.execute({ sql: 'SELECT id FROM square_unmatched_payments WHERE square_payment_id = ?', args: [paymentId] }),
  ]);
  if (existingDeposit.rows.length > 0 || existingUnmatched.rows.length > 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const chargedCents = Number(payment.amount_money?.amount ?? 0);
  const parsed = parseSquareNote(payment.note);

  const queueForReview = async (
    reason: 'unparseable_note' | 'no_match' | 'ambiguous',
    amountCents: number,
    platform: string | null,
    parsedName: string | null
  ) => {
    await db.execute({
      sql: `INSERT INTO square_unmatched_payments
            (id, square_payment_id, amount_cents, square_charged_cents, platform, parsed_name, note, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), paymentId, amountCents, chargedCents, platform, parsedName, payment.note ?? null, reason],
    });
    await notifyDiscord([
      '⚠️ Square payment needs manual matching',
      `Amount: $${(amountCents / 100).toFixed(2)}`,
      `Note: ${payment.note || '(none)'}`,
      `Reason: ${reason.replace('_', ' ')}`,
      'Resolve it: https://www.luckypearl.app/admin',
    ]);
  };

  if (!parsed) {
    await queueForReview('unparseable_note', chargedCents, null, null);
    return NextResponse.json({ ok: true, matched: false });
  }

  const usersResult = await db.execute("SELECT id, full_name, username FROM users WHERE role != 'admin'");
  const match = matchCustomerByName(
    usersResult.rows.map((row) => ({ id: row.id, full_name: row.full_name, username: row.username })),
    parsed.name
  );

  if (match.status !== 'matched') {
    await queueForReview(match.status, parsed.amountCents, parsed.platform, parsed.name);
    return NextResponse.json({ ok: true, matched: false });
  }

  const userId = String(match.customer.id);
  await db.execute({
    sql: `INSERT INTO deposits (id, user_id, amount_cents, method, note, square_payment_id, square_charged_cents, platform)
          VALUES (?, ?, ?, 'square', ?, ?, ?, ?)`,
    args: [randomUUID(), userId, parsed.amountCents, payment.note ?? null, paymentId, chargedCents, parsed.platform],
  });

  return NextResponse.json({ ok: true, matched: true, userId });
}
