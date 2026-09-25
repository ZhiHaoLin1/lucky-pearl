export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokens(name: string): string[] {
  return normalizeName(name).split(' ').filter(Boolean);
}

function firstToken(name: string): string {
  return tokens(name)[0] ?? '';
}

function lastToken(name: string): string {
  const parts = tokens(name);
  return parts[parts.length - 1] ?? '';
}

/** Levenshtein edit distance — small, dependency-free, fine for name-length strings. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

const FUZZY_MAX_DISTANCE = 2;

export type NameMatchResult<T> =
  | { status: 'matched'; customer: T }
  | { status: 'no_match' }
  | { status: 'ambiguous' };

type Candidate = { username: unknown };

/**
 * Matches a parsed name (from a Square note or a payment notification email)
 * against known customers, from strictest to most lenient:
 *   1. Exact match on username or full name.
 *   2. First-name-only match.
 *   3. First name exact + last name loosely equal (handles a dropped middle
 *      name or a compound/hyphenated surname typed partially).
 *   4. Typo-tolerant fuzzy match (edit distance <= 2) against full name,
 *      "first + last" (middle name stripped), and username.
 *
 * At every pass, a unique match resolves immediately; more than one
 * candidate at a pass makes the whole thing ambiguous (looser passes would
 * only add more candidates, never fewer, so there's no point continuing).
 * Only a pass with zero candidates falls through to the next, more lenient
 * pass. This attributes real money, so guessing between look-alikes is never
 * acceptable — only manual review is, when it's not clearly one person.
 */
export function matchCustomerByName<T extends { id: unknown; full_name: unknown } & Candidate>(
  candidates: T[],
  parsedName: string
): NameMatchResult<T> {
  const target = normalizeName(parsedName);
  const resolve = (matches: T[]): NameMatchResult<T> | null => {
    if (matches.length === 1) return { status: 'matched', customer: matches[0] };
    if (matches.length > 1) return { status: 'ambiguous' };
    return null;
  };

  // Pass 1: exact match on username or full name.
  const exact =
    resolve(
      candidates.filter((row) => {
        const username = row.username ? normalizeName(String(row.username)) : null;
        return normalizeName(String(row.full_name)) === target || username === target;
      })
    ) ?? null;
  if (exact) return exact;

  // Pass 2: first name only (e.g. note just says "Cindy").
  const firstOnly = resolve(candidates.filter((row) => firstToken(String(row.full_name)) === target));
  if (firstOnly) return firstOnly;

  // Pass 3: first name exact, last name loosely equal (substring either way).
  const targetFirst = firstToken(target);
  const targetLast = lastToken(target);
  const firstLast = resolve(
    candidates.filter((row) => {
      const rowFirst = firstToken(String(row.full_name));
      const rowLast = lastToken(String(row.full_name));
      if (!targetFirst || !targetLast || !rowLast) return false;
      const lastMatches = rowLast === targetLast || rowLast.includes(targetLast) || targetLast.includes(rowLast);
      return rowFirst === targetFirst && lastMatches;
    })
  );
  if (firstLast) return firstLast;

  // Pass 4: typo-tolerant fuzzy match against full name, first+last, or username.
  const fuzzy = resolve(
    candidates.filter((row) => {
      const full = normalizeName(String(row.full_name));
      const firstLastOnly = [firstToken(full), lastToken(full)].filter(Boolean).join(' ');
      const username = row.username ? normalizeName(String(row.username)) : null;

      const distances = [editDistance(target, full), editDistance(target, firstLastOnly)];
      if (username) distances.push(editDistance(target, username));

      return Math.min(...distances) <= FUZZY_MAX_DISTANCE;
    })
  );
  if (fuzzy) return fuzzy;

  return { status: 'no_match' };
}
