import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getFinanceSummary } from '@/lib/finance';
import { getNextTier, VIP_TIERS } from '@/lib/vip';

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
  }

  await ensureSchema();
  const summary = await getFinanceSummary(userId);
  const nextTier = getNextTier(summary.tier);

  const [deposits, withdrawals] = await Promise.all([
    db.execute({
      sql: 'SELECT id, amount_cents, method, note, created_at FROM deposits WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT id, amount_cents, method, payout_detail, fee_cents, status, created_at, processed_at FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    }),
  ]);

  return NextResponse.json({
    lifetimeDepositsCents: summary.lifetimeDepositsCents,
    todaysWithdrawnCents: summary.todaysWithdrawnCents,
    remainingTodayCents: summary.remainingTodayCents,
    tier: summary.tier,
    tierOverride: summary.tierOverride ?? null,
    nextTier,
    deposits: deposits.rows,
    withdrawals: withdrawals.rows,
  });
}

const TIER_NAMES = VIP_TIERS.map((tier) => tier.name);

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = String(body.userId ?? '');
    const tierOverride = body.tierOverride ? String(body.tierOverride) : null;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
    }
    if (tierOverride && !TIER_NAMES.includes(tierOverride)) {
      return NextResponse.json({ error: 'Invalid tier.' }, { status: 400 });
    }

    await ensureSchema();
    await db.execute({
      sql: 'UPDATE users SET tier_override = ? WHERE id = ?',
      args: [tierOverride, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while updating the tier.' },
      { status: 500 }
    );
  }
}
