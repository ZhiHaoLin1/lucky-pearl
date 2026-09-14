const EASTERN_TIMEZONE = 'America/New_York';

function getEasternOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === '24' ? '0' : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

/** UTC start/end instants for "today" as measured in US Eastern time. */
export function getEasternDayRangeUtc(date: Date = new Date()): { startUtc: Date; endUtc: Date } {
  const offsetMinutes = getEasternOffsetMinutes(date);
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number);

  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60000);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

/** Formats a Date as the "YYYY-MM-DD HH:MM:SS" string SQLite's datetime('now') produces (UTC, no offset). */
export function toSqliteDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}
