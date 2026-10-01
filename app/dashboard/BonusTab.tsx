import { BONUS_PER_DEPOSIT_CENTS, MAX_BONUS_CENTS, MAX_BONUS_DEPOSITS, MIN_QUALIFYING_DEPOSIT_CENTS } from '@/lib/bonuses';

export type BonusTabProps = {
  emoji: string;
  heading: string;
  intro: string;
  qualifyingDeposits: number;
  earnedCents: number;
  endsLabel: string;
};

const dollars = (cents: number) => `$${Math.round(cents / 100)}`;

// Shown only while a holiday / birthday bonus window is open. Progress comes
// straight from the customer's recorded deposits (the payment-email parser
// creates those), so it fills in on its own as payments are matched.
export default function BonusTab({ emoji, heading, intro, qualifyingDeposits, earnedCents, endsLabel }: BonusTabProps) {
  const complete = qualifyingDeposits >= MAX_BONUS_DEPOSITS;

  return (
    <div className="rounded-2xl border border-gold-500/40 bg-navy-800/60 p-5 sm:p-8 text-center">
      <div className="text-5xl mb-2" aria-hidden>
        {emoji}
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gold-shimmer mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
        {heading}
      </h2>
      <p className="text-pearl-200/80 text-base mb-6 max-w-xl mx-auto">{intro}</p>

      <p className="text-pearl-300/60 text-xs uppercase tracking-widest mb-1">You&apos;ve earned</p>
      <p className="text-4xl sm:text-5xl font-bold text-gold-400 mb-1">
        {dollars(earnedCents)} <span className="text-pearl-300/60 text-xl font-medium">of {dollars(MAX_BONUS_CENTS)}</span>
      </p>

      <div
        className="grid grid-cols-5 gap-2 max-w-md mx-auto my-5"
        role="progressbar"
        aria-label="Bonus earned"
        aria-valuemin={0}
        aria-valuemax={MAX_BONUS_CENTS / 100}
        aria-valuenow={earnedCents / 100}
      >
        {Array.from({ length: MAX_BONUS_DEPOSITS }, (_, index) => (
          <div
            key={index}
            className={`h-6 rounded-md transition-colors ${
              index < qualifyingDeposits ? 'bg-gradient-to-r from-gold-600 to-gold-300' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <p className="text-pearl-100 text-base mb-1">
        {complete
          ? "You've earned the full bonus! 🎉"
          : `Your next ${MAX_BONUS_DEPOSITS} deposits of ${dollars(MIN_QUALIFYING_DEPOSIT_CENTS)} or more each earn an extra ${dollars(BONUS_PER_DEPOSIT_CENTS)}.`}
      </p>
      <p className="text-pearl-300/70 text-sm mb-6">
        {qualifyingDeposits} of {MAX_BONUS_DEPOSITS} deposits counted · Ends {endsLabel}
      </p>

      <div className="rounded-xl bg-black/20 px-4 py-3 text-sm text-pearl-300/80 text-left max-w-xl mx-auto space-y-1.5">
        <p>
          <span className="text-gold-400 font-semibold">How to claim:</span> text{' '}
          <a href="sms:+14077968311" className="text-gold-400 underline underline-offset-2 font-semibold">
            407-796-8311
          </a>{' '}
          and we&apos;ll add your bonus.
        </p>
        <p className="text-pearl-300/60 text-xs">
          Terms: {dollars(BONUS_PER_DEPOSIT_CENTS)} bonus on each of your next {MAX_BONUS_DEPOSITS} deposits of{' '}
          {dollars(MIN_QUALIFYING_DEPOSIT_CENTS)} or more (up to {dollars(MAX_BONUS_CENTS)} total), valid 1 week.
        </p>
      </div>
    </div>
  );
}
