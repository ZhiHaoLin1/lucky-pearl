import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Gem, Mail, Phone, CalendarDays } from 'lucide-react';
import { db, ensureSchema } from '@/lib/db';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';
import { gamePlayUrls } from '@/lib/gamePlayUrls';
import LogoutButton from './LogoutButton';

export const dynamic = 'force-dynamic';

const games: Array<{ slug: keyof typeof gamePlayUrls; name: string; emoji: string; accentColor: string }> = [
  { slug: 'golden-dragon', name: 'Golden Dragon', emoji: '🐉', accentColor: '#f5c842' },
  { slug: 'magic-city', name: 'Magic City', emoji: '🏙️', accentColor: '#e879f9' },
  { slug: 'river', name: 'River', emoji: '🌊', accentColor: '#34d399' },
  { slug: 'fire-phoenix', name: 'Fire Phoenix', emoji: '🔥', accentColor: '#ff6b35' },
];

export default async function DashboardPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;
  if (!userId) {
    redirect('/');
  }

  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT full_name, email, phone, preferred_game, created_at FROM users WHERE id = ?',
    args: [userId],
  });
  const user = result.rows[0];
  if (!user) {
    redirect('/');
  }

  const memberSince = new Date(String(user.created_at).replace(' ', 'T') + 'Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main
      className="min-h-screen pb-20"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #111f38 0%, #070c1a 40%, #04060f 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        <div className="flex items-center justify-between gap-4 mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-gold-300 to-gold-700 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              <Gem className="w-4 h-4 sm:w-5 sm:h-5 text-navy-900" />
            </div>
            <span className="text-gold-shimmer text-lg sm:text-xl font-bold">Lucky Pearl</span>
          </Link>
          <LogoutButton />
        </div>

        <div className="mb-10">
          <p
            className="text-gold-600 text-xs tracking-[0.5em] uppercase mb-3"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Your Account
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold text-gold-shimmer mb-2"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            Welcome back, {String(user.full_name).split(' ')[0]}
          </h1>
          <p className="text-pearl-300/60 text-base">Manage your account and jump straight into your games.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-1 rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
            <h2
              className="text-lg font-bold text-white mb-5"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Profile
            </h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" />
                <div>
                  <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Email</p>
                  <p className="text-pearl-100 break-all">{String(user.email)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" />
                <div>
                  <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Phone</p>
                  <p className="text-pearl-100">{String(user.phone)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" />
                <div>
                  <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Member since</p>
                  <p className="text-pearl-100">{memberSince}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
            <h2
              className="text-lg font-bold text-white mb-5"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Your Games
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {games.map((game) => (
                <div
                  key={game.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-900/60 px-4 py-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{game.emoji}</span>
                    <div className="min-w-0">
                      <Link
                        href={`/games/${game.slug}`}
                        className="text-pearl-100 font-semibold text-sm hover:text-gold-400 transition-colors truncate block"
                      >
                        {game.name}
                      </Link>
                      {String(user.preferred_game) === game.name && (
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: game.accentColor }}>
                          Your favorite
                        </span>
                      )}
                    </div>
                  </div>
                  <a
                    href={gamePlayUrls[game.slug]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 btn-press"
                    style={{
                      background: `${game.accentColor}20`,
                      color: game.accentColor,
                      border: `1px solid ${game.accentColor}60`,
                    }}
                  >
                    Play
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gold-600/25 bg-navy-800/40 p-6 text-center">
          <p className="text-pearl-300/70 text-sm">
            Need a redeem, a deposit, or help with your account? Reach our team from the{' '}
            <a href="/#support" className="text-gold-400 hover:text-gold-300 underline underline-offset-2">
              Support section
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
