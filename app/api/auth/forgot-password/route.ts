import { randomBytes, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const RESET_TOKEN_TTL_MINUTES = 30;

export async function POST(request: Request) {
  const genericResponse = NextResponse.json({
    ok: true,
    message: 'If an account exists for that email, a reset link is on its way.',
  });

  try {
    await ensureSchema();

    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email) return genericResponse;

    const result = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });
    const row = result.rows[0];
    if (!row) return genericResponse;

    const userId = String(row.id);
    await db.execute({ sql: 'DELETE FROM password_resets WHERE user_id = ?', args: [userId] });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    await db.execute({
      sql: 'INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      args: [tokenHash, userId, expiresAt],
    });

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: email,
      subject: 'Reset your Lucky Pearl password',
      text: `Someone requested a password reset for your Lucky Pearl account.\n\nReset your password: ${resetUrl}\n\nThis link expires in ${RESET_TOKEN_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
      html: `<p>Someone requested a password reset for your Lucky Pearl account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
    });

    return genericResponse;
  } catch {
    return genericResponse;
  }
}
