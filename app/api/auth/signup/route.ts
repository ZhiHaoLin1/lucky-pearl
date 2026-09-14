import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

type SignupPayload = {
  fullName?: string;
  email?: string;
  phone?: string;
  preferredGame?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    await ensureSchema();

    const body = (await request.json()) as SignupPayload;
    const fullName = body.fullName?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const phone = body.phone?.trim() ?? '';
    const preferredGame = body.preferredGame?.trim() ?? '';
    const password = body.password ?? '';

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Full name, email, phone, and password are required.' },
        { status: 400 }
      );
    }
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'An account with that email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();

    await db.execute({
      sql: 'INSERT INTO users (id, full_name, email, phone, preferred_game, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, fullName, email, phone, preferredGame || null, passwordHash],
    });

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: [
            'New Lucky Pearl account created',
            `Name: ${fullName}`,
            `Email: ${email}`,
            `Phone: ${phone}`,
            `Preferred game: ${preferredGame || 'Not provided'}`,
          ].join('\n'),
        }),
      }).catch(() => {});
    }

    const response = NextResponse.json({ ok: true, fullName });
    await attachSessionCookie(response, id);
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while creating your account.' },
      { status: 500 }
    );
  }
}
