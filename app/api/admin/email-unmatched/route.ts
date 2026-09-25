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
    `SELECT id, email_message_id, source, amount_cents, sender_email, subject, parsed_name, reason, created_at
     FROM email_unmatched_payments
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
    const amountDollars = body.amountDollars !== undefined ? Number(body.amountDollars) : null;

    if (!id) {
      return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
    }
    if (action === 'assign' && !userId) {
      return NextResponse.json({ error: 'Missing userId to assign to.' }, { status: 400 });
    }

    await ensureSchema();

    const pending = await db.execute({
      sql: `SELECT id, email_message_id, source, amount_cents
            FROM email_unmatched_payments WHERE id = ? AND resolved_at IS NULL`,
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

      const amountCents =
        row.amount_cents !== null
          ? Number(row.amount_cents)
          : Number.isFinite(amountDollars) && (amountDollars as number) > 0
          ? Math.round((amountDollars as number) * 100)
          : null;
      if (!amountCents) {
        return NextResponse.json({ error: 'This entry has no amount — enter one to assign it.' }, { status: 400 });
      }

      await db.execute({
        sql: `INSERT INTO deposits (id, user_id, amount_cents, method, email_message_id, recorded_by_admin_id)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), userId, amountCents, row.source, row.email_message_id, sessionUser.id],
      });
    }

    await db.execute({
      sql: `UPDATE email_unmatched_payments
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
