import { headers } from 'next/headers';
import ReferralLanding from './ReferralLanding';
import { mainSiteUrlForHost } from '@/lib/referralSite';

export const dynamic = 'force-dynamic';

export default function ReferralHomePage() {
  const mainSiteUrl = mainSiteUrlForHost(headers().get('host') ?? '');
  return <ReferralLanding code={null} referrerFirstName={null} mainSiteUrl={mainSiteUrl} />;
}
