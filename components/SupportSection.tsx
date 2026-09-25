const supportItems = [
  {
    icon: '💳',
    title: 'Deposits 24/7',
    description: 'Deposits are accepted any time, day or night, so you can fund your account whenever it is convenient.',
  },
  {
    icon: '📱',
    title: 'Text or Call Us',
    description: 'Please text first so we know to expect your call. Available daily from 10:00 AM to 10:00 PM EST.',
    phone: '407-796-8311',
  },
  {
    icon: '🔐',
    title: 'Secure & Licensed',
    description: 'Fully licensed and SSL-encrypted. Your data and winnings are protected by enterprise-grade security.',
  },
  {
    icon: '⚡',
    title: 'Withdrawals 10AM-10PM EST',
    description: 'Withdrawal reviews and payout processing are handled daily between 10:00 AM and 10:00 PM EST.',
  },
];

export default function SupportSection() {
  return (
    <section id="support" className="py-20 px-6 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #070c1a 0%, #04060f 100%)',
        }}
      />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold text-gold-shimmer mb-3"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Always Here For You
          </h2>
          <p
            className="text-pearl-300/40 text-base"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}
          >
            World-class support for world-class players
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {supportItems.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-xl text-center hover:scale-105 transition-all duration-300 cursor-default group"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(212,175,55,0.08)',
              }}
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
              <h3
                className="text-white font-bold text-base mb-2"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {item.title}
              </h3>
              <p
                className="text-pearl-300/40 text-sm leading-relaxed"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {item.description}
              </p>
              {item.phone && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <a
                    href={`sms:+1${item.phone.replace(/[^0-9]/g, '')}`}
                    className="text-gold-400 hover:text-gold-300 font-bold text-sm transition-colors"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    Text {item.phone}
                  </a>
                  <span className="text-pearl-300/20">|</span>
                  <a
                    href={`tel:+1${item.phone.replace(/[^0-9]/g, '')}`}
                    className="text-pearl-300/50 hover:text-pearl-100 font-bold text-sm transition-colors"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    Call
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
