'use client';

import { useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { DuplicateGroup } from '@/lib/accountSignals';

const dollars = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const sqliteDate = (value: string) => new Date(value.replace(' ', 'T') + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Groups of accounts that may belong to the same person (shared phone, email, device, ...).
// These are hints to look at, not proof: families and roommates share phones and Wi-Fi.
export default function DuplicatesPanel({ onCountChange }: { onCountChange: (count: number) => void }) {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    return fetch('/api/admin/duplicates')
      .then((res) => res.json())
      .then((data) => {
        const next: DuplicateGroup[] = Array.isArray(data?.groups) ? data.groups : [];
        setGroups(next);
        onCountChange(next.length);
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

  const markFine = async (group: DuplicateGroup) => {
    setError(null);
    setBusyKey(group.key);
    try {
      const response = await fetch('/api/admin/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupKey: group.key }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not save that.');
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <p className="text-pearl-300/50 text-sm">Checking for duplicate accounts…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-pearl-300/60 text-sm">
          {groups.length > 0
            ? `${groups.length} group${groups.length === 1 ? '' : 's'} of accounts that may be the same person.`
            : 'No suspicious account groups right now.'}{' '}
          These are hints, not proof. Families and roommates can share a phone or Wi-Fi.
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

      {groups.map((group) => (
        <div key={group.key} className="rounded-xl border border-amber-500/30 bg-navy-800/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                group.strength === 'strong' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {group.strength === 'strong' ? 'Strong match' : 'Possible match'}
            </span>
            {group.reasons.map((reason) => (
              <span key={reason} className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-pearl-200">
                {reason}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.accounts.map((account) => (
              <div key={account.id} className="rounded-lg border border-white/10 bg-navy-900/60 p-3 text-sm">
                <p className="text-pearl-100 font-semibold">
                  {account.fullName}
                  {account.username && <span className="text-pearl-300/50 font-normal"> · {account.username}</span>}
                </p>
                <p className="text-pearl-300/70 break-all">{account.email}</p>
                <p className="text-pearl-300/70">{account.phone}</p>
                <p className="text-pearl-300/50 text-xs mt-1">
                  {account.tier} · {dollars(account.lifetimeDepositsCents)} deposited · joined {sqliteDate(account.createdAt)}
                  {account.lastSeenAt ? ` · last seen ${sqliteDate(account.lastSeenAt)}` : ''}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => markFine(group)}
            disabled={busyKey === group.key}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-navy-900/60 text-pearl-300/80 border border-gold-600/25 hover:text-pearl-100 disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {busyKey === group.key ? 'Saving…' : 'Looks fine, hide this'}
          </button>
        </div>
      ))}
    </div>
  );
}
