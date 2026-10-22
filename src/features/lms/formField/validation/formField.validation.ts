import type { FieldPath } from 'react-hook-form';
import { z } from 'zod';
import type { ErrorDetail } from '../../../../services/api-client';
import {
  CUSTOM_FIELD_TYPES, DEFAULT_CUSTOM_FIELD_TYPE, DEFAULT_REQUIRED_STAGE, DEFAULT_SENSITIVITY, FIELD_CODE_PATTERN, HELP_TEXT_MAX, LABEL_MAX,
  OPTIONS_MAX, OPTION_MAX_LENGTH, RULE_KEYS_BY_TYPE, RULE_LABELS, RULE_LENGTH_MAX, RULE_PATTERN_MAX, SECTION_CODE_PATTERN, SORT_ORDER_MAX,
  isChoiceType,
  type ApiFormField, type CreateFormFieldInput, type FormFieldTranslations, type FormSection, type RuleKey, type UpdateFormFieldInput,
} from '../types/formField.types';

/*
 * Form Field Configuration form rules, the same as the backend validator and form-field.rules.ts (F-LMS-FFC,
 * Table 40), with the backend's messages. Not a security boundary: the server validates every request again,
 * and its answers (409 duplicate key / label per language, FIELD_* locks, 422 rules) land on the matching field.
 */

export interface RuleValues {
  minLength: string;
  maxLength: string;
  pattern: string;
  min: string;
  max: string;
  integer: boolean;
  notInFuture: boolean;
  minDate: string;
  maxDate: string;
  minSelected: string;
  maxSelected: string;
}

export interface TranslationValues {
  label: string;
  helpText: string;
}

export interface FormFieldFormValues {
  formCode: string;
  fieldCode: string;
  label: string;
  helpText: string;
  /* One entry per platform language. Empty = the default label / help text is shown in that language. */
  translations: Record<string, TranslationValues>;
  /* true = a custom section code is typed instead of one of the form's sections (F-LMS-FFC-08). */
  customSection: boolean;
  sectionCode: string;
  /* '' = end of the section (create) / unchanged (edit). */
  sortOrder: string;
  dataType: string;
  options: { value: string }[];
  rules: RuleValues;
  isVisible: boolean;
  isRequired: boolean;
  requiredStage: string;
  sensitivity: string;
  isExportable: boolean;
  isActive: boolean;
}

export const HIDDEN_REQUIRED = 'A hidden field cannot be compulsory.';
export const CHOICE_NEEDS_OPTIONS = 'Add at least one option for a choice field.';

const collapse = (s: string) => s.trim().replace(/\s+/g, ' ');

export const emptyRules = (): RuleValues => ({
  minLength: '', maxLength: '', pattern: '', min: '', max: '', integer: false, notInFuture: false, minDate: '', maxDate: '', minSelected: '', maxSelected: '',
});

const emptyTranslations = (languages: { code: string }[]) =>
  Object.fromEntries(languages.map((l) => [l.code, { label: '', helpText: '' }])) as Record<string, TranslationValues>;

/* Table 40 defaults for a new custom field: visible, optional, ON_VERIFICATION, Text, Internal, exportable, active. */
export const emptyFormFieldForm = (
  { formCode, sectionCode = '', languages, sections }: { formCode: string; sectionCode?: string; languages: { code: string }[]; sections: Pick<FormSection, 'code'>[] },
): FormFieldFormValues => ({
  formCode,
  fieldCode: '',
  label: '',
  helpText: '',
  translations: emptyTranslations(languages),
  customSection: !!sectionCode && !sections.some((s) => s.code === sectionCode),
  sectionCode,
  sortOrder: '',
  dataType: DEFAULT_CUSTOM_FIELD_TYPE,
  options: [],
  rules: emptyRules(),
  isVisible: true,
  isRequired: false,
  requiredStage: DEFAULT_REQUIRED_STAGE,
  sensitivity: DEFAULT_SENSITIVITY,
  isExportable: true,
  isActive: true,
});

