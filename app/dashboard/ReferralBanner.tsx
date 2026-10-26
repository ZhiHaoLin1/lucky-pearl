import { REFEREE_CREDIT_CENTS, REFERRAL_MIN_PURCHASE_CENTS } from '@/lib/referrals';

const dollars = (cents: number) => `$${cents / 100}`;

// Shown on the Overview tab to customers who joined through a friend's invite. The $10 credit is
// earned by a first deposit of $20+ that they paid themselves, then claimed by text.
export default function ReferralBanner({
  eligible,
  purchaseVerified,
  creditGiven,
  locked,
}: {
  eligible: boolean;
  purchaseVerified: boolean;
  creditGiven: boolean;
  locked: boolean;
}) {
  const showEarn = eligible && !purchaseVerified;
  const showClaim = eligible && purchaseVerified && !creditGiven;
  if (!showEarn && !showClaim && !locked) return null;

  return (
    <div className="rounded-2xl border border-gold-500/40 bg-gold-500/5 p-5 space-y-2">
      <h2 className="text-lg font-bold text-gold-400" style={{ fontFamily: "'Cinzel', serif" }}>
        🎁 Your friend’s invite gift
      </h2>
      {showEarn && (
        <p className="text-pearl-100 text-sm">
          Make your first deposit of {dollars(REFERRAL_MIN_PURCHASE_CENTS)} or more, paid from your own account, and you’ll earn{' '}
          <span className="text-gold-400 font-bold">{dollars(REFEREE_CREDIT_CENTS)} in free game credit</span>.
        </p>
      )}
      {showClaim && (
        <p className="text-pearl-100 text-sm">
          Your <span className="text-gold-400 font-bold">{dollars(REFEREE_CREDIT_CENTS)} game credit</span> is ready! Text{' '}
          <a href="sms:+14077968311" className="text-gold-400 underline underline-offset-2 font-semibold">
            (407) 796-8311
          </a>{' '}
          from the phone number you signed up with and we’ll add it to your game account.
        </p>
      )}
      {locked && (
        <p className="text-pearl-300/80 text-sm">
          Cashouts unlock after that first deposit. Already made it? Text us and we’ll confirm it.
        </p>
      )}
    </div>
  );
}
