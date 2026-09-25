import { ExternalLink } from 'lucide-react';

export default function HowToDepositCard({ isGoldOrAbove }: { isGoldOrAbove: boolean }) {
  return (
    <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
      <h2 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
        How to Deposit
      </h2>
      <p className="text-pearl-300/60 text-sm mb-5">
        Send your deposit using any of the methods below. Include your name and which game in the
        payment note so we can add it to your account quickly.
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-900/60 px-4 py-3.5">
          <span className="text-2xl shrink-0">📲</span>
          <div>
            <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Venmo</p>
            <p className="text-pearl-100 font-semibold text-sm">@yiranstudios</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-900/60 px-4 py-3.5">
          <span className="text-2xl shrink-0">💸</span>
          <div>
            <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Zelle</p>
            <p className="text-pearl-100 font-semibold text-sm break-all">belt9279@gmail.com</p>
          </div>
        </div>

        <a
          href="https://cashapp-pay-p61p.onrender.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-900/60 px-4 py-3.5 hover:border-gold-400/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl shrink-0">💵</span>
            <div>
              <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Cash App</p>
              <p className="text-pearl-100 font-semibold text-sm">Pay with Cash App</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-gold-400 shrink-0" />
        </a>

        {isGoldOrAbove ? (
          <a
            href="https://cashapp-pay-p61p.onrender.com/card"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-gold-500/30 bg-gold-500/5 px-4 py-3.5 hover:border-gold-400/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">💳</span>
              <div>
                <p className="text-gold-400/80 text-xs uppercase tracking-wider">Card</p>
                <p className="text-pearl-100 font-semibold text-sm">Pay with Card</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gold-400 shrink-0" />
          </a>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-navy-900/30 px-4 py-3.5 opacity-60">
            <span className="text-2xl shrink-0">💳</span>
            <div>
              <p className="text-pearl-300/40 text-xs uppercase tracking-wider">Card</p>
              <p className="text-pearl-300/50 font-semibold text-sm">Unlocks at Gold tier</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
