import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

type AdminRegisterPayload = {
  inviteCode?: string;
  fullName?: string;
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const expectedCode = process.env.ADMIN_INVITE_CODE;
    if (!expectedCode) {
      return NextResponse.json(
        { error: 'Admin registration is not configured.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as AdminRegisterPayload;
    const inviteCode = body.inviteCode ?? '';
    const fullName = body.fullName?.trim() ?? '';
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';

    if (inviteCode !== expectedCode) {
      return NextResponse.json({ error: 'Invalid invite code.' }, { status: 403 });
    }
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required.' },
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

    await ensureSchema();

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
      sql: "INSERT INTO users (id, full_name, email, phone, preferred_game, password_hash, role) VALUES (?, ?, ?, '', NULL, ?, 'admin')",
      args: [id, fullName, email, passwordHash],
    });

    const response = NextResponse.json({ ok: true });
    await attachSessionCookie(response, id);
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while creating the admin account.' },
      { status: 500 }
    );
  }
}
