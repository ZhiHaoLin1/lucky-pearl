const processors = [
  { name: 'Venmo', icon: '📲', highlight: true },
  { name: 'Zelle', icon: '💸', highlight: true },
  { name: 'Cash App', icon: '💵', highlight: false },
  { name: 'Cards', icon: '💳', highlight: false },
  { name: 'Apple Pay', icon: '🍎', highlight: false },
];

export default function PaymentProcessorsSection() {
  return (
    <section
      id="payments"
      className="relative border-y border-gold-600/35 bg-gradient-to-b from-[#0a1020] via-navy-900 to-[#060912] py-10 sm:py-14 px-4 sm:px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(212,175,55,0.12),transparent)]" />

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <p className="text-gold-400/90 text-sm sm:text-base font-semibold tracking-wide uppercase mb-2">
          Pay your way — right away
        </p>
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
          Venmo, Zelle, Cash App, cards &amp; Apple Pay
        </h2>
        <p className="text-pearl-200/80 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          We accept the methods you already use. No confusing checkout — just familiar apps and cards for deposits and payouts.
        </p>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
          {processors.map((processor) => (
            <div
              key={processor.name}
              className={`rounded-2xl text-center min-w-[140px] sm:min-w-[160px] flex-1 sm:flex-none max-w-[200px] ${
                processor.highlight ? 'py-6 px-5 sm:py-8 sm:px-6 scale-[1.02]' : 'py-5 px-4 sm:py-6 sm:px-5'
              }`}
              style={{
                background: processor.highlight
                  ? 'linear-gradient(160deg, rgba(212,175,55,0.22), rgba(255,255,255,0.06))'
                  : 'rgba(255,255,255,0.04)',
                border: processor.highlight ? '2px solid rgba(212,175,55,0.55)' : '1px solid rgba(212,175,55,0.2)',
                boxShadow: processor.highlight ? '0 0 40px rgba(212,175,55,0.15)' : 'none',
              }}
            >
              <div className={`mb-2 ${processor.highlight ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}`}>
                {processor.icon}
              </div>
              <p className="text-white font-bold text-lg sm:text-xl tracking-wide">{processor.name}</p>
              {processor.highlight && (
                <p className="text-gold-200/80 text-sm mt-2 font-medium">Popular choice</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
