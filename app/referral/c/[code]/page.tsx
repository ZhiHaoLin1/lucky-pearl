import { headers } from 'next/headers';
import { ensureSchema } from '@/lib/db';
import { getActiveLink, normalizeReferralCode } from '@/lib/referrals';
import ReferralLanding from '../../ReferralLanding';
import { mainSiteUrlForHost } from '@/lib/referralSite';

export const dynamic = 'force-dynamic';

export default async function ReferralInvitePage({ params }: { params: { code: string } }) {
  const mainSiteUrl = mainSiteUrlForHost(headers().get('host') ?? '');
  const code = normalizeReferralCode(params.code);

  let link = null;
  try {
    await ensureSchema();
    link = await getActiveLink(code);
  } catch {
    // Fall through to the generic page.
  }

  // An unknown or switched-off link still shows the offer, just without a name or tracking.
  return <ReferralLanding code={link ? link.code : null} referrerFirstName={link ? link.referrerFirstName : null} mainSiteUrl={mainSiteUrl} />;
}
