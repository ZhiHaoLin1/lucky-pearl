import Link from 'next/link';
import { Gem, ArrowLeft, Users, Zap, Trophy, Star } from 'lucide-react';
import type { Metadata } from 'next';

const gameData: Record<string, {
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  longDescription: string;
  rtp: string;
  minBet: string;
  maxBet: string;
  volatility: string;
  jackpot: string;
  players: string;
  reels: string;
  paylines: string;
  gradient: string;
  glowColor: string;
  iconEmoji: string;
  accentColor: string;
  features: Array<{ title: string; description: string; icon: string }>;
  howToPlay: string[];
}> = {
  'golden-dragon': {
    name: 'Golden Dragon',
    subtitle: '黄金龙',
    tagline: 'Legend of the Dragon Emperor',
    description: 'Enter the imperial palace of the Dragon Emperor.',
    longDescription: 'Deep within the imperial palace, a sleeping dragon guards mountains of gold. Golden Dragon is a cascading 5x5 slot where winning symbols vanish, replaced by new ones falling from above — chains of wins replicating endlessly. The Dragon Wild breathes fire across entire reels, while the Emperor Free Spins mode awards 15 free games with a guaranteed multiplier of up to 50x.',
    rtp: '96.8%',
    minBet: '$0.25',
    maxBet: '$500',
    volatility: 'High',
    jackpot: '$1,240,000',
    players: '3,241',
    reels: '5x5 Cascade',
    paylines: '50 Ways',
    gradient: 'linear-gradient(135deg, #7a2d00 0%, #c45a00 30%, #e8960a 60%, #f5c842 100%)',
    glowColor: 'rgba(228, 130, 20, 0.4)',
    iconEmoji: '🐉',
    accentColor: '#f5c842',
    features: [
      { title: 'Dragon Wild', description: 'The Dragon Wild covers full reels, transforming every adjacent symbol into a wild for massive chain wins.', icon: '🔥' },
      { title: 'Emperor Free Spins', description: '15 free games awarded when 3+ scatter pearls land. All wins during free spins are multiplied up to 50x.', icon: '⚡' },
      { title: 'Cascade Mechanic', description: 'Winning symbols explode and new ones cascade down — a single spin can trigger dozens of consecutive wins.', icon: '💫' },
      { title: 'Dragon Hoard Jackpot', description: 'Fill the Dragon Hoard meter with 6 consecutive wins to unlock the grand jackpot prize pool.', icon: '👑' },
    ],
    howToPlay: [
      'Choose your bet amount from $0.25 to $500 per spin',
      'Click Spin and watch the 5x5 grid explode into life',
      'Matching symbols in clusters of 5+ pay out and cascade away',
      'The Dragon Wild appears randomly to ignite multiplied wins',
      'Land 3 Pearl Scatters anywhere to trigger Emperor Free Spins',
    ],
  },
  'magic-city': {
    name: 'Magic City',
    subtitle: 'Neon Paradise',
    tagline: 'The City That Never Sleeps',
    description: 'Neon signs flicker across a rain-drenched metropolis.',
    longDescription: 'Rain streaks down neon-lit windows as the city pulses with electric energy. Magic City is a 5-reel, 40-payline urban fantasy slot where every block hides a bonus. The Cityscape expands with each win, unlocking new districts packed with wilds and multipliers. When midnight strikes, the After Midnight Bonus transforms the entire city into a wild-covered jackpot playground.',
    rtp: '95.5%',
    minBet: '$0.10',
    maxBet: '$250',
    volatility: 'Medium',
    jackpot: '$890,000',
    players: '2,108',
    reels: '5x4 Grid',
    paylines: '40 Paylines',
    gradient: 'linear-gradient(135deg, #0a0a2e 0%, #1a0a3e 30%, #3d1060 60%, #c026d3 100%)',
    glowColor: 'rgba(192, 38, 211, 0.4)',
    iconEmoji: '🏙️',
    accentColor: '#e879f9',
    features: [
      { title: 'Neon Wild Respins', description: 'Neon sign wilds lock in place and trigger free respins until no new wilds appear.', icon: '⚡' },
      { title: 'City Lights Multiplier', description: 'Each consecutive win increases the city lights multiplier up to 10x.', icon: '💡' },
      { title: 'After Midnight Bonus', description: 'Triggered randomly in the base game — the city goes dark and 15 wild lights illuminate for massive wins.', icon: '🌃' },
      { title: 'District Unlock', description: 'Explore 4 city districts as you play — each district unlocks a unique bonus feature.', icon: '🗺️' },
    ],
    howToPlay: [
      'Set your bet from $0.10 to $250 and explore the city',
      'Match symbols across 40 paylines on the 5x4 grid',
      'Neon Wilds substitute for all symbols except scatters',
      'Collect Scatter Signs to unlock City Free Spins mode',
      'Stack the City Lights multiplier for electrifying payouts',
    ],
  },
  'river': {
    name: 'River',
    subtitle: '福河',
    tagline: 'Where Riches Flow Eternal',
    description: 'Follow the sacred river through jade valleys and ancient temples.',
    longDescription: 'A sacred river winds through jade mountains where ancient temples guard the secrets of eternal fortune. River is our highest-RTP game at 97.2%, built for players who appreciate consistent, flowing wins. Lotus flowers bloom across the reels, multiplying wins up to 20x, while the Temple Free Spins mode offers 20 free games with an expanding lotus wild that fills entire reels with fortune.',
    rtp: '97.2%',
    minBet: '$0.20',
    maxBet: '$400',
    volatility: 'Low',
    jackpot: '$650,000',
    players: '1,876',
    reels: '5x3 Classic',
    paylines: '243 Ways',
    gradient: 'linear-gradient(135deg, #003322 0%, #005c3a 30%, #0f8c5a 60%, #34d399 100%)',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    iconEmoji: '🌊',
    accentColor: '#34d399',
    features: [
      { title: 'Lotus Wild Bloom', description: 'Lotus wilds expand vertically to cover full reels, multiplying all wins by up to 20x.', icon: '🌸' },
      { title: 'River Flow Respins', description: 'Flowing symbol groups drift into optimal positions during a respin, maximizing your win potential.', icon: '🌊' },
      { title: 'Temple Free Spins', description: 'Enter the Sacred Temple for 20 free spins with an ever-expanding lotus wild and guaranteed multipliers.', icon: '⛩️' },
      { title: 'Fortune Fish Scatter', description: 'Golden koi fish scatters pay anywhere and trigger bonus rounds regardless of payline position.', icon: '🐟' },
    ],
    howToPlay: [
      'Bet between $0.20 and $400 — River rewards patient play',
      'Wins pay across 243 ways-to-win on the 5x3 grid',
      'Lotus Wilds randomly bloom on any reel',
      'Collect 3 Golden Koi scatters to enter the Temple',
      'Enjoy consistent, flowing wins with our best 97.2% RTP',
    ],
  },
  'fire-phoenix': {
    name: 'Fire Phoenix',
    subtitle: '火凤凰',
    tagline: 'Rise from the Ashes, Win the Blaze',
    description: 'The immortal phoenix soars through columns of flame.',
    longDescription: 'The immortal phoenix cannot be destroyed — only reborn, stronger and more glorious with each resurrection. Fire Phoenix is our most volatile and highest-jackpot game, with a 100x Inferno Multiplier that can transform a single spin into a life-changing moment. The Phoenix Respin mechanic gives you additional chances after every near-miss, and the Rebirth Jackpot triggers when the phoenix is finally reborn at full flame.',
    rtp: '96.1%',
    minBet: '$0.50',
    maxBet: '$1,000',
    volatility: 'Very High',
    jackpot: '$2,100,000',
    players: '4,522',
    reels: '6x4 Inferno',
    paylines: '4,096 Ways',
    gradient: 'linear-gradient(135deg, #3d0000 0%, #8b0000 30%, #dc2626 60%, #ff6b35 100%)',
    glowColor: 'rgba(220, 38, 38, 0.5)',
    iconEmoji: '🔥',
    accentColor: '#ff6b35',
    features: [
      { title: 'Phoenix Respin', description: 'After any non-winning spin, the phoenix ignites and triggers a free respin with 2 guaranteed wilds.', icon: '♻️' },
      { title: 'Inferno Multiplier x100', description: 'The Inferno Multiplier builds with consecutive wins, reaching a maximum of 100x for catastrophic payouts.', icon: '💥' },
      { title: 'Rebirth Jackpot', description: 'When the phoenix meter fills, the bird is reborn — triggering the Grand Rebirth Jackpot of up to $2.1M.', icon: '🏆' },
      { title: 'Flame Scatter', description: 'Flame scatters ignite 20 free games with a persistent multiplier that never resets during free spins.', icon: '🔥' },
    ],
    howToPlay: [
      'For high rollers: bet up to $1,000 per spin across 4,096 ways',
      'Build the phoenix meter with consecutive wins',
      'Phoenix Respin fires automatically after non-winning spins',
      'The Inferno Multiplier stacks — do not let it reset',
      'Fill the Rebirth meter to claim the Grand Jackpot',
    ],
  },
};

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const game = gameData[params.slug];
  if (!game) return { title: 'Game Not Found — Lucky Pearl' };
  return {
    title: `${game.name} — Lucky Pearl Gaming`,
    description: game.longDescription.slice(0, 155),
  };
}

