import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getFinanceSummary } from '@/lib/finance';
import { getNextTier, formatCents } from '@/lib/vip';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();
  const summary = await getFinanceSummary(sessionUser.id);
  const nextTier = getNextTier(summary.tier);

  const [deposits, withdrawals] = await Promise.all([
    db.execute({
      sql: 'SELECT id, amount_cents, method, created_at FROM deposits WHERE user_id = ? ORDER BY created_at DESC',
      args: [sessionUser.id],
    }),
    db.execute({
      sql: 'SELECT id, amount_cents, status, created_at, processed_at FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC',
      args: [sessionUser.id],
    }),
  ]);

  return NextResponse.json({
    lifetimeDepositsCents: summary.lifetimeDepositsCents,
    todaysWithdrawnCents: summary.todaysWithdrawnCents,
    remainingTodayCents: summary.remainingTodayCents,
    tier: summary.tier,
    nextTier,
    deposits: deposits.rows,
    withdrawals: withdrawals.rows,
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const amountDollars = Number(body.amountDollars);
    if (!Number.isFinite(amountDollars) || amountDollars <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });
    }
    const amountCents = Math.round(amountDollars * 100);

    await ensureSchema();
    const summary = await getFinanceSummary(sessionUser.id);

    if (amountCents > summary.remainingTodayCents) {
      return NextResponse.json(
        {
          error: `That's more than your remaining daily withdrawal allowance. You can request up to ${formatCents(
            summary.remainingTodayCents
          )} more today.`,
        },
        { status: 400 }
      );
    }

    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO withdrawals (id, user_id, amount_cents) VALUES (?, ?, ?)',
      args: [id, sessionUser.id, amountCents],
    });

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: [
            'New Lucky Pearl withdrawal request',
            `Name: ${sessionUser.fullName}`,
            `Email: ${sessionUser.email}`,
            `Amount: ${formatCents(amountCents)}`,
            `Tier: ${summary.tier.name}`,
          ].join('\n'),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while requesting a withdrawal.' },
      { status: 500 }
    );
  }
}
