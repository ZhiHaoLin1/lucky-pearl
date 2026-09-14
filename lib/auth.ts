import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, ensureSchema } from './db';

export const SESSION_COOKIE = 'lp_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production.');
    }
    console.warn('SESSION_SECRET is not set — using an insecure development default.');
  }
  return new TextEncoder().encode(secret ?? 'dev-insecure-secret-change-me');
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function attachSessionCookie(response: NextResponse, userId: string) {
  const token = await createSessionToken(userId);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  preferredGame: string | null;
  role: string;
  createdAt: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT id, full_name, email, phone, preferred_game, role, created_at FROM users WHERE id = ?',
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    preferredGame: row.preferred_game ? String(row.preferred_game) : null,
    role: String(row.role),
    createdAt: String(row.created_at),
  };
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
