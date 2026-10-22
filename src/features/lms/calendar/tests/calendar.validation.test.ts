import { describe, expect, it } from 'vitest';
import {
  calendarFormSchema, calendarServerErrors, emptyCalendarForm, normalizeCalendarForm, type CalendarFormValues,
} from '../validation/calendar.validation';
import { fmtDay, isIsoDate, periodStats, workingDaysLabel } from '../validation/calendarDates';
import { configFormFrom, configFormSchema, configValueOf, formatConfigValue } from '../validation/learningConfig.validation';
import { ENTITY_ID, configRow, learningConfig } from './fixtures';

const valid = (over: Partial<CalendarFormValues> = {}): CalendarFormValues => ({
  ...emptyCalendarForm(ENTITY_ID),
  name: 'Academic Year 2026-27',
  validFrom: '2026-06-01',
  validTo: '2027-05-31',
  workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  ...over,
});

/* path → message of every issue, like the form shows them. */
const issues = (v: CalendarFormValues) => {
  const r = calendarFormSchema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('calendar form rules (F-LMS-05)', () => {
  it('accepts a complete calendar', () => {
    expect(issues(valid({ holidays: [{ date: '2026-08-15', name: 'Independence Day' }] }))).toEqual({});
  });

  it('requires the entity, name, period and at least one working day (no default day is assumed)', () => {
    expect(issues(emptyCalendarForm())).toEqual({
      entityId: 'Select an entity.',
      name: 'Enter a calendar name.',
      validFrom: 'Enter the start date.',
      validTo: 'Enter the end date.',
      workingDays: 'Select at least one working day.',
    });
  });

  it('checks the name length (3–80) and character set', () => {
    expect(issues(valid({ name: 'AY' })).name).toBe('Calendar name must be at least 3 characters');
    expect(issues(valid({ name: 'A'.repeat(81) })).name).toBe('Calendar name must be at most 80 characters');
    expect(issues(valid({ name: '#Year' })).name).toMatch(/may use letters, digits/);
  });

  it('needs the end date strictly after the start date, and real dates', () => {
    expect(issues(valid({ validTo: '2026-06-01' })).validTo).toBe('The end date must be after the start date.');
    expect(issues(valid({ validTo: '2026-05-01' })).validTo).toBe('The end date must be after the start date.');
    expect(issues(valid({ validFrom: '2026-02-30' })).validFrom).toBe('Enter a valid date');
  });

  it('keeps holidays inside the period, one per date, with a 2–80 character name', () => {
    const out = issues(
      valid({
        holidays: [
          { date: '2026-08-15', name: 'Independence Day' },
          { date: '2026-08-15', name: 'Duplicate' },
          { date: '2027-08-15', name: 'Outside' },
          { date: '', name: 'X' },
        ],
      }),
    );
    expect(out['holidays.1.date']).toBe('This date is already a holiday.');
    expect(out['holidays.2.date']).toBe('The date must be between 2026-06-01 and 2027-05-31.');
    expect(out['holidays.3.date']).toBe('Enter the holiday date.');
    expect(out['holidays.3.name']).toBe('Must be at least 2 characters');
    expect(out['holidays.0.date']).toBeUndefined();
  });

  it('normalises what is sent: collapsed spaces, null centre, days Monday→Sunday, holiday rows in form order', () => {
    expect(
      normalizeCalendarForm(
        valid({
          name: '  Academic   Year ',
          workingDays: ['FRI', 'MON'],
          holidays: [
            { date: '2026-10-02', name: ' Gandhi  Jayanti ' },
            { date: '2026-08-15', name: 'Independence Day' },
          ],
        }),
      ),
    ).toEqual({
      entityId: ENTITY_ID,
      centreId: null,
      name: 'Academic Year',
      validFrom: '2026-06-01',
      validTo: '2027-05-31',
      workingDays: ['MON', 'FRI'],
      holidays: [
        { date: '2026-10-02', name: 'Gandhi Jayanti' },
        { date: '2026-08-15', name: 'Independence Day' },
      ],
      isActive: true,
    });
  });

  it('maps server field details onto form paths', () => {
    expect(
      calendarServerErrors([
        { field: 'body.holidays.2.date', message: 'Enter a valid date' },
        { field: 'holidays.0.date', message: 'The date must be between 2026-06-01 and 2027-05-31.' },
        { field: 'validFrom', message: 'The period overlaps another calendar.' },
        { field: 'body.workingDays.3', message: 'Choose days from Monday to Sunday.' },
        { field: 'body.unknown', message: 'ignored' },
      ]),
    ).toEqual([
      { path: 'holidays.2.date', message: 'Enter a valid date' },
      { path: 'holidays.0.date', message: 'The date must be between 2026-06-01 and 2027-05-31.' },
      { path: 'validFrom', message: 'The period overlaps another calendar.' },
      { path: 'workingDays', message: 'Choose days from Monday to Sunday.' },
    ]);
  });
});

describe('calendar dates', () => {
  it('validates, formats and counts in UTC', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(fmtDay('2026-06-01')).toBe('Mon, 01 Jun 2026');
    expect(workingDaysLabel(['MON', 'TUE', 'WED', 'THU', 'FRI'])).toBe('Mon–Fri');
    expect(workingDaysLabel(['MON', 'WED', 'FRI'])).toBe('Mon, Wed, Fri');
    /* June 2026: 30 days, 22 weekdays; one holiday on a Monday, one on a Sunday. */
    expect(periodStats('2026-06-01', '2026-06-30', ['MON', 'TUE', 'WED', 'THU', 'FRI'], ['2026-06-08', '2026-06-07'])).toEqual({
      days: 30,
      workingDays: 22,
      holidaysOnWorkingDays: 1,
      teachingDays: 21,
    });
  });
});

