import { z } from 'zod';
import type { ErrorDetail } from '../../../../services/api-client';
import {
  COURSE_MODULE_FIELDS, MODULE_NUMBERS, type ApiCourseModule, type CourseModuleField, type CreateCourseModuleInput, type ModuleHours,
  type PrescribedModule, type ReleaseField, type UpdateCourseModuleInput,
} from '../types/courseModule.types';
import { RICH_TEXT_REFUSED, isAllowedRichText, opensMarkup } from './richText';

/*
 * Module form rules (F-LMS-07 Table 32): the field rules of the backend validator
 * (src/lms/course-module/course-module.validator.ts) as the same Zod chains with the same limits and messages,
 * and the cross-field rules of the service (checkModuleHours, and the reason a core-hours change needs).
 * Not a security boundary: the server validates every request again, and its answers land on the same fields.
 */

/* ------------------------------------------------------------------------------------------------------------
 * Field rules, mirrored from the backend validator.
 * ---------------------------------------------------------------------------------------------------------- */

const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const MODULE_NUMBER_MESSAGE = 'Select module 1, 2, 3 or 4.';
export const COURSE_MESSAGE = 'Select a course.';

/* F-LMS-07-01: 1, 2, 3 or 4. */
export const moduleNumberRule = z.coerce
  .number({ invalid_type_error: MODULE_NUMBER_MESSAGE })
  .int(MODULE_NUMBER_MESSAGE)
  .refine((n) => (MODULE_NUMBERS as readonly number[]).includes(n), MODULE_NUMBER_MESSAGE);

/* F-LMS-07-02: 3–160 characters (counted as PostgreSQL does), trimmed with inner whitespace collapsed, plain text. */
const MODULE_TITLE = 'Enter a module title.';
export const moduleTitleRule = z
  .string({ required_error: MODULE_TITLE, invalid_type_error: MODULE_TITLE })
  .trim()
  .transform((s) => s.replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .refine((v) => [...v].length >= 3, MODULE_TITLE)
      .refine((v) => [...v].length <= 160, 'Must be at most 160 characters')
      .refine((v) => !opensMarkup(v) && !/\p{Cc}/u.test(v), 'Enter the title as plain text.'),
  );

/* F-LMS-07-06: ≤ 3,000 characters, the rich-text allow-list. Blank → null. */
export const descriptionRule = z.preprocess(
  blankToNull,
  z.string().trim().max(3000, 'Shorten the text.').refine(isAllowedRichText, RICH_TEXT_REFUSED).nullable().optional(),
);

/* Hours: decimal > 0 with at most 2 decimals (numeric(6,2)); 9999.99 is the column's bound. Blank → null. */
const hoursRule = (message: string) =>
  z.preprocess(
    blankToNull,
    z
      .number({ invalid_type_error: message })
      .positive(message)
      .max(9999.99, 'Must be at most 9999.99')
      .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use at most 2 decimals')
      .nullable()
      .optional(),
  );

/* F-LMS-07-07: sessions and session hours are integers > 0. */
const countRule = (message: string) =>
  z.preprocess(blankToNull, z.number({ invalid_type_error: message }).int(message).positive(message).max(9999, 'Must be at most 9999').nullable().optional());

/* F-LMS-07-05: ≤ 120 characters (optionalText(120)). */
export const syllabusRefRule = z.preprocess(blankToNull, z.string().trim().max(120, 'Must be at most 120 characters').nullable().optional());

/* F-LMS-07-04: "a change needs the syllabus reference and a reason". */
export const reasonRule = z.string().trim().min(1, 'Enter a reason.').max(500, 'Must be at most 500 characters');

/* POST /prescribed: the syllabus reference stored on every module created (required with core hours). */
export const prescribedSyllabusRefRule = z
  .string({ required_error: 'Enter the syllabus reference.', invalid_type_error: 'Enter the syllabus reference.' })
  .trim()
  .min(1, 'Enter the syllabus reference.')
  .max(120, 'Must be at most 120 characters');

