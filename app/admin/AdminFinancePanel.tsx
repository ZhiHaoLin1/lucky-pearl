'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { methodLabel } from '@/lib/withdrawalMethods';

type Tier = { name: string; icon: string; color: string; dailyLimitCents: number };
type NextTier = { name: string; minDepositsCents: number } | null;
type DepositRow = { id: string; amount_cents: number; method: string | null; note: string | null; created_at: string };
type WithdrawalRow = {
  id: string;
  amount_cents: number;
  method: string | null;
  payout_detail: string | null;
  fee_cents: number;
  status: string;
  created_at: string;
  processed_at: string | null;
};

type FinanceData = {
  tier: Tier;
  nextTier: NextTier;
  lifetimeDepositsCents: number;
  todaysWithdrawnCents: number;
  remainingTodayCents: number;
  deposits: DepositRow[];
  withdrawals: WithdrawalRow[];
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSqliteDate(value: string) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString('en-US');
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gold-500/15 text-gold-400 border-gold-500/30',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  denied: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function AdminFinancePanel({ customerId }: { customerId: string }) {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('zelle');
  const [isAddingDeposit, setIsAddingDeposit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    return fetch(`/api/admin/finance?userId=${encodeURIComponent(customerId)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleAddDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountNumber = Number(depositAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Enter a valid deposit amount.');
      return;
    }
    setError(null);
    setIsAddingDeposit(true);
    try {
      const response = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: customerId, amountDollars: amountNumber, method: depositMethod }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Could not record the deposit.');
      }
      setDepositAmount('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the deposit.');
    } finally {
      setIsAddingDeposit(false);
    }
  };

  const updateWithdrawalStatus = async (id: string, status: string) => {
    setError(null);
    try {
      const response = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Could not update the withdrawal.');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the withdrawal.');
    }
  };

  if (loading || !data) {
    return <p className="text-pearl-300/50 text-sm">Loading finance details…</p>;
  }

  const dailyPct = Math.min(100, (data.todaysWithdrawnCents / data.tier.dailyLimitCents) * 100);

  return (
    <div className="space-y-5 max-h-[440px] overflow-y-auto pr-1">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{data.tier.icon}</span>
        <div>
          <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Tier</p>
          <p className="font-bold text-sm" style={{ color: data.tier.color }}>
            {data.tier.name}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Lifetime deposits</p>
          <p className="text-pearl-100 font-bold text-sm">{formatCents(data.lifetimeDepositsCents)}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-pearl-300/70">Today&apos;s withdrawals</span>
          <span className="text-pearl-300/70">
            {formatCents(data.todaysWithdrawnCents)} / {formatCents(data.tier.dailyLimitCents)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-navy-900 overflow-hidden">
          <div className="h-full rounded-full bg-gold-gradient" style={{ width: `${dailyPct}%` }} />
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-pearl-200 text-sm font-semibold mb-2">Record a deposit</p>
        <form onSubmit={handleAddDeposit} className="flex flex-wrap gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pearl-300/60 text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              placeholder="0.00"
              className="w-28 rounded-lg bg-navy-900 border border-gold-600/25 pl-6 pr-2 py-2 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none"
            />
          </div>
          <select
            value={depositMethod}
            onChange={(event) => setDepositMethod(event.target.value)}
            className="rounded-lg bg-navy-900 border border-gold-600/25 px-2 py-2 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none"
          >
            <option value="zelle">Zelle</option>
            <option value="venmo">Venmo</option>
            <option value="square">Square</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            disabled={isAddingDeposit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-gold-gradient text-navy-900 disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>
        {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
      </div>

      <div>
        <p className="text-pearl-200 text-sm font-semibold mb-2">Withdrawal requests</p>
        {data.withdrawals.length === 0 ? (
          <p className="text-pearl-300/50 text-sm">No withdrawal requests yet.</p>
        ) : (
          <div className="space-y-2">
            {data.withdrawals.map((withdrawal) => {
              const netCents = withdrawal.amount_cents - withdrawal.fee_cents;
              return (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-navy-900/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-pearl-100 text-sm font-semibold">{formatCents(withdrawal.amount_cents)}</p>
                    {withdrawal.method && (
                      <p className="text-pearl-300/70 text-xs truncate">
                        {methodLabel(withdrawal.method)} → {withdrawal.payout_detail}
                        {withdrawal.fee_cents > 0 ? ` (net ${formatCents(netCents)})` : ''}
                      </p>
                    )}
                    <p className="text-pearl-300/40 text-xs">{formatSqliteDate(withdrawal.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        STATUS_STYLES[withdrawal.status] ?? STATUS_STYLES.pending
                      }`}
                    >
                      {withdrawal.status}
                    </span>
                    {withdrawal.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateWithdrawalStatus(withdrawal.id, 'completed')}
                          className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => updateWithdrawalStatus(withdrawal.id, 'denied')}
                          className="px-2 py-1 rounded text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25"
                        >
                          Deny
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="text-pearl-200 text-sm font-semibold mb-2 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-gold-400" />
          Deposit history
        </p>
        {data.deposits.length === 0 ? (
          <p className="text-pearl-300/50 text-sm">No deposits recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {data.deposits.map((deposit) => (
              <div key={deposit.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-navy-900/40">
                <span className="text-pearl-100">{formatCents(deposit.amount_cents)}</span>
                <span className="text-pearl-300/50 text-xs capitalize">{deposit.method ?? 'other'}</span>
                <span className="text-pearl-300/40 text-xs">{formatSqliteDate(deposit.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