const str = (v: unknown) => (typeof v === 'number' || typeof v === 'string' ? String(v) : '');

export const rulesFrom = (r: Record<string, unknown>): RuleValues => ({
  minLength: str(r.minLength),
  maxLength: str(r.maxLength),
  pattern: typeof r.pattern === 'string' ? r.pattern : '',
  min: str(r.min),
  max: str(r.max),
  integer: r.integer === true,
  notInFuture: r.notInFuture === true,
  minDate: typeof r.minDate === 'string' ? r.minDate : '',
  maxDate: typeof r.maxDate === 'string' ? r.maxDate : '',
  minSelected: str(r.minSelected),
  maxSelected: str(r.maxSelected),
});

export const formFieldFormFrom = (f: ApiFormField, languages: { code: string }[], sections: Pick<FormSection, 'code'>[]): FormFieldFormValues => ({
  formCode: f.formCode,
  fieldCode: f.fieldCode,
  label: f.label,
  helpText: f.helpText ?? '',
  translations: Object.fromEntries(
    languages.map((l) => [l.code, { label: f.translations?.[l.code]?.label ?? '', helpText: f.translations?.[l.code]?.helpText ?? '' }]),
  ),
  customSection: !sections.some((s) => s.code === f.sectionCode),
  sectionCode: f.sectionCode,
  sortOrder: String(f.sortOrder),
  dataType: f.dataType,
  options: (f.options ?? []).map((value) => ({ value })),
  rules: rulesFrom(f.rules ?? {}),
  isVisible: f.isVisible,
  isRequired: f.isRequired,
  requiredStage: f.requiredStage,
  sensitivity: f.sensitivity,
  isExportable: f.isExportable,
  isActive: f.isActive,
});

/* A field key suggested from the label while the key has not been typed: "Blood Group" → blood_group. */
export const suggestFieldCode = (label: string): string =>
  label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .slice(0, 60)
    .replace(/_+$/, '');

/* Per-language labels to send: only the languages with a value; {} when none. */
export const translationsPayload = (t: Record<string, TranslationValues>): FormFieldTranslations => {
  const out: FormFieldTranslations = {};
  for (const [code, v] of Object.entries(t)) {
    const label = collapse(v.label);
    const helpText = v.helpText.trim();
    if (!label && !helpText) continue;
    out[code] = { ...(label ? { label } : {}), ...(helpText ? { helpText } : {}) };
  }
  return out;
};

/* The rules of the data type, typed (numbers, booleans, dates); a rule left empty is not set. */
export const rulesPayload = (dataType: string, r: RuleValues): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of RULE_KEYS_BY_TYPE[dataType] ?? []) {
    if (key === 'integer' || key === 'notInFuture') {
      if (r[key]) out[key] = true;
    } else if (key === 'pattern') {
      if (r.pattern !== '') out.pattern = r.pattern;
    } else if (key === 'minDate' || key === 'maxDate') {
      if (r[key]) out[key] = r[key];
    } else if (r[key].trim() !== '') {
      out[key] = Number(r[key].trim());
    }
  }
  return out;
};

export const optionsPayload = (dataType: string, options: { value: string }[]): string[] | null =>
  isChoiceType(dataType) ? options.map((o) => collapse(o.value)) : null;

const sortOrderPayload = (raw: string) => (raw.trim() === '' ? {} : { sortOrder: Number(raw.trim()) });

/* What 'Add custom field' sends. */
export const createFormFieldPayload = (v: FormFieldFormValues): CreateFormFieldInput => ({
  formCode: v.formCode,
  fieldCode: v.fieldCode.trim(),
  label: collapse(v.label),
  helpText: v.helpText.trim() || null,
  translations: translationsPayload(v.translations),
  sectionCode: v.sectionCode.trim().toUpperCase(),
  ...sortOrderPayload(v.sortOrder),
  dataType: v.dataType,
  options: optionsPayload(v.dataType, v.options),
  rules: rulesPayload(v.dataType, v.rules),
  isVisible: v.isVisible,
  isRequired: v.isRequired,
  requiredStage: v.requiredStage,
  sensitivity: v.sensitivity,
  isExportable: v.isExportable,
  isActive: v.isActive,
});

