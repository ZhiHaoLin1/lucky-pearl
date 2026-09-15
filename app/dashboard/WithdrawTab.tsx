'use client';

import { useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { WITHDRAWAL_METHODS, methodLabel, type WithdrawalMethodKey } from '@/lib/withdrawalMethods';

type Tier = {
  name: string;
  icon: string;
  color: string;
  dailyLimitCents: number;
};

type NextTier = {
  name: string;
  minDepositsCents: number;
} | null;

type WithdrawalRow = {
  id: string;
  amount_cents: number;
  method: string | null;
  payout_detail: string | null;
  fee_cents: number;
  status: string;
  created_at: string;
};

export type WithdrawTabProps = {
  tier: Tier;
  nextTier: NextTier;
  lifetimeDepositsCents: number;
  todaysWithdrawnCents: number;
  remainingTodayCents: number;
  initialWithdrawals: WithdrawalRow[];
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

const METHOD_KEYS = Object.keys(WITHDRAWAL_METHODS) as WithdrawalMethodKey[];

export default function WithdrawTab({
  tier,
  nextTier,
  lifetimeDepositsCents,
  todaysWithdrawnCents,
  remainingTodayCents,
  initialWithdrawals,
}: WithdrawTabProps) {
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [used, setUsed] = useState(todaysWithdrawnCents);
  const [remaining, setRemaining] = useState(remainingTodayCents);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethodKey>('zelle');
  const [payoutDetail, setPayoutDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dailyPct = Math.min(100, (used / tier.dailyLimitCents) * 100);
  const depositPct = nextTier
    ? Math.min(100, (lifetimeDepositsCents / nextTier.minDepositsCents) * 100)
    : 100;

  const amountNumber = Number(amount);
  const amountCentsPreview = Number.isFinite(amountNumber) && amountNumber > 0 ? Math.round(amountNumber * 100) : 0;
  const feeCentsPreview = Math.round(amountCentsPreview * WITHDRAWAL_METHODS[method].feeRate);
  const netCentsPreview = amountCentsPreview - feeCentsPreview;

  const refresh = async () => {
    try {
      const response = await fetch('/api/withdrawals');
      const data = await response.json();
      if (Array.isArray(data?.withdrawals)) {
        setWithdrawals(data.withdrawals);
        setUsed(data.todaysWithdrawnCents);
        setRemaining(data.remainingTodayCents);
      }
    } catch {
      // Keep current state if refresh fails.
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage('Enter a valid amount.');
      return;
    }
    const trimmedDetail = payoutDetail.trim();
    const methodInfo = WITHDRAWAL_METHODS[method];
    if (!trimmedDetail) {
      setMessage(`Enter your ${methodInfo.detailLabel.toLowerCase()}.`);
      return;
    }
    if (methodInfo.detailPrefix && !trimmedDetail.startsWith(methodInfo.detailPrefix)) {
      setMessage(`Your ${methodInfo.detailLabel.toLowerCase()} must start with "${methodInfo.detailPrefix}".`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountDollars: amountNumber, method, payoutDetail: trimmedDetail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not submit your withdrawal request.');
      }
      setAmount('');
      setPayoutDetail('');
      setMessage('Withdrawal request submitted — our team will review it.');
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not submit your withdrawal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{tier.icon}</span>
          <div>
            <p className="text-pearl-300/50 text-xs uppercase tracking-wider">Your tier</p>
            <p className="text-lg font-bold" style={{ color: tier.color }}>
              {tier.name}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-pearl-200">Today&apos;s withdrawals</span>
              <span className="text-pearl-300/70">
                {formatCents(used)} / {formatCents(tier.dailyLimitCents)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-navy-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-gold-gradient transition-all duration-500"
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <p className="text-pearl-300/50 text-xs mt-1.5">
              {formatCents(remaining)} remaining today
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-pearl-200">Lifetime deposits</span>
              <span className="text-pearl-300/70">
                {formatCents(lifetimeDepositsCents)}
                {nextTier ? ` / ${formatCents(nextTier.minDepositsCents)}` : ''}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-navy-900 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${depositPct}%`, background: tier.color }}
              />
            </div>
            <p className="text-pearl-300/50 text-xs mt-1.5">
              {nextTier
                ? `${formatCents(Math.max(0, nextTier.minDepositsCents - lifetimeDepositsCents))} more to unlock ${nextTier.name}`
                : "You've reached our highest tier"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
        <div className="flex items-center gap-2 mb-5">
          <ArrowDownToLine className="w-5 h-5 text-gold-400" />
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
            Request a Withdrawal
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METHOD_KEYS.map((key) => {
              const info = WITHDRAWAL_METHODS[key];
              const selected = method === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? 'border-gold-400 bg-gold-500/10'
                      : 'border-white/10 bg-navy-900/60 hover:border-white/20'
                  }`}
                >
                  <p className="text-pearl-100 font-semibold text-sm">{info.label}</p>
                  <p className={`text-xs mt-0.5 ${info.feeRate > 0 ? 'text-gold-400' : 'text-emerald-400'}`}>
                    {info.feeDescription}
                  </p>
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="text-pearl-200 text-sm font-medium mb-1.5 block">
              {WITHDRAWAL_METHODS[method].detailLabel}
            </span>
            <input
              type="text"
              value={payoutDetail}
              onChange={(event) => setPayoutDetail(event.target.value)}
              placeholder={WITHDRAWAL_METHODS[method].detailPlaceholder}
              required
              className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
            />
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pearl-300/60">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-xl bg-navy-900 border border-gold-600/25 pl-8 pr-4 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || remaining <= 0}
              className="shrink-0 px-6 py-3.5 rounded-xl bg-gold-gradient text-navy-900 font-bold disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Request Withdrawal'}
            </button>
          </div>

          {amountCentsPreview > 0 && (
            <p className="text-pearl-300/60 text-xs">
              {feeCentsPreview > 0
                ? `${WITHDRAWAL_METHODS[method].label} fee: ${formatCents(feeCentsPreview)} · You'll receive ${formatCents(netCentsPreview)}`
                : `No fee · You'll receive ${formatCents(netCentsPreview)}`}
            </p>
          )}
        </form>
        {message && <p className="text-sm text-pearl-100 mb-3">{message}</p>}

        {withdrawals.length === 0 ? (
          <p className="text-pearl-300/60 text-sm">No withdrawal requests yet.</p>
        ) : (
          <div className="space-y-2.5">
            {withdrawals.map((withdrawal) => {
              return (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-navy-900/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-pearl-100 font-semibold text-sm">{formatCents(withdrawal.amount_cents)}</p>
                    {withdrawal.method && (
                      <p className="text-pearl-300/60 text-xs truncate">
                        {methodLabel(withdrawal.method)} → {withdrawal.payout_detail}
                      </p>
                    )}
                    <p className="text-pearl-300/40 text-xs">{formatSqliteDate(withdrawal.created_at)}</p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                      STATUS_STYLES[withdrawal.status] ?? STATUS_STYLES.pending
                    }`}
                  >
                    {withdrawal.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
