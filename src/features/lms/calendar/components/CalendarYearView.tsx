import type { CSSProperties } from 'react';
import { WEEKDAYS, type Weekday } from '../types/calendar.types';
import { MONTH_NAMES, isIsoDate, weekdayOf } from '../validation/calendarDates';

interface CalendarYearViewProps {
  validFrom: string;
  validTo: string;
  workingDays: readonly Weekday[];
  holidays: readonly { date: string; name: string }[];
}

/* A long period is cut here; the holidays table still lists every holiday. */
const MAX_MONTHS = 24;

const pad = (n: number) => String(n).padStart(2, '0');

type DayKind = 'outside' | 'holiday' | 'off' | 'working';

const CELL: Record<DayKind, CSSProperties> = {
  outside: { color: 'var(--border-strong)' },
  holiday: { background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 700 },
  off: { background: 'var(--grey-bg)', color: 'var(--muted)' },
  working: { color: 'var(--text)' },
};

const KIND_TEXT: Record<DayKind, string> = {
  outside: 'outside the calendar period',
  holiday: 'holiday',
  off: 'not a working day',
  working: 'working day',
};

function Legend() {
  const items: [DayKind, string][] = [
    ['working', 'Working day'],
    ['off', 'Non-working day'],
    ['holiday', 'Holiday'],
    ['outside', 'Outside the period'],
  ];
  return (
    <div className="f ac gp8 wrap fs12 mb14" aria-hidden="true">
      {items.map(([k, l]) => (
        <span key={k} className="f ac gp4">
          <span style={{ ...CELL[k], display: 'inline-block', width: 18, height: 18, lineHeight: '18px', textAlign: 'center', borderRadius: 4, border: '1px solid var(--border)' }}>
            1
          </span>
          {l}
        </span>
      ))}
    </div>
  );
}

/*
 * L-05 "year view": every month of the calendar period as a Monday-first month grid, showing working days,
 * non-working days and holidays (the holiday name on hover).
 */
export default function CalendarYearView({ validFrom, validTo, workingDays, holidays }: CalendarYearViewProps) {
  if (!isIsoDate(validFrom) || !isIsoDate(validTo) || validTo < validFrom) return null;
  const holidayNames = new Map(holidays.map((h) => [h.date, h.name]));
  const working = new Set(workingDays);

  const months: { y: number; m: number }[] = [];
  let y = Number(validFrom.slice(0, 4));
  let m = Number(validFrom.slice(5, 7)) - 1;
  const endKey = Number(validTo.slice(0, 4)) * 12 + Number(validTo.slice(5, 7)) - 1;
  while (y * 12 + m <= endKey && months.length < MAX_MONTHS) {
    months.push({ y, m });
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  const cut = y * 12 + m <= endKey;

  return (
    <>
      <Legend />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
        {months.map(({ y: year, m: month }) => {
          const first = `${year}-${pad(month + 1)}-01`;
          const lead = WEEKDAYS.findIndex((d) => d.code === weekdayOf(first));
          const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
          const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`)];
          while (cells.length % 7) cells.push(null);
          const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
          const label = `${MONTH_NAMES[month]} ${year}`;
          return (
            <table key={label} aria-label={label} style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 2, tableLayout: 'fixed' }}>
              <caption className="fs12" style={{ fontWeight: 700, textAlign: 'left', paddingBottom: 4, color: 'var(--text-2)' }}>{label}</caption>
              <thead>
                <tr>
                  {WEEKDAYS.map((d) => (
                    <th key={d.code} scope="col" abbr={d.label} className="fs12 muted" style={{ fontWeight: 600, textAlign: 'center', padding: 0 }}>
                      {d.short.charAt(0)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((date, di) => {
                      if (!date) return <td key={di} />;
                      const holiday = holidayNames.get(date);
                      const kind: DayKind =
                        date < validFrom || date > validTo ? 'outside' : holiday !== undefined ? 'holiday' : working.has(weekdayOf(date)) ? 'working' : 'off';
                      const title = `${date}: ${kind === 'holiday' ? `holiday, ${holiday}` : KIND_TEXT[kind]}`;
                      return (
                        <td key={di} title={title} aria-label={title} className="fs12" style={{ ...CELL[kind], textAlign: 'center', padding: '2px 0', borderRadius: 4 }}>
                          {Number(date.slice(8))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
      {cut ? <p className="muted fs12" style={{ marginTop: 10 }}>The first {MAX_MONTHS} months of the period are shown.</p> : null}
    </>
  );
}
