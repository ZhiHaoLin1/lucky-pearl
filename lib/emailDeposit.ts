// Parses Venmo and Zelle (via Discover) "you got paid" notification emails
// into a deposit candidate. Unlike the Square webhook, these emails have no
// cryptographic signature — Venmo/Zelle/banks don't offer one for personal
// notification mail — so safety here comes from two things instead:
//   1. Strict, specific pattern matching on subject + a known body phrase.
//      A subject/body combination this exact is not something spam or an
//      unrelated email would produce by chance.
//   2. For Venmo specifically, requiring the email say the money was sent to
//      our own known Venmo handle, not just that it mentions a payment.
// Anything that doesn't match these patterns is ignored outright (it's not
// treated as "needs review" — it's simply not a payment notification). Only
// emails that DO match the pattern but then fail to yield a usable
// name/amount/dedup-id go to manual review, since that suggests the
// template changed rather than that the email is irrelevant.

export type ParsedDepositEmail = {
  status: 'parsed';
  source: 'venmo' | 'zelle';
  name: string;
  amountCents: number;
  messageId: string;
};

export type UnparseableDepositEmail = {
  status: 'unparseable';
  source: 'venmo' | 'zelle';
};

// Venmo account that receives these payments — see HowToDepositCard.tsx.
const OWN_VENMO_HANDLE = 'yiranstudios';

function parseAmountToCents(amountStr: string): number | null {
  const amount = Number(amountStr.replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

const ZELLE_SUBJECT_RE = /^Notification - (.+?) sent you \$([\d,]+\.\d{2})\.?\s*$/i;
const ZELLE_BODY_MARKER_RE = /will be automatically deposited to your account/i;
const ZELLE_REFERENCE_RE = /ReferenceID\s*\((\d+)\)/i;

function parseZelleDiscoverEmail(
  subject: string,
  text: string
): ParsedDepositEmail | UnparseableDepositEmail | null {
  const subjectMatch = subject.match(ZELLE_SUBJECT_RE);
  if (!subjectMatch) return null;

  if (!ZELLE_BODY_MARKER_RE.test(text)) return { status: 'unparseable', source: 'zelle' };

  const referenceMatch = text.match(ZELLE_REFERENCE_RE);
  if (!referenceMatch) return { status: 'unparseable', source: 'zelle' };

  const amountCents = parseAmountToCents(subjectMatch[2]);
  const name = subjectMatch[1].trim();
  if (!amountCents || !name) return { status: 'unparseable', source: 'zelle' };

  return { status: 'parsed', source: 'zelle', name, amountCents, messageId: `zelle-${referenceMatch[1]}` };
}

const VENMO_SUBJECT_RE = /^(.+?) paid you \$([\d,]+\.\d{2})\s*$/i;
const VENMO_BODY_MARKER_RE = /Money credited to your Venmo account/i;
// Whitespace between a label and its value is unpredictable once HTML is
// stripped (Venmo's template sometimes has none at all, e.g. "Transaction
// ID4693816...") — \s* rather than \s+ so either is fine.
const VENMO_TRANSACTION_RE = /Transaction ID\s*(\d+)/i;
const VENMO_SENT_TO_RE = /Sent to\s*@?([\w.\-]+)/i;

function parseVenmoEmail(subject: string, text: string): ParsedDepositEmail | UnparseableDepositEmail | null {
  const subjectMatch = subject.match(VENMO_SUBJECT_RE);
  if (!subjectMatch) return null;

  if (!VENMO_BODY_MARKER_RE.test(text)) return { status: 'unparseable', source: 'venmo' };

  const sentToMatch = text.match(VENMO_SENT_TO_RE);
  if (!sentToMatch || sentToMatch[1].toLowerCase() !== OWN_VENMO_HANDLE.toLowerCase()) {
    return { status: 'unparseable', source: 'venmo' };
  }

  const transactionMatch = text.match(VENMO_TRANSACTION_RE);
  if (!transactionMatch) return { status: 'unparseable', source: 'venmo' };

  const amountCents = parseAmountToCents(subjectMatch[2]);
  const name = subjectMatch[1].trim();
  if (!amountCents || !name) return { status: 'unparseable', source: 'venmo' };

  return { status: 'parsed', source: 'venmo', name, amountCents, messageId: `venmo-${transactionMatch[1]}` };
}

/**
 * Tries each known notification format against a forwarded email's subject
 * and plain-text body.
 *   - Returns a ParsedDepositEmail on a full, confident parse.
 *   - Returns 'unparseable' when the subject looks like a real notification
 *     (matches the exact pattern) but a required detail is missing — this
 *     goes to manual review rather than being silently dropped, since it
 *     likely means the template changed.
 *   - Returns null when nothing recognizable matched at all — treated as
 *     irrelevant mail, not queued for review.
 */
export function parseDepositEmail(
  subject: string,
  text: string
): ParsedDepositEmail | UnparseableDepositEmail | null {
  const zelle = parseZelleDiscoverEmail(subject, text);
  if (zelle) return zelle;

  const venmo = parseVenmoEmail(subject, text);
  if (venmo) return venmo;

  return null;
}
