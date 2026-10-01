import { db } from './db';
import { getEasternDayRangeUtc, toSqliteDateTime } from './easternDay';

// Birthday & holiday bonus: $5 per qualifying deposit, up to 5 deposits ($25
// total), inside a 1-week window that starts on the holiday / birthday.
export const BONUS_PER_DEPOSIT_CENTS = 500;
export const MIN_QUALIFYING_DEPOSIT_CENTS = 1_000;
export const MAX_BONUS_DEPOSITS = 5;
export const BONUS_WINDOW_DAYS = 7;
export const MAX_BONUS_CENTS = BONUS_PER_DEPOSIT_CENTS * MAX_BONUS_DEPOSITS;

const EASTERN_TIMEZONE = 'America/New_York';

type Ymd = { year: number; month: number; day: number };

// Lunar New Year moves every year; add more years here as needed.
const LUNAR_NEW_YEAR: Record<number, [number, number]> = {
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
};

function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return 1 + ((weekday - firstWeekday + 7) % 7) + (n - 1) * 7;
}

function lastMonday(year: number, month: number): number {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weekday = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  return lastDay - ((weekday - 1 + 7) % 7);
}

export type Holiday = { name: string; emoji: string; date: Ymd };

function holidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { name: "New Year's Day", emoji: '🎆', date: { year, month: 1, day: 1 } },
    { name: 'Memorial Day', emoji: '🇺🇸', date: { year, month: 5, day: lastMonday(year, 5) } },
    { name: '4th of July', emoji: '🎇', date: { year, month: 7, day: 4 } },
    { name: 'Thanksgiving', emoji: '🦃', date: { year, month: 11, day: nthWeekday(year, 11, 4, 4) } },
    { name: 'Christmas', emoji: '🎄', date: { year, month: 12, day: 25 } },
  ];
  const lunar = LUNAR_NEW_YEAR[year];
  if (lunar) {
    holidays.push({ name: 'Lunar New Year', emoji: '🧧', date: { year, month: lunar[0], day: lunar[1] } });
  }
  return holidays;
}

export type BonusWindow = {
  // Stable id for payout tracking, e.g. "holiday:2026-07-04" or "birthday:2026-03-05".
  key: string;
  kind: 'holiday' | 'birthday';
  title: string;
  emoji: string;
  startUtc: Date;
  endUtc: Date;
};

// Midnight US-Eastern at the start of the given calendar day (offset by dayOffset days).
function easternMidnightUtc({ year, month, day }: Ymd, dayOffset = 0): Date {
  // Noon UTC is always the same calendar day in Eastern time, which keeps this DST-safe.
  return getEasternDayRangeUtc(new Date(Date.UTC(year, month - 1, day + dayOffset, 12))).startUtc;
}

function windowStartingOn(date: Ymd) {
  return { startUtc: easternMidnightUtc(date), endUtc: easternMidnightUtc(date, BONUS_WINDOW_DAYS) };
}

function easternYear(now: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: EASTERN_TIMEZONE, year: 'numeric' }).format(now));
}

function ymdKey({ year, month, day }: Ymd): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Holiday windows that have started and haven't ended more than `lookbackDays`
 * ago. With lookbackDays = 0 that is just the window open right now (if any).
 */
export function listHolidayWindows(now: Date = new Date(), lookbackDays = 0): BonusWindow[] {
  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  const year = easternYear(now);
  const windows: BonusWindow[] = [];
  for (const y of [year - 1, year]) {
    for (const holiday of holidaysForYear(y)) {
      const { startUtc, endUtc } = windowStartingOn(holiday.date);
      if (now >= startUtc && endUtc.getTime() > cutoff) {
        windows.push({
          key: `holiday:${ymdKey(holiday.date)}`,
          kind: 'holiday',
          title: holiday.name,
          emoji: holiday.emoji,
          startUtc,
          endUtc,
        });
      }
    }
  }
  return windows;
}

/** The holiday bonus window we're in right now (holiday + the following 6 days), if any. */
export function getActiveHolidayWindow(now: Date = new Date()): BonusWindow | null {
  return listHolidayWindows(now, 0)[0] ?? null;
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Birthday windows (`birthday` is "MM-DD") that have started and haven't ended
 * more than `lookbackDays` ago. The birthday has to have been saved before the
 * window opens, so signing up (or entering a birthday) on the day itself
 * doesn't qualify until next year.
 */
export function listBirthdayWindows(
  birthday: string | null,
  birthdaySetAt: string | null,
  now: Date = new Date(),
  lookbackDays = 0
): BonusWindow[] {
  if (!birthday || !birthdaySetAt) return [];
  const match = /^(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return [];
  const month = Number(match[1]);
  const rawDay = Number(match[2]);
  const setAt = new Date(birthdaySetAt.replace(' ', 'T') + 'Z');
  const cutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;

  const year = easternYear(now);
  const windows: BonusWindow[] = [];
  for (const y of [year - 1, year]) {
    // Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
    const day = month === 2 && rawDay === 29 && !isLeapYear(y) ? 28 : rawDay;
    const date = { year: y, month, day };
    const { startUtc, endUtc } = windowStartingOn(date);
    if (now >= startUtc && endUtc.getTime() > cutoff && setAt <= startUtc) {
      windows.push({
        key: `birthday:${ymdKey(date)}`,
        kind: 'birthday',
        title: 'Birthday Bonus',
        emoji: '\u{1F382}',
        startUtc,
        endUtc,
      });
    }
  }
  return windows;
}

/** The birthday bonus window we're in right now, if any. */
export function getActiveBirthdayWindow(
  birthday: string | null,
  birthdaySetAt: string | null,
  now: Date = new Date()
): BonusWindow | null {
  return listBirthdayWindows(birthday, birthdaySetAt, now, 0)[0] ?? null;
}

export type BonusProgress = { qualifyingDeposits: number; earnedCents: number };

/** Qualifying deposits (>= $10) the customer's payments have recorded inside the window. */
export async function getBonusProgress(userId: string, window: BonusWindow): Promise<BonusProgress> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM deposits
          WHERE user_id = ? AND amount_cents >= ? AND created_at >= ? AND created_at < ?`,
    args: [userId, MIN_QUALIFYING_DEPOSIT_CENTS, toSqliteDateTime(window.startUtc), toSqliteDateTime(window.endUtc)],
  });
  const qualifyingDeposits = Math.min(MAX_BONUS_DEPOSITS, Number(result.rows[0]?.n ?? 0));
  return { qualifyingDeposits, earnedCents: qualifyingDeposits * BONUS_PER_DEPOSIT_CENTS };
}

export function isValidBirthday(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1) return false;
  // Year 2000 is a leap year, so Feb 29 is allowed.
  return day <= new Date(Date.UTC(2000, month, 0)).getUTCDate();
}

export function formatBirthday(birthday: string): string {
  const [month, day] = birthday.split('-').map(Number);
  return new Date(Date.UTC(2000, month - 1, day)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
  });
}
