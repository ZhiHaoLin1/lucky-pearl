import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { attachSessionCookie, verifyHandoffToken } from '@/lib/auth';

// Opened (as a normal page visit) right after someone signs up on the referral site: trades the
// one-time token for a login on this site and drops them on their dashboard.
export async function GET(request: Request) {
  const home = new URL('/', request.url);
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const verified = await verifyHandoffToken(token);
  if (!verified) {
    return NextResponse.redirect(home, 303);
  }

  try {
    await ensureSchema();
    // Single use: the token's id can only be recorded once.
    const used = await db.execute({ sql: 'INSERT OR IGNORE INTO auth_handoffs (jti) VALUES (?)', args: [verified.jti] });
    if (used.rowsAffected === 0) {
      return NextResponse.redirect(home, 303);
    }
    const user = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [verified.userId] });
    if (user.rows.length === 0) {
      return NextResponse.redirect(home, 303);
    }

    const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
    response.headers.set('Referrer-Policy', 'no-referrer');
    await attachSessionCookie(response, verified.userId);
    return response;
  } catch {
    return NextResponse.redirect(home, 303);
  }
}
