const tiers = [
  {
    name: 'Pearl',
    icon: '🪬',
    color: '#b5a285',
    depositLine: 'Lifetime deposits of $0+',
    withdrawalLimit: '$100/day',
    features: ['Entry tier for every member', 'Daily bonus on all games'],
  },
  {
    name: 'Jade',
    icon: '💚',
    color: '#34d399',
    depositLine: 'Lifetime deposits of $2,500+',
    withdrawalLimit: '$200/day',
    features: ['Referral bonus', 'Birthday gift', 'Priority text support'],
  },
  {
    name: 'Gold',
    icon: '⚜️',
    color: '#d4af37',
    depositLine: 'Lifetime deposits of $10,000+',
    withdrawalLimit: '$300/day',
    features: ['Major holiday bonus', 'Extended cashout hours starting 9AM'],
    highlighted: true,
  },
  {
    name: 'Dragon',
    icon: '🐉',
    color: '#ff6b35',
    depositLine: 'Lifetime deposits of $25,000+',
    withdrawalLimit: '$500/day',
    features: ['Request new game platforms', 'No-fee deposit day once a month'],
  },
];

export default function VIPSection() {
  return (
    <section id="vip" className="py-20 sm:py-28 px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, rgba(17,31,56,0.9) 0%, #04060f 60%)`,
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-gold-500 text-sm font-semibold tracking-wide uppercase mb-3">
            Withdrawal limits by loyalty
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gold-shimmer mb-4 leading-tight">
            The VIP Circle
          </h2>
          <p className="text-pearl-200/75 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Your tier is based on <strong className="text-pearl-100">total lifetime deposits</strong> with us. The more you have deposited over time, the higher your <strong className="text-pearl-100">daily withdrawal</strong> limit — from $100 up to $500 per day.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative rounded-2xl p-6 sm:p-7 flex flex-col transition-all duration-300 hover:-translate-y-1"
              style={{
                background: tier.highlighted
                  ? `linear-gradient(160deg, ${tier.color}18, rgba(255,255,255,0.03))`
                  : 'rgba(255,255,255,0.02)',
                border: tier.highlighted
                  ? `2px solid ${tier.color}55`
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: tier.highlighted ? `0 0 32px ${tier.color}18` : 'none',
              }}
            >
              {tier.highlighted && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-gold-600 to-gold-300 text-navy-900"
                >
                  Most popular
                </div>
              )}

              <div className="text-4xl mb-3">{tier.icon}</div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: tier.color }}>
                {tier.name}
              </h3>
              <p className="text-pearl-300/70 text-sm mb-5 leading-relaxed">{tier.depositLine}</p>

              <div className="space-y-3 mb-6 flex-1 border-t border-white/10 pt-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center text-sm border-b border-white/5 pb-3">
                  <span className="text-pearl-300/60">Daily withdrawal</span>
                  <span className="text-white font-bold text-base">{tier.withdrawalLimit}</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-pearl-200/80 leading-relaxed">
                    <span style={{ color: tier.color }} className="shrink-0 mt-0.5">
                      ◆
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="w-full py-3 rounded-lg text-sm font-bold tracking-wide transition-all duration-300"
                style={{
                  background: tier.highlighted ? `linear-gradient(135deg, ${tier.color}, #f5d882, ${tier.color})` : 'transparent',
                  color: tier.highlighted ? '#04060f' : tier.color,
                  border: tier.highlighted ? 'none' : `1px solid ${tier.color}45`,
                }}
              >
                {`Explore ${tier.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
