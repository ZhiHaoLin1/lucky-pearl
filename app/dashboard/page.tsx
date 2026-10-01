import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Gem, Mail, Phone, CalendarDays } from 'lucide-react';
import { db, ensureSchema } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { gamePlayUrls } from '@/lib/gamePlayUrls';
import { getFinanceSummary } from '@/lib/finance';
import { getNextTier, VIP_TIERS } from '@/lib/vip';
import {
  formatBirthday,
  getActiveBirthdayWindow,
  getActiveHolidayWindow,
  getNextHoliday,
  getBonusProgress,
  type BonusWindow,
} from '@/lib/bonuses';
import VIPSection from '@/components/VIPSection';
import LogoutButton from './LogoutButton';
import InboxClient from './InboxClient';
import DashboardTabs, { type BonusTabEntry } from './DashboardTabs';
import { getEventWindows, listEvents } from '@/lib/events';
import BonusTab from './BonusTab';
import EventsTab, { type EventCard } from './EventsTab';
import BirthdayRow from './BirthdayRow';
import HowToDepositCard from './HowToDepositCard';

export const dynamic = 'force-dynamic';

const games: Array<{ slug: keyof typeof gamePlayUrls; name: string; emoji: string; accentColor: string }> = [
  { slug: 'golden-dragon', name: 'Golden Dragon', emoji: '🐉', accentColor: '#f5c842' },
  { slug: 'magic-city', name: 'Magic City', emoji: '🏙️', accentColor: '#e879f9' },
  { slug: 'river', name: 'River', emoji: '🌊', accentColor: '#34d399' },
  { slug: 'fire-phoenix', name: 'Fire Phoenix', emoji: '🔥', accentColor: '#ff6b35' },
  { slug: 'ultra-thunder', name: 'Ultra Thunder', emoji: '⚡', accentColor: '#60a5fa' },
  { slug: 'dragon-fury', name: 'Dragon Fury', emoji: '🐲', accentColor: '#a855f7' },
];

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/');
  }

  await ensureSchema();

  const messagesResult = await db.execute({
    sql: 'SELECT id, body, sender_admin_id, created_at, read_at FROM messages WHERE user_id = ? ORDER BY created_at ASC',
    args: [user.id],
  });
  const messages = messagesResult.rows.map((row) => ({
    id: String(row.id),
    body: String(row.body),
    senderAdminId: row.sender_admin_id ? String(row.sender_admin_id) : null,
    createdAt: String(row.created_at),
    wasUnread: Boolean(row.sender_admin_id) && !row.read_at,
  }));

  const hasUnread = messages.some((message) => message.wasUnread);
  if (hasUnread) {
    await db.execute({
      sql: "UPDATE messages SET read_at = datetime('now') WHERE user_id = ? AND sender_admin_id IS NOT NULL AND read_at IS NULL",
      args: [user.id],
    });
  }

  const memberSince = new Date(user.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const financeSummary = await getFinanceSummary(user.id);
  const nextTier = getNextTier(financeSummary.tier);
  const goldIndex = VIP_TIERS.findIndex((tier) => tier.name === 'Gold');
  const currentTierIndex = VIP_TIERS.findIndex((tier) => tier.name === financeSummary.tier.name);
  const isGoldOrAbove = currentTierIndex >= goldIndex;
  // Holiday bonus is a Gold perk, birthday bonus a Jade perk (higher tiers keep lower-tier perks).
  const jadeIndex = VIP_TIERS.findIndex((tier) => tier.name === 'Jade');
  const bonusTabs: BonusTabEntry[] = [];
  const addBonusTab = async (key: string, tabLabel: string, window: BonusWindow, heading: string, intro: string) => {
    const progress = await getBonusProgress(user.id, window);
    const endsLabel = new Date(window.endUtc.getTime() - 60 * 60 * 1000).toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const days = Math.round((window.endUtc.getTime() - window.startUtc.getTime()) / (24 * 60 * 60 * 1000));
    const validLabel = days === 7 ? '1 week' : `${days} day${days === 1 ? '' : 's'}`;
    bonusTabs.push({
      key,
      label: tabLabel,
      content: (
        <BonusTab
          emoji={window.emoji}
          heading={heading}
          intro={intro}
          qualifyingDeposits={progress.qualifyingDeposits}
          earnedCents={progress.earnedCents}
          endsLabel={endsLabel}
          perDepositCents={window.perDepositCents}
          minDepositCents={window.minDepositCents}
          maxDeposits={window.maxDeposits}
          validLabel={validLabel}
        />
      ),
    });
  };

  const holidayWindow = isGoldOrAbove ? getActiveHolidayWindow() : null;
  if (holidayWindow) {
    await addBonusTab(
      'bonus-holiday',
      `${holidayWindow.emoji} Holiday Bonus`,
      holidayWindow,
      `Happy ${holidayWindow.title}!`,
      'As a Gold member, you can earn a holiday bonus this week.'
    );
  }
  const birthdayWindow = currentTierIndex >= jadeIndex ? getActiveBirthdayWindow(user.birthday, user.birthdaySetAt) : null;
  if (birthdayWindow) {
    await addBonusTab(
      'bonus-birthday',
      '🎂 Birthday Bonus',
      birthdayWindow,
      `Happy Birthday, ${user.fullName.split(' ')[0]}!`,
      'Here is your birthday bonus. Make deposits this week to earn it.'
    );
  }

  for (const eventWindow of await getEventWindows()) {
    const minTierIndex = VIP_TIERS.findIndex((tier) => tier.name === eventWindow.minTier);
    if (currentTierIndex < minTierIndex) continue;
    await addBonusTab(
      `bonus-${eventWindow.key}`,
      `${eventWindow.emoji} ${eventWindow.title}`,
      eventWindow,
      eventWindow.title,
      eventWindow.description || 'A special event for our members. Make deposits during the event to earn a bonus.'
    );
  }

  // Events tab: running + upcoming events the customer is eligible for.
  const nowMs = Date.now();
  const easternDay = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
  const eventCards: EventCard[] = (await listEvents())
    .filter((event) => new Date(event.endsAt).getTime() > nowMs)
    .reverse() // soonest first
    .map((event) => {
      const minTierIndex = VIP_TIERS.findIndex((tier) => tier.name === event.minTier);
      const tierLabel =
        minTierIndex <= 0 ? 'Everyone' : minTierIndex === VIP_TIERS.length - 1 ? `${event.minTier} members` : `${event.minTier} and above`;
      return {
        id: event.id,
        emoji: event.emoji,
        name: event.name,
        description: event.description,
        status: new Date(event.startsAt).getTime() <= nowMs ? ('running' as const) : ('upcoming' as const),
        startsLabel: easternDay(event.startsAt),
        endsLabel: easternDay(new Date(new Date(event.endsAt).getTime() - 60 * 60 * 1000).toISOString()),
        perDepositCents: event.bonusPerDepositCents,
        minDepositCents: event.minDepositCents,
        maxDeposits: event.maxDeposits,
        minTierLabel: tierLabel,
        minTierName: event.minTier,
        eligible: currentTierIndex >= minTierIndex,
      };
    })
    // Events above the customer's tier are hidden entirely so they don't cause confusion.
    .filter((card) => card.eligible);
  const nextHoliday = getNextHoliday();

  const withdrawalsResult = await db.execute({
    sql: `SELECT id, amount_cents, method, payout_detail, fee_cents, status, created_at
          FROM withdrawals WHERE user_id = ? AND hidden_from_customer_at IS NULL ORDER BY created_at DESC`,
    args: [user.id],
  });
  const initialWithdrawals = withdrawalsResult.rows.map((row) => ({
    id: String(row.id),
    amount_cents: Number(row.amount_cents),
    method: row.method ? String(row.method) : null,
    payout_detail: row.payout_detail ? String(row.payout_detail) : null,
    fee_cents: Number(row.fee_cents ?? 0),
    status: String(row.status),
    created_at: String(row.created_at),
  }));

  const depositsResult = await db.execute({
    sql: 'SELECT id, amount_cents, method, platform, created_at FROM deposits WHERE user_id = ? ORDER BY created_at DESC',
    args: [user.id],
  });
  const initialDeposits = depositsResult.rows.map((row) => ({
    id: String(row.id),
    amount_cents: Number(row.amount_cents),
    method: row.method ? String(row.method) : null,
    platform: row.platform ? String(row.platform) : null,
    created_at: String(row.created_at),
  }));

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
            Welcome back, {user.fullName.split(' ')[0]}
          </h1>
          <p className="text-pearl-300/60 text-base">Manage your account and jump straight into your games.</p>
        </div>

        <DashboardTabs
          overview={
            <div className="space-y-6">
              <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
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
                      <p className="text-pearl-100 break-all">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" />
                    <div>
                      <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Phone</p>
                      <p className="text-pearl-100">{user.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarDays className="w-4 h-4 mt-0.5 text-gold-400 shrink-0" />
                    <div>
                      <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Member since</p>
                      <p className="text-pearl-100">{memberSince}</p>
                    </div>
                  </div>
                  <BirthdayRow birthdayLabel={user.birthday ? formatBirthday(user.birthday) : null} />
                </div>
              </div>

              <HowToDepositCard isGoldOrAbove={isGoldOrAbove} />

              <InboxClient initialMessages={messages} />

              <div className="rounded-2xl border border-gold-600/25 bg-navy-800/40 p-6 text-center">
                <p className="text-pearl-300/70 text-sm mb-2">
                  Need a game account, a redeem, or help with anything else?
                </p>
                <p className="text-pearl-300/70 text-sm">
                  <a
                    href="sms:+14077968311"
                    className="text-gold-400 hover:text-gold-300 font-semibold underline underline-offset-2"
                  >
                    Text 407-796-8311
                  </a>{' '}
                  <span className="text-pearl-300/30">·</span>{' '}
                  <a
                    href="tel:+14077968311"
                    className="text-pearl-300/60 hover:text-pearl-100 font-semibold underline underline-offset-2"
                  >
                    Call
                  </a>{' '}
                  (please text first), or send a message using the Inbox above.
                </p>
              </div>

              <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
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
                          {user.preferredGame === game.name && (
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
          }
          vip={<VIPSection currentTierName={financeSummary.tier.name} />}
          events={
            eventCards.some((card) => card.status === 'running') && (
            <EventsTab
              events={eventCards}
              member={{
                birthdayLabel: user.birthday ? formatBirthday(user.birthday) : null,
                birthdayEligible: currentTierIndex >= jadeIndex,
                nextHolidayLabel: nextHoliday ? `${nextHoliday.emoji} ${nextHoliday.name}, ${nextHoliday.dateLabel}` : 'See you next year',
                holidayEligible: isGoldOrAbove,
              }}
            />
            )
          }
          withdrawProps={{
            tier: financeSummary.tier,
            nextTier,
            lifetimeDepositsCents: financeSummary.lifetimeDepositsCents,
            todaysWithdrawnCents: financeSummary.todaysWithdrawnCents,
            remainingTodayCents: financeSummary.remainingTodayCents,
            initialWithdrawals,
          }}
          initialDeposits={initialDeposits}
          bonusTabs={bonusTabs}
        />
      </div>
    </main>
  );
}
