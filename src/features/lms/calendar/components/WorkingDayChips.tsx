import { WEEKDAYS, type Weekday } from '../types/calendar.types';

/* Monday to Sunday as seven small chips, the working ones highlighted (read-only). */
export default function WorkingDayChips({ days }: { days: readonly Weekday[] }) {
  return (
    <span className="f ac gp4 wrap" role="list" aria-label="Working days">
      {WEEKDAYS.map((d) => {
        const on = days.includes(d.code);
        return (
          <span
            key={d.code}
            role="listitem"
            title={`${d.label}: ${on ? 'working day' : 'not a working day'}`}
            aria-label={`${d.label}: ${on ? 'working day' : 'not a working day'}`}
            className="fs12"
            style={{
              padding: '1px 7px',
              borderRadius: 999,
              border: '1px solid ' + (on ? 'var(--green)' : 'var(--border)'),
              background: on ? 'var(--green-bg)' : 'transparent',
              color: on ? 'var(--green)' : 'var(--muted)',
              fontWeight: on ? 600 : 400,
              textDecoration: on ? undefined : 'line-through',
            }}
          >
            {d.short}
          </span>
        );
      })}
    </span>
  );
}
