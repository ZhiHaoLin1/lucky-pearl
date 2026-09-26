'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, AtSign, Check, Mail, MailWarning, Megaphone, Pencil, Phone, Send, Trash2, Users } from 'lucide-react';
import AdminFinancePanel from './AdminFinancePanel';
import SquareQueuePanel from './SquareQueuePanel';
import EmailQueuePanel from './EmailQueuePanel';

export type AdminCustomer = {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  phone: string;
  preferredGame: string | null;
  createdAt: string;
  unreadCount: number;
};

type AdminMessage = {
  id: string;
  body: string;
  sender_admin_id: string | null;
  created_at: string;
  read_at: string | null;
};

function formatSqliteDate(value: string) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString('en-US');
}

export default function AdminDashboardClient({
  customers: initialCustomers,
  initialSquareQueueCount = 0,
  initialEmailQueueCount = 0,
}: {
  customers: AdminCustomer[];
  initialSquareQueueCount?: number;
  initialEmailQueueCount?: number;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(initialCustomers[0]?.id ?? null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'messages' | 'finance'>('messages');
  const [view, setView] = useState<'customers' | 'broadcast' | 'square' | 'email'>('customers');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  const [squareQueueCount, setSquareQueueCount] = useState(initialSquareQueueCount);
  const [emailQueueCount, setEmailQueueCount] = useState(initialEmailQueueCount);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const activeCustomer = customers.find((customer) => customer.id === activeId) ?? null;

  const loadMessages = (userId: string) => {
    setMessagesLoading(true);
    return fetch(`/api/admin/messages?userId=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
      })
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  };

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setIsEditingUsername(false);
    setUsernameError(null);
    setMessagesLoading(true);
    fetch(`/api/admin/messages?userId=${encodeURIComponent(activeId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
        setCustomers((prev) =>
          prev.map((customer) => (customer.id === activeId ? { ...customer, unreadCount: 0 } : customer))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeId || !messageBody.trim()) return;
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeId, body: messageBody.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not send the message.');
      }
      setMessageBody('');
      await loadMessages(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeId) return;
    setMessages((prev) => prev.filter((message) => message.id !== messageId));
    try {
      await fetch(`/api/admin/messages?id=${encodeURIComponent(messageId)}`, { method: 'DELETE' });
    } catch {
      // Re-sync from server if the delete failed to keep the UI honest.
      loadMessages(activeId);
    }
  };

  const startEditingUsername = () => {
    setUsernameDraft(activeCustomer?.username ?? '');
    setUsernameError(null);
    setIsEditingUsername(true);
  };

  const saveUsername = async () => {
    if (!activeCustomer) return;
    setIsSavingUsername(true);
    setUsernameError(null);
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeCustomer.id, username: usernameDraft.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not save the username.');
      }
      const saved = usernameDraft.trim() || null;
      setCustomers((prev) =>
        prev.map((customer) => (customer.id === activeCustomer.id ? { ...customer, username: saved } : customer))
      );
      setIsEditingUsername(false);
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : 'Could not save the username.');
    } finally {
      setIsSavingUsername(false);
    }
  };

  const deleteAccounts = async (ids: string[]) => {
    if (ids.length === 0) return;
    const label = ids.length === 1 ? 'this account' : `these ${ids.length} accounts`;
    if (!window.confirm(`Permanently delete ${label} and all of their messages? This cannot be undone.`)) {
      return;
    }

    setError(null);
    setIsDeletingAccount(true);
    try {
      const response = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: ids }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not delete the selected accounts.');
      }

      setCustomers((prev) => prev.filter((customer) => !ids.includes(customer.id)));
      setCheckedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (activeId && ids.includes(activeId)) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the selected accounts.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const selectAll = () => setCheckedIds(new Set(customers.map((customer) => customer.id)));
  const clearSelection = () => setCheckedIds(new Set());

  const sendBroadcast = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const recipientIds = Array.from(checkedIds);
    if (recipientIds.length === 0) {
      setBroadcastMessage('Select at least one customer first.');
      return;
    }
    if (!broadcastBody.trim()) return;

    const label = recipientIds.length === 1 ? '1 customer' : `${recipientIds.length} customers`;
    if (!window.confirm(`Send this message to ${label}?`)) {
      return;
    }

    setBroadcastMessage(null);
    setIsBroadcasting(true);
    try {
      const response = await fetch('/api/admin/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: recipientIds, body: broadcastBody.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not send the broadcast.');
      }
      setBroadcastBody('');
      setBroadcastMessage(`Sent to ${data.sent} customer${data.sent === 1 ? '' : 's'}.`);
    } catch (err) {
      setBroadcastMessage(err instanceof Error ? err.message : 'Could not send the broadcast.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (customers.length === 0) {
    return (
      <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-8 text-center text-pearl-300/70">
        No customer accounts yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-5 border-b border-white/10 overflow-x-auto">
        {(['customers', 'broadcast', 'square', 'email'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              view === key
                ? 'border-gold-400 text-gold-400'
                : 'border-transparent text-pearl-300/60 hover:text-pearl-100'
            }`}
          >
            {key === 'customers' && <Users className="w-4 h-4" />}
            {key === 'broadcast' && <Megaphone className="w-4 h-4" />}
            {key === 'square' && <AlertTriangle className="w-4 h-4" />}
            {key === 'email' && <MailWarning className="w-4 h-4" />}
            {key === 'customers'
              ? 'Customers'
              : key === 'broadcast'
              ? 'Mass Message'
              : key === 'square'
              ? 'Square Queue'
              : 'Email Queue'}
            {key === 'square' && squareQueueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-500/20 text-gold-400">
                {squareQueueCount}
              </span>
            )}
            {key === 'email' && emailQueueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-500/20 text-gold-400">
                {emailQueueCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-pearl-300/60 text-base">
          {customers.length} account{customers.length === 1 ? '' : 's'}. Click one to message them, or check boxes
          to select several for bulk actions.
        </p>
        <div className="flex items-center gap-3 text-sm">
          <button type="button" onClick={selectAll} className="text-gold-400 hover:text-gold-300">
            Select all
          </button>
          {checkedIds.size > 0 && (
            <button type="button" onClick={clearSelection} className="text-pearl-300/60 hover:text-pearl-100">
              Clear selection
            </button>
          )}
        </div>
      </div>

      {view === 'customers' && checkedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <span className="text-sm text-pearl-100">{checkedIds.size} selected</span>
          <button
            type="button"
            onClick={() => deleteAccounts(Array.from(checkedIds))}
            disabled={isDeletingAccount}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            Delete selected
          </button>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

      {view === 'broadcast' ? (
        <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-5 h-5 text-gold-400" />
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
              Mass Message
            </h2>
          </div>
          <p className="text-pearl-300/60 text-sm mb-5">
            {checkedIds.size === 0
              ? 'No customers selected. Check boxes in the Customers tab, or use "Select all" above.'
              : `Sending to ${checkedIds.size} customer${checkedIds.size === 1 ? '' : 's'}.`}
          </p>

          <form onSubmit={sendBroadcast} className="space-y-3">
            <textarea
              value={broadcastBody}
              onChange={(event) => setBroadcastBody(event.target.value)}
              placeholder="Write a message to send to everyone selected…"
              rows={5}
              required
              className="w-full rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
            />
            <button
              type="submit"
              disabled={isBroadcasting || checkedIds.size === 0}
              className="px-6 py-3 rounded-xl bg-gold-gradient text-navy-900 font-bold flex items-center gap-2 disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {isBroadcasting
                ? 'Sending…'
                : `Send to ${checkedIds.size} customer${checkedIds.size === 1 ? '' : 's'}`}
            </button>
          </form>
          {broadcastMessage && <p className="mt-3 text-sm text-pearl-100">{broadcastMessage}</p>}
        </div>
      ) : view === 'square' ? (
        <SquareQueuePanel customers={customers} onCountChange={setSquareQueueCount} />
      ) : view === 'email' ? (
        <EmailQueuePanel customers={customers} onCountChange={setEmailQueueCount} />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl border border-gold-600/25 bg-navy-800/60 overflow-hidden">
          <div className="max-h-[560px] overflow-y-auto divide-y divide-white/5">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className={`flex items-center gap-3 px-4 py-4 transition-colors ${
                  activeId === customer.id ? 'bg-gold-500/10' : 'hover:bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(customer.id)}
                  onChange={() => toggleChecked(customer.id)}
                  className="w-4 h-4 shrink-0 accent-gold-500"
                  aria-label={`Select ${customer.fullName}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(customer.id);
                    setDetailTab('messages');
                  }}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-pearl-100 font-semibold text-sm truncate">{customer.fullName}</p>
                  <p className="text-pearl-300/60 text-xs truncate">
                    {customer.email}
                    {customer.username && <span className="text-pearl-300/40"> · @{customer.username}</span>}
                  </p>
                </button>
                {customer.unreadCount > 0 && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-gold-500/20 text-gold-400">
                    {customer.unreadCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gold-600/25 bg-navy-800/60 p-6 flex flex-col">
          {!activeCustomer ? (
            <p className="text-pearl-300/70 text-sm">Select a customer to view details.</p>
          ) : (
            <>
              <div className="mb-5 pb-5 border-b border-white/10 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">{activeCustomer.fullName}</h2>
                  <div className="mb-3">
                    {isEditingUsername ? (
                      <div className="flex items-center gap-2">
                        <AtSign className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                        <input
                          type="text"
                          value={usernameDraft}
                          onChange={(event) => setUsernameDraft(event.target.value)}
                          placeholder="username"
                          autoFocus
                          className="w-40 rounded-lg bg-navy-900 border border-gold-600/25 px-2 py-1 text-xs text-pearl-100 focus:border-gold-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={saveUsername}
                          disabled={isSavingUsername}
                          className="text-green-400 hover:text-green-300 disabled:opacity-60"
                          aria-label="Save username"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingUsername(false)}
                          className="text-pearl-300/50 hover:text-pearl-100 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startEditingUsername}
                        className="flex items-center gap-1.5 text-xs text-pearl-300/60 hover:text-gold-400 transition-colors"
                      >
                        <AtSign className="w-3.5 h-3.5" />
                        {activeCustomer.username ? `@${activeCustomer.username}` : 'Set username'}
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {usernameError && <p className="text-red-300 text-xs mt-1">{usernameError}</p>}
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span className="flex items-center gap-2 text-pearl-300/80">
                      <Mail className="w-4 h-4 text-gold-400" />
                      {activeCustomer.email}
                    </span>
                    <span className="flex items-center gap-2 text-pearl-300/80">
                      <Phone className="w-4 h-4 text-gold-400" />
                      {activeCustomer.phone}
                    </span>
                    {activeCustomer.preferredGame && (
                      <span className="text-pearl-300/60">Favorite: {activeCustomer.preferredGame}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAccounts([activeCustomer.id])}
                  disabled={isDeletingAccount}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete account
                </button>
              </div>

              <div className="flex gap-2 mb-4 border-b border-white/10 overflow-x-auto">
                {(['messages', 'finance'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDetailTab(key)}
                    className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                      detailTab === key
                        ? 'border-gold-400 text-gold-400'
                        : 'border-transparent text-pearl-300/60 hover:text-pearl-100'
                    }`}
                  >
                    {key === 'messages' ? 'Messages' : 'Deposits & Withdrawals'}
                  </button>
                ))}
              </div>

              {detailTab === 'finance' ? (
                <AdminFinancePanel customerId={activeCustomer.id} />
              ) : (
                <>
                  <div className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto space-y-3 mb-5">
                    {messagesLoading ? (
                      <p className="text-pearl-300/50 text-sm">Loading messages…</p>
                    ) : messages.length === 0 ? (
                      <p className="text-pearl-300/50 text-sm">No messages in this thread yet.</p>
                    ) : (
                      messages.map((message) => {
                        const fromAdmin = Boolean(message.sender_admin_id);
                        return (
                          <div
                            key={message.id}
                            className={`group rounded-xl border px-4 py-3 flex items-start justify-between gap-3 ${
                              fromAdmin
                                ? 'border-gold-500/30 bg-gold-500/5 ml-8'
                                : 'border-white/10 bg-navy-900/60 mr-8'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-pearl-300/50 text-[10px] uppercase tracking-wider mb-1">
                                {fromAdmin ? 'You' : activeCustomer.fullName}
                              </p>
                              <p className="text-pearl-100 text-sm whitespace-pre-wrap">{message.body}</p>
                              <p className="text-pearl-300/40 text-xs mt-1.5">
                                {formatSqliteDate(message.created_at)}
                                {message.read_at ? ' · Read' : ' · Unread'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(message.id)}
                              className="shrink-0 text-pearl-300/40 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSend} className="flex gap-3">
                    <textarea
                      value={messageBody}
                      onChange={(event) => setMessageBody(event.target.value)}
                      placeholder="Write a message…"
                      rows={2}
                      required
                      className="flex-1 rounded-xl bg-navy-900 border border-gold-600/25 px-4 py-3 text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={isSending}
                      className="shrink-0 px-5 rounded-xl bg-gold-gradient text-navy-900 font-bold flex items-center gap-2 disabled:opacity-60"
                    >
                      <Send className="w-4 h-4" />
                      {isSending ? 'Sending…' : 'Send'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
