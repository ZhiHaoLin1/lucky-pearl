import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { attachSessionCookie } from '@/lib/auth';

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    await ensureSchema();

    const body = (await request.json()) as LoginPayload;
    const email = body.email?.trim().toLowerCase() ?? '';
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = await db.execute({
      sql: 'SELECT id, full_name, password_hash, role FROM users WHERE email = ?',
      args: [email],
    });
    const row = result.rows[0];

    if (!row) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, String(row.password_hash));
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, fullName: row.full_name, role: row.role });
    await attachSessionCookie(response, String(row.id));
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Unexpected error while logging in.' },
      { status: 500 }
    );
  }
}
