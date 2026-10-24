import { validateText, validateWholeNumber, type FieldErrors } from '../../validation';
import {
  ELIGIBILITY_KINDS,
  SETTINGS_KEYS,
  SETTINGS_LABEL,
  type ApiEligibilityItem,
  type ApiEligibilitySettings,
  type Bilingual,
  type CreateEligibilityItemInput,
  type EligibilityItemField,
  type EligibilityKind,
  type EligibilitySettingsField,
  type SettingsKey,
  type UpdateEligibilitySettingsInput,
} from '../types/eligibility.types';

/*
 * Eligibility form rules, deliberately identical to the server rules in
 * backend/src/cms/eligibility/eligibility.validator.ts and to the CHECK constraints on the
 * eligibility_items and eligibility_page_settings tables: both halves of every pair are required and
 * within the column lengths, a criterion carries a value and a document does not, and the display order
 * is a whole number from 0 to 9999.
 */

/* ---------------- items (criteria and documents) ---------------- */

export interface EligibilityItemFormValues {
  kind: EligibilityKind;
  label: { mr: string; en: string };
  /* Only used by a criterion; ignored (and never sent) for a document. */
  value: { mr: string; en: string };
  /* Typed as text so the box can be left empty: an empty order puts a new item at the end of its list. */
  displayOrder: string;
  isActive: boolean;
}

export const LABEL_MAX = 300;
export const VALUE_MAX = 1000;

/* What the label is called on the form, so a document is not asked for its "criterion". */
export const labelName = (kind: EligibilityKind): string => (kind === 'CRITERION' ? 'Criterion' : 'Document name');

/* ?kind= from the URL, or a criterion when it is missing or not one of the two types. */
export const parseKind = (raw: string | null): EligibilityKind =>
  ELIGIBILITY_KINDS.includes(raw as EligibilityKind) ? (raw as EligibilityKind) : 'CRITERION';

export const emptyEligibilityItemForm = (kind: EligibilityKind = 'CRITERION'): EligibilityItemFormValues => ({
  kind,
  label: { mr: '', en: '' },
  value: { mr: '', en: '' },
  displayOrder: '',
  isActive: true,
});

export const toEligibilityItemFormValues = (item: ApiEligibilityItem): EligibilityItemFormValues => ({
  kind: item.kind,
  label: { ...item.label },
  value: item.value ? { ...item.value } : { mr: '', en: '' },
  displayOrder: String(item.displayOrder),
  isActive: item.isActive,
});

/*
 * The values actually sent to the API: every text trimmed, no order at all when the box is empty, and a
 * value only for a criterion — the server refuses one on a document.
 */
export const normalizeEligibilityItemForm = (v: EligibilityItemFormValues): CreateEligibilityItemInput => ({
  kind: v.kind,
  label: { mr: v.label.mr.trim(), en: v.label.en.trim() },
  ...(v.kind === 'CRITERION' ? { value: { mr: v.value.mr.trim(), en: v.value.en.trim() } } : {}),
  ...(v.displayOrder.trim() ? { displayOrder: Number(v.displayOrder.trim()) } : {}),
  isActive: v.isActive,
});

export function validateEligibilityItemForm(
  v: EligibilityItemFormValues,
  { orderRequired = false } = {},
): FieldErrors<EligibilityItemField> {
  const name = labelName(v.kind);
  const isCriterion = v.kind === 'CRITERION';
  return {
    kind: ELIGIBILITY_KINDS.includes(v.kind) ? undefined : 'Type is required',
    'label.mr': validateText(v.label.mr, `${name} (Marathi)`, { max: LABEL_MAX, required: true }),
    'label.en': validateText(v.label.en, `${name} (English)`, { max: LABEL_MAX, required: true }),
    'value.mr': isCriterion ? validateText(v.value.mr, 'Value (Marathi)', { max: VALUE_MAX, required: true }) : undefined,
    'value.en': isCriterion ? validateText(v.value.en, 'Value (English)', { max: VALUE_MAX, required: true }) : undefined,
    displayOrder: validateWholeNumber(v.displayOrder, 'Display order', { min: 0, max: 9999, required: orderRequired }),
  };
}

/* ---------------- page text (singleton) ---------------- */

export type EligibilitySettingsFormValues = Record<SettingsKey, Bilingual> & { showNote: boolean };

/* Column lengths of eligibility_page_settings. */
export const SETTINGS_MAX: Record<SettingsKey, number> = {
  pageTitle: 200,
  pageSubtitle: 500,
  criteriaHeading: 200,
  documentsHeading: 200,
  noteTitle: 200,
  noteBody: 2000,
};

export const toEligibilitySettingsFormValues = (s: ApiEligibilitySettings): EligibilitySettingsFormValues => ({
  pageTitle: { ...s.pageTitle },
  pageSubtitle: { ...s.pageSubtitle },
  criteriaHeading: { ...s.criteriaHeading },
  documentsHeading: { ...s.documentsHeading },
  noteTitle: { ...s.noteTitle },
  noteBody: { ...s.noteBody },
  showNote: s.showNote,
});

/* The values actually sent to the API: every text trimmed. */
export const normalizeEligibilitySettingsForm = (v: EligibilitySettingsFormValues): UpdateEligibilitySettingsInput => {
  const trim = (p: Bilingual): Bilingual => ({ mr: p.mr.trim(), en: p.en.trim() });
  return {
    pageTitle: trim(v.pageTitle),
    pageSubtitle: trim(v.pageSubtitle),
    criteriaHeading: trim(v.criteriaHeading),
    documentsHeading: trim(v.documentsHeading),
    noteTitle: trim(v.noteTitle),
    noteBody: trim(v.noteBody),
    showNote: v.showNote,
  };
};

export function validateEligibilitySettingsForm(v: EligibilitySettingsFormValues): FieldErrors<EligibilitySettingsField> {
  const errors: FieldErrors<EligibilitySettingsField> = {};
  for (const key of SETTINGS_KEYS) {
    const max = SETTINGS_MAX[key];
    errors[`${key}.mr`] = validateText(v[key].mr, `${SETTINGS_LABEL[key]} (Marathi)`, { max, required: true });
    errors[`${key}.en`] = validateText(v[key].en, `${SETTINGS_LABEL[key]} (English)`, { max, required: true });
  }
  return errors;
}
