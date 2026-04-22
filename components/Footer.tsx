import { Gem } from 'lucide-react';

const footerLinks = {
  Games: ['Golden Dragon', 'Magic City', 'River', 'Fire Phoenix', 'All Games'],
  Company: ['About Us', 'Careers', 'Press', 'Partners', 'Blog'],
  Support: ['Help Center', 'Live Chat', 'Email Support', 'Responsible Gaming', 'FAQ'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'AML Policy', 'Licenses'],
};

export default function Footer() {
  return (
    <footer
      className="relative pt-16 pb-8 px-6 border-t border-gold-DEFAULT/10"
      style={{ background: '#030509' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Top */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-14">
          {/* Brand col */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center">
                <Gem className="w-4 h-4 text-navy-900" />
              </div>
              <span
                className="text-gold-shimmer text-lg font-bold tracking-widest uppercase"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Lucky Pearl
              </span>
            </div>
            <p
              className="text-pearl-300/40 text-base leading-relaxed mb-6 max-w-xs"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              The premier online gaming destination where legends are made and fortunes are written. Play responsibly.
            </p>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              {['🔒 SSL Secured', '18+ Only', '⚖️ Licensed', '🎯 Fair Play'].map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-1 rounded text-[11px] text-pearl-300/40 border border-pearl-300/10"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                className="text-gold-600 text-xs tracking-[0.3em] uppercase mb-4"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-pearl-300/40 hover:text-gold-400 text-sm transition-colors duration-300"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Responsible gaming banner */}
        <div
          className="rounded-xl p-5 mb-10 flex flex-wrap items-center gap-4"
          style={{
            background: 'rgba(212,175,55,0.04)',
            border: '1px solid rgba(212,175,55,0.12)',
          }}
        >
          <span className="text-2xl">🛡️</span>
          <div className="flex-1">
            <p
              className="text-pearl-200/70 text-sm font-medium"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Play Responsibly
            </p>
            <p className="text-pearl-300/40 text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Gambling should be entertaining. Set limits, take breaks, and seek help if needed.
              Lucky Pearl supports responsible gaming initiatives.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {['GamCare', 'BeGambleAware', 'GamStop'].map((org) => (
              <span
                key={org}
                className="px-3 py-1.5 rounded text-xs text-pearl-300/50 border border-pearl-300/10 hover:text-gold-400 hover:border-gold-600/30 transition-colors cursor-pointer"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {org}
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gold-DEFAULT/20 to-transparent mb-8" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p
            className="text-pearl-300/25 text-xs text-center sm:text-left"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            © 2025 Lucky Pearl Gaming. All rights reserved. Licensed and regulated.
            Must be 18 or older to play.
          </p>
          <div className="flex items-center gap-4">
            {['Visa', 'MC', 'Crypto', 'USDT'].map((pay) => (
              <span key={pay} className="text-pearl-300/25 text-xs" style={{ fontFamily: "'Cinzel', serif" }}>
                {pay}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