export const HOURS_MESSAGES = {
  coreHours: 'Enter the core hours of the module.',
  sessions: 'Enter a whole number of sessions.',
  sessionHours: 'Enter whole session hours.',
  lectureHours: 'Enter the lecture hours.',
  practicalHours: 'Enter the practical hours.',
  oft: 'Enter a valid OFT hours range.',
} as const;

const HOURS_RULES = {
  coreHours: hoursRule(HOURS_MESSAGES.coreHours),
  sessions: countRule(HOURS_MESSAGES.sessions),
  sessionHours: countRule(HOURS_MESSAGES.sessionHours),
  lectureHours: hoursRule(HOURS_MESSAGES.lectureHours),
  practicalHours: hoursRule(HOURS_MESSAGES.practicalHours),
  oftHoursMin: hoursRule(HOURS_MESSAGES.oft),
  oftHoursMax: hoursRule(HOURS_MESSAGES.oft),
};

/* Service messages (checkModuleHours / update). */
export const PAIR_SESSIONS = 'Enter both the number of sessions and the session hours.';
export const PAIR_LECTURE = 'Enter both the lecture and the practical hours.';
export const DOES_NOT_ADD_UP = 'The delivery pattern does not add up to the core hours.';
export const SYLLABUS_REQUIRED = 'Enter the syllabus reference.';

/* ------------------------------------------------------------------------------------------------------------
 * Form values.
 * ---------------------------------------------------------------------------------------------------------- */

/*
 * F-LMS-07-07 delivery pattern: sessions × session hours, lecture + practical hours, or both. "Not set yet" leaves
 * both pairs empty (allowed until release; the module then lists the delivery pattern as missing for release).
 */
export const DELIVERY_PATTERNS = ['NONE', 'SESSIONS', 'LECTURE_PRACTICAL', 'BOTH'] as const;
export type DeliveryPattern = (typeof DELIVERY_PATTERNS)[number];
export const DELIVERY_PATTERN_LABELS: Record<DeliveryPattern, string> = {
  NONE: 'Not set yet',
  SESSIONS: 'Sessions × session hours',
  LECTURE_PRACTICAL: 'Lecture + practical hours',
  BOTH: 'Both',
};
export const usesSessions = (p: DeliveryPattern) => p === 'SESSIONS' || p === 'BOTH';
export const usesLecture = (p: DeliveryPattern) => p === 'LECTURE_PRACTICAL' || p === 'BOTH';

export const patternOf = (h: Pick<ModuleHours, 'sessions' | 'sessionHours' | 'lectureHours' | 'practicalHours'>): DeliveryPattern => {
  const s = h.sessions !== null || h.sessionHours !== null;
  const l = h.lectureHours !== null || h.practicalHours !== null;
  return s && l ? 'BOTH' : s ? 'SESSIONS' : l ? 'LECTURE_PRACTICAL' : 'NONE';
};

/* Number inputs are text boxes, so "abc" reaches the rule and gets its message instead of silently becoming empty. */
export interface CourseModuleFormValues {
  courseId: string;
  moduleNumber: string;
  title: string;
  description: string;
  coreHours: string;
  syllabusRef: string;
  deliveryPattern: DeliveryPattern;
  sessions: string;
  sessionHours: string;
  lectureHours: string;
  practicalHours: string;
  oftHoursMin: string;
  oftHoursMax: string;
  reason: string;
  isActive: boolean;
}

export interface CourseModuleFormContext {
  mode: 'create' | 'edit';
  /* Edit: the saved core hours. A change of them needs a reason (F-LMS-07-04). */
  savedCoreHours?: number | null;
}

const numberText = (n: number | null) => (n === null ? '' : String(n));

