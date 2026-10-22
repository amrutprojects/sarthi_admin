/*
 * Form Field Configuration (AMRUT_KALASH_03 L-38 / FR-338, form F-LMS-FFC), as /api/v1/lms/form-fields returns
 * and accepts it. The fixed values below mirror the backend's form-field.constants.ts and form-field.rules.ts.
 */

/* Per-language label / help text, keyed by platform language code (F-LMS-FFC-03 "per language"). */
export type FormFieldTranslations = Partial<Record<string, { label?: string; helpText?: string }>>;

/* One field configuration row (list rows and the detail). */
export interface ApiFormField {
  id: string;
  formCode: string;
  formLabel: string | null;
  fieldCode: string;
  /* false = standard field of the application's catalogue; true = custom field added here. */
  isCustom: boolean;
  /* Trainer Name: always visible and compulsory (FIELD_SYSTEM_LOCKED). */
  isSystemLocked: boolean;
  label: string;
  helpText: string | null;
  translations: FormFieldTranslations;
  sectionCode: string;
  sectionLabel: string;
  sortOrder: number;
  dataType: string;
  options: string[] | null;
  rules: Record<string, unknown>;
  isVisible: boolean;
  isRequired: boolean;
  requiredStage: string;
  sensitivity: string;
  isExportable: boolean;
  /* ACTIVE / ARCHIVED for custom fields; standard fields are always active. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /* Only on the single-record response: records holding a value; > 0 locks the type and blocks delete. */
  storedValues?: number;
  typeLocked?: boolean;
}

export interface FormSection {
  code: string;
  label: string;
}

/*
 * GET /lms/form-fields/forms/:formCode/sections: every section of a form — its standard sections in form
 * order, then each custom section a non-deleted field uses (hidden and archived fields included), A to Z.
 */
export interface FormSectionSummary {
  code: string;
  /* null for a custom section (it has only a code). */
  label: string | null;
  isStandard: boolean;
  /* Non-deleted fields in the section, hidden and archived ones included. */
  fieldCount: number;
}

/* A section offered by a filter or picker; fieldCount is null while only form-options' standard sections are known. */
export type SectionChoice = Omit<FormSectionSummary, 'fieldCount'> & { fieldCount: number | null };

export const sectionChoiceLabel = (s: Pick<SectionChoice, 'code' | 'label'>) => `${s.code} · ${s.label ?? 'Custom section'}`;

/* GET /lms/form-fields/form-options. */
export interface FormFieldFormOptions {
  forms: { code: string; label: string; specRef: string; sections: FormSection[] }[];
  customDataTypes: { code: string; rules: string[]; hasOptions: boolean }[];
  requiredStages: string[];
  sensitivities: string[];
  languages: { code: string; label: string }[];
  /* false while OQ-023 (platform languages) is open. */
  languagesConfirmed: boolean;
  fileConstraints: { extensions: string[]; mimeTypes: string[]; maxBytes: number };
}

/* One field of the effective configuration (what the form renders and the server enforces). */
export interface EffectiveFormField {
  fieldCode: string;
  label: string;
  helpText: string | null;
  translations: FormFieldTranslations;
  dataType: string;
  options: string[] | null;
  rules: Record<string, unknown>;
  isRequired: boolean;
  /* null when the field is not compulsory. */
  requiredStage: string | null;
  isSystemLocked: boolean;
  isCustom: boolean;
  sensitivity: string;
  isExportable: boolean;
  sortOrder: number;
}

/* GET /lms/form-fields/forms/:formCode/effective: visible, active fields by section, in display order. */
export interface EffectiveFormConfiguration {
  form: { code: string; label: string; specRef: string };
  sections: { code: string; label: string; isCustomSection: boolean; fields: EffectiveFormField[] }[];
}

/* POST body ('Add custom field'). Standard fields come only from the catalogue. */
export interface CreateFormFieldInput {
  formCode: string;
  fieldCode: string;
  label: string;
  helpText: string | null;
  translations: FormFieldTranslations;
  sectionCode: string;
  /* Left out: end of the section. */
  sortOrder?: number;
  dataType: string;
  options: string[] | null;
  rules: Record<string, unknown>;
  isVisible: boolean;
  isRequired: boolean;
  requiredStage: string;
  sensitivity: string;
  isExportable: boolean;
  isActive: boolean;
}

/*
 * PATCH body. Form and field key never change; status has its own endpoint. dataType / options / rules /
 * sensitivity / isExportable belong to custom fields only (FIELD_STANDARD); a system-locked field keeps its
 * visibility, compulsory rule and stage (FIELD_SYSTEM_LOCKED).
 */
export interface UpdateFormFieldInput {
  label?: string;
  helpText?: string | null;
  translations?: FormFieldTranslations;
  sectionCode?: string;
  sortOrder?: number;
  dataType?: string;
  options?: string[] | null;
  rules?: Record<string, unknown>;
  isVisible?: boolean;
  isRequired?: boolean;
  requiredStage?: string;
  sensitivity?: string;
  isExportable?: boolean;
}

