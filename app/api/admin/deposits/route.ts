import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const ALLOWED_METHODS = ['square', 'zelle', 'venmo', 'cash', 'other'];

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = String(body.userId ?? '');
    const amountDollars = Number(body.amountDollars);
    const method = ALLOWED_METHODS.includes(body.method) ? body.method : null;
    const note = body.note ? String(body.note).trim().slice(0, 500) : null;

    if (!userId || !Number.isFinite(amountDollars) || amountDollars <= 0) {
      return NextResponse.json({ error: 'A customer and a valid amount are required.' }, { status: 400 });
    }

    await ensureSchema();

    const recipient = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [userId] });
    if (recipient.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    const amountCents = Math.round(amountDollars * 100);
    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO deposits (id, user_id, amount_cents, method, note, recorded_by_admin_id) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, userId, amountCents, method, note, sessionUser.id],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while recording the deposit.' },
      { status: 500 }
    );
  }
}