/* A new module: nothing assumed (every value may stay empty until release), status ACTIVE. */
export const emptyCourseModuleForm = (prefill: { courseId?: string; moduleNumber?: string } = {}): CourseModuleFormValues => ({
  courseId: prefill.courseId ?? '',
  moduleNumber: prefill.moduleNumber ?? '',
  title: '',
  description: '',
  coreHours: '',
  syllabusRef: '',
  deliveryPattern: 'NONE',
  sessions: '',
  sessionHours: '',
  lectureHours: '',
  practicalHours: '',
  oftHoursMin: '',
  oftHoursMax: '',
  reason: '',
  isActive: true,
});

export const courseModuleFormFrom = (m: ApiCourseModule): CourseModuleFormValues => ({
  courseId: m.courseId,
  moduleNumber: String(m.moduleNumber),
  title: m.title,
  description: m.description ?? '',
  coreHours: numberText(m.coreHours),
  syllabusRef: m.syllabusRef ?? '',
  deliveryPattern: patternOf(m),
  sessions: numberText(m.sessions),
  sessionHours: numberText(m.sessionHours),
  lectureHours: numberText(m.lectureHours),
  practicalHours: numberText(m.practicalHours),
  oftHoursMin: numberText(m.oftHoursMin),
  oftHoursMax: numberText(m.oftHoursMax),
  reason: '',
  isActive: m.isActive,
});

/* The prescribed values of one module (section 2.1), as form values. The description and syllabus reference stay as typed. */
export const prescribedFormValues = (p: PrescribedModule): Partial<CourseModuleFormValues> => ({
  title: p.title,
  coreHours: numberText(p.coreHours),
  deliveryPattern: patternOf(p),
  sessions: numberText(p.sessions),
  sessionHours: numberText(p.sessionHours),
  lectureHours: numberText(p.lectureHours),
  practicalHours: numberText(p.practicalHours),
  oftHoursMin: numberText(p.oftHoursMin),
  oftHoursMax: numberText(p.oftHoursMax),
});

/* ------------------------------------------------------------------------------------------------------------
 * Validation and the payload.
 * ---------------------------------------------------------------------------------------------------------- */

const NUMERIC = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
/* A number box's text as the JSON value the server would get: null when blank, the text itself when not a number. */
const numberInput = (raw: string): unknown => {
  const v = raw.trim();
  if (!v) return null;
  return NUMERIC.test(v) ? Number(v) : v;
};

/* Hours compared in hundredths, as the server does, so 0.1 + 0.2 never "differs" from 0.3. */
const cents = (v: number) => Math.round(v * 100);

export type CourseModuleErrors = Partial<Record<CourseModuleField, string>>;

export interface ParsedCourseModule extends ModuleHours {
  courseId: string;
  moduleNumber: number;
  title: string;
  description: string | null;
  reason: string | undefined;
  isActive: boolean;
}

/*
 * Every rule of the form, field by field and across fields. A cross-field rule is checked once the fields it
 * reads are valid on their own, so one problem is named once, next to the field the server would name.
 */
