import { Gem } from 'lucide-react';
import { REFEREE_CREDIT_CENTS, REFERRAL_MIN_PURCHASE_CENTS } from '@/lib/referrals';
import VisitBeacon from './VisitBeacon';
import ReferralSignup from './ReferralSignup';

const dollars = (cents: number) => `$${cents / 100}`;

// The shared look of the referral site, used with and without a personal invite.
export default function ReferralLanding({
  code,
  referrerFirstName,
  mainSiteUrl,
}: {
  code: string | null;
  referrerFirstName: string | null;
  mainSiteUrl: string;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center px-5 py-10 text-center"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #111f38 0%, #070c1a 45%, #04060f 100%)' }}
    >
      {code && <VisitBeacon code={code} />}

      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
          <Gem className="w-5 h-5 text-navy-900" />
        </div>
        <span className="text-gold-shimmer text-xl font-bold">Lucky Pearl</span>
      </div>

      <div className="max-w-lg w-full">
        <p className="text-gold-600 text-xs tracking-[0.4em] uppercase mb-3" style={{ fontFamily: "'Cinzel', serif" }}>
          {referrerFirstName ? 'You’re invited' : 'Lucky Pearl Friends'}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gold-shimmer mb-4 leading-tight" style={{ fontFamily: "'Cinzel', serif" }}>
          {referrerFirstName ? `${referrerFirstName} invited you to Lucky Pearl` : 'Invited by a friend?'}
        </h1>
        <p className="text-pearl-200/80 text-lg mb-8">
          Join through your friend’s link and get <span className="text-gold-400 font-bold">{dollars(REFEREE_CREDIT_CENTS)} in free game credit</span>{' '}
          to try your first games.
        </p>

        <ReferralSignup
          code={code}
          referrerFirstName={referrerFirstName}
          mainSiteUrl={mainSiteUrl}
          buttonLabel={`Claim my ${dollars(REFEREE_CREDIT_CENTS)}`}
        />

        {!code && (
          <p className="text-pearl-300/60 text-sm mt-5">
            Don’t have a personal link? Ask the friend who told you about us to send theirs, so you both get credit.
          </p>
        )}

        <div className="mt-10 rounded-2xl border border-gold-600/25 bg-navy-800/60 p-5 text-left text-sm text-pearl-300/80 space-y-3">
          <h2 className="text-pearl-100 font-bold text-base text-center">How it works</h2>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Tap the button and create your free account.</li>
            <li>We add your {dollars(REFEREE_CREDIT_CENTS)} game credit. Just text us once you’re signed up.</li>
            <li>Make your first deposit of {dollars(REFERRAL_MIN_PURCHASE_CENTS)} or more to unlock cashouts. Your friend gets rewarded too.</li>
          </ol>
        </div>

        <div className="mt-6 text-xs text-pearl-300/50 text-left space-y-1.5">
          <p className="font-semibold text-pearl-300/70">Terms</p>
          <p>For new customers 18 or older only. One offer per person. Existing customers, repeat or duplicate accounts and self-referrals don’t qualify.</p>
          <p>
            The {dollars(REFEREE_CREDIT_CENTS)} game credit is promotional. Cashouts are not available until you make your first deposit of{' '}
            {dollars(REFERRAL_MIN_PURCHASE_CENTS)} or more. We may verify accounts and withhold rewards if we find misuse.
          </p>
          <p>Please play responsibly.</p>
        </div>
      </div>
    </main>
  );
}
