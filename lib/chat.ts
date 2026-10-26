import { createHash, randomBytes, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { db } from './db';
import { getSessionUser, type SessionUser } from './auth';

// Visitors who aren't logged in chat as a "guest": a random token in an httpOnly
// cookie, stored in messages.user_id as "guest:<token>". When they log in or sign
// up, their guest messages are moved onto their account.
export const GUEST_COOKIE = 'lp_guest';
const GUEST_PREFIX = 'guest:';
const GUEST_TOKEN_PATTERN = /^[a-f0-9]{48}$/;
const GUEST_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const MAX_CHAT_MESSAGE_LENGTH = 1000;

export type ChatIdentity = {
  conversationId: string; // messages.user_id
  user: SessionUser | null;
  guestToken: string | null;
};

export function isGuestConversation(conversationId: string) {
  return conversationId.startsWith(GUEST_PREFIX);
}

async function readGuestToken(): Promise<string | null> {
  const token = cookies().get(GUEST_COOKIE)?.value;
  return token && GUEST_TOKEN_PATTERN.test(token) ? token : null;
}

/** Who is chatting: the logged-in customer, an existing guest, or (if `create`) a brand new guest. */
export async function resolveChatIdentity(create: boolean): Promise<{ identity: ChatIdentity | null; newGuestToken: string | null }> {
  const user = await getSessionUser();
  if (user) {
    return { identity: { conversationId: user.id, user, guestToken: null }, newGuestToken: null };
  }
  const existing = await readGuestToken();
  if (existing) {
    return { identity: { conversationId: GUEST_PREFIX + existing, user: null, guestToken: existing }, newGuestToken: null };
  }
  if (!create) return { identity: null, newGuestToken: null };
  const token = randomBytes(24).toString('hex');
  return { identity: { conversationId: GUEST_PREFIX + token, user: null, guestToken: token }, newGuestToken: token };
}

export function setGuestCookie(response: NextResponse, token: string) {
  response.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GUEST_MAX_AGE_SECONDS,
  });
}

/** After login/signup: move this browser's guest chat onto the account and forget the guest cookie. */
export async function claimGuestMessages(response: NextResponse, userId: string) {
  const token = await readGuestToken();
  if (!token) return;
  try {
    await db.execute({
      sql: 'UPDATE messages SET user_id = ? WHERE user_id = ?',
      args: [userId, GUEST_PREFIX + token],
    });
  } catch {
    // Never block a login over this.
  }
  response.cookies.set(GUEST_COOKIE, '', { path: '/', maxAge: 0 });
}

const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 24);

/**
 * Throttles unauthenticated spam into Discord: per conversation and per IP.
 * Returns true if the message may go through (and records it).
 */
export async function allowChatMessage(conversationId: string, ip: string | null): Promise<boolean> {
  const keys = [{ key: 'c:' + hash(conversationId), perMinute: 6, perHour: 60 }];
  if (ip) keys.push({ key: 'ip:' + hash(ip), perMinute: 12, perHour: 120 });

  for (const { key, perMinute, perHour } of keys) {
    const result = await db.execute({
      sql: `SELECT
              COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-1 minute') THEN 1 ELSE 0 END), 0) AS m,
              COUNT(*) AS h
            FROM chat_rate_events WHERE key = ? AND created_at >= datetime('now', '-1 hour')`,
      args: [key],
    });
    if (Number(result.rows[0]?.m ?? 0) >= perMinute || Number(result.rows[0]?.h ?? 0) >= perHour) return false;
  }

  for (const { key } of keys) {
    await db.execute({ sql: 'INSERT INTO chat_rate_events (key) VALUES (?)', args: [key] });
  }
  // Keep the table small.
  if (Math.random() < 0.05) {
    await db.execute("DELETE FROM chat_rate_events WHERE created_at < datetime('now', '-2 days')");
  }
  return true;
}

export async function saveCustomerMessage(conversationId: string, text: string) {
  await db.execute({
    sql: 'INSERT INTO messages (id, user_id, sender_admin_id, body) VALUES (?, ?, NULL, ?)',
    args: [randomUUID(), conversationId, text],
  });
}

/** A reply typed in Discord, stored as a support message on the conversation. */
export async function saveSupportReply(conversationId: string, discordUserId: string, text: string) {
  await db.execute({
    sql: 'INSERT INTO messages (id, user_id, sender_admin_id, body) VALUES (?, ?, ?, ?)',
    args: [randomUUID(), conversationId, `discord:${discordUserId}`, text],
  });
}
