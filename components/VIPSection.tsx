import { VIP_TIERS, formatCents } from '@/lib/vip';

const tiers = VIP_TIERS.map((tier) => ({
  ...tier,
  depositLine:
    tier.minDepositsCents === 0
      ? 'Lifetime deposits of $0+'
      : `Lifetime deposits of ${formatCents(tier.minDepositsCents).replace('.00', '')}+`,
  withdrawalLimit: `${formatCents(tier.dailyLimitCents).replace('.00', '')}/day`,
}));

export default function VIPSection() {
  return (
    <section id="vip" className="mb-6 rounded-2xl border border-gold-600/25 bg-navy-800/60 p-5 sm:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <p className="text-gold-500 text-xs sm:text-sm font-semibold tracking-wide uppercase mb-2">
          Withdrawal limits by loyalty
        </p>
        <h2 className="text-xl sm:text-3xl font-bold text-gold-shimmer mb-2 leading-tight">
          The VIP Circle
        </h2>
        <p className="text-pearl-200/75 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Your tier is based on total lifetime deposits — the more you&apos;ve deposited, the higher your daily withdrawal limit.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="relative rounded-xl p-4 sm:p-5"
            style={{
              background: tier.highlighted
                ? `linear-gradient(160deg, ${tier.color}18, rgba(255,255,255,0.03))`
                : 'rgba(255,255,255,0.02)',
              border: tier.highlighted
                ? `2px solid ${tier.color}55`
                : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {tier.highlighted && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-gradient-to-r from-gold-600 to-gold-300 text-navy-900">
                Most popular
              </div>
            )}

            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{tier.icon}</span>
              <h3 className="text-lg font-bold" style={{ color: tier.color }}>
                {tier.name}
              </h3>
            </div>
            <p className="text-pearl-300/60 text-xs mb-3">{tier.depositLine}</p>

            <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 mb-3">
              <span className="text-pearl-300/60 text-xs">Daily withdrawal</span>
              <span className="text-white font-bold text-sm">{tier.withdrawalLimit}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tier.features.map((f) => (
                <span
                  key={f}
                  className="px-2 py-1 rounded-md text-[11px] leading-tight"
                  style={{ background: `${tier.color}15`, color: tier.color }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
