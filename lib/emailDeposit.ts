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
// The block between the main sentence and the disclaimer is either a
// personal message the sender typed (e.g. their real name, when their
// Zelle/bank account is registered under a different name — a business
// name, a nickname) or, if they didn't add one, Discover just repeats the
// account name there next to an "Access Account" link. Only the first case
// is a real memo worth preferring over the account name.
const ZELLE_MEMO_RE = /will be automatically deposited to your account\.\s*([\s\S]*?)\s*Discover is not responsible/i;

function extractZelleMemo(text: string, accountName: string): string | null {
  const match = text.match(ZELLE_MEMO_RE);
  if (!match) return null;
  const memo = match[1].replace(/Access Account/gi, '').replace(/\s+/g, ' ').trim();
  if (!memo) return null;
  if (memo.toLowerCase() === accountName.toLowerCase()) return null;
  return memo;
}

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
  const accountName = subjectMatch[1].trim();
  if (!amountCents || !accountName) return { status: 'unparseable', source: 'zelle' };

  // Prefer a personal-message memo over the Zelle account's own display
  // name — see HowToDepositCard.tsx, which asks customers to put their
  // real name in the note, since their bank/Zelle account may be
  // registered under a business name or nickname instead.
  const name = extractZelleMemo(text, accountName) ?? accountName;

  return { status: 'parsed', source: 'zelle', name, amountCents, messageId: `zelle-${referenceMatch[1]}` };
}

const VENMO_SUBJECT_RE = /^(.+?) paid you \$([\d,]+\.\d{2})\s*$/i;
const VENMO_BODY_MARKER_RE = /Money credited to your Venmo account/i;
// Whitespace between a label and its value is unpredictable once HTML is
// stripped (Venmo's template sometimes has none at all, e.g. "Transaction
// ID4693816...") — \s* rather than \s+ so either is fine.
const VENMO_TRANSACTION_RE = /Transaction ID\s*(\d+)/i;
const VENMO_SENT_TO_RE = /Sent to\s*@?([\w.\-]+)/i;
// Venmo's "For {caption}" note, which appears once near the top of the
// email, before "See transaction"/"Money credited...". The footer also
// has an unrelated "For any issues, including..." disclaimer sentence, so
// the search is deliberately restricted to before that cutoff to avoid
// matching it instead.
const VENMO_MEMO_CUTOFF_RE = /See transaction|Money credited to your Venmo account/i;
const VENMO_MEMO_RE = /\bFor\s+(.+?)\s*$/i;

function extractVenmoMemo(text: string): string | null {
  const cutoffIndex = text.search(VENMO_MEMO_CUTOFF_RE);
  const searchArea = cutoffIndex >= 0 ? text.slice(0, cutoffIndex) : text;
  const match = searchArea.match(VENMO_MEMO_RE);
  if (!match) return null;
  const memo = match[1].replace(/\s+/g, ' ').trim();
  return memo || null;
}

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
  const accountName = subjectMatch[1].trim();
  if (!amountCents || !accountName) return { status: 'unparseable', source: 'venmo' };

  // Prefer the "For {caption}" note over the Venmo account's own display
  // name, same reasoning as the Zelle side — see HowToDepositCard.tsx.
  const name = extractVenmoMemo(text) ?? accountName;

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
