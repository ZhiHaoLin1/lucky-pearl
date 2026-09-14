import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ loggedIn: false });
  }

  const userId = await verifySessionToken(token);
  if (!userId) {
    return NextResponse.json({ loggedIn: false });
  }

  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT full_name FROM users WHERE id = ?',
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) {
    return NextResponse.json({ loggedIn: false });
  }

  return NextResponse.json({ loggedIn: true, fullName: row.full_name });
}
