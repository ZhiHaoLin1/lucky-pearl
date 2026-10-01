'use client';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const selectClass =
  'w-full rounded-xl bg-navy-900 border border-gold-600/25 px-3 py-3.5 text-base text-pearl-100 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30';

// Month + day pickers (no year). Values are strings so "" means "not chosen".
export default function BirthdaySelect({
  month,
  day,
  onChange,
}: {
  month: string;
  day: string;
  onChange: (next: { month: string; day: string }) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <select
        aria-label="Birth month"
        value={month}
        onChange={(event) => onChange({ month: event.target.value, day })}
        className={selectClass}
      >
        <option value="">Month</option>
        {MONTHS.map((name, index) => (
          <option key={name} value={String(index + 1)}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="Birth day"
        value={day}
        onChange={(event) => onChange({ month, day: event.target.value })}
        className={selectClass}
      >
        <option value="">Day</option>
        {Array.from({ length: 31 }, (_, index) => (
          <option key={index + 1} value={String(index + 1)}>
            {index + 1}
          </option>
        ))}
      </select>
    </div>
  );
}
