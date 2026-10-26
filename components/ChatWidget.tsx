'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Send, X } from 'lucide-react';

type ChatMessage = {
  id: string;
  body: string;
  fromSupport: boolean;
  createdAt: string;
  unread: boolean;
};

type ApiMessage = {
  id: string;
  body: string;
  sender_admin_id: string | null;
  created_at: string;
  read_at: string | null;
};

const OPEN_KEY = 'lp-chat-open';
const DRAFT_KEY = 'lp-chat-draft';
const OPEN_POLL_MS = 4_000;
const CLOSED_POLL_MS = 20_000;

// Pages where a floating chat would just get in the way.
const HIDDEN_PATH_PREFIXES = ['/admin', '/spin', '/reset-password'];

const toDate = (value: string) => new Date(value.replace(' ', 'T') + 'Z');

function formatTime(value: string) {
  const date = toDate(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' ' +
        date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const normalize = (rows: ApiMessage[]): ChatMessage[] =>
  rows.map((row) => ({
    id: row.id,
    body: row.body,
    fromSupport: Boolean(row.sender_admin_id),
    createdAt: row.created_at,
    unread: Boolean(row.sender_admin_id) && !row.read_at,
  }));

// Sticky chat for everyone, logged in or not. Lives in the root layout, so it stays put
// (and keeps its state) while visitors move between pages and dashboard tabs. Messages
// go to the Discord support channel; replies typed there show up here.
export default function ChatWidget() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const openRef = useRef(false);
  openRef.current = open;

  // Other parts of the page (the mobile "Help" tab) can open the chat with this event.
  useEffect(() => {
    const openFromElsewhere = () => {
      setOpen(true);
      try {
        localStorage.setItem(OPEN_KEY, '1');
      } catch {}
    };
    window.addEventListener('lp-chat-open', openFromElsewhere);
    return () => window.removeEventListener('lp-chat-open', openFromElsewhere);
  }, []);

  // Restore open state + unsent draft.
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === '1');
      setDraft(localStorage.getItem(DRAFT_KEY) ?? '');
    } catch {}
  }, []);

  // Everyone gets the chat except admins (who reply from Discord or /admin). Re-check on
  // navigation so logging in or out switches between guest and account chat without a reload.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const isAdmin = data?.role === 'admin';
        setEnabled(!isAdmin);
        setIsGuest(!data?.loggedIn);
        if (isAdmin) setMessages([]);
      })
      .catch(() => {
        if (!cancelled) setEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const hidden = HIDDEN_PATH_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  const active = enabled && !hidden;

  // Opening the chat reads (and marks as read); while closed we only peek so the unread badge works.
  const load = useCallback(async (markRead: boolean) => {
    try {
      const response = await fetch(markRead ? '/api/messages' : '/api/messages?peek=1', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data?.messages)) {
        const next = normalize(data.messages);
        // Keep the same array when nothing changed so the list doesn't re-render every poll.
        setMessages((prev) =>
          prev.length === next.length && prev.every((m, i) => m.id === next[i].id && m.unread === next[i].unread) ? prev : next
        );
      }
    } catch {
      // Keep what we have; the next poll will try again.
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState === 'visible') await load(openRef.current);
      timer = setTimeout(tick, openRef.current ? OPEN_POLL_MS : CLOSED_POLL_MS);
    };
    tick();
    const refreshNow = () => {
      if (document.visibilityState === 'visible') load(openRef.current);
    };
    document.addEventListener('visibilitychange', refreshNow);
    window.addEventListener('focus', refreshNow);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshNow);
      window.removeEventListener('focus', refreshNow);
    };
  }, [active, load]);

  // Opening: mark read right away and jump to the latest message.
  useEffect(() => {
    if (active && open) {
      stickToBottom.current = true;
      load(true);
    }
  }, [active, open, load]);

  useEffect(() => {
    const list = listRef.current;
    if (open && list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  const setOpenPersisted = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? '1' : '0');
    } catch {}
  };

  const updateDraft = (value: string) => {
    setDraft(value);
    try {
      localStorage.setItem(DRAFT_KEY, value);
    } catch {}
  };

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Could not send your message.');
      updateDraft('');
      stickToBottom.current = true;
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter((message) => message.unread).length;

  // Let the navbar's Help tab show the same unread badge.
  useEffect(() => {
    (window as unknown as { __lpChatUnread?: number }).__lpChatUnread = unreadCount;
    window.dispatchEvent(new CustomEvent('lp-chat-unread', { detail: unreadCount }));
  }, [unreadCount]);

  if (!active) return null;

  // On the home page phones/tablets have a bottom nav bar whose Help tab opens the chat,
  // so the floating bubble would just overlap it there.
  const bubbleHiddenBelowLg = pathname === '/';

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Lucky Pearl support"
          className="fixed z-40 inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:bottom-24 sm:w-[22rem] h-[min(34rem,82dvh)] sm:h-[32rem] flex flex-col rounded-t-2xl sm:rounded-2xl border border-gold-600/40 bg-navy-800 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
            <div className="min-w-0">
              <p className="text-gold-400 font-bold text-sm" style={{ fontFamily: "'Cinzel', serif" }}>
                Lucky Pearl Support
              </p>
              <p className="text-pearl-300/60 text-[11px]">Send us a message. We&apos;ll reply here.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenPersisted(false)}
              aria-label="Close chat"
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-pearl-300/70 hover:text-pearl-100 hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2"
          >
            {messages.length === 0 ? (
              <div className="text-pearl-300/60 text-sm text-center mt-8 px-4 space-y-2">
                <p>No messages yet. Ask us anything about deposits, cashouts or your account.</p>
                {isGuest && (
                  <p className="text-xs">
                    Not logged in? Add your phone number or email in your message so we can reach you if you close this page.
                  </p>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.fromSupport ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                      message.fromSupport
                        ? 'bg-white/10 text-pearl-100 rounded-bl-md'
                        : 'bg-gold-gradient text-navy-900 rounded-br-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`text-[10px] mt-1 ${message.fromSupport ? 'text-pearl-300/50' : 'text-navy-900/60'}`}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="border-t border-white/10 p-3">
            {error && <p className="text-red-300 text-xs mb-2">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => updateDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Type a message…"
                aria-label="Message"
                className="flex-1 min-w-0 max-h-28 rounded-xl bg-navy-900 border border-gold-600/25 px-3 py-2.5 text-base sm:text-sm text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-gold-gradient text-navy-900 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* On phones the open panel covers the bubble, so only show the bubble when closed there. */}
      <button
        type="button"
        onClick={() => setOpenPersisted(!open)}
        aria-label={open ? 'Close chat' : unreadCount > 0 ? `Open chat, ${unreadCount} new` : 'Open chat'}
        className={`fixed z-40 right-4 w-14 h-14 rounded-full bg-gold-gradient text-navy-900 shadow-[0_6px_24px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform hover:scale-105 ${
          open ? 'hidden sm:flex' : ''
        } ${bubbleHiddenBelowLg ? 'max-lg:hidden' : ''} ${!open && unreadCount > 0 ? 'animate-pulse-gold' : ''}`}
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
