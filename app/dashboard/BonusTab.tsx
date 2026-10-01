export type BonusTabProps = {
  emoji: string;
  heading: string;
  intro: string;
  qualifyingDeposits: number;
  earnedCents: number;
  endsLabel: string;
  perDepositCents: number;
  minDepositCents: number;
  maxDeposits: number;
  validLabel: string; // e.g. "1 week" or "3 days"
};

const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

// Many segments get unreadable, so past this the bar becomes one continuous fill.
const MAX_SEGMENTS = 10;

// Shown only while a holiday / birthday / event bonus window is open. Progress comes
// straight from the customer's recorded deposits (the payment-email parser
// creates those), so it fills in on its own as payments are matched.
export default function BonusTab({
  emoji,
  heading,
  intro,
  qualifyingDeposits,
  earnedCents,
  endsLabel,
  perDepositCents,
  minDepositCents,
  maxDeposits,
  validLabel,
}: BonusTabProps) {
  const complete = qualifyingDeposits >= maxDeposits;
  const maxBonusCents = perDepositCents * maxDeposits;

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
        {dollars(earnedCents)} <span className="text-pearl-300/60 text-xl font-medium">of {dollars(maxBonusCents)}</span>
      </p>

      <div
        className="max-w-md mx-auto my-5"
        role="progressbar"
        aria-label="Bonus earned"
        aria-valuemin={0}
        aria-valuemax={maxBonusCents / 100}
        aria-valuenow={earnedCents / 100}
      >
        {maxDeposits <= MAX_SEGMENTS ? (
          <div className="flex gap-2">
            {Array.from({ length: maxDeposits }, (_, index) => (
              <div
                key={index}
                className={`h-6 flex-1 rounded-md transition-colors ${
                  index < qualifyingDeposits ? 'bg-gradient-to-r from-gold-600 to-gold-300' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="h-6 rounded-md bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-600 to-gold-300 transition-all"
              style={{ width: `${Math.min(100, (qualifyingDeposits / maxDeposits) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <p className="text-pearl-100 text-base mb-1">
        {complete
          ? "You've earned the full bonus! 🎉"
          : `Your next ${maxDeposits} deposits of ${dollars(minDepositCents)} or more each earn an extra ${dollars(perDepositCents)}.`}
      </p>
      <p className="text-pearl-300/70 text-sm mb-6">
        {qualifyingDeposits} of {maxDeposits} deposits counted · Ends {endsLabel}
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
          Terms: {dollars(perDepositCents)} bonus on each of your next {maxDeposits} deposits of {dollars(minDepositCents)} or
          more (up to {dollars(maxBonusCents)} total), valid {validLabel}.
        </p>
      </div>
    </div>
  );
}
