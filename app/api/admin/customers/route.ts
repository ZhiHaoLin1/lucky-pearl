import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = String(body.userId ?? '');
    const username = String(body.username ?? '').trim();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId.' }, { status: 400 });
    }

    await ensureSchema();

    if (username) {
      const existing = await db.execute({
        sql: "SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?",
        args: [username, userId],
      });
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'Another customer already has that username.' },
          { status: 409 }
        );
      }
    }

    await db.execute({
      sql: 'UPDATE users SET username = ? WHERE id = ?',
      args: [username || null, userId],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while updating the username.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.userIds)
      ? body.userIds.map((id: unknown) => String(id)).filter(Boolean)
      : typeof body.userId === 'string' && body.userId
      ? [body.userId]
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No accounts specified.' }, { status: 400 });
    }

    await ensureSchema();

    const statements = ids.flatMap((id) => [
      { sql: 'DELETE FROM messages WHERE user_id = ?', args: [id] },
      { sql: 'DELETE FROM password_resets WHERE user_id = ?', args: [id] },
      { sql: "DELETE FROM users WHERE id = ? AND role != 'admin'", args: [id] },
    ]);
    await db.batch(statements, 'write');

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while deleting accounts.' },
      { status: 500 }
    );
  }
}
