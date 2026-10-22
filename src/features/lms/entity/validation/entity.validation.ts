import { normalizeCode, normalizeName, optionalValue, validateEntityName, type FieldErrors } from '../../../cms/validation';
import type { ApiLmsEntity, LmsEntityField } from '../types/entity.types';

/*
 * Entity form rules, the same as the backend validator (F-LMS-03 Table 28). The messages quote the spec
 * where it gives one. Not a security boundary: the server validates every request again.
 */
export interface LmsEntityFormValues {
  name: string;
  code: string;
  description: string;
  defaultLanguage: string;
  timeZone: string;
  centreIds: string[];
  trackIds: string[];
  isActive: boolean;
}

/*
 * A new entity: no default language until one is chosen (F-LMS-03-06's default is "first enabled language",
 * and a new entity has no enabled languages yet), the spec time zone default, status ACTIVE (F-LMS-03-08).
 */
export const emptyLmsEntityForm = (defaultTimeZone: string): LmsEntityFormValues => ({
  name: '',
  code: '',
  description: '',
  defaultLanguage: '',
  timeZone: defaultTimeZone,
  centreIds: [],
  trackIds: [],
  isActive: true,
});

export const lmsEntityFormFrom = (e: ApiLmsEntity): LmsEntityFormValues => ({
  name: e.name,
  code: e.code,
  description: e.description ?? '',
  defaultLanguage: e.defaultLanguage,
  timeZone: e.timeZone,
  centreIds: e.enabledCentres.map((c) => c.id),
  trackIds: e.enabledTracks.map((t) => t.id),
  isActive: e.isActive,
});

/* What is sent to the API: trimmed name with collapsed spaces, upper-cased code, null for an empty description. */
export const normalizeLmsEntityForm = (v: LmsEntityFormValues) => ({
  name: normalizeName(v.name),
  code: normalizeCode(v.code),
  description: optionalValue(v.description),
  defaultLanguage: v.defaultLanguage,
  timeZone: v.timeZone,
  centreIds: v.centreIds,
  trackIds: v.trackIds,
  isActive: v.isActive,
});

export type LmsEntityPayload = ReturnType<typeof normalizeLmsEntityForm>;

const CODE_RE = /^[A-Z0-9-]+$/;

export function validateLmsEntityForm(v: LmsEntityFormValues): FieldErrors<LmsEntityField> {
  const code = normalizeCode(v.code);
  return {
    /* F-LMS-03-01: required, 3–120 characters. */
    name: normalizeName(v.name) ? validateEntityName(v.name, 'Entity name', { min: 3, max: 120 }) : 'Enter an entity name.',
    /* F-LMS-03-02: A–Z, 0–9, hyphen; 2–20 characters. */
    code: !code
      ? 'Enter an entity code.'
      : code.length < 2
        ? 'Entity code must be at least 2 characters'
        : code.length > 20
          ? 'Entity code must be at most 20 characters'
          : CODE_RE.test(code)
            ? undefined
            : 'Use capital letters, digits and hyphens.',
    /* F-LMS-03-03: ≤ 500 characters. */
    description: v.description.trim().length > 500 ? 'Shorten the description (500 characters at most).' : undefined,
    /* F-LMS-03-06 / -07: required. */
    defaultLanguage: v.defaultLanguage ? undefined : 'Select a language.',
    timeZone: v.timeZone ? undefined : 'Select a time zone.',
  };
}
