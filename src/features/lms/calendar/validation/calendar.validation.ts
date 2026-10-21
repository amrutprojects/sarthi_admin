import { z } from 'zod';
import type { ErrorDetail } from '../../../../services/api-client';
import { normalizeName, validateEntityName } from '../../../cms/validation';
import { WEEKDAY_CODES, sortWeekdays, type ApiLmsCalendar, type CreateLmsCalendarInput, type Weekday } from '../types/calendar.types';
import { isIsoDate } from './calendarDates';

/*
 * Calendar form rules, the same as the backend validator and service (F-LMS-05 Table 30), with the backend's
 * messages where it has one. Not a security boundary: the server validates every request again, and its
 * answers (409 name / overlap, 400 centre / holiday period) are shown on the matching field.
 */

export interface CalendarHolidayRow {
  date: string;
  name: string;
}

export interface CalendarFormValues {
  entityId: string;
  /* '' = all centres (entity-wide calendar). */
  centreId: string;
  name: string;
  validFrom: string;
  validTo: string;
  workingDays: Weekday[];
  holidays: CalendarHolidayRow[];
  isActive: boolean;
}

export const PERIOD_MESSAGE = 'The end date must be after the start date.';
export const MAX_HOLIDAYS = 366;

/* A new calendar: no working day is assumed (F-LMS-05-05 has no default), status ACTIVE. */
export const emptyCalendarForm = (entityId = ''): CalendarFormValues => ({
  entityId,
  centreId: '',
  name: '',
  validFrom: '',
  validTo: '',
  workingDays: [],
  holidays: [],
  isActive: true,
});

export const calendarFormFrom = (c: ApiLmsCalendar): CalendarFormValues => ({
  entityId: c.entityId,
  centreId: c.centreId ?? '',
  name: c.name,
  validFrom: c.validFrom,
  validTo: c.validTo,
  workingDays: sortWeekdays(c.workingDays),
  holidays: (c.holidays ?? []).map((h) => ({ date: h.date, name: h.name })),
  isActive: c.isActive,
});

/*
 * What is sent to the API: collapsed spaces, null for "all centres", days Monday→Sunday. Holidays keep the
 * form's row order, so a server answer naming "holidays.2.date" lands on the third row on screen.
 */
export const normalizeCalendarForm = (v: CalendarFormValues): CreateLmsCalendarInput & { isActive: boolean } => ({
  entityId: v.entityId,
  centreId: v.centreId || null,
  name: normalizeName(v.name),
  validFrom: v.validFrom,
  validTo: v.validTo,
  workingDays: sortWeekdays(v.workingDays),
  holidays: v.holidays.map((h) => ({ date: h.date, name: normalizeName(h.name) })),
  isActive: v.isActive,
});

export type CalendarPayload = ReturnType<typeof normalizeCalendarForm>;

const issue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

const dateField = (missing: string) =>
  z.string().superRefine((v, ctx) => {
    if (!v) issue(ctx, [], missing);
    else if (!isIsoDate(v)) issue(ctx, [], 'Enter a valid date');
  });

export const calendarFormSchema = z
  .object({
    /* F-LMS-05-02: required, an active entity. */
    entityId: z.string().min(1, 'Select an entity.'),
    /* F-LMS-05-03: optional; '' = all centres. */
    centreId: z.string(),
    /* F-LMS-05-01: 3–80 characters, the catalogue-name character set. */
    name: z.string().superRefine((v, ctx) => {
      const message = normalizeName(v) ? validateEntityName(v, 'Calendar name', { min: 3, max: 80 }) : 'Enter a calendar name.';
      if (message) issue(ctx, [], message);
    }),
    /* F-LMS-05-04. */
    validFrom: dateField('Enter the start date.'),
    validTo: dateField('Enter the end date.'),
    /* F-LMS-05-05: at least one of Monday to Sunday. */
    workingDays: z.array(z.enum(WEEKDAY_CODES)).min(1, 'Select at least one working day.'),
    holidays: z.array(z.object({ date: z.string(), name: z.string() })).max(MAX_HOLIDAYS, 'A calendar year has at most 366 holidays'),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const periodValid = isIsoDate(v.validFrom) && isIsoDate(v.validTo) && v.validTo > v.validFrom;
    /* F-LMS-05-04: "To later than from". */
    if (isIsoDate(v.validFrom) && isIsoDate(v.validTo) && !periodValid) issue(ctx, ['validTo'], PERIOD_MESSAGE);

    /* F-LMS-05-06: a date inside the period, one holiday per date, a name of 2–80 characters. */
    const seen = new Set<string>();
    v.holidays.forEach((h, i) => {
      if (!h.date) issue(ctx, ['holidays', i, 'date'], 'Enter the holiday date.');
      else if (!isIsoDate(h.date)) issue(ctx, ['holidays', i, 'date'], 'Enter a valid date');
      else if (periodValid && (h.date < v.validFrom || h.date > v.validTo)) {
        issue(ctx, ['holidays', i, 'date'], `The date must be between ${v.validFrom} and ${v.validTo}.`);
      } else if (seen.has(h.date)) issue(ctx, ['holidays', i, 'date'], 'This date is already a holiday.');
      if (h.date) seen.add(h.date);

      const name = normalizeName(h.name);
      if (!name) issue(ctx, ['holidays', i, 'name'], 'Enter the holiday name.');
      else if (name.length < 2) issue(ctx, ['holidays', i, 'name'], 'Must be at least 2 characters');
      else if (name.length > 80) issue(ctx, ['holidays', i, 'name'], 'Must be at most 80 characters');
    });
  });

/* A form path the server may name: "name", "validFrom", "holidays.2.date", "workingDays" … */
export type CalendarErrorPath =
  | 'entityId' | 'centreId' | 'name' | 'validFrom' | 'validTo' | 'workingDays' | 'holidays'
  | `holidays.${number}.date` | `holidays.${number}.name`;

const PATH_RE = /^(entityId|centreId|name|validFrom|validTo|workingDays|holidays)(?:\.(\d+)(?:\.(date|name))?)?$/;

/*
 * Server field details mapped onto form paths. The validator names fields "body.holidays.2.date", the service
 * "holidays.2.date" / "validFrom"; an item of workingDays ("workingDays.3") lands on the whole field.
 */
export function calendarServerErrors(details: ErrorDetail[]): { path: CalendarErrorPath; message: string }[] {
  const out: { path: CalendarErrorPath; message: string }[] = [];
  for (const d of details) {
    const m = (d.field ?? '').replace(/^(body|params|query)\./, '').match(PATH_RE);
    if (!m) continue;
    const [, root, index, leaf] = m;
    const path = (root === 'holidays' && index !== undefined && leaf ? `holidays.${index}.${leaf}` : root) as CalendarErrorPath;
    if (!out.some((o) => o.path === path)) out.push({ path, message: d.message });
  }
  return out;
}