export async function generateStaticParams() {
  return Object.keys(gameData).map((slug) => ({ slug }));
}

export default function GamePage({ params }: { params: Params }) {
  const game = gameData[params.slug];
  const readableFont = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gold-DEFAULT mb-4" style={{ fontFamily: readableFont }}>
            Game Not Found
          </h1>
          <Link href="/" className="text-pearl-300/50 hover:text-gold-400 transition-colors">
            ← Return to Lucky Pearl
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Sticky nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 bg-navy-900/95 backdrop-blur-md border-b border-gold-600/20"
        style={{ fontFamily: readableFont }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center">
              <Gem className="w-4 h-4 text-navy-900" />
            </div>
            <span className="text-gold-shimmer text-lg font-bold tracking-widest uppercase">Lucky Pearl</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-pearl-300/50 hover:text-gold-400 text-xs tracking-widest uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Games
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="pt-20 relative overflow-hidden"
        style={{ minHeight: 480 }}
      >
        <div className="absolute inset-0" style={{ background: game.gradient, opacity: 0.3 }} />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, #04060f 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${game.glowColor} 0%, transparent 60%)`,
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          <div
            className="text-8xl mb-6 inline-block"
            style={{ filter: `drop-shadow(0 0 40px ${game.accentColor})` }}
          >
            {game.iconEmoji}
          </div>
          <h1
            className="text-5xl sm:text-6xl font-bold text-white mb-2"
            style={{ fontFamily: readableFont }}
          >
            {game.name}
          </h1>
          <p
            className="text-lg tracking-[0.3em] mb-2"
            style={{ color: game.accentColor, fontFamily: readableFont }}
          >
            {game.subtitle}
          </p>
          <p
            className="text-pearl-300/50 text-xl italic mb-10"
            style={{ fontFamily: readableFont }}
          >
            {game.tagline}
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {[
              { icon: <Star className="w-4 h-4" />, label: 'RTP', value: game.rtp },
              { icon: <Zap className="w-4 h-4" />, label: 'Volatility', value: game.volatility },
              { icon: <Trophy className="w-4 h-4" />, label: 'Jackpot', value: game.jackpot },
              { icon: <Users className="w-4 h-4" />, label: 'Playing Now', value: game.players },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${game.accentColor}30`,
                }}
              >
                <span style={{ color: game.accentColor }}>{stat.icon}</span>
                <span className="text-pearl-300/50 text-xs">{stat.label}:</span>
                <span className="text-white text-sm font-bold" style={{ fontFamily: readableFont }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Play button */}
          <button
            className="px-12 py-5 text-sm tracking-[0.3em] uppercase font-bold text-navy-900 rounded-xl btn-press"
            style={{
              background: `linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}aa)`,
              boxShadow: `0 0 40px ${game.glowColor}`,
              fontFamily: readableFont,
            }}
          >
            Play {game.name}
          </button>
          <p className="text-pearl-300/30 text-xs mt-3" style={{ fontFamily: readableFont }}>
            Try for free or play for real money
          </p>
        </div>
      </section>

      {/* Details */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: description + how to play */}
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            <div>
              <h2
                className="text-2xl font-bold text-white mb-4"
                style={{ fontFamily: readableFont }}
              >
                About the Game
              </h2>
              <p
                className="text-pearl-300/60 text-lg leading-relaxed"
                style={{ fontFamily: readableFont }}
              >
                {game.longDescription}
              </p>
            </div>

            {/* Features */}
            <div>
              <h2
                className="text-2xl font-bold text-white mb-6"
                style={{ fontFamily: readableFont }}
              >
                Game Features
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {game.features.map((feature) => (
                  <div
                    key={feature.title}
                    className="p-5 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${game.accentColor}20`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <h3 className="text-white font-bold text-sm" style={{ fontFamily: readableFont }}>
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-pearl-300/50 text-sm leading-relaxed" style={{ fontFamily: readableFont }}>
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* How to play */}
            <div>
              <h2
                className="text-2xl font-bold text-white mb-6"
                style={{ fontFamily: readableFont }}
              >
                How to Play
              </h2>
              <ol className="space-y-4">
                {game.howToPlay.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-navy-900"
                      style={{
                        background: `linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}80)`,
                        fontFamily: readableFont,
                      }}
                    >
                      {i + 1}
                    </span>
                    <p
                      className="text-pearl-300/60 text-base mt-1 leading-relaxed"
                      style={{ fontFamily: readableFont }}
                    >
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right: game specs + play card */}
          <div className="space-y-6">
            {/* Play card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: `linear-gradient(160deg, ${game.accentColor}15, rgba(255,255,255,0.03))`,
                border: `1px solid ${game.accentColor}30`,
                boxShadow: `0 0 40px ${game.glowColor}`,
              }}
            >
              <p className="text-pearl-300/40 text-xs tracking-[0.3em] uppercase mb-1" style={{ fontFamily: readableFont }}>
                Grand Jackpot
              </p>
              <p
                className="text-3xl font-black mb-6"
                style={{ color: game.accentColor, fontFamily: readableFont }}
              >
                {game.jackpot}
              </p>
              <button
                className="w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase text-navy-900 mb-3 btn-press"
                style={{
                  background: `linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}aa)`,
                  fontFamily: readableFont,
                }}
              >
                Play for Real
              </button>
              <button
                className="w-full py-4 rounded-xl text-sm font-bold tracking-widest uppercase transition-all duration-300"
                style={{
                  border: `1px solid ${game.accentColor}40`,
                  color: game.accentColor,
                  background: 'transparent',
                  fontFamily: readableFont,
                }}
              >
                Try Demo
              </button>
            </div>

            {/* Game specs */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h3 className="text-white font-bold mb-5 text-sm tracking-widest uppercase" style={{ fontFamily: readableFont }}>
                Game Specs
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'RTP', value: game.rtp },
                  { label: 'Min Bet', value: game.minBet },
                  { label: 'Max Bet', value: game.maxBet },
                  { label: 'Volatility', value: game.volatility },
                  { label: 'Reels', value: game.reels },
                  { label: 'Paylines', value: game.paylines },
                  { label: 'Players Online', value: game.players },
                ].map((spec) => (
                  <div key={spec.label} className="flex justify-between border-b border-white/5 pb-3">
                    <span className="text-pearl-300/40 text-sm">{spec.label}</span>
                    <span className="text-white text-sm font-semibold" style={{ fontFamily: readableFont }}>
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to games */}
      <div className="text-center pb-16 px-6">
        <Link
          href="/#games"
          className="inline-flex items-center gap-2 text-pearl-300/40 hover:text-gold-400 text-sm tracking-widest uppercase transition-colors"
          style={{ fontFamily: readableFont }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Games
        </Link>
      </div>

      {/* Footer note */}
      <div className="text-center pb-8 px-6 border-t border-gold-DEFAULT/10 pt-8">
        <p className="text-pearl-300/20 text-xs" style={{ fontFamily: readableFont }}>
          © 2025 Lucky Pearl Gaming. Must be 18+ to play. Please gamble responsibly.
        </p>
      </div>
    </div>
  );
}