/*
 * What an edit sends: only what the backend lets this field change. A standard field never sends its type,
 * options, rules or classification (FIELD_STANDARD); a system-locked one never sends its visibility,
 * compulsory rule or stage (FIELD_SYSTEM_LOCKED); a field with values keeps its type (FIELD_TYPE_LOCKED).
 */
export const updateFormFieldPayload = (
  v: FormFieldFormValues,
  field: Pick<ApiFormField, 'isCustom' | 'isSystemLocked' | 'typeLocked'>,
): UpdateFormFieldInput => ({
  label: collapse(v.label),
  helpText: v.helpText.trim() || null,
  translations: translationsPayload(v.translations),
  sectionCode: v.sectionCode.trim().toUpperCase(),
  ...sortOrderPayload(v.sortOrder),
  ...(field.isSystemLocked ? {} : { isVisible: v.isVisible, isRequired: v.isRequired, requiredStage: v.requiredStage }),
  ...(field.isCustom
    ? {
        ...(field.typeLocked ? {} : { dataType: v.dataType }),
        options: optionsPayload(v.dataType, v.options),
        rules: rulesPayload(v.dataType, v.rules),
        sensitivity: v.sensitivity,
        isExportable: v.isExportable,
      }
    : {}),
});

/* ---------------------------------------------------------------- schema ---------------------------------------------------------------- */

const issue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

const WHOLE = /^-?\d+$/;

/* A length / count rule: whole number, 0 (or 1 for a maximum) to 10000. */
const lengthError = (raw: string, min: number): string | undefined => {
  const t = raw.trim();
  if (!WHOLE.test(t)) return 'Enter a whole number';
  const n = Number(t);
  if (n < min) return `Must be at least ${min}`;
  if (n > RULE_LENGTH_MAX) return `Must be at most ${RULE_LENGTH_MAX}`;
  return undefined;
};

export const isIsoDate = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
};

const validRegex = (p: string) => {
  try {
    new RegExp(p, 'u');
    return true;
  } catch {
    return false;
  }
};

const GREATER: Partial<Record<RuleKey, string>> = {
  minLength: 'Must not be greater than the maximum length',
  min: 'Must not be greater than the maximum value',
  minDate: 'Must not be later than the latest date',
  minSelected: 'Must not be greater than the maximum selections',
};

/* F-LMS-FFC-07 rules of the chosen type (form-field.rules.ts): each type accepts only its own, all optional. */
function checkRules(ctx: z.RefinementCtx, dataType: string, r: RuleValues, optionCount: number | null) {
  const keys = RULE_KEYS_BY_TYPE[dataType] ?? [];
  let failed = false;
  const at = (k: RuleKey, message: string) => {
    failed = true;
    issue(ctx, ['rules', k], message);
  };
  const num: Partial<Record<RuleKey, number>> = {};

  for (const k of keys) {
    if (k === 'integer' || k === 'notInFuture') continue;
    const raw = r[k];
    if (k === 'pattern') {
      if (raw === '') continue;
      if (raw.length > RULE_PATTERN_MAX) at(k, `Must be at most ${RULE_PATTERN_MAX} characters`);
      else if (!validRegex(raw)) at(k, 'Enter a valid regular expression');
      continue;
    }
    if (k === 'minDate' || k === 'maxDate') {
      if (!raw) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) at(k, 'Enter a date as YYYY-MM-DD');
      else if (!isIsoDate(raw)) at(k, 'Enter a valid date');
      continue;
    }
    if (raw.trim() === '') continue;
    if (k === 'min' || k === 'max') {
      const n = Number(raw.trim());
      if (!Number.isFinite(n)) at(k, 'Enter a number');
      else num[k] = n;
      continue;
    }
    const error = lengthError(raw, k === 'maxLength' || k === 'maxSelected' ? 1 : 0);
    if (error) at(k, error);
    else num[k] = Number(raw.trim());
  }

  const pair = (lo: RuleKey, hi: RuleKey) => {
    if (num[lo] !== undefined && num[hi] !== undefined && num[lo]! > num[hi]!) at(lo, GREATER[lo]!);
  };
  pair('minLength', 'maxLength');
  pair('min', 'max');
  pair('minSelected', 'maxSelected');
  if (keys.includes('minDate') && isIsoDate(r.minDate) && isIsoDate(r.maxDate) && r.minDate > r.maxDate) at('minDate', GREATER.minDate!);

  /* A selection count cannot exceed the number of options (checked, as on the server, once the rules themselves are valid). */
  if (dataType === 'MULTIPLE_CHOICE' && optionCount && !failed) {
    for (const k of ['minSelected', 'maxSelected'] as const) {
      const n = num[k];
      if (n !== undefined && n > optionCount) at(k, `Must be at most the number of options (${optionCount})`);
    }
  }
}

