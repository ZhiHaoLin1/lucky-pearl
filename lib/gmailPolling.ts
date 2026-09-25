// Minimal Gmail API client (plain fetch, no googleapis dependency) used to
// poll a single mailbox for Venmo/Zelle payment notifications, since we
// don't have a working inbound-email-to-webhook provider (Twilio/SendGrid
// closed the account on signup, likely over the gambling-adjacent
// vertical). Uses a long-lived refresh token for one Gmail account,
// obtained once via scripts/gmail-oauth-setup.mjs.
//
// Strictly read-only (gmail.readonly scope) and deliberately never writes
// anything back to the mailbox — no mark-as-read, no labels. That inbox has
// a separate, independent poller also reading it for other purposes, and
// this one must never mutate shared mailbox state (read/unread, labels)
// that the other system might also depend on. Our own database is the only
// place "already processed" is tracked (see emailDepositProcessor.ts).

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    mimeType?: string;
    body?: { data?: string };
    parts?: GmailMessagePart[];
  };
};

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Gmail OAuth env vars are not configured.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to refresh Gmail access token: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * IDs of recent messages that look like they could be a Venmo/Zelle deposit
 * notification. Scoped tightly on purpose: the account also gets plenty of
 * OTHER Zelle mail from this same sender (outgoing payouts, payment
 * requests, "Action Required" reminders) that we should never mistake for a
 * deposit. subject:"sent you" / subject:"paid you" excludes all of that —
 * only a received-payment notification uses that exact phrasing.
 *
 * Deliberately NOT filtered to is:unread and never mutates anything in the
 * mailbox (see the module comment) — this inbox has a separate, independent
 * poller reading the same mail, and this one must never affect what that
 * one sees. Re-seeing an already-handled message every poll is fine; our
 * own database (email_message_id) is what prevents double-processing it.
 */
export async function listCandidateMessageIds(accessToken: string): Promise<string[]> {
  const query = '((from:zelle.discover.com subject:"sent you") OR (from:venmo.com subject:"paid you")) newer_than:2d';
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=25`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Failed to list Gmail messages: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { messages?: Array<{ id: string }> };
  return (data.messages ?? []).map((m) => m.id);
}

function findTextPart(part: GmailMessagePart | undefined, mimeType: string): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return part.body.data;
  for (const child of part.parts ?? []) {
    const found = findTextPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf-8');
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export async function getMessage(
  accessToken: string,
  id: string
): Promise<{ from: string; subject: string; text: string }> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`Failed to fetch Gmail message ${id}: ${response.status} ${await response.text()}`);
  }
  const message = (await response.json()) as GmailMessage;

  const headers = message.payload?.headers ?? [];
  const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value ?? '';
  const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value ?? '';

  const plainData = findTextPart(message.payload as GmailMessagePart, 'text/plain');
  if (plainData) {
    return { from, subject, text: decodeBase64Url(plainData) };
  }
  const htmlData = findTextPart(message.payload as GmailMessagePart, 'text/html');
  if (htmlData) {
    return { from, subject, text: stripHtml(decodeBase64Url(htmlData)) };
  }
  return { from, subject, text: '' };
}

