import { z } from 'zod';
import type { ErrorDetail } from '../../../../services/api-client';
import { normalizeCode, normalizeName, optionalValue } from '../../../cms/validation';
import {
  COURSE_CODE_MAX, COURSE_CODE_MIN, COURSE_DESCRIPTION_MAX, COURSE_FIELDS, COURSE_TITLE_MAX, COURSE_TITLE_MIN,
  type ApiLmsCourseDetail, type CourseField, type CourseStatus, type CreateLmsCourseInput, type UpdateLmsCourseInput,
} from '../types/course.types';

/*
 * Course form rules, the same as the backend validator (course.validator.ts, F-LMS-06 Table 31) with its messages.
 * Not a security boundary: the server validates every request again, and its answers (409 duplicate / locked
 * code, 400 inactive entity / languages not enabled for the entity) are shown on the matching field.
 */

/*
 * Rich text (F-LMS-06-04 "sanitised; no scripts"): the server's ALLOW-LIST, copied rule for rule so the form
 * refuses exactly what the server refuses.
 *   - <p> <br> <strong> <em> <b> <i> <u> <ul> <ol> <li>, without attributes;
 *   - <a href="https://…"> with optional target="_blank" and rel="…" (no entity in the link but &amp;).
 * Any other tag or attribute, a comment, an unquoted or entity-encoded value or a non-https link is refused.
 * A "<" that cannot open a tag ("a < b") is plain text, as in HTML.
 */
const RICH_TEXT_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a']);
/* HTML whitespace (not \s: a no-break space does not separate attributes in a browser). */
const TAG = /<(\/?)([a-z]+)((?:[ \t\n\f\r]+[a-z]+="[^"<>]*")*)[ \t\n\f\r]*(\/?)>/y;
const ATTRIBUTE = /[ \t\n\f\r]+([a-z]+)="([^"<>]*)"/g;
/* RFC 3986 characters, after &amp; is read as "&". */
const HTTPS_URL = /^https:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;
export const RICH_TEXT_REFUSED = 'Use only paragraphs, bold, italic, lists and https links; remove other markup and scripts.';

/* "<" followed by a letter, "/", "!" or "?" starts markup in a browser. */
const opensMarkup = (v: string): boolean => /<[a-zA-Z/!?]/.test(v);

function allowedTag(close: string, name: string, attrs: string, selfClose: string): boolean {
  if (!RICH_TEXT_TAGS.has(name)) return false;
  if (close) return !attrs && !selfClose && name !== 'br';
  if (name === 'br') return !attrs;
  if (selfClose) return false;
  if (name !== 'a') return !attrs;
  const seen = new Map<string, string>();
  for (const [, key, value] of attrs.matchAll(ATTRIBUTE)) {
    if (seen.has(key)) return false;
    seen.set(key, value);
  }
  const href = seen.get('href');
  const rel = seen.get('rel');
  return (
    href !== undefined &&
    !/&(?!amp;)/.test(href) &&
    HTTPS_URL.test(href.replace(/&amp;/g, '&')) &&
    [...seen.keys()].every((k) => k === 'href' || k === 'target' || k === 'rel') &&
    (!seen.has('target') || seen.get('target') === '_blank') &&
    (rel === undefined || /^[a-z]+(?: [a-z]+)*$/.test(rel))
  );
}

/* True when every piece of markup in the text is on the allow-list above (the server's isAllowedRichText). */
export function isAllowedRichText(text: string): boolean {
  for (let i = text.indexOf('<'); i !== -1; i = text.indexOf('<', i + 1)) {
    if (!opensMarkup(text.slice(i, i + 2))) continue;
    TAG.lastIndex = i;
    const m = TAG.exec(text);
    if (!m || !allowedTag(m[1], m[2], m[3], m[4])) return false;
    i = TAG.lastIndex - 1;
  }
  return true;
}

/* True when the text holds markup at all (the View page renders it then, plain text otherwise). */
export const hasMarkup = (text: string): boolean => opensMarkup(text);

export interface CourseFormValues {
  entityId: string;
  code: string;
  title: string;
  description: string;
  languages: string[];
  isActive: boolean;
}

/* A new course: status ACTIVE; the languages follow the chosen entity. */
export const emptyCourseForm = (entityId = ''): CourseFormValues => ({
  entityId,
  code: '',
  title: '',
  description: '',
  languages: [],
  isActive: true,
});

export const courseFormFrom = (c: ApiLmsCourseDetail): CourseFormValues => ({
  entityId: c.entityId,
  code: c.code,
  title: c.title,
  description: c.description ?? '',
  languages: [...c.languages],
  isActive: c.isActive,
});

/* What is sent to the API: upper-cased code, collapsed spaces in the title, trimmed description or null. */
export const normalizeCourseForm = (v: CourseFormValues) => ({
  entityId: v.entityId,
  code: normalizeCode(v.code),
  title: normalizeName(v.title),
  description: optionalValue(v.description),
  languages: v.languages,
  isActive: v.isActive,
});