export function parseCourseModuleForm(v: CourseModuleFormValues, ctx: CourseModuleFormContext): { errors: CourseModuleErrors; value: ParsedCourseModule } {
  const errors: CourseModuleErrors = {};
  const take = <S extends z.ZodTypeAny>(field: CourseModuleField, rule: S, input: unknown): z.output<S> | null => {
    const r = rule.safeParse(input);
    if (r.success) return r.data;
    errors[field] = r.error.issues[0]?.message ?? 'Enter a valid value.';
    return null;
  };
  const ok = (...fields: CourseModuleField[]) => fields.every((f) => !errors[f]);
  const hours = (field: keyof typeof HOURS_RULES, raw: string, used = true): number | null =>
    used ? ((take(field, HOURS_RULES[field], numberInput(raw)) as number | null | undefined) ?? null) : null;

  /* Course and module number are chosen on creation only (F-LMS-07-01). */
  let moduleNumber = Number(v.moduleNumber) || 0;
  if (ctx.mode === 'create') {
    if (!v.courseId) errors.courseId = COURSE_MESSAGE;
    moduleNumber = take('moduleNumber', moduleNumberRule, v.moduleNumber) ?? 0;
  }

  const title = take('title', moduleTitleRule, v.title) ?? '';
  const description = (take('description', descriptionRule, v.description) as string | null | undefined) ?? null;
  const syllabusRef = (take('syllabusRef', syllabusRefRule, v.syllabusRef) as string | null | undefined) ?? null;

  const sessionsUsed = usesSessions(v.deliveryPattern);
  const lectureUsed = usesLecture(v.deliveryPattern);
  const h: ModuleHours = {
    coreHours: hours('coreHours', v.coreHours),
    syllabusRef,
    sessions: hours('sessions', v.sessions, sessionsUsed),
    sessionHours: hours('sessionHours', v.sessionHours, sessionsUsed),
    lectureHours: hours('lectureHours', v.lectureHours, lectureUsed),
    practicalHours: hours('practicalHours', v.practicalHours, lectureUsed),
    oftHoursMin: hours('oftHoursMin', v.oftHoursMin),
    oftHoursMax: hours('oftHoursMax', v.oftHoursMax),
  };

  /* A pair is entered whole or not at all; a pattern that is chosen needs its pair (F-LMS-07-07). */
  const pair = (a: CourseModuleField & keyof ModuleHours, b: CourseModuleField & keyof ModuleHours, used: boolean, message: string): boolean => {
    if (!used || !ok(a, b)) return false;
    if (h[a] === null && h[b] === null) {
      errors[a] = message;
      errors[b] = message;
      return false;
    }
    if ((h[a] === null) !== (h[b] === null)) {
      errors[h[a] === null ? a : b] = message;
      return false;
    }
    return true;
  };
  const sessionsComplete = pair('sessions', 'sessionHours', sessionsUsed, PAIR_SESSIONS);
  const lectureComplete = pair('lectureHours', 'practicalHours', lectureUsed, PAIR_LECTURE);

  if (ok('coreHours')) {
    if ((sessionsComplete || lectureComplete) && h.coreHours === null) {
      errors.coreHours = HOURS_MESSAGES.coreHours;
    } else if (h.coreHours !== null) {
      /* sessions × session hours = core hours; lecture + practical hours = core hours. */
      if (sessionsComplete && cents(h.sessions! * h.sessionHours!) !== cents(h.coreHours)) errors.sessions = DOES_NOT_ADD_UP;
      if (lectureComplete && cents(h.lectureHours!) + cents(h.practicalHours!) !== cents(h.coreHours)) errors.lectureHours = DOES_NOT_ADD_UP;
    }
  }

  /* F-LMS-07-05: the syllabus reference is "Required with core hours". */
  if (ok('coreHours', 'syllabusRef') && h.coreHours !== null && h.syllabusRef === null) errors.syllabusRef = SYLLABUS_REQUIRED;

  /* F-LMS-07-08: the OFT range is complete and 0 < minimum ≤ maximum (each > 0 is the field rule). */
  if (ok('oftHoursMin', 'oftHoursMax')) {
    if ((h.oftHoursMin === null) !== (h.oftHoursMax === null)) errors[h.oftHoursMin === null ? 'oftHoursMin' : 'oftHoursMax'] = HOURS_MESSAGES.oft;
    else if (h.oftHoursMin !== null && cents(h.oftHoursMin) > cents(h.oftHoursMax!)) errors.oftHoursMin = HOURS_MESSAGES.oft;
  }

  /* F-LMS-07-04: a change of the core hours needs a reason (and the syllabus reference, checked above). */
  let reason: string | undefined;
  if (coreHoursChanged(v, ctx)) reason = take('reason', reasonRule, v.reason) ?? undefined;

  return {
    errors,
    value: { courseId: v.courseId, moduleNumber, title, description, ...h, reason, isActive: v.isActive },
  };
}

