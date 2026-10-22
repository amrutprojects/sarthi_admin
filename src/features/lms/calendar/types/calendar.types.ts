/* Academic Calendar (AMRUT_KALASH_03 L-05 / F-LMS-05), as /api/v1/lms/calendars returns and accepts it. */

/* F-LMS-05-05: Monday to Sunday, in the order the server stores them. Same list as the backend's WEEKDAYS. */
export const WEEKDAYS = [
  { code: 'MON', short: 'Mon', label: 'Monday' },
  { code: 'TUE', short: 'Tue', label: 'Tuesday' },
  { code: 'WED', short: 'Wed', label: 'Wednesday' },
  { code: 'THU', short: 'Thu', label: 'Thursday' },
  { code: 'FRI', short: 'Fri', label: 'Friday' },
  { code: 'SAT', short: 'Sat', label: 'Saturday' },
  { code: 'SUN', short: 'Sun', label: 'Sunday' },
] as const;

export type Weekday = (typeof WEEKDAYS)[number]['code'];

export const WEEKDAY_CODES = WEEKDAYS.map((d) => d.code) as [Weekday, ...Weekday[]];

export const WEEKDAY_SHORT: Record<Weekday, string> = Object.fromEntries(WEEKDAYS.map((d) => [d.code, d.short])) as Record<Weekday, string>;

/* Working days in Monday→Sunday order, whatever order they were picked in. */
export const sortWeekdays = (days: readonly Weekday[]): Weekday[] => WEEKDAY_CODES.filter((d) => days.includes(d));

/* L-05 "Filter by … type": entity-wide (no centre, "All centres") or a centre exception calendar (F-LMS-05-03). */
export const CALENDAR_TYPES = ['ENTITY', 'CENTRE'] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];

export const CALENDAR_TYPE_LABELS: Record<CalendarType, string> = {
  ENTITY: 'Entity-wide',
  CENTRE: 'Centre exception',
};

/* The owning entity / the exception centre. isActive = usable right now (active and not deleted). */
export interface CalendarRef {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface CalendarHoliday {
  id: string;
  date: string;
  name: string;
}

/* holidays only on the single-record response; holidayCount on both. Dates are YYYY-MM-DD. */
export interface ApiLmsCalendar {
  id: string;
  name: string;
  entityId: string;
  entity: CalendarRef | null;
  centreId: string | null;
  centre: CalendarRef | null;
  type: CalendarType;
  validFrom: string;
  validTo: string;
  workingDays: Weekday[];
  holidayCount: number;
  holidays?: CalendarHoliday[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/* GET /lms/calendars/form-options. */
export interface LmsCalendarFormOptions {
  weekdays: { code: Weekday; label: string }[];
  types: CalendarType[];
}

export interface CalendarHolidayInput {
  date: string;
  name: string;
}

export interface CreateLmsCalendarInput {
  entityId: string;
  /* null = all centres (entity-wide calendar). */
  centreId: string | null;
  name: string;
  validFrom: string;
  validTo: string;
  workingDays: Weekday[];
  holidays: CalendarHolidayInput[];
  isActive?: boolean;
}

/* The entity is fixed after creation; status has its own endpoint; holidays, when sent, replace the whole set. */
export interface UpdateLmsCalendarInput {
  centreId?: string | null;
  name?: string;
  validFrom?: string;
  validTo?: string;
  workingDays?: Weekday[];
  holidays?: CalendarHolidayInput[];
}

/* Field names of the calendar form, used to key validation messages. */
export const LMS_CALENDAR_FIELDS = ['entityId', 'centreId', 'name', 'validFrom', 'validTo', 'workingDays', 'holidays'] as const;
export type LmsCalendarField = (typeof LMS_CALENDAR_FIELDS)[number];
