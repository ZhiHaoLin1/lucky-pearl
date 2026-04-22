'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Game {
  slug: string;
  name: string;
  subtitle: string;
  tagline: string;
  description: string;
  rtp: string;
  minBet: string;
  maxBet: string;
  volatility: 'Low' | 'Medium' | 'High' | 'Very High';
  jackpot: string;
  players: string;
  badge?: string;
  gradient: string;
  glowColor: string;
  iconEmoji: string;
  accentColor: string;
  bgPattern: string;
  features: string[];
}

const games: Game[] = [
  {
    slug: 'golden-dragon',
    name: 'Golden Dragon',
    subtitle: '黄金龙',
    tagline: 'Legend of the Dragon Emperor',
    description:
      'Enter the imperial palace of the Dragon Emperor. Ancient wilds breathe fire across cascading reels as the mythical beast\'s treasure unlocks massive multiplied jackpots.',
    rtp: '96.8%',
    minBet: '$0.25',
    maxBet: '$500',
    volatility: 'High',
    jackpot: '$1,240,000',
    players: '3,241',
    badge: '🔥 HOT',
    gradient: 'linear-gradient(135deg, #7a2d00 0%, #c45a00 30%, #e8960a 60%, #f5c842 100%)',
    glowColor: 'rgba(228, 130, 20, 0.6)',
    iconEmoji: '🐉',
    accentColor: '#f5c842',
    bgPattern: `radial-gradient(ellipse at 20% 80%, rgba(180,80,0,0.4) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(245,200,66,0.3) 0%, transparent 50%)`,
    features: ['Dragon Wild Multiplier', 'Emperor Free Spins', '5x5 Cascade Reels'],
  },
  {
    slug: 'magic-city',
    name: 'Magic City',
    subtitle: 'Neon Paradise',
    tagline: 'The City That Never Sleeps',
    description:
      'Neon signs flicker across a rain-drenched metropolis where every spin lights up the skyline. Urban wilds and cityscape bonuses make every night electric.',
    rtp: '95.5%',
    minBet: '$0.10',
    maxBet: '$250',
    volatility: 'Medium',
    jackpot: '$890,000',
    players: '2,108',
    badge: '⚡ POPULAR',
    gradient: 'linear-gradient(135deg, #0a0a2e 0%, #1a0a3e 30%, #3d1060 60%, #c026d3 100%)',
    glowColor: 'rgba(192, 38, 211, 0.6)',
    iconEmoji: '🏙️',
    accentColor: '#e879f9',
    bgPattern: `radial-gradient(ellipse at 20% 80%, rgba(76,0,130,0.5) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(192,38,211,0.4) 0%, transparent 50%)`,
    features: ['Neon Wild Respins', 'City Lights Multiplier', 'After Midnight Bonus'],
  },
  {
    slug: 'river',
    name: 'River',
    subtitle: '福河',
    tagline: 'Where Riches Flow Eternal',
    description:
      'Follow the sacred river through jade valleys and ancient temples. Serene waters conceal immense fortunes — lotus wilds bloom into free spins cascading like rushing currents.',
    rtp: '97.2%',
    minBet: '$0.20',
    maxBet: '$400',
    volatility: 'Low',
    jackpot: '$650,000',
    players: '1,876',
    badge: '💎 TOP RTP',
    gradient: 'linear-gradient(135deg, #003322 0%, #005c3a 30%, #0f8c5a 60%, #34d399 100%)',
    glowColor: 'rgba(16, 185, 129, 0.6)',
    iconEmoji: '🌊',
    accentColor: '#34d399',
    bgPattern: `radial-gradient(ellipse at 20% 80%, rgba(0,80,60,0.5) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(52,211,153,0.3) 0%, transparent 50%)`,
    features: ['Lotus Wild Bloom', 'River Flow Free Spins', 'Sacred Temple Bonus'],
  },
  {
    slug: 'fire-phoenix',
    name: 'Fire Phoenix',
    subtitle: '火凤凰',
    tagline: 'Rise from the Ashes, Win the Blaze',
    description:
      'The immortal phoenix soars through columns of flame, reborn with every spin. Each respin ignites new wins as the mythical bird\'s resurrection triggers explosive jackpot multipliers.',
    rtp: '96.1%',
    minBet: '$0.50',
    maxBet: '$1,000',
    volatility: 'Very High',
    jackpot: '$2,100,000',
    players: '4,522',
    badge: '👑 JACKPOT',
    gradient: 'linear-gradient(135deg, #3d0000 0%, #8b0000 30%, #dc2626 60%, #ff6b35 100%)',
    glowColor: 'rgba(220, 38, 38, 0.7)',
    iconEmoji: '🔥',
    accentColor: '#ff6b35',
    bgPattern: `radial-gradient(ellipse at 20% 80%, rgba(139,0,0,0.5) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(255,107,53,0.4) 0%, transparent 50%)`,
    features: ['Phoenix Respin', 'Inferno Multiplier x100', 'Rebirth Jackpot'],
  },
];

