export type EventCard = {
  id: string;
  emoji: string;
  name: string;
  description: string | null;
  status: 'running' | 'upcoming';
  startsLabel: string;
  endsLabel: string;
  perDepositCents: number;
  minDepositCents: number;
  maxDeposits: number;
  minTierLabel: string; // e.g. "Everyone", "Gold and above"
  minTierName: string;
  eligible: boolean;
};

export type MemberBonusInfo = {
  birthdayLabel: string | null; // "March 5", or null if not saved yet
  birthdayEligible: boolean;
  nextHolidayLabel: string; // "4th of July · Saturday, July 4"
  holidayEligible: boolean;
};

const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

function EventCardView({ event }: { event: EventCard }) {
  const maxBonusCents = event.perDepositCents * event.maxDeposits;
  return (
    <div className="rounded-xl border border-gold-500/30 bg-navy-900/60 p-4 sm:p-5 text-left">
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0" aria-hidden>
          {event.emoji}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gold-400">{event.name}</h3>
          <p className="text-pearl-300/70 text-sm">
            {event.status === 'running' ? `Happening now · ends ${event.endsLabel}` : `Starts ${event.startsLabel} · ends ${event.endsLabel}`}
          </p>
        </div>
      </div>
      {event.description && <p className="text-pearl-200/80 text-sm mt-3">{event.description}</p>}
      <p className="text-pearl-100 text-sm mt-3">
        Earn <span className="text-gold-400 font-semibold">{dollars(event.perDepositCents)}</span> on each of your next{' '}
        {event.maxDeposits} deposits of {dollars(event.minDepositCents)} or more (up to{' '}
        <span className="text-gold-400 font-semibold">{dollars(maxBonusCents)}</span>).
      </p>
      <p className="text-sm mt-2 text-emerald-300">
        {event.status === 'running'
          ? `You're in! Track your progress on the ${event.emoji} ${event.name} tab above.`
          : "You're eligible. A tab with your progress will appear when it starts."}
      </p>
    </div>
  );
}

// Always-visible "what's going on" page so customers know about events and bonuses
// before the progress tabs appear.
export default function EventsTab({ events, member }: { events: EventCard[]; member: MemberBonusInfo }) {
  const running = events.filter((event) => event.status === 'running');
  const upcoming = events.filter((event) => event.status === 'upcoming');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
          Happening now
        </h2>
        {running.length > 0 ? (
          <div className="space-y-3">
            {running.map((event) => (
              <EventCardView key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-pearl-300/70 text-sm">No special events right now. New ones are announced here, so check back soon.</p>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
            Coming soon
          </h2>
          <div className="space-y-3">
            {upcoming.map((event) => (
              <EventCardView key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gold-600/25 bg-navy-800/60 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
          Your member bonuses
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-pearl-100 font-semibold">🎂 Birthday bonus</p>
            <p className="text-pearl-300/70">
              On your birthday week, earn $5 on each of your next 5 deposits of $10 or more (up to $25). Jade members and above.
            </p>
            <p className="text-pearl-300/70 mt-1">
              {!member.birthdayEligible
                ? 'Reach Jade to unlock it.'
                : member.birthdayLabel
                ? `Your birthday: ${member.birthdayLabel}.`
                : 'Add your birthday in the Overview tab so we can unlock it. It can only be set once.'}
            </p>
          </div>
          <div>
            <p className="text-pearl-100 font-semibold">🎉 Holiday bonus</p>
            <p className="text-pearl-300/70">
              On 6 major holidays a year, earn $5 on each of your next 5 deposits of $10 or more (up to $25) during the holiday week. Gold
              members and above.
            </p>
            <p className="text-pearl-300/70 mt-1">
              {member.holidayEligible ? `Next up: ${member.nextHolidayLabel}.` : 'Reach Gold to unlock it.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
