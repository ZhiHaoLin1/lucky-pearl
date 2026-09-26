'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import type { AdminCustomer } from './AdminDashboardClient';

type PendingPayment = {
  id: string;
  email_message_id: string;
  source: string;
  amount_cents: number | null;
  sender_email: string | null;
  subject: string | null;
  parsed_name: string | null;
  reason: string;
  created_at: string;
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

const REASON_LABELS: Record<string, string> = {
  unparseable: "Looked like a payment email but didn't match the expected format",
  no_match: 'No customer name matched',
  ambiguous: 'More than one customer matched that name',
};

const SOURCE_LABELS: Record<string, string> = {
  venmo: 'Venmo',
  zelle: 'Zelle',
};

export default function EmailQueuePanel({
  customers,
  onCountChange,
}: {
  customers: AdminCustomer[];
  onCountChange: (count: number) => void;
}) {
  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, string>>({});
  const [manualAmount, setManualAmount] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    return fetch('/api/admin/email-unmatched')
      .then((res) => res.json())
      .then((data) => {
        const rows = Array.isArray(data?.pending) ? data.pending : [];
        setPending(rows);
        onCountChange(rows.length);
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

  const resolve = async (id: string, action: 'assign' | 'dismiss', userId?: string, amountDollars?: string) => {
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch('/api/admin/email-unmatched', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          userId,
          amountDollars: amountDollars ? Number(amountDollars) : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not resolve this payment.');
      }
      setPending((prev) => {
        const next = prev.filter((item) => item.id !== id);
        onCountChange(next.length);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve this payment.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="text-pearl-300/50 text-sm">Loading pending payment emails…</p>;
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-8 text-center text-pearl-300/70">
        <p className="mb-4">No payment emails waiting on a match. Everything's reconciled.</p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-navy-900/60 text-pearl-300/70 border border-gold-600/25 hover:text-pearl-100 hover:border-gold-400/40 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-pearl-300/60 text-sm">
          {pending.length} payment email{pending.length === 1 ? '' : 's'} waiting on a match
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-navy-800/60 text-pearl-300/70 border border-gold-600/25 hover:text-pearl-100 hover:border-gold-400/40 disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {pending.map((payment) => (
        <div key={payment.id} className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-pearl-100 font-bold text-lg">
                {payment.amount_cents !== null ? formatCents(payment.amount_cents) : 'Unknown amount'}
              </p>
              <p className="text-pearl-300/50 text-xs">{SOURCE_LABELS[payment.source] ?? payment.source}</p>
              <p className="text-pearl-300/40 text-xs">{formatSqliteDate(payment.created_at)}</p>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-gold-500/15 text-gold-400 border border-gold-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              {REASON_LABELS[payment.reason] ?? payment.reason}
            </span>
          </div>

          <div className="text-sm text-pearl-300/70 mb-4 space-y-0.5">
            <p>
              Subject: <span className="text-pearl-100">{payment.subject || '(none)'}</span>
            </p>
            <p>
              From: <span className="text-pearl-100">{payment.sender_email || '(unknown)'}</span>
            </p>
            {payment.parsed_name && (
              <p>
                Parsed name: <span className="text-pearl-100">{payment.parsed_name}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {payment.amount_cents === null && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-pearl-300/60 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={manualAmount[payment.id] ?? ''}
                  onChange={(event) =>
                    setManualAmount((prev) => ({ ...prev, [payment.id]: event.target.value }))
                  }
                  className="w-28 rounded-lg bg-navy-900 border border-gold-600/25 pl-6 pr-2 py-2 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none"
                />
              </div>
            )}
            <select
              value={selectedCustomer[payment.id] ?? ''}
              onChange={(event) =>
                setSelectedCustomer((prev) => ({ ...prev, [payment.id]: event.target.value }))
              }
              className="rounded-lg bg-navy-900 border border-gold-600/25 px-3 py-2 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none flex-1 min-w-[200px]"
            >
              <option value="">Assign to…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.fullName} ({customer.email})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={
                busyId === payment.id ||
                !selectedCustomer[payment.id] ||
                (payment.amount_cents === null && !manualAmount[payment.id])
              }
              onClick={() => resolve(payment.id, 'assign', selectedCustomer[payment.id], manualAmount[payment.id])}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Assign deposit
            </button>
            <button
              type="button"
              disabled={busyId === payment.id}
              onClick={() => resolve(payment.id, 'dismiss')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
