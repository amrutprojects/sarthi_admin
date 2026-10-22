import { validateHttpsUrl, validateText, validateWholeNumber, type FieldErrors } from '../../validation';
import {
  APPLY_KINDS,
  CTA_URL_LABEL,
  SETTINGS_KEYS,
  SETTINGS_LABEL,
  type ApiApplyItem,
  type ApiApplySettings,
  type ApplyItemField,
  type ApplyKind,
  type ApplySettingsField,
  type Bilingual,
  type CreateApplyItemInput,
  type SettingsKey,
  type UpdateApplySettingsInput,
} from '../types/apply.types';

/*
 * Apply page form rules, deliberately identical to the server rules in
 * backend/src/cms/apply/apply.validator.ts and to the CHECK constraints on the apply_page_items and
 * apply_page_settings tables: both halves of every pair are required and within the column lengths,
 * a step and a fact both carry a value, the display order is a whole number from 0 to 9999, and the
 * portal link is an https link.
 */

/* ---------------- items (steps and at-a-glance rows) ---------------- */

export interface ApplyItemFormValues {
  kind: ApplyKind;
  label: { mr: string; en: string };
  value: { mr: string; en: string };
  /* Typed as text so the box can be left empty: an empty order puts a new item at the end of its list. */
  displayOrder: string;
  isActive: boolean;
}

export const LABEL_MAX = 300;
export const VALUE_MAX = 2000;

/* What the two halves are called on the form, so an at-a-glance row is not asked for its "step title". */
export const labelName = (kind: ApplyKind): string => (kind === 'STEP' ? 'Step title' : 'Label');
export const valueName = (kind: ApplyKind): string => (kind === 'STEP' ? 'Step description' : 'Value');

/* ?kind= from the URL, or a step when it is missing or not one of the two types. */
export const parseKind = (raw: string | null): ApplyKind => (APPLY_KINDS.includes(raw as ApplyKind) ? (raw as ApplyKind) : 'STEP');

export const emptyApplyItemForm = (kind: ApplyKind = 'STEP'): ApplyItemFormValues => ({
  kind,
  label: { mr: '', en: '' },
  value: { mr: '', en: '' },
  displayOrder: '',
  isActive: true,
});

export const toApplyItemFormValues = (item: ApiApplyItem): ApplyItemFormValues => ({
  kind: item.kind,
  label: { ...item.label },
  value: { ...item.value },
  displayOrder: String(item.displayOrder),
  isActive: item.isActive,
});

/* The values actually sent to the API: every text trimmed, and no order at all when the box is empty. */
export const normalizeApplyItemForm = (v: ApplyItemFormValues): CreateApplyItemInput => ({
  kind: v.kind,
  label: { mr: v.label.mr.trim(), en: v.label.en.trim() },
  value: { mr: v.value.mr.trim(), en: v.value.en.trim() },
  ...(v.displayOrder.trim() ? { displayOrder: Number(v.displayOrder.trim()) } : {}),
  isActive: v.isActive,
});

export function validateApplyItemForm(v: ApplyItemFormValues, { orderRequired = false } = {}): FieldErrors<ApplyItemField> {
  const label = labelName(v.kind);
  const value = valueName(v.kind);
  return {
    kind: APPLY_KINDS.includes(v.kind) ? undefined : 'Type is required',
    'label.mr': validateText(v.label.mr, `${label} (Marathi)`, { max: LABEL_MAX, required: true }),
    'label.en': validateText(v.label.en, `${label} (English)`, { max: LABEL_MAX, required: true }),
    'value.mr': validateText(v.value.mr, `${value} (Marathi)`, { max: VALUE_MAX, required: true }),
    'value.en': validateText(v.value.en, `${value} (English)`, { max: VALUE_MAX, required: true }),
    displayOrder: validateWholeNumber(v.displayOrder, 'Display order', { min: 0, max: 9999, required: orderRequired }),
  };
}

/* ---------------- page text (singleton) ---------------- */

export type ApplySettingsFormValues = Record<SettingsKey, Bilingual> & { ctaUrl: string };

/* Column lengths of apply_page_settings. */
export const SETTINGS_MAX: Record<SettingsKey, number> = {
  pageTitle: 200,
  pageSubtitle: 500,
  noteTitle: 200,
  noteBody: 2000,
  glanceHeading: 200,
  documentsHeading: 200,
  ctaText: 1000,
  ctaLabel: 100,
  ctaHint: 300,
};

export const CTA_URL_MAX = 500;

export const toApplySettingsFormValues = (s: ApiApplySettings): ApplySettingsFormValues => ({
  pageTitle: { ...s.pageTitle },
  pageSubtitle: { ...s.pageSubtitle },
  noteTitle: { ...s.noteTitle },
  noteBody: { ...s.noteBody },
  glanceHeading: { ...s.glanceHeading },
  documentsHeading: { ...s.documentsHeading },
  ctaText: { ...s.ctaText },
  ctaLabel: { ...s.ctaLabel },
  ctaUrl: s.ctaUrl,
  ctaHint: { ...s.ctaHint },
});

/* The values actually sent to the API: every text trimmed. */
export const normalizeApplySettingsForm = (v: ApplySettingsFormValues): UpdateApplySettingsInput => {
  const trim = (p: Bilingual): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });
  return {
    pageTitle: trim(v.pageTitle),
    pageSubtitle: trim(v.pageSubtitle),
    noteTitle: trim(v.noteTitle),
    noteBody: trim(v.noteBody),
    glanceHeading: trim(v.glanceHeading),
    documentsHeading: trim(v.documentsHeading),
    ctaText: trim(v.ctaText),
    ctaLabel: trim(v.ctaLabel),
    ctaUrl: v.ctaUrl.trim(),
    ctaHint: trim(v.ctaHint),
  };
};

/*
 * The portal link is required (the Apply button needs somewhere to go); beyond that it is the shared
 * https rule — a lower-case "https://" prefix, a link that parses, at most 500 characters — as on the server.
 */
export const validateCtaUrl = (raw: string): string | undefined =>
  raw.trim() ? validateHttpsUrl(raw, CTA_URL_MAX) : `${CTA_URL_LABEL} is required`;

export function validateApplySettingsForm(v: ApplySettingsFormValues): FieldErrors<ApplySettingsField> {
  const errors: FieldErrors<ApplySettingsField> = {};
  for (const key of SETTINGS_KEYS) {
    const max = SETTINGS_MAX[key];
    errors[`${key}.mr`] = validateText(v[key].mr, `${SETTINGS_LABEL[key]} (Marathi)`, { max, required: true });
    errors[`${key}.en`] = validateText(v[key].en, `${SETTINGS_LABEL[key]} (English)`, { max, required: true });
  }
  errors.ctaUrl = validateCtaUrl(v.ctaUrl);
  return errors;
}
