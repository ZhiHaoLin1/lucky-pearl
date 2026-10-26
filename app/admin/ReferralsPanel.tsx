'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2, RefreshCw } from 'lucide-react';
import type { LinkStat, ReferralRow } from '@/lib/referrals';
import type { AdminCustomer } from './AdminDashboardClient';

const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
const sqliteDate = (value: string | null) =>
  value ? new Date(value.replace(' ', 'T') + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

const STATE_LABEL: Record<ReferralRow['state'], { text: string; className: string }> = {
  rejected: { text: 'Not eligible', className: 'bg-red-500/20 text-red-300' },
  review: { text: 'Needs your review', className: 'bg-amber-500/20 text-amber-300' },
  waiting: { text: 'Waiting for first purchase', className: 'bg-white/10 text-pearl-300' },
  owed: { text: 'Referrer is owed', className: 'bg-emerald-500/20 text-emerald-300' },
  blocked: { text: 'Payment on hold', className: 'bg-red-500/20 text-red-300' },
  paid: { text: 'Paid', className: 'bg-white/10 text-pearl-300' },
};

const inputClass =
  'rounded-lg bg-navy-900 border border-gold-600/25 px-3 py-2.5 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30';

// Referral campaign: create a unique link per customer, then watch visits -> signups ->
// first purchases per link, and hand out the rewards by hand.
export default function ReferralsPanel({
  customers,
  onCountChange,
}: {
  customers: AdminCustomer[];
  onCountChange: (count: number) => void;
}) {
  const [links, setLinks] = useState<LinkStat[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [newUserId, setNewUserId] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    return fetch('/api/admin/referrals')
      .then(async (res) => {
        const text = await res.text();
        let data: { links?: LinkStat[]; referrals?: ReferralRow[]; error?: string } = {};
        try {
          data = JSON.parse(text);
        } catch {}
        if (!res.ok || !data.links || !data.referrals) throw new Error(data.error || 'Could not load referrals. Please try again.');
        setLinks(data.links);
        setReferrals(data.referrals);
        onCountChange(data.referrals.filter((r) => r.state === 'owed' || r.state === 'review' || r.promoToGive).length);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load referrals.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const post = async (key: string, body: Record<string, unknown>) => {
    setError(null);
    setBusy(key);
    try {
      const response = await fetch('/api/admin/referrals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Something went wrong.');
      await load(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const createLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newUserId) {
      setError('Pick a customer first.');
      return;
    }
    if (await post('create', { action: 'create-link', userId: newUserId, label: newLabel })) {
      setNewLabel('');
    }
  };

  const copy = async (link: LinkStat) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(link.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt('Copy this link:', link.url);
    }
  };

  const totals = links.reduce(
    (sum, link) => ({
      visits: sum.visits + link.visits,
      signups: sum.signups + link.signups,
      eligible: sum.eligible + link.eligible,
      purchased: sum.purchased + link.purchased,
      owed: sum.owed + link.owedCents,
      paid: sum.paid + link.paidCents,
      promo: sum.promo + link.promoToGive,
    }),
    { visits: 0, signups: 0, eligible: 0, purchased: 0, owed: 0, paid: 0, promo: 0 }
  );

  if (loading) return <p className="text-pearl-300/50 text-sm">Loading referrals…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-pearl-300/60 text-sm">$10 to the referrer on the friend’s first real purchase, plus $10 promo credit for the new customer.</p>
        <button
          type="button"
          onClick={async () => {
            setRefreshing(true);
            await load(true);
            setRefreshing(false);
          }}
          disabled={refreshing}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-navy-900/60 text-pearl-300/70 border border-gold-600/25 hover:text-pearl-100 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Campaign totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          ['Link visits', totals.visits],
          ['Signups', totals.signups],
          ['Eligible', totals.eligible],
          ['First purchases', totals.purchased],
          ['Promo credits to give', totals.promo],
          ['Referrers owed', dollars(totals.owed)],
          ['Referrers paid', dollars(totals.paid)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-white/10 bg-navy-900/50 p-3 text-center">
            <p className="text-gold-400 text-xl font-bold">{value}</p>
            <p className="text-pearl-300/60 text-[11px] leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Create a link */}
      <form onSubmit={createLink} className="rounded-xl border border-gold-600/25 bg-navy-800/60 p-4 space-y-3">
        <h3 className="text-pearl-100 font-bold text-sm flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gold-400" /> Create a referral link for a customer
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <select className={inputClass} value={newUserId} onChange={(e) => setNewUserId(e.target.value)}>
            <option value="">Choose a customer…</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.fullName} ({customer.phone})
              </option>
            ))}
          </select>
          <input className={inputClass} placeholder="Note, e.g. Facebook group (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} maxLength={80} />
          <button type="submit" disabled={busy === 'create'} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-gold-400 text-navy-900 hover:bg-gold-300 disabled:opacity-60">
            {busy === 'create' ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </form>

      {/* Links and their performance */}
      <div className="space-y-2">
        <h3 className="text-pearl-100 font-bold text-sm">Links and performance</h3>
        {links.length === 0 ? (
          <p className="text-pearl-300/60 text-sm">No links yet. Create one above and send it to the customer.</p>
        ) : (
          links.map((link) => (
            <div key={link.id} className={`rounded-xl border p-3 text-sm ${link.active ? 'border-white/10 bg-navy-800/50' : 'border-white/5 bg-navy-900/40 opacity-60'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-pearl-100 font-semibold">
                  {link.referrerName}
                  {link.label && <span className="text-pearl-300/50 font-normal"> · {link.label}</span>}
                  {!link.active && <span className="ml-2 text-xs text-pearl-300/50">(switched off)</span>}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => copy(link)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-navy-900/60 text-gold-400 border border-gold-600/25">
                    {copied === link.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied === link.id ? 'Copied' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => post(`toggle-${link.id}`, { action: 'toggle-link', linkId: link.id, active: !link.active })}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-navy-900/60 text-pearl-300/70 border border-white/10"
                  >
                    {link.active ? 'Switch off' : 'Switch on'}
                  </button>
                </div>
              </div>
              <p className="text-pearl-300/50 text-xs break-all mt-1">{link.url}</p>
              <p className="text-pearl-300/70 text-xs mt-1.5">
                {link.visits} visits → {link.signups} signups ({link.eligible} eligible
                {link.review > 0 ? `, ${link.review} to review` : ''}
                {link.rejected > 0 ? `, ${link.rejected} not eligible` : ''}) → {link.purchased} purchased · owed {dollars(link.owedCents)} · paid{' '}
                {dollars(link.paidCents)}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Each referred customer */}
      <div className="space-y-2">
        <h3 className="text-pearl-100 font-bold text-sm">Referred customers</h3>
        {referrals.length === 0 ? (
          <p className="text-pearl-300/60 text-sm">No one has signed up through a link yet.</p>
        ) : (
          referrals.map((row) => {
            const label = STATE_LABEL[row.state];
            return (
              <div key={row.id} className="rounded-xl border border-white/10 bg-navy-800/50 p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-pearl-100 font-semibold">{row.refereeName}</span>
                  <span className="text-pearl-300/50">invited by {row.referrerName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${label.className}`}>{label.text}</span>
                  <span className="text-pearl-300/40 text-xs">joined {sqliteDate(row.createdAt)} · phone on account {row.refereePhone}</span>
                </div>
                {row.reason && <p className="text-amber-200/90 text-xs">{row.reason}</p>}
                {row.blockReason && <p className="text-red-300 text-xs">{row.blockReason}</p>}
                {row.purchaseCents !== null && (
                  <p className="text-pearl-300/70 text-xs">
                    First purchase {dollars(row.purchaseCents)} on {sqliteDate(row.purchasedAt)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {row.promoToGive && (
                    <button type="button" disabled={busy === `c-${row.id}`} onClick={() => post(`c-${row.id}`, { action: 'credit-given', referralId: row.id })} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gold-400 text-navy-900 disabled:opacity-60">
                      I credited their $10 game credit (text came from {row.refereePhone})
                    </button>
                  )}
                  {row.eligibility === 'eligible' && row.promoGivenAt && <span className="text-xs text-pearl-300/50 self-center">Promo credit given {sqliteDate(row.promoGivenAt)}</span>}
                  {row.state === 'owed' && (
                    <button type="button" disabled={busy === `p-${row.id}`} onClick={() => post(`p-${row.id}`, { action: 'pay-referrer', referralId: row.id })} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-400 text-navy-900 disabled:opacity-60">
                      I paid {row.referrerName} $10
                    </button>
                  )}
                  {row.state === 'paid' && <span className="text-xs text-pearl-300/50 self-center">Referrer paid {sqliteDate(row.referrerPaidAt)}</span>}
                  {(row.state === 'review' || row.state === 'blocked') && (
                    <button type="button" disabled={busy === `a-${row.id}`} onClick={() => post(`a-${row.id}`, { action: 'approve', referralId: row.id })} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-navy-900/60 text-emerald-300 border border-emerald-500/30 disabled:opacity-60">
                      {row.state === 'blocked' ? 'I checked it: approve this payment' : 'Approve (they’re a real new customer)'}
                    </button>
                  )}
                  {(row.state === 'review' || row.state === 'blocked' || row.state === 'waiting' || row.state === 'owed') && (
                    <button
                      type="button"
                      disabled={busy === `r-${row.id}`}
                      onClick={() => {
                        const reason = window.prompt('Why is this not eligible? (shown only to you)', 'Duplicate account');
                        if (reason !== null) post(`r-${row.id}`, { action: 'reject', referralId: row.id, reason });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-navy-900/60 text-red-300 border border-red-500/30 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
