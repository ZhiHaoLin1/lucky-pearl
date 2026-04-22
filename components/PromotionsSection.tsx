'use client';

const promotions = [
  {
    icon: '🎁',
    title: 'Welcome Bonus',
    value: '200%',
    subtitle: 'Up to $2,000 + 100 Free Spins',
    description: 'New members receive a grand welcome to Lucky Pearl. Your first deposit is doubled, plus 100 free spins on Golden Dragon.',
    tag: 'NEW PLAYERS',
    tagColor: '#f5c842',
    borderColor: 'rgba(212,175,55,0.3)',
  },
  {
    icon: '🔄',
    title: 'Daily Reload',
    value: '50%',
    subtitle: 'Every Day, Every Deposit',
    description: 'Reload your account each day and receive a 50% bonus. The pearls never stop flowing for loyal players.',
    tag: 'DAILY',
    tagColor: '#34d399',
    borderColor: 'rgba(52,211,153,0.3)',
  },
  {
    icon: '👑',
    title: 'VIP Cashback',
    value: '15%',
    subtitle: 'Weekly Cash Returns',
    description: 'Elite members receive up to 15% weekly cashback on net losses. The house always gives back at Lucky Pearl.',
    tag: 'VIP ONLY',
    tagColor: '#e879f9',
    borderColor: 'rgba(232,121,249,0.3)',
  },
  {
    icon: '🏆',
    title: 'Tournament Prizes',
    value: '$50K',
    subtitle: 'Monthly Grand Tournament',
    description: 'Compete in our monthly dragon tournament. Climb the leaderboard across all four game realms to claim legendary prizes.',
    tag: 'MONTHLY',
    tagColor: '#ff6b35',
    borderColor: 'rgba(255,107,53,0.3)',
  },
];

export default function PromotionsSection() {
  return (
    <section
      id="promotions"
      className="py-24 px-6 relative"
      style={{
        background: 'linear-gradient(180deg, #04060f 0%, #070c1a 50%, #04060f 100%)',
      }}
    >
      {/* Decorative line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-DEFAULT/30 to-transparent" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold-600 text-xs tracking-[0.5em] uppercase mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
            Promotions & Rewards
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-gold-shimmer mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
            Pearl Rewards
          </h2>
          <div className="ornament-divider max-w-sm mx-auto">
            <span className="text-gold-600 text-sm">◇</span>
          </div>
        </div>

        {/* Promo grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {promotions.map((promo) => (
            <div
              key={promo.title}
              className="relative rounded-xl p-6 group hover:scale-105 transition-all duration-400 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${promo.borderColor}`,
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${promo.tagColor}10 0%, transparent 70%)`,
                }}
              />

              <div className="relative z-10">
                {/* Tag */}
                <span
                  className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase mb-4"
                  style={{
                    background: `${promo.tagColor}15`,
                    color: promo.tagColor,
                    border: `1px solid ${promo.tagColor}30`,
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  {promo.tag}
                </span>

                <div className="text-3xl mb-3">{promo.icon}</div>

                <div
                  className="text-4xl font-black mb-1"
                  style={{ color: promo.tagColor, fontFamily: "'Cinzel', serif" }}
                >
                  {promo.value}
                </div>

                <h3
                  className="text-white font-bold text-lg mb-1"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {promo.title}
                </h3>
                <p className="text-pearl-300/50 text-sm mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {promo.subtitle}
                </p>
                <p className="text-pearl-300/40 text-sm leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {promo.description}
                </p>

                <button
                  className="mt-5 w-full py-2.5 rounded text-xs font-bold tracking-widest uppercase transition-all duration-300"
                  style={{
                    border: `1px solid ${promo.tagColor}40`,
                    color: promo.tagColor,
                    background: 'transparent',
                    fontFamily: "'Cinzel', serif",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.background = `${promo.tagColor}15`;
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  Claim Offer
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Terms */}
        <p className="text-center text-pearl-300/25 text-xs mt-8 tracking-wider">
          *Terms & conditions apply. Must be 18+ to participate. Please gamble responsibly.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-DEFAULT/20 to-transparent" />
    </section>
  );
}