/* L-38: "In LMS Admin the configurable form is the Trainer Profile". */
export const DEFAULT_FORM_CODE = 'TRAINER_PROFILE';

/* F-LMS-FFC-03 and the option editor's bounds (form-field.constants.ts). */
export const LABEL_MAX = 80;
export const HELP_TEXT_MAX = 200;
export const OPTION_MAX_LENGTH = 80;
export const OPTIONS_MAX = 100;
export const RULE_LENGTH_MAX = 10_000;
export const RULE_PATTERN_MAX = 200;
export const SORT_ORDER_MAX = 100_000;

export const FIELD_CODE_PATTERN = /^[a-z][a-z0-9_]{1,59}$/;
export const SECTION_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,39}$/;

/* F-LMS-FFC-07: the data types a custom field can have; the default is Text. */
export const CUSTOM_FIELD_TYPES = ['TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'FILE'] as const;
export const DEFAULT_CUSTOM_FIELD_TYPE = 'TEXT';
export const isChoiceType = (t: string) => t === 'SINGLE_CHOICE' || t === 'MULTIPLE_CHOICE';

/* The rules each custom type accepts (form-field.rules.ts RULE_KEYS_BY_TYPE). */
export type RuleKey = 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'integer' | 'notInFuture' | 'minDate' | 'maxDate' | 'minSelected' | 'maxSelected';
export const RULE_KEYS_BY_TYPE: Record<string, RuleKey[]> = {
  TEXT: ['minLength', 'maxLength', 'pattern'],
  LONG_TEXT: ['minLength', 'maxLength'],
  NUMBER: ['min', 'max', 'integer'],
  DATE: ['notInFuture', 'minDate', 'maxDate'],
  YES_NO: [],
  SINGLE_CHOICE: [],
  MULTIPLE_CHOICE: ['minSelected', 'maxSelected'],
  FILE: [],
};
export const RULE_LABELS: Record<RuleKey, string> = {
  minLength: 'Minimum length',
  maxLength: 'Maximum length',
  pattern: 'Pattern',
  min: 'Minimum value',
  max: 'Maximum value',
  integer: 'Whole numbers only',
  notInFuture: 'Not in the future',
  minDate: 'Earliest date',
  maxDate: 'Latest date',
  minSelected: 'Minimum selections',
  maxSelected: 'Maximum selections',
};

export const DATA_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Text',
  LONG_TEXT: 'Long text',
  NUMBER: 'Number',
  DATE: 'Date',
  YES_NO: 'Yes / No',
  SINGLE_CHOICE: 'Single choice',
  MULTIPLE_CHOICE: 'Multiple choice',
  FILE: 'File',
  EMAIL: 'Email',
  PHONE: 'Phone',
  IMAGE: 'Image',
  TEXT_ARRAY: 'List of texts',
  REFERENCE: 'Reference',
  REFERENCE_ARRAY: 'References',
  REPEATING_GROUP: 'Repeating group',
  ENUM_ARRAY: 'Multiple values',
  GRID: 'Grid',
  SIGN_OFF: 'Sign-off',
};
export const dataTypeLabel = (t: string) => DATA_TYPE_LABELS[t] ?? t;

/* F-LMS-FFC-06: when a compulsory rule applies (default ON_VERIFICATION). */
export const DEFAULT_REQUIRED_STAGE = 'ON_VERIFICATION';
export const STAGE_LABELS: Record<string, string> = { ON_SAVE: 'On every save', ON_VERIFICATION: 'On verification' };
export const stageLabel = (s: string) => STAGE_LABELS[s] ?? s;

/* F-LMS-FFC-09: Internal (default), Personal, Restricted. */
export const DEFAULT_SENSITIVITY = 'INTERNAL';
export const SENSITIVITY_LABELS: Record<string, string> = { INTERNAL: 'Internal', PERSONAL: 'Personal', RESTRICTED: 'Restricted' };
export const sensitivityLabel = (s: string) => SENSITIVITY_LABELS[s] ?? s;

/*
 * The backend's answers for what it refuses on a field (409), shown next to the controls it concerns before
 * anything is sent. FIELD_HAS_VALUES carries the count of records holding a value.
 */
export const LOCK_MESSAGES = {
  FIELD_SYSTEM_LOCKED: 'This field is required by the system and cannot be changed in this way.',
  FIELD_STANDARD: 'This is a standard field of the form: only its label, help text, visibility, compulsory rule, section and order can change.',
  FIELD_STANDARD_ARCHIVE: 'Standard fields cannot be archived. Hide the field instead.',
  FIELD_STANDARD_DELETE: 'Standard fields cannot be deleted. Hide the field instead.',
  FIELD_TYPE_LOCKED: 'The type cannot be changed because values already exist.',
} as const;

export const hasValuesMessage = (n: number) =>
  `This custom field cannot be deleted while ${n} ${n === 1 ? 'record holds a value' : 'records hold a value'}. Archive it instead.`;
