import type { FieldErrors } from '../../validation';
import type { ApiBrandBar, Bilingual, BrandBarField, UpdateBrandBarInput } from '../types/brandbar.types';

/*
 * Brand Bar form rules, deliberately identical to the server rules for PUT /cms/brand-bar.
 *
 * This is for the person filling in the form — it names the problem next to the field instead of
 * making them submit to find out. The backend validates every request again regardless.
 */

export interface BrandBarFormValues {
  /* Required: the bar always shows its bold title. */
  title: string;
  /* Each line on its own: blank hides that line only, since the website shows both lines together. */
  fullName: Bilingual;
  /* Both languages or neither: the website shows the label in the visitor's language. */
  partnerLabel: Bilingual;
  /* Blank: the whole partner block is left out of the bar. */
  partnerName: string;
  /* Off: the website leaves the partner block out, and the label and name above are kept for later. */
  showPartner: boolean;
}

export const TITLE_MAX = 60;
export const FULL_NAME_MAX = 160;
export const PARTNER_LABEL_MAX = 60;
export const PARTNER_NAME_MAX = 100;

export const brandBarToForm = (b: ApiBrandBar): BrandBarFormValues => ({
  title: b.title,
  fullName: { ...b.fullName },
  partnerLabel: { ...b.partnerLabel },
  partnerName: b.partnerName,
  showPartner: b.showPartner,
});

/* The same normalisation the server applies, so what is compared and sent is what will be stored. */
const line = (v: string) => v.replace(/\s+/g, ' ').trim();
const pairOf = (p: Bilingual): Bilingual => ({ mr: line(p.mr), en: line(p.en) });

/* Every field of the form, as the API takes it, with the version the form was opened at. */
export function brandBarPayload(v: BrandBarFormValues, expectedUpdatedAt: string): UpdateBrandBarInput {
  return {
    title: line(v.title),
    fullName: pairOf(v.fullName),
    partnerLabel: pairOf(v.partnerLabel),
    partnerName: line(v.partnerName),
    showPartner: v.showPartner,
    expectedUpdatedAt,
  };
}

/*
 * The bar as it was loaded with only the partner block switched, for the tab's quick switch: the same PUT as the
 * form, so the texts go back exactly as they are and a save made since the tab loaded is refused with a 409.
 */
export const partnerSwitchPayload = (b: ApiBrandBar, showPartner: boolean): UpdateBrandBarInput =>
  brandBarPayload({ ...brandBarToForm(b), showPartner }, b.updatedAt);

const tooLong = (value: string, label: string, max: number) =>
  value.length > max ? `${label} must be at most ${max} characters` : undefined;

function optionalPair(errors: FieldErrors<BrandBarField>, key: string, p: Bilingual, label: string, max: number) {
  const v = pairOf(p);
  errors[`${key}.mr`] =
    tooLong(v.mr, `${label} (Marathi)`, max) ??
    (v.en && !v.mr ? `${label} (Marathi) is required when the English text is filled in` : undefined);
  errors[`${key}.en`] =
    tooLong(v.en, `${label} (English)`, max) ??
    (v.mr && !v.en ? `${label} (English) is required when the Marathi text is filled in` : undefined);
}

export function validateBrandBarForm(v: BrandBarFormValues): FieldErrors<BrandBarField> {
  const errors: FieldErrors<BrandBarField> = {};
  const title = line(v.title);
  errors.title = title ? tooLong(title, 'Title', TITLE_MAX) : 'Title is required';
  /* Two independent lines, not a pair: either may be blank on its own. */
  const fullName = pairOf(v.fullName);
  errors['fullName.mr'] = tooLong(fullName.mr, 'Full name (Marathi)', FULL_NAME_MAX);
  errors['fullName.en'] = tooLong(fullName.en, 'Full name (English)', FULL_NAME_MAX);
  optionalPair(errors, 'partnerLabel', v.partnerLabel, 'Partner label', PARTNER_LABEL_MAX);
  errors.partnerName = tooLong(line(v.partnerName), 'Partner name', PARTNER_NAME_MAX);
  return errors;
}

/* Server 422 details ("body.title", "body.fullName.mr") onto this form's keys ("title", "fullName.mr"). */
export function serverErrors(details: { field?: string; message: string }[]): FieldErrors<BrandBarField> {
  const out: FieldErrors<BrandBarField> = {};
  for (const d of details) {
    if (!d.field) continue;
    const key = d.field.replace(/^body\.?/, '') || 'form';
    out[key] ??= d.message;
  }
  return out;
}