describe('learning configuration value rules (backend parseValue)', () => {
  const [hours, range, attendance, offline] = learningConfig().keys;
  const check = (row: typeof hours, over: Partial<ReturnType<typeof configFormFrom>>) => {
    const r = configFormSchema(row).safeParse({ ...configFormFrom(row), reason: 'Board decision', ...over });
    return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
  };

  it('requires a reason', () => {
    expect(check(hours, { reason: '  ' }).reason).toBe('Enter a reason.');
    expect(check(hours, { reason: 'x'.repeat(501) }).reason).toBe('Must be at most 500 characters');
  });

  it('checks whole numbers, percentages, ranges and enums with the server messages', () => {
    expect(check(hours, { num: '0' }).num).toBe('Enter a whole number of hours, at least 1.');
    expect(check(hours, { num: '2.5' }).num).toBe('Enter a whole number of hours, at least 1.');
    expect(check(attendance, { num: '101' }).num).toBe('Enter a percentage from 0 to 100.');
    expect(check(attendance, { num: '75.5' })).toEqual({});
    expect(check(range, { min: '50', max: '48' }).max).toBe('The minimum cannot be greater than the maximum.');
    expect(check(offline, { choice: '' }).choice).toBe('Choose one of: trainer_marked, self_check_in.');
  });

  it('builds the typed value, and only a prescribed key can be cleared', () => {
    expect(configValueOf(range, { ...configFormFrom(range), min: '42', max: '50' })).toEqual({ min: 42, max: 50 });
    expect(configValueOf(attendance, { ...configFormFrom(attendance), clear: true })).toBeNull();
    expect(check(hours, { clear: true }).clear).toBe('A syllabus value can be changed but not emptied.');
    const labels = configRow({ key: 'competency_bands', label: 'Bands', group: 'Competency bands', type: 'labels', kind: 'SYLLABUS', length: 2 });
    expect(check(labels, { labels: ['Beginning', ' '] })['labels.1']).toBe('Enter 2 labels of 1 to 60 characters.');
  });

  it('formats values with their unit', () => {
    expect(formatConfigValue(hours, 60)).toBe('60 hours');
    expect(formatConfigValue(hours, 1)).toBe('1 hour');
    expect(formatConfigValue(range, { min: 42, max: 48 })).toBe('42–48 hours');
    expect(formatConfigValue(attendance, 75)).toBe('75%');
    expect(formatConfigValue(offline, 'self_check_in')).toBe('Self check in');
    expect(formatConfigValue(attendance, null)).toBe('To Be Confirmed');
  });
});
