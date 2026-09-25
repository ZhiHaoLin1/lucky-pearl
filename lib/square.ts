import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Square signs webhooks over (notification URL + raw body), not just the body —
 * unlike most webhook providers. The URL must match byte-for-byte what's
 * configured in the Square dashboard for this subscription.
 */
export function verifySquareSignature(
  notificationUrl: string,
  rawBody: string,
  signatureHeader: string | null,
  signatureKey: string
): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', signatureKey)
    .update(notificationUrl + rawBody)
    .digest('base64');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export type ParsedSquareNote = {
  platform: string;
  amountCents: number;
  name: string;
};

/** Parses the "PLATFORM:AMOUNT:NAME" note format, e.g. "GD:50:Cindy Little". */
export function parseSquareNote(note: string | null | undefined): ParsedSquareNote | null {
  if (!note) return null;
  const parts = note.split(':').map((part) => part.trim());
  if (parts.length !== 3) return null;

  const [platform, amountStr, name] = parts;
  const amount = Number(amountStr);
  if (!platform || !name || !Number.isFinite(amount) || amount <= 0) return null;

  return { platform, amountCents: Math.round(amount * 100), name };
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type NameMatchResult<T> =
  | { status: 'matched'; customer: T }
  | { status: 'no_match' }
  | { status: 'ambiguous' };

/**
 * Matches a parsed name against known customers by exact full-name match, then
 * by first-name-only. Only resolves when exactly one candidate matches at
 * whichever pass first finds any — ambiguous or empty results are left to
 * manual review rather than guessed at, since this attributes real money.
 */
export function matchCustomerByName<T extends { id: unknown; full_name: unknown }>(
  candidates: T[],
  parsedName: string
): NameMatchResult<T> {
  const target = normalizeName(parsedName);

  const exact = candidates.filter((row) => normalizeName(String(row.full_name)) === target);
  if (exact.length === 1) return { status: 'matched', customer: exact[0] };
  if (exact.length > 1) return { status: 'ambiguous' };

  const firstNameOnly = candidates.filter((row) => {
    const firstName = normalizeName(String(row.full_name)).split(' ')[0];
    return firstName === target;
  });
  if (firstNameOnly.length === 1) return { status: 'matched', customer: firstNameOnly[0] };
  if (firstNameOnly.length > 1) return { status: 'ambiguous' };

  return { status: 'no_match' };
}
