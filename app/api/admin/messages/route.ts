import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

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
  const result = await db.execute({
    sql: 'SELECT id, body, created_at, read_at FROM messages WHERE user_id = ? ORDER BY created_at ASC',
    args: [userId],
  });

  return NextResponse.json({ messages: result.rows });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = String(body.userId ?? '');
    const text = String(body.body ?? '').trim();

    if (!userId || !text) {
      return NextResponse.json({ error: 'Missing recipient or message body.' }, { status: 400 });
    }

    await ensureSchema();

    const recipient = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [userId] });
    if (recipient.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO messages (id, user_id, sender_admin_id, body) VALUES (?, ?, ?, ?)',
      args: [id, userId, sessionUser.id, text],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unexpected error while sending the message.' }, { status: 500 });
  }
}
