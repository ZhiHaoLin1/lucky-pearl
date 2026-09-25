import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  await db.execute({
    sql: "UPDATE messages SET read_at = datetime('now') WHERE user_id = ? AND sender_admin_id IS NOT NULL AND read_at IS NULL",
    args: [sessionUser.id],
  });

  const result = await db.execute({
    sql: 'SELECT id, body, sender_admin_id, created_at, read_at FROM messages WHERE user_id = ? ORDER BY created_at ASC',
    args: [sessionUser.id],
  });

  return NextResponse.json({ messages: result.rows });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const text = String(body.body ?? '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    await ensureSchema();
    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO messages (id, user_id, sender_admin_id, body) VALUES (?, ?, NULL, ?)',
      args: [id, sessionUser.id, text],
    });

    const webhookUrl = process.env.DISCORD_INBOX_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: [
            '📨 New inbox message from a customer',
            `Name: ${sessionUser.fullName}`,
            `Email: ${sessionUser.email}`,
            `Message: ${text}`,
            '',
            'Reply: https://www.luckypearl.app/admin',
          ].join('\n'),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while sending the message.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing message id.' }, { status: 400 });
  }

  await ensureSchema();
  await db.execute({
    sql: 'DELETE FROM messages WHERE id = ? AND user_id = ?',
    args: [id, sessionUser.id],
  });

  return NextResponse.json({ ok: true });
}