const translationSchema = z.object({ label: z.string(), helpText: z.string() });

const ruleValuesSchema = z.object({
  minLength: z.string(), maxLength: z.string(), pattern: z.string(), min: z.string(), max: z.string(), integer: z.boolean(),
  notInFuture: z.boolean(), minDate: z.string(), maxDate: z.string(), minSelected: z.string(), maxSelected: z.string(),
});

export interface FormFieldSchemaContext {
  mode: 'create' | 'edit';
  /* Edit of a standard field: its type, options and rules belong to the catalogue and are not checked here. */
  isCustom: boolean;
  requiredStages: string[];
  sensitivities: string[];
}

export const formFieldSchema = ({ mode, isCustom, requiredStages, sensitivities }: FormFieldSchemaContext) =>
  z
    .object({
      formCode: z.string(),
      fieldCode: z.string(),
      label: z.string(),
      helpText: z.string(),
      translations: z.record(translationSchema),
      customSection: z.boolean(),
      sectionCode: z.string(),
      sortOrder: z.string(),
      dataType: z.string(),
      options: z.array(z.object({ value: z.string() })),
      rules: ruleValuesSchema,
      isVisible: z.boolean(),
      isRequired: z.boolean(),
      requiredStage: z.string(),
      sensitivity: z.string(),
      isExportable: z.boolean(),
      isActive: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (mode === 'create') {
        /* F-LMS-FFC-01: a form registered as configurable. */
        if (!v.formCode) issue(ctx, ['formCode'], 'Select a form.');
        /* F-LMS-FFC-02: the key the value is stored under. */
        const key = v.fieldCode.trim();
        if (!key) issue(ctx, ['fieldCode'], 'Enter a field key.');
        else if (!FIELD_CODE_PATTERN.test(key)) issue(ctx, ['fieldCode'], 'Use 2–60 lower-case letters, digits and underscores, starting with a letter.');
      }

      /* F-LMS-FFC-03: label ≤ 80 (required), help text ≤ 200, the same per language. */
      const label = collapse(v.label);
      if (!label) issue(ctx, ['label'], 'Enter a label.');
      else if (label.length > LABEL_MAX) issue(ctx, ['label'], `Must be at most ${LABEL_MAX} characters`);
      if (v.helpText.trim().length > HELP_TEXT_MAX) issue(ctx, ['helpText'], `Must be at most ${HELP_TEXT_MAX} characters`);
      for (const [code, t] of Object.entries(v.translations)) {
        if (collapse(t.label).length > LABEL_MAX) issue(ctx, ['translations', code, 'label'], `Must be at most ${LABEL_MAX} characters`);
        if (t.helpText.trim().length > HELP_TEXT_MAX) issue(ctx, ['translations', code, 'helpText'], `Must be at most ${HELP_TEXT_MAX} characters`);
      }

      /* F-LMS-FFC-08: a section of the form, or a custom section (upper-case code), and the order within it. */
      const section = v.sectionCode.trim().toUpperCase();
      if (!section) issue(ctx, ['sectionCode'], 'Select a section.');
      else if (!SECTION_CODE_PATTERN.test(section)) issue(ctx, ['sectionCode'], 'Use 1–40 capital letters, digits and underscores, starting with a letter.');
      const order = v.sortOrder.trim();
      if (order) {
        if (!WHOLE.test(order)) issue(ctx, ['sortOrder'], 'Enter a whole number');
        else if (Number(order) < 0) issue(ctx, ['sortOrder'], 'Must be at least 0');
        else if (Number(order) > SORT_ORDER_MAX) issue(ctx, ['sortOrder'], `Must be at most ${SORT_ORDER_MAX}`);
      }

      /* F-LMS-FFC-07: type, options and rules of a custom field. */
      if (isCustom) {
        if (!(CUSTOM_FIELD_TYPES as readonly string[]).includes(v.dataType)) issue(ctx, ['dataType'], 'Select a data type.');
        const choice = isChoiceType(v.dataType);
        if (choice) {
          if (!v.options.length) issue(ctx, ['options'], CHOICE_NEEDS_OPTIONS);
          else if (v.options.length > OPTIONS_MAX) issue(ctx, ['options'], `At most ${OPTIONS_MAX} options`);
          const seen = new Set<string>();
          v.options.forEach((o, i) => {
            const value = collapse(o.value);
            if (!value) issue(ctx, ['options', i, 'value'], 'Enter the option.');
            else if (value.length > OPTION_MAX_LENGTH) issue(ctx, ['options', i, 'value'], `Must be at most ${OPTION_MAX_LENGTH} characters`);
            else if (seen.has(value.toLowerCase())) issue(ctx, ['options', i, 'value'], 'Each option can be listed only once.');
            if (value) seen.add(value.toLowerCase());
          });
        }
        checkRules(ctx, v.dataType, v.rules, choice ? v.options.length : null);
        if (!sensitivities.includes(v.sensitivity)) issue(ctx, ['sensitivity'], 'Select Internal, Personal or Restricted.');
      }

      /* F-LMS-FFC-04 / -05 / -06. */
      if (!v.isVisible && v.isRequired) issue(ctx, ['isRequired'], HIDDEN_REQUIRED);
      if (!requiredStages.includes(v.requiredStage)) issue(ctx, ['requiredStage'], 'Select ON_SAVE or ON_VERIFICATION.');
    });

