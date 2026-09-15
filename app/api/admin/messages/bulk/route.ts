import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userIds: string[] = Array.isArray(body.userIds)
      ? body.userIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    const text = String(body.body ?? '').trim();

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one customer.' }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    await ensureSchema();

    const statements = userIds.map((userId) => ({
      sql: 'INSERT INTO messages (id, user_id, sender_admin_id, body) VALUES (?, ?, ?, ?)',
      args: [randomUUID(), userId, sessionUser.id, text],
    }));
    await db.batch(statements, 'write');

    return NextResponse.json({ ok: true, sent: userIds.length });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while sending the broadcast.' },
      { status: 500 }
    );
  }
}
