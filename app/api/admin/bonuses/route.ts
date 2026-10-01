import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getBonusPayoutRows } from '@/lib/bonusPayouts';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await ensureSchema();
  const rows = await getBonusPayoutRows();
  return NextResponse.json({ rows });
}

// Marks a customer's bonus as credited up to what they've earned right now.
// The amount is recomputed here, never taken from the browser.
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = String(body.userId ?? '');
    const bonusKey = String(body.bonusKey ?? '');
    if (!userId || !bonusKey) {
      return NextResponse.json({ error: 'Missing userId or bonusKey.' }, { status: 400 });
    }

    await ensureSchema();
    const [row] = await getBonusPayoutRows(new Date(), { userId, bonusKey });
    if (!row) {
      return NextResponse.json({ error: 'No bonus found for that customer.' }, { status: 404 });
    }

    await db.execute({
      sql: `INSERT INTO bonus_payouts (user_id, bonus_key, paid_cents, paid_at, paid_by_admin_id)
            VALUES (?, ?, ?, datetime('now'), ?)
            ON CONFLICT(user_id, bonus_key) DO UPDATE SET
              paid_cents = excluded.paid_cents, paid_at = excluded.paid_at, paid_by_admin_id = excluded.paid_by_admin_id`,
      args: [userId, bonusKey, row.earnedCents, sessionUser.id],
    });
    return NextResponse.json({ ok: true, paidCents: row.earnedCents });
  } catch {
    return NextResponse.json({ error: 'Could not mark this bonus as paid.' }, { status: 500 });
  }
}
