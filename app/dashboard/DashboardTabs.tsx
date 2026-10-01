'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import WithdrawTab, { type WithdrawTabProps } from './WithdrawTab';
import DepositsTab, { type DepositRow } from './DepositsTab';

type TabKey = string;

export type BonusTabEntry = { key: string; label: string; content: ReactNode };

const BASE_TAB_KEYS = ['overview', 'deposits', 'withdraw', 'vip'];

// Re-fetch the page data this often while a bonus tab is open so the progress
// bar fills in as the payment parser matches new deposits.
const BONUS_REFRESH_MS = 60_000;
const TAB_STORAGE_KEY = 'lp-dashboard-tab';

export default function DashboardTabs({
  overview,
  vip,
  events,
  withdrawProps,
  initialDeposits,
  bonusTabs = [],
}: {
  overview: ReactNode;
  vip: ReactNode;
  // Only passed while at least one event is running; the Events tab is hidden otherwise.
  events?: ReactNode;
  withdrawProps: WithdrawTabProps;
  initialDeposits: DepositRow[];
  // Only passed while a holiday / birthday bonus window is open.
  bonusTabs?: BonusTabEntry[];
}) {
  const router = useRouter();
  const [tab, setTabState] = useState<TabKey>('overview');
  const allKeys = [...BASE_TAB_KEYS, ...(events ? ['events'] : []), ...bonusTabs.map((entry) => entry.key)];
  // A saved bonus tab may have expired; fall back to Overview instead of showing nothing.
  const activeTab = allKeys.includes(tab) ? tab : 'overview';
  const activeBonus = bonusTabs.find((entry) => entry.key === activeTab);

  // Remember the selected tab across refreshes. Restored after mount (not in
  // the useState initializer) so the first client render matches the server's.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved && allKeys.includes(saved)) setTabState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeBonus) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, BONUS_REFRESH_MS);
    return () => clearInterval(id);
  }, [activeBonus, router]);

  const setTab = (next: TabKey) => {
    setTabState(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {}
  };

  const tabLabel: Record<string, string> = {
    overview: 'Overview',
    deposits: 'Deposit History',
    withdraw: 'Withdraw',
    vip: 'VIP Club',
    events: 'Events',
  };
  const tabEntries: Array<{ key: string; label: string; isBonus: boolean }> = [
    { key: 'overview', label: tabLabel.overview, isBonus: false },
    ...bonusTabs.map((entry) => ({ key: entry.key, label: entry.label, isBonus: true })),
    ...BASE_TAB_KEYS.slice(1).map((key) => ({ key, label: tabLabel[key], isBonus: false })),
    ...(events ? [{ key: 'events', label: tabLabel.events, isBonus: false }] : []),
  ];
  const gridCols = tabEntries.length >= 6 ? 'sm:grid-cols-3' : tabEntries.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4';

  return (
    <div className="mb-12">
      {/* Pill grid, not a horizontal scroller — customers here skew
          elderly/less tech-comfortable, and a tab hidden behind a swipe
          gesture is a tab they may never find. Every tab stays visible at
          every width; on narrow screens the 4 tabs sit in a clean 2x2
          grid instead of relying on a shared bottom-border alignment trick. */}
      <div className={`grid grid-cols-2 ${gridCols} gap-2 mb-6`}>
        {tabEntries.map(({ key, label, isBonus }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors text-center leading-tight ${
              activeTab === key
                ? 'bg-gold-400 text-navy-900'
                : isBonus
                  ? 'bg-gold-400/15 text-gold-300 ring-1 ring-gold-400/60 hover:bg-gold-400/25'
                  : 'bg-white/5 text-pearl-300/70 hover:bg-white/10 hover:text-pearl-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && overview}
      {activeTab === 'deposits' && <DepositsTab initialDeposits={initialDeposits} />}
      {activeTab === 'withdraw' && <WithdrawTab {...withdrawProps} />}
      {activeTab === 'vip' && vip}
      {activeTab === 'events' && events}
      {activeBonus?.content}
    </div>
  );
}
