import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { createReferralLink, getReferralOverview } from '@/lib/referrals';

async function requireAdmin() {
  const sessionUser = await getSessionUser();
  return sessionUser && sessionUser.role === 'admin' ? sessionUser : null;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    await ensureSchema();
    return NextResponse.json(await getReferralOverview());
  } catch (error) {
    console.error('referrals failed', error);
    return NextResponse.json({ error: 'Could not load referrals. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = String(body.action ?? '');
    await ensureSchema();

    if (action === 'create-link') {
      const userId = String(body.userId ?? '');
      const label = String(body.label ?? '').trim().slice(0, 80) || null;
      const customer = await db.execute({ sql: "SELECT id FROM users WHERE id = ? AND role != 'admin'", args: [userId] });
      if (customer.rows.length === 0) {
        return NextResponse.json({ error: 'Pick a customer to create the link for.' }, { status: 400 });
      }
      const code = await createReferralLink(userId, label, admin.id);
      return NextResponse.json({ ok: true, code });
    }

    if (action === 'toggle-link') {
      await db.execute({
        sql: 'UPDATE referral_links SET active = ? WHERE id = ?',
        args: [body.active ? 1 : 0, String(body.linkId ?? '')],
      });
      return NextResponse.json({ ok: true });
    }

    const referralId = String(body.referralId ?? '');
    const referral = (await getReferralOverview()).referrals.find((row) => row.id === referralId);
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found.' }, { status: 404 });
    }

    if (action === 'credit-given') {
      if (referral.eligibility !== 'eligible') {
        return NextResponse.json({ error: 'This referral is not eligible for the promo credit.' }, { status: 409 });
      }
      await db.execute({
        sql: "UPDATE referrals SET referee_credit_given_at = datetime('now'), referee_credit_given_by = ? WHERE id = ? AND referee_credit_given_at IS NULL",
        args: [admin.id, referralId],
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'pay-referrer') {
      // Recomputed from the database; the browser only says which referral.
      if (referral.state !== 'owed') {
        return NextResponse.json({ error: referral.blockReason || 'This referral is not payable right now.' }, { status: 409 });
      }
      await db.execute({
        sql: "UPDATE referrals SET referrer_paid_at = datetime('now'), referrer_paid_by = ? WHERE id = ? AND referrer_paid_at IS NULL",
        args: [admin.id, referralId],
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'approve' || action === 'reject') {
      const reason = String(body.reason ?? '').trim().slice(0, 200);
      await db.execute({
        sql: `UPDATE referrals SET eligibility = ?, eligibility_reason = ?, reviewed_by_admin_id = ?, reviewed_at = datetime('now') WHERE id = ?`,
        args: [
          action === 'approve' ? 'eligible' : 'rejected',
          action === 'approve' ? `Approved by admin${referral.reason ? ` (was: ${referral.reason})` : ''}` : reason || referral.reason || 'Rejected by admin',
          admin.id,
          referralId,
        ],
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('referrals action failed', error);
    return NextResponse.json({ error: 'Could not save that.' }, { status: 500 });
  }
}
