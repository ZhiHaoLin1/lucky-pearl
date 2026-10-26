import { REFEREE_CREDIT_CENTS, REFERRAL_MIN_PURCHASE_CENTS } from '@/lib/referrals';

// Shown on the Overview tab to customers who joined through a friend's invite.
export default function ReferralBanner({ showCredit, locked }: { showCredit: boolean; locked: boolean }) {
  if (!showCredit && !locked) return null;
  return (
    <div className="rounded-2xl border border-gold-500/40 bg-gold-500/5 p-5 space-y-2">
      <h2 className="text-lg font-bold text-gold-400" style={{ fontFamily: "'Cinzel', serif" }}>
        🎁 Welcome gift from your friend’s invite
      </h2>
      {showCredit && (
        <p className="text-pearl-100 text-sm">
          You have <span className="text-gold-400 font-bold">${REFEREE_CREDIT_CENTS / 100} in free game credit</span> waiting. Text{' '}
          <a href="sms:+14077968311" className="text-gold-400 underline underline-offset-2 font-semibold">
            407-796-8311
          </a>{' '}
          and we’ll add it to your game account.
        </p>
      )}
      {locked && (
        <p className="text-pearl-300/80 text-sm">
          Cashouts unlock after your first deposit of ${REFERRAL_MIN_PURCHASE_CENTS / 100} or more.
        </p>
      )}
    </div>
  );
}