/* ----------------------------------------------------------- server answers ----------------------------------------------------------- */

const SIMPLE_PATHS = [
  'formCode', 'fieldCode', 'label', 'helpText', 'sectionCode', 'sortOrder', 'dataType', 'options', 'rules',
  'isVisible', 'isRequired', 'requiredStage', 'sensitivity', 'isExportable', 'isActive',
] as const;

/*
 * Server field details mapped onto form paths. The validator names fields "body.rules.min" / "body.options.2",
 * the service "label" / "translations.mr.label" / "dataType"; anything the form has no control for is left out
 * (and toasted by the caller).
 */
export function formFieldServerErrors(details: ErrorDetail[], languages: string[]): { path: FieldPath<FormFieldFormValues>; message: string }[] {
  const out: { path: FieldPath<FormFieldFormValues>; message: string }[] = [];
  const add = (path: FieldPath<FormFieldFormValues>, message: string) => {
    if (!out.some((o) => o.path === path)) out.push({ path, message });
  };
  for (const d of details) {
    const f = (d.field ?? '').replace(/^(body|params|query)\./, '');
    const option = f.match(/^options\.(\d+)$/);
    const rule = f.match(/^rules\.(\w+)$/);
    const translation = f.match(/^translations\.([^.]+)\.(label|helpText)$/);
    if (option) add(`options.${Number(option[1])}.value`, d.message);
    else if (rule && rule[1] in RULE_LABELS) add(`rules.${rule[1] as RuleKey}`, d.message);
    else if (translation && languages.includes(translation[1])) add(`translations.${translation[1]}.${translation[2] as 'label' | 'helpText'}`, d.message);
    else if ((SIMPLE_PATHS as readonly string[]).includes(f)) add(f as (typeof SIMPLE_PATHS)[number], d.message);
  }
  return out;
}
