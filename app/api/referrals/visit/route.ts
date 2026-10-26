import { randomBytes, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getActiveLink, normalizeReferralCode } from '@/lib/referrals';

const VISITOR_COOKIE = 'lp_ref_visitor';

// Counts a visit to a referral landing page (once per visitor per link per day), so the
// admin can compare clicks with signups and purchases for each link.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = normalizeReferralCode(body.code);

    await ensureSchema();
    const link = await getActiveLink(code);
    if (!link) return NextResponse.json({ ok: true });

    let visitorId = cookies().get(VISITOR_COOKIE)?.value ?? '';
    const isNewVisitor = !/^[a-f0-9]{32}$/.test(visitorId);
    if (isNewVisitor) visitorId = randomBytes(16).toString('hex');

    const already = await db.execute({
      sql: "SELECT 1 FROM referral_visits WHERE link_id = ? AND visitor_id = ? AND created_at >= datetime('now', '-1 day') LIMIT 1",
      args: [link.id, visitorId],
    });
    if (already.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO referral_visits (id, link_id, visitor_id) VALUES (?, ?, ?)',
        args: [randomUUID(), link.id, visitorId],
      });
    }

    const response = NextResponse.json({ ok: true });
    if (isNewVisitor) {
      response.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
