'use client';

const tiers = [
  {
    name: 'Pearl',
    icon: '🪬',
    color: '#b5a285',
    minDeposit: '$0',
    cashback: '3%',
    withdrawalLimit: '$5,000/week',
    personalManager: false,
    features: ['Weekly bonus', 'Tournament access', 'Priority chat support'],
  },
  {
    name: 'Jade',
    icon: '💚',
    color: '#34d399',
    minDeposit: '$1,000',
    cashback: '7%',
    withdrawalLimit: '$15,000/week',
    personalManager: false,
    features: ['Daily reload bonus', 'Jade-exclusive games', 'Birthday gift'],
  },
  {
    name: 'Gold',
    icon: '⚜️',
    color: '#d4af37',
    minDeposit: '$5,000',
    cashback: '10%',
    withdrawalLimit: '$50,000/week',
    personalManager: true,
    features: ['Personal manager', 'Gold VIP lounge', 'Event invitations', 'Higher bet limits'],
    highlighted: true,
  },
  {
    name: 'Dragon',
    icon: '🐉',
    color: '#ff6b35',
    minDeposit: '$25,000',
    cashback: '15%',
    withdrawalLimit: 'Unlimited',
    personalManager: true,
    features: ['Elite concierge 24/7', 'Custom bonus crafting', 'Private tournaments', 'Luxury gifts program'],
  },
];

export default function VIPSection() {
  return (
    <section id="vip" className="py-24 px-6 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(17,31,56,0.9) 0%, #04060f 60%)`,
        }}
      />
      {/* Decorative pearl sphere */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 40% 40%, #f0ebe0, #d4af37, #04060f)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold-600 text-xs tracking-[0.5em] uppercase mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
            Exclusive Membership
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gold-shimmer mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
            The VIP Circle
          </h2>
          <div className="ornament-divider max-w-sm mx-auto mb-4">
            <span className="text-gold-600 text-sm">❖</span>
          </div>
          <p
            className="text-pearl-200/50 text-lg max-w-xl mx-auto"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}
          >
            Ascend through four legendary tiers. The higher you climb, the greater the rewards.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative rounded-2xl p-6 flex flex-col group transition-all duration-400 hover:-translate-y-2"
              style={{
                background: tier.highlighted
                  ? `linear-gradient(160deg, ${tier.color}20, ${tier.color}08, rgba(255,255,255,0.02))`
                  : 'rgba(255,255,255,0.02)',
                border: tier.highlighted
                  ? `1px solid ${tier.color}50`
                  : `1px solid rgba(255,255,255,0.06)`,
                boxShadow: tier.highlighted
                  ? `0 0 40px ${tier.color}20`
                  : 'none',
              }}
            >
              {tier.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                  style={{
                    background: `linear-gradient(90deg, ${tier.color}, #f5d882, ${tier.color})`,
                    color: '#04060f',
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  Most Popular
                </div>
              )}

              <div className="text-4xl mb-4">{tier.icon}</div>
              <h3
                className="text-2xl font-bold mb-1"
                style={{ color: tier.color, fontFamily: "'Cinzel', serif" }}
              >
                {tier.name}
              </h3>
              <p className="text-pearl-300/40 text-xs tracking-widest uppercase mb-6">
                From {tier.minDeposit}
              </p>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-pearl-300/50">Cashback</span>
                  <span className="text-white font-semibold" style={{ fontFamily: "'Cinzel', serif" }}>{tier.cashback}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-pearl-300/50">Withdrawals</span>
                  <span className="text-white font-semibold text-xs">{tier.withdrawalLimit}</span>
                </div>
                <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-pearl-300/50">Manager</span>
                  <span className={tier.personalManager ? 'text-emerald-400' : 'text-pearl-300/30'} style={{ fontFamily: "'Cinzel', serif" }}>
                    {tier.personalManager ? '✓ Yes' : '—'}
                  </span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-pearl-300/60">
                    <span style={{ color: tier.color }} className="mt-0.5">◆</span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-300"
                style={{
                  background: tier.highlighted ? `linear-gradient(135deg, ${tier.color}, #f5d882, ${tier.color})` : 'transparent',
                  color: tier.highlighted ? '#04060f' : tier.color,
                  border: tier.highlighted ? 'none' : `1px solid ${tier.color}40`,
                  fontFamily: "'Cinzel', serif",
                }}
              >
                {tier.highlighted ? 'Join Gold' : `Explore ${tier.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
