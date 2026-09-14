import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await ensureSchema();

    const body = await request.json();
    const token = String(body.token ?? '').trim();
    const password = String(body.password ?? '');

    if (!token || !password) {
      return NextResponse.json({ error: 'Missing reset token or password.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const result = await db.execute({
      sql: 'SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?',
      args: [tokenHash],
    });
    const row = result.rows[0];

    if (!row || new Date(String(row.expires_at)) < new Date()) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired.' },
        { status: 400 }
      );
    }

    const userId = String(row.user_id);
    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
      args: [passwordHash, userId],
    });
    await db.execute({ sql: 'DELETE FROM password_resets WHERE user_id = ?', args: [userId] });

    const response = NextResponse.json({ ok: true });
    await attachSessionCookie(response, userId);
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while resetting your password.' },
      { status: 500 }
    );
  }
}
