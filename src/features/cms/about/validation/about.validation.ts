import type { FieldErrors } from '../../validation';
import { KINDS } from '../constants';
import type { ItemInput } from '../services/aboutService';
import type { AboutField, AboutItem, AboutKind, Bilingual } from '../types/about.types';

/*
 * About SARTHI form rules, deliberately identical to the server rules in
 * backend/src/cms/about/about.validator.ts and to the CHECK constraints on the about_* tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const para = (v: string) =>
  v
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
export const normPair = (p: Bilingual, multiline = false): Bilingual => {
  const f = multiline ? para : line;
  return { mr: f(p.mr), en: f(p.en) };
};
export const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

/* Both halves required: the public site defaults to Marathi and has no language fallback. */
export function requiredPair(errors: FieldErrors<AboutField>, key: string, p: Bilingual, label: string, max: number, multiline = false) {
  const v = normPair(p, multiline);
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    errors[`${key}.${half}`] = v[half] ? tooLong(v[half], `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

/* Optional text: blank in both languages, or filled in both. */
export function optionalPair(errors: FieldErrors<AboutField>, key: string, p: Bilingual, label: string, max: number) {
  const v = normPair(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export interface ItemFormValues {
  first: Bilingual;
  second: Bilingual;
  /** Text, because blank is allowed on create ("end of the list"). */
  displayOrder: string;
  isActive: boolean;
}

export const emptyItemForm = (): ItemFormValues => ({
  first: { mr: '', en: '' },
  second: { mr: '', en: '' },
  displayOrder: '',
  isActive: true,
});

export const itemToForm = (i: AboutItem): ItemFormValues => ({
  first: { ...i.first },
  second: { ...i.second },
  displayOrder: String(i.displayOrder),
  isActive: i.isActive,
});

export function validateItemForm(kind: AboutKind, v: ItemFormValues): FieldErrors<AboutField> {
  const k = KINDS[kind];
  const errors: FieldErrors<AboutField> = {};
  requiredPair(errors, 'first', v.first, k.first.label, k.first.max);
  requiredPair(errors, 'second', v.second, k.second.label, k.second.max, k.second.multiline);
  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

export function itemPayload(kind: AboutKind, v: ItemFormValues): ItemInput {
  const order = v.displayOrder.trim();
  return {
    first: normPair(v.first),
    second: normPair(v.second, KINDS[kind].second.multiline),
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/* Only what changed since the form was opened, plus the version it was opened at. */
export function itemChanges(kind: AboutKind, initial: AboutItem, v: ItemFormValues): ItemInput {
  const next = itemPayload(kind, v);
  const out: ItemInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.first!, initial.first)) out.first = next.first;
  if (!samePair(next.second!, initial.second)) out.second = next.second;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

/*
 * Server 422 details onto this form's keys. The API names the texts after the record
 * ("body.heading.mr"); the shared form calls them first / second ("first.mr").
 */
export function serverErrors(kind: AboutKind | null, details: { field?: string; message: string }[]): FieldErrors<AboutField> {
  const out: FieldErrors<AboutField> = {};
  for (const d of details) {
    if (!d.field) continue;
    let key = d.field.replace(/^body\.?/, '') || 'form';
    if (kind) {
      const k = KINDS[kind];
      key = key.replace(new RegExp(`^${k.first.key}(?=\\.|$)`), 'first').replace(new RegExp(`^${k.second.key}(?=\\.|$)`), 'second');
    }
    out[key] ??= d.message;
  }
  return out;
}
