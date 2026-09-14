import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

const ALLOWED_STATUSES = ['pending', 'approved', 'denied', 'paid'];

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    const status = String(body.status ?? '');

    if (!id || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'A withdrawal id and valid status are required.' }, { status: 400 });
    }

    await ensureSchema();
    await db.execute({
      sql: "UPDATE withdrawals SET status = ?, processed_at = datetime('now'), processed_by_admin_id = ? WHERE id = ?",
      args: [status, sessionUser.id, id],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while updating the withdrawal.' },
      { status: 500 }
    );
  }
}
