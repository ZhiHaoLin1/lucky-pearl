import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/db';
import { getActiveLink, normalizeReferralCode } from '@/lib/referrals';

// Public: lets the signup form show "Invited by Jordan" for a referral link.
// Only the referrer's first name is returned.
export async function GET(request: Request) {
  const code = normalizeReferralCode(new URL(request.url).searchParams.get('code'));
  try {
    await ensureSchema();
    const link = await getActiveLink(code);
    return NextResponse.json(link ? { valid: true, firstName: link.referrerFirstName } : { valid: false });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
