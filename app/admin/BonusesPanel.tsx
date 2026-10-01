'use client';

import { useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { BonusPayoutRow } from '@/lib/bonusPayouts';

const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

const dateLabel = (iso: string, offsetMs = 0) =>
  new Date(new Date(iso).getTime() + offsetMs).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  });

// Holiday / birthday bonuses customers have earned from their deposits. The bar
// on the customer's dashboard fills automatically; this is the list you work
// from when crediting their game account by hand.
export default function BonusesPanel({ onCountChange }: { onCountChange: (count: number) => void }) {
  const [rows, setRows] = useState<BonusPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    return fetch('/api/admin/bonuses')
      .then((res) => res.json())
      .then((data) => {
        const next: BonusPayoutRow[] = Array.isArray(data?.rows) ? data.rows : [];
        setRows(next);
        onCountChange(next.filter((row) => row.owedCents > 0).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  };

  const markPaid = async (row: BonusPayoutRow) => {
    setError(null);
    setBusyKey(`${row.userId}|${row.bonusKey}`);
    try {
      const response = await fetch('/api/admin/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: row.userId, bonusKey: row.bonusKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not mark this bonus as paid.');
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark this bonus as paid.');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <p className="text-pearl-300/50 text-sm">Loading bonuses…</p>;
  }

  const owedCount = rows.filter((row) => row.owedCents > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-pearl-300/60 text-sm">
          {owedCount > 0
            ? `${owedCount} bonus${owedCount === 1 ? '' : 'es'} waiting to be credited.`
            : 'No bonuses waiting to be credited.'}{' '}
          Earned amounts update as deposits come in.
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-navy-900/60 text-pearl-300/70 border border-gold-600/25 hover:text-pearl-100 hover:border-gold-400/40 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-8 text-center text-pearl-300/70">
          Nobody has earned a holiday or birthday bonus in the last 30 days.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const id = `${row.userId}|${row.bonusKey}`;
            const owed = row.owedCents > 0;
            return (
              <div
                key={id}
                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  owed ? 'border-gold-500/40 bg-navy-800/70' : 'border-white/10 bg-navy-800/40'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-pearl-100 font-semibold">
                    {row.fullName}
                    {row.username && <span className="text-pearl-300/50 font-normal"> · {row.username}</span>}
                  </p>
                  <p className="text-pearl-300/60 text-sm">
                    {row.emoji} {row.title} · {dateLabel(row.startsAt)}–{dateLabel(row.endsAt, -60 * 60 * 1000)}
                    {row.isActive && <span className="ml-2 text-gold-400 text-xs font-semibold">STILL OPEN</span>}
                  </p>
                  <p className="text-pearl-300/60 text-sm">
                    {row.qualifyingDeposits} of 5 deposits · earned {dollars(row.earnedCents)}
                    {row.paidCents > 0 && ` · credited ${dollars(row.paidCents)}`}
                    {' · '}
                    <a href={`sms:${row.phone}`} className="underline underline-offset-2">
                      {row.phone}
                    </a>
                  </p>
                </div>
                {owed ? (
                  <button
                    type="button"
                    onClick={() => markPaid(row)}
                    disabled={busyKey === id}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold bg-gold-400 text-navy-900 hover:bg-gold-300 disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" />
                    {busyKey === id ? 'Saving…' : `Credit ${dollars(row.owedCents)} · mark paid`}
                  </button>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-sm text-pearl-300/60">
                    <Check className="w-4 h-4 text-emerald-400" /> Paid {dollars(row.paidCents)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
