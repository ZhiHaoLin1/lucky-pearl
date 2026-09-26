'use client';

import { useState, type ReactNode } from 'react';
import WithdrawTab, { type WithdrawTabProps } from './WithdrawTab';
import DepositsTab, { type DepositRow } from './DepositsTab';

type TabKey = 'overview' | 'deposits' | 'withdraw' | 'vip';

export default function DashboardTabs({
  overview,
  vip,
  withdrawProps,
  initialDeposits,
}: {
  overview: ReactNode;
  vip: ReactNode;
  withdrawProps: WithdrawTabProps;
  initialDeposits: DepositRow[];
}) {
  const [tab, setTab] = useState<TabKey>('overview');

  const tabLabel: Record<TabKey, string> = {
    overview: 'Overview',
    deposits: 'Deposit History',
    withdraw: 'Withdraw',
    vip: 'VIP Club',
  };

  return (
    <div className="mb-12">
      {/* Pill grid, not a horizontal scroller — customers here skew
          elderly/less tech-comfortable, and a tab hidden behind a swipe
          gesture is a tab they may never find. Every tab stays visible at
          every width; on narrow screens the 4 tabs sit in a clean 2x2
          grid instead of relying on a shared bottom-border alignment trick. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {(['overview', 'deposits', 'withdraw', 'vip'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-2 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors text-center leading-tight ${
              tab === key
                ? 'bg-gold-400 text-navy-900'
                : 'bg-white/5 text-pearl-300/70 hover:bg-white/10 hover:text-pearl-100'
            }`}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview}
      {tab === 'deposits' && <DepositsTab initialDeposits={initialDeposits} />}
      {tab === 'withdraw' && <WithdrawTab {...withdrawProps} />}
      {tab === 'vip' && vip}
    </div>
  );
}