/* Edit: true when the core hours on the form are valid and differ from the saved value (blank = cleared). */
export function coreHoursChanged(v: Pick<CourseModuleFormValues, 'coreHours'>, ctx: CourseModuleFormContext): boolean {
  if (ctx.mode !== 'edit') return false;
  const r = HOURS_RULES.coreHours.safeParse(numberInput(v.coreHours));
  if (!r.success) return false;
  return ((r.data as number | null | undefined) ?? null) !== (ctx.savedCoreHours ?? null);
}

const issue = (zctx: z.RefinementCtx, path: string, message: string) => zctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

/* The React Hook Form schema: the values stay strings; every rule above is reported on its field. */
export const courseModuleFormSchema = (ctx: CourseModuleFormContext) =>
  z
    .object({
      courseId: z.string(),
      moduleNumber: z.string(),
      title: z.string(),
      description: z.string(),
      coreHours: z.string(),
      syllabusRef: z.string(),
      deliveryPattern: z.enum(DELIVERY_PATTERNS),
      sessions: z.string(),
      sessionHours: z.string(),
      lectureHours: z.string(),
      practicalHours: z.string(),
      oftHoursMin: z.string(),
      oftHoursMax: z.string(),
      reason: z.string(),
      isActive: z.boolean(),
    })
    .superRefine((v, zctx) => {
      const { errors } = parseCourseModuleForm(v, ctx);
      for (const [field, message] of Object.entries(errors)) if (message) issue(zctx, field, message);
    });

/* POST body: trimmed title with collapsed spaces, null for anything empty, a pattern not chosen sent as empty. */
export function toCreateInput(v: CourseModuleFormValues): CreateCourseModuleInput {
  const p = parseCourseModuleForm(v, { mode: 'create' }).value;
  return {
    courseId: p.courseId,
    moduleNumber: p.moduleNumber,
    title: p.title,
    description: p.description,
    coreHours: p.coreHours,
    syllabusRef: p.syllabusRef,
    sessions: p.sessions,
    sessionHours: p.sessionHours,
    lectureHours: p.lectureHours,
    practicalHours: p.practicalHours,
    oftHoursMin: p.oftHoursMin,
    oftHoursMax: p.oftHoursMax,
    isActive: p.isActive,
  };
}

/* PATCH body: every editable value (unchanged ones are ignored by the server), and the reason when the core hours change. */
export function toUpdateInput(v: CourseModuleFormValues, savedCoreHours: number | null): UpdateCourseModuleInput {
  const p = parseCourseModuleForm(v, { mode: 'edit', savedCoreHours }).value;
  return {
    title: p.title,
    description: p.description,
    coreHours: p.coreHours,
    syllabusRef: p.syllabusRef,
    sessions: p.sessions,
    sessionHours: p.sessionHours,
    lectureHours: p.lectureHours,
    practicalHours: p.practicalHours,
    oftHoursMin: p.oftHoursMin,
    oftHoursMax: p.oftHoursMax,
    ...(p.reason ? { reason: p.reason } : {}),
  };
}

/* The "Required before release" fields still empty (the server's missingForRelease), for the form's live summary. */
export function missingForRelease(h: ModuleHours): ReleaseField[] {
  const missing: ReleaseField[] = [];
  if (h.coreHours === null) missing.push('coreHours');
  if (h.syllabusRef === null) missing.push('syllabusRef');
  if (h.sessions === null && h.lectureHours === null) missing.push('deliveryPattern');
  if (h.oftHoursMin === null) missing.push('oftHours');
  return missing;
}

/*
 * Server field details mapped onto form fields. The validator names fields "body.sessions", the service
 * "sessions" / "moduleNumber" / "reason"; anything else (a body-level rule) is left to the toast.
 */
export function courseModuleServerErrors(details: ErrorDetail[]): { field: CourseModuleField; message: string }[] {
  const out: { field: CourseModuleField; message: string }[] = [];
  for (const d of details) {
    const name = (d.field ?? '').split('.').pop() as CourseModuleField;
    if ((COURSE_MODULE_FIELDS as readonly string[]).includes(name) && !out.some((o) => o.field === name)) out.push({ field: name, message: d.message });
  }
  return out;
}
