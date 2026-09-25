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
      <div className="flex gap-2 mb-6 border-b border-white/10">
        {(['overview', 'deposits', 'withdraw'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
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
