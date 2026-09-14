'use client';

import { useState, type ReactNode } from 'react';
import WithdrawTab, { type WithdrawTabProps } from './WithdrawTab';

export default function DashboardTabs({
  overview,
  withdrawProps,
}: {
  overview: ReactNode;
  withdrawProps: WithdrawTabProps;
}) {
  const [tab, setTab] = useState<'overview' | 'withdraw'>('overview');

  return (
    <div className="mb-12">
      <div className="flex gap-2 mb-6 border-b border-white/10">
        {(['overview', 'withdraw'] as const).map((key) => (
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
            {key === 'overview' ? 'Overview' : 'Withdraw'}
          </button>
        ))}
      </div>

      {tab === 'overview' ? overview : <WithdrawTab {...withdrawProps} />}
    </div>
  );
}
