'use client';

import { useState, type ReactNode } from 'react';
import WithdrawTab, { type WithdrawTabProps } from './WithdrawTab';
import DepositsTab, { type DepositRow } from './DepositsTab';

export default function DashboardTabs({
  overview,
  withdrawProps,
  initialDeposits,
}: {
  overview: ReactNode;
  withdrawProps: WithdrawTabProps;
  initialDeposits: DepositRow[];
}) {
  const [tab, setTab] = useState<'overview' | 'deposits' | 'withdraw'>('overview');

  const tabLabel: Record<typeof tab, string> = {
    overview: 'Overview',
    deposits: 'Deposit History',
    withdraw: 'Withdraw',
  };

  return (
    <div className="mb-12">
      {/* Fixed 3-column grid, not a horizontal scroller — customers here
          skew elderly/less tech-comfortable, and a tab hidden behind a
          swipe gesture is a tab they may never find. Every tab stays
          visible at every width; long labels wrap instead of hiding. */}
      <div className="grid grid-cols-3 mb-6 border-b border-white/10">
        {(['overview', 'deposits', 'withdraw'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-1 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors text-center leading-tight ${
              tab === key
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-pearl-300/60 hover:text-pearl-100'
            }`}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      {tab === 'overview' ? overview : tab === 'deposits' ? (
        <DepositsTab initialDeposits={initialDeposits} />
      ) : (
        <WithdrawTab {...withdrawProps} />
      )}
    </div>
  );
}
