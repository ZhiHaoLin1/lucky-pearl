import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await ensureSchema();
  const result = await db.execute(
    `SELECT id, square_payment_id, amount_cents, square_charged_cents, platform, parsed_name, note, reason, created_at
     FROM square_unmatched_payments
     WHERE resolved_at IS NULL
     ORDER BY created_at DESC`
  );

  return NextResponse.json({ pending: result.rows });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    const action = body.action === 'dismiss' ? 'dismiss' : 'assign';
    const userId = body.userId ? String(body.userId) : null;

    if (!id) {
      return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    }
    if (action === 'assign' && !userId) {
      return NextResponse.json({ error: 'Missing userId to assign to.' }, { status: 400 });
    }

    await ensureSchema();

    const pending = await db.execute({
      sql: `SELECT id, square_payment_id, amount_cents, note, platform
            FROM square_unmatched_payments WHERE id = ? AND resolved_at IS NULL`,
      args: [id],
    });
    const row = pending.rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Not found or already resolved.' }, { status: 404 });
    }

    if (action === 'assign') {
      const customer = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [userId] });
      if (customer.rows.length === 0) {
        return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
      }

      await db.execute({
        sql: `INSERT INTO deposits (id, user_id, amount_cents, method, note, square_payment_id, platform, recorded_by_admin_id)
              VALUES (?, ?, ?, 'square', ?, ?, ?, ?)`,
        args: [randomUUID(), userId, row.amount_cents, row.note, row.square_payment_id, row.platform, sessionUser.id],
      });
    }

    await db.execute({
      sql: `UPDATE square_unmatched_payments
            SET resolved_at = datetime('now'), resolved_user_id = ?, resolved_by_admin_id = ?
            WHERE id = ?`,
      args: [action === 'assign' ? userId : null, sessionUser.id, id],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while resolving the payment.' },
      { status: 500 }
    );
  }
}