const volatilityColors: Record<Game['volatility'], string> = {
  Low: 'text-emerald-400',
  Medium: 'text-yellow-400',
  High: 'text-orange-400',
  'Very High': 'text-red-400',
};

export default function GamesSection() {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  return (
    <section id="games" className="py-24 px-6 relative">
      {/* Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(17,31,56,0.8) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <p
            className="text-gold-600 text-xs tracking-[0.5em] uppercase mb-4"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Featured Games
          </p>
          <h2
            className="text-4xl sm:text-5xl font-bold text-gold-shimmer mb-4"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Choose Your Destiny
          </h2>
          <div className="ornament-divider max-w-sm mx-auto">
            <span className="text-gold-600 text-sm">◆</span>
          </div>
          <p
            className="text-pearl-200/50 text-lg mt-4 max-w-xl mx-auto"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}
          >
            Four legendary realms. Infinite fortunes. Your saga begins now.
          </p>
        </div>

        {/* Game grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {games.map((game) => {
            const isHovered = hoveredSlug === game.slug;

            return (
              <Link href={`/games/${game.slug}`} key={game.slug}>
                <div
                  className="relative rounded-2xl overflow-hidden cursor-pointer group game-card-glow"
                  style={{
                    minHeight: 320,
                    boxShadow: isHovered
                      ? `0 20px 60px ${game.glowColor}, 0 0 0 1px ${game.accentColor}40`
                      : `0 8px 30px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)`,
                    transform: isHovered ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
                    transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  }}
                  onMouseEnter={() => setHoveredSlug(game.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                >
                  {/* Background gradient */}
                  <div
                    className="absolute inset-0"
                    style={{ background: game.gradient }}
                  />
                  {/* Pattern overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: game.bgPattern }}
                  />
                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-navy-900/30" />

                  {/* Shimmer on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)`,
                    }}
                  />

                  {/* Card content */}
                  <div className="relative z-10 p-7 flex flex-col h-full" style={{ minHeight: 320 }}>
                    {/* Top row: emoji + badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-5xl" style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.3))' }}>
                        {game.iconEmoji}
                      </div>
                      {game.badge && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase"
                          style={{
                            background: 'rgba(0,0,0,0.4)',
                            border: `1px solid ${game.accentColor}60`,
                            color: game.accentColor,
                            fontFamily: "'Cinzel', serif",
                          }}
                        >
                          {game.badge}
                        </span>
                      )}
                    </div>

                    {/* Game name */}
                    <div className="mb-3">
                      <h3
                        className="text-2xl font-bold text-white leading-tight"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        {game.name}
                      </h3>
                      <p className="text-sm opacity-60 tracking-[0.2em]">{game.subtitle}</p>
                      <p
                        className="text-xs mt-1 opacity-80 tracking-widest uppercase"
                        style={{ color: game.accentColor, fontFamily: "'Cinzel', serif" }}
                      >
                        {game.tagline}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="text-white/60 text-sm leading-relaxed mb-5 flex-1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem' }}>
                      {game.description}
                    </p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {game.features.map((f) => (
                        <span
                          key={f}
                          className="px-2.5 py-1 rounded text-xs"
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            border: `1px solid ${game.accentColor}30`,
                            color: game.accentColor,
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3 mb-5 pt-4 border-t border-white/10">
                      {[
                        { label: 'RTP', value: game.rtp },
                        { label: 'Min Bet', value: game.minBet },
                        { label: 'Max Bet', value: game.maxBet },
                        { label: 'Volatility', value: game.volatility, className: volatilityColors[game.volatility] },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center">
                          <div className={`text-xs font-bold ${stat.className || 'text-white'}`} style={{ fontFamily: "'Cinzel', serif" }}>
                            {stat.value}
                          </div>
                          <div className="text-white/40 text-[10px] tracking-wider uppercase mt-0.5">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom: jackpot + play button */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Jackpot</p>
                        <p className="text-lg font-bold" style={{ color: game.accentColor, fontFamily: "'Cinzel', serif" }}>
                          {game.jackpot}
                        </p>
                        <p className="text-white/30 text-[10px]">{game.players} playing now</p>
                      </div>
                      <button
                        className="px-6 py-3 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 btn-press"
                        style={{
                          background: isHovered
                            ? game.accentColor
                            : 'rgba(255,255,255,0.1)',
                          color: isHovered ? '#04060f' : game.accentColor,
                          border: `1px solid ${game.accentColor}60`,
                          fontFamily: "'Cinzel', serif",
                        }}
                      >
                        Play Now
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14">
          <p className="text-pearl-300/40 text-sm tracking-widest mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
            500+ more games in our collection
          </p>
          <button
            className="px-8 py-3 border border-gold-600/30 rounded-full text-gold-400 text-xs tracking-[0.3em] uppercase hover:border-gold-400 hover:bg-gold-DEFAULT/5 transition-all duration-300"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Browse All Games
          </button>
        </div>
      </div>
    </section>
  );
}
