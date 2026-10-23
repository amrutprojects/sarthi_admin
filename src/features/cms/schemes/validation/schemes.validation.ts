import { destinationProblem } from '../../destination';
import type { FieldErrors } from '../../validation';
import type { ApiScheme, ApiSchemesSection, Bilingual, SchemeInput, SchemesField, UpdateSchemesSectionInput } from '../types/schemes.types';

/*
 * AMRUT Schemes form rules, deliberately identical to the server rules in
 * backend/src/cms/schemes/schemes.validator.ts and to the CHECK constraints on the tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface SchemeFormValues {
  title: Bilingual;
  description: Bilingual;
  /** Blank in both languages: no tag above the title. */
  badge: Bilingual;
  /** "YYYY-MM-DD" from the date input; blank: the scheme has no last date. */
  deadline: string;
  /** Blank: the button has no destination and says the page is not available yet. */
  link: string;
  /** Blank in both languages: the section's default label is used. */
  buttonLabel: Bilingual;
  featured: boolean;
  /** Text, because blank is allowed on create ("end of the list"). */
  displayOrder: string;
  isActive: boolean;
}

export interface SectionFormValues {
  heading: Bilingual;
  subtitle: Bilingual;
  buttonLabel: Bilingual;
  showSection: boolean;
}

const blank = (): Bilingual => ({ mr: '', en: '' });

export const emptySchemeForm = (): SchemeFormValues => ({
  title: blank(),
  description: blank(),
  badge: blank(),
  deadline: '',
  link: '',
  buttonLabel: blank(),
  featured: false,
  displayOrder: '',
  isActive: true,
});

export const schemeToForm = (s: ApiScheme): SchemeFormValues => ({
  title: { ...s.title },
  description: { ...s.description },
  badge: { ...s.badge },
  deadline: s.deadline ?? '',
  link: s.link ?? '',
  buttonLabel: { ...s.buttonLabel },
  featured: s.featured,
  displayOrder: String(s.displayOrder),
  isActive: s.isActive,
});

export const sectionToForm = (s: ApiSchemesSection): SectionFormValues => ({
  heading: { ...s.heading },
  subtitle: { ...s.subtitle },
  buttonLabel: { ...s.buttonLabel },
  showSection: s.showSection,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

/* Every field of the form, as the API takes it. */
export function schemePayload(v: SchemeFormValues): SchemeInput {
  const order = v.displayOrder.trim();
  return {
    title: pairOf(v.title),
    description: pairOf(v.description),
    badge: pairOf(v.badge),
    deadline: v.deadline.trim() || null,
    link: v.link.trim() || null,
    buttonLabel: pairOf(v.buttonLabel),
    featured: v.featured,
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy.
 */
export function schemeChanges(initial: ApiScheme, v: SchemeFormValues): SchemeInput {
  const next = schemePayload(v);
  const out: SchemeInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.title!, initial.title)) out.title = next.title;
  if (!samePair(next.description!, initial.description)) out.description = next.description;
  if (!samePair(next.badge!, initial.badge)) out.badge = next.badge;
  if (next.deadline !== initial.deadline) out.deadline = next.deadline;
  if (next.link !== initial.link) out.link = next.link;
  if (!samePair(next.buttonLabel!, initial.buttonLabel)) out.buttonLabel = next.buttonLabel;
  if (next.featured !== initial.featured) out.featured = next.featured;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function sectionPayload(v: SectionFormValues, expectedUpdatedAt: string): UpdateSchemesSectionInput {
  return {
    heading: pairOf(v.heading),
    subtitle: pairOf(v.subtitle),
    buttonLabel: pairOf(v.buttonLabel),
    showSection: v.showSection,
    expectedUpdatedAt,
  };
}

/*
 * A real calendar day, "YYYY-MM-DD", between 2000 and 2100 — the same rule as the server. A date
 * input only ever produces that form or "", but a browser without one lets any text through.
 */
export function deadlineProblem(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return 'Last date must be a date in the format YYYY-MM-DD';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100) return 'Last date must be between the years 2000 and 2100';
  const day = new Date(Date.UTC(y, mo - 1, d));
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== mo - 1 || day.getUTCDate() !== d) return 'Last date is not a real calendar date';
  return undefined;
}

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

function requiredPair(errors: FieldErrors<SchemesField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    const v = line(p[half]);
    errors[`${key}.${half}`] = v ? tooLong(v, `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

function optionalPair(errors: FieldErrors<SchemesField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export function validateSchemeForm(v: SchemeFormValues): FieldErrors<SchemesField> {
  const errors: FieldErrors<SchemesField> = {};
  requiredPair(errors, 'title', v.title, 'Scheme title', 150);
  requiredPair(errors, 'description', v.description, 'Description', 500);
  optionalPair(errors, 'badge', v.badge, 'Badge', 40);
  errors.deadline = deadlineProblem(v.deadline);
  errors.link = destinationProblem(v.link);
  optionalPair(errors, 'buttonLabel', v.buttonLabel, 'Button label', 60);
  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

export function validateSectionForm(v: SectionFormValues): FieldErrors<SchemesField> {
  const errors: FieldErrors<SchemesField> = {};
  requiredPair(errors, 'heading', v.heading, 'Heading', 120);
  optionalPair(errors, 'subtitle', v.subtitle, 'Subtitle', 300);
  requiredPair(errors, 'buttonLabel', v.buttonLabel, 'Default button label', 60);
  return errors;
}

/* Server 422 details ("body.title.mr", "body.deadline") onto this form's keys ("title.mr", "deadline"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<SchemesField> {
  const out: FieldErrors<SchemesField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
