import { headers } from 'next/headers';
import ReferralLanding from './ReferralLanding';

export const dynamic = 'force-dynamic';

export default function ReferralHomePage() {
  // referral.luckypearl.app -> https://www.luckypearl.app; anywhere else (local testing) stay on the same host.
  const host = headers().get('host') ?? '';
  const mainSiteUrl = host.startsWith('referral.') ? `https://www.${host.slice('referral.'.length)}` : '';
  return <ReferralLanding code={null} referrerFirstName={null} mainSiteUrl={mainSiteUrl} />;
}
