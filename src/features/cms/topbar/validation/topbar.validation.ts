import { destinationProblem, normalizeDestination } from '../../destination';
import type { FieldErrors } from '../../validation';
import type {
  ApiTopBarLink,
  ApiTopBarSettings,
  Bilingual,
  TopBarField,
  TopBarLinkInput,
  UpdateTopBarSettingsInput,
} from '../types/topbar.types';

/*
 * Top Bar form rules, deliberately identical to the server rules in
 * backend/src/cms/topbar/topbar.validator.ts and to the CHECK constraints on the tables.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface TopBarLinkFormValues {
  /* Both languages are required: the button reads in whichever language the visitor has chosen. */
  label: Bilingual;
  /* Required: a button without a destination is meaningless. */
  link: string;
  /** Text, because blank is allowed on create ("end of the strip"). */
  displayOrder: string;
  isActive: boolean;
}

export interface SettingsFormValues {
  /* Blank in both languages: the bold text is left out of the strip. */
  governmentName: Bilingual;
  showLanguageToggle: boolean;
}

export const LABEL_MAX = 40;
export const GOVERNMENT_NAME_MAX = 80;

const blank = (): Bilingual => ({ mr: '', en: '' });

export const emptyTopBarLinkForm = (): TopBarLinkFormValues => ({
  label: blank(),
  link: '',
  displayOrder: '',
  isActive: true,
});

export const topBarLinkToForm = (l: ApiTopBarLink): TopBarLinkFormValues => ({
  label: { ...l.label },
  link: l.link,
  displayOrder: String(l.displayOrder),
  isActive: l.isActive,
});

export const settingsToForm = (s: ApiTopBarSettings): SettingsFormValues => ({
  governmentName: s.governmentName ? { ...s.governmentName } : blank(),
  showLanguageToggle: s.showLanguageToggle,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });
const samePair = (a: Bilingual, b: Bilingual) => a.mr === b.mr && a.en === b.en;

/* The link as the server stores it: "www.example.gov.in" becomes "https://www.example.gov.in". */
const linkOf = (v: string) => normalizeDestination(v.trim());

/* Every field of the form, as the API takes it. */
export function topBarLinkPayload(v: TopBarLinkFormValues): TopBarLinkInput {
  const order = v.displayOrder.trim();
  return {
    label: pairOf(v.label),
    link: linkOf(v.link),
    ...(order ? { displayOrder: Number(order) } : {}),
    isActive: v.isActive,
  };
}

/*
 * Only what changed since the form was opened, plus the version it was opened at. The server's
 * update is partial, so a field this form did not change is never sent and can never be cleared or
 * overwritten by a stale copy.
 */
export function topBarLinkChanges(initial: ApiTopBarLink, v: TopBarLinkFormValues): TopBarLinkInput {
  const next = topBarLinkPayload(v);
  const out: TopBarLinkInput = { expectedUpdatedAt: initial.updatedAt };
  if (!samePair(next.label!, initial.label)) out.label = next.label;
  if (next.link !== initial.link) out.link = next.link;
  if (next.displayOrder !== undefined && next.displayOrder !== initial.displayOrder) out.displayOrder = next.displayOrder;
  if (next.isActive !== initial.isActive) out.isActive = next.isActive;
  return out;
}

export function settingsPayload(v: SettingsFormValues, expectedUpdatedAt: string): UpdateTopBarSettingsInput {
  return {
    governmentName: pairOf(v.governmentName),
    showLanguageToggle: v.showLanguageToggle,
    expectedUpdatedAt,
  };
}

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

function requiredPair(errors: FieldErrors<TopBarField>, key: string, p: Bilingual, label: string, max: number) {
  for (const [half, lang] of [
    ['mr', 'Marathi'],
    ['en', 'English'],
  ] as const) {
    const v = line(p[half]);
    errors[`${key}.${half}`] = v ? tooLong(v, `${label} (${lang})`, max) : `${label} (${lang}) is required`;
  }
}

function optionalPair(errors: FieldErrors<TopBarField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export function validateTopBarLinkForm(v: TopBarLinkFormValues): FieldErrors<TopBarField> {
  const errors: FieldErrors<TopBarField> = {};
  requiredPair(errors, 'label', v.label, 'Label', LABEL_MAX);
  errors.link = v.link.trim() ? destinationProblem(v.link) : 'Link is required';
  const order = v.displayOrder.trim();
  if (order && !(/^\d+$/.test(order) && Number(order) >= 1 && Number(order) <= 999)) {
    errors.displayOrder = 'Display order must be a whole number from 1 to 999';
  }
  return errors;
}

export function validateSettingsForm(v: SettingsFormValues): FieldErrors<TopBarField> {
  const errors: FieldErrors<TopBarField> = {};
  optionalPair(errors, 'governmentName', v.governmentName, 'Government name', GOVERNMENT_NAME_MAX);
  return errors;
}

/* Server 422 details ("body.label.mr", "body.link") onto this form's keys ("label.mr", "link"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<TopBarField> {
  const out: FieldErrors<TopBarField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