export type CoursePayload = ReturnType<typeof normalizeCourseForm>;

/* POST body: no language selected = left out, so the server uses the entity's default language. */
export const toCreateInput = (p: CoursePayload): CreateLmsCourseInput => ({
  entityId: p.entityId,
  code: p.code,
  title: p.title,
  description: p.description,
  ...(p.languages.length ? { languages: p.languages } : {}),
  isActive: p.isActive,
});

/* PATCH body: the entity is immutable and a locked code is not sent. */
export const toUpdateInput = (p: CoursePayload, codeLocked: boolean): UpdateLmsCourseInput => ({
  ...(codeLocked ? {} : { code: p.code }),
  title: p.title,
  description: p.description,
  languages: p.languages,
});

/* F-LMS-06-01: the code is immutable once the course is in a published release (status no longer DRAFT). */
export const isCodeLocked = (status: CourseStatus): boolean => status !== 'DRAFT';

/* Why the code field is locked, shown next to it. */
export const codeLockReason = (status: CourseStatus): string =>
  `The code cannot be changed: the course is ${status === 'RETIRED' ? 'retired' : 'published'} and in a published release. Only a draft course's code can be changed.`;

/* F-LMS-06-01: A–Z, 0–9 and hyphen, 2–20 characters (typed lower case is upper-cased, as on the server). */
export function courseCodeError(raw: string): string | undefined {
  const code = normalizeCode(raw);
  if (!code) return 'Enter a course code.';
  if (code.length < COURSE_CODE_MIN) return `Must be at least ${COURSE_CODE_MIN} characters`;
  if (code.length > COURSE_CODE_MAX) return `Must be at most ${COURSE_CODE_MAX} characters`;
  return /^[A-Z0-9-]+$/.test(code) ? undefined : 'Use capital letters, digits and hyphens.';
}

/* F-LMS-06-02: 3–120 characters after trimming and collapsing spaces (the server's entityName rule). */
const TITLE_RE = /^[\p{L}\p{M}\d][\p{L}\p{M}\d .,'’()/&-]*$/u;
export function courseTitleError(raw: string): string | undefined {
  const title = normalizeName(raw);
  if (!title) return 'Enter a course title.';
  if (title.length < COURSE_TITLE_MIN) return `Must be at least ${COURSE_TITLE_MIN} characters`;
  if (title.length > COURSE_TITLE_MAX) return `Must be at most ${COURSE_TITLE_MAX} characters`;
  return TITLE_RE.test(title) ? undefined : 'Use letters, digits, spaces and . , ( ) - / & only';
}

/* F-LMS-06-04: optional, at most 2,000 characters after trimming, allow-listed markup only. */
export function courseDescriptionError(raw: string): string | undefined {
  const text = raw.trim();
  if (!text) return undefined;
  if (text.length > COURSE_DESCRIPTION_MAX) return 'Shorten the description.';
  return isAllowedRichText(text) ? undefined : RICH_TEXT_REFUSED;
}

const issue = (ctx: z.RefinementCtx, message: string | undefined) => {
  if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
};

/*
 * The form schema. `requireLanguages`: at least one language (F-LMS-06-05) whenever the form can offer one; a
 * new course whose entity languages cannot be read is sent without, and the server uses the default language.
 */
export const courseFormSchema = ({ requireLanguages }: { requireLanguages: boolean }) =>
  z.object({
    /* F-LMS-06-03: required, an active entity. */
    entityId: z.string().min(1, 'Select an entity.'),
    code: z.string().superRefine((v, ctx) => issue(ctx, courseCodeError(v))),
    title: z.string().superRefine((v, ctx) => issue(ctx, courseTitleError(v))),
    description: z.string().superRefine((v, ctx) => issue(ctx, courseDescriptionError(v))),
    /* F-LMS-06-05: ≥ 1 language, each at most once. */
    languages: z.array(z.string()).superRefine((l, ctx) => {
      if (requireLanguages && !l.length) issue(ctx, 'Select at least one language.');
      else if (new Set(l).size !== l.length) issue(ctx, 'Each language can be selected only once');
    }),
    isActive: z.boolean(),
  });

/*
 * Server field details mapped onto the form. The validator names fields "body.code" / "body.languages.1", the
 * service "code" / "languages" / "entityId"; an item of a list lands on the whole field.
 */
export function courseServerErrors(details: ErrorDetail[]): { field: CourseField; message: string }[] {
  const out: { field: CourseField; message: string }[] = [];
  for (const d of details) {
    const root = (d.field ?? '').replace(/^(body|params|query)\./, '').split('.')[0] as CourseField;
    if ((COURSE_FIELDS as readonly string[]).includes(root) && !out.some((o) => o.field === root)) out.push({ field: root, message: d.message });
  }
  return out;
}
