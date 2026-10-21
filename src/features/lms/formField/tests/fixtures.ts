import type { ApiFormField, EffectiveFormConfiguration, FormFieldFormOptions, FormSectionSummary } from '../types/formField.types';

/* Test data shaped exactly like the /api/v1/lms/form-fields responses. */
export const AT = '2026-10-01T10:00:00.000Z';

export const formOptions: FormFieldFormOptions = {
  forms: [
    {
      code: 'TRAINER_PROFILE',
      label: 'Trainer Profile',
      specRef: 'F-LMS-TRN',
      sections: [
        { code: 'A', label: 'Basic personal details' },
        { code: 'B', label: 'Educational qualification' },
        { code: 'VERIFICATION', label: 'Verification and sign-off' },
      ],
    },
  ],
  customDataTypes: [
    { code: 'TEXT', rules: ['minLength', 'maxLength', 'pattern'], hasOptions: false },
    { code: 'LONG_TEXT', rules: ['minLength', 'maxLength'], hasOptions: false },
    { code: 'NUMBER', rules: ['min', 'max', 'integer'], hasOptions: false },
    { code: 'DATE', rules: ['notInFuture', 'minDate', 'maxDate'], hasOptions: false },
    { code: 'YES_NO', rules: [], hasOptions: false },
    { code: 'SINGLE_CHOICE', rules: [], hasOptions: true },
    { code: 'MULTIPLE_CHOICE', rules: ['minSelected', 'maxSelected'], hasOptions: true },
    { code: 'FILE', rules: [], hasOptions: false },
  ],
  requiredStages: ['ON_SAVE', 'ON_VERIFICATION'],
  sensitivities: ['INTERNAL', 'PERSONAL', 'RESTRICTED'],
  languages: [
    { code: 'en', label: 'English' },
    { code: 'mr', label: 'Marathi' },
  ],
  languagesConfirmed: false,
  fileConstraints: { extensions: ['pdf', 'jpg', 'jpeg', 'png'], mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxBytes: 5 * 1024 * 1024 },
};

/* A custom field (Blood Group, single choice). */
export const customField = (over: Partial<ApiFormField> = {}): ApiFormField => ({
  id: 'ff1',
  formCode: 'TRAINER_PROFILE',
  formLabel: 'Trainer Profile',
  fieldCode: 'blood_group',
  isCustom: true,
  isSystemLocked: false,
  label: 'Blood Group',
  helpText: 'As on the medical record',
  translations: { mr: { label: 'रक्तगट' } },
  sectionCode: 'A',
  sectionLabel: 'Basic personal details',
  sortOrder: 10,
  dataType: 'SINGLE_CHOICE',
  options: ['A+', 'B+', 'O+'],
  rules: {},
  isVisible: true,
  isRequired: true,
  requiredStage: 'ON_VERIFICATION',
  sensitivity: 'PERSONAL',
  isExportable: true,
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  storedValues: 0,
  typeLocked: false,
  ...over,
});

/* The system-locked standard field (Trainer Name). */
export const lockedField = (over: Partial<ApiFormField> = {}): ApiFormField => ({
  ...customField(),
  id: 'ff0',
  fieldCode: 'full_name',
  isCustom: false,
  isSystemLocked: true,
  label: 'Trainer Name',
  helpText: null,
  translations: {},
  sortOrder: 1,
  dataType: 'TEXT',
  options: null,
  requiredStage: 'ON_SAVE',
  ...over,
});

/* A standard field that is not locked (Official Email). */
export const standardField = (over: Partial<ApiFormField> = {}): ApiFormField => ({
  ...lockedField(),
  id: 'ff2',
  fieldCode: 'email',
  isSystemLocked: false,
  label: 'Official Email',
  sortOrder: 5,
  dataType: 'EMAIL',
  isRequired: false,
  requiredStage: 'ON_VERIFICATION',
  ...over,
});

export const effective = (): EffectiveFormConfiguration => ({
  form: { code: 'TRAINER_PROFILE', label: 'Trainer Profile', specRef: 'F-LMS-TRN' },
  sections: [
    {
      code: 'A',
      label: 'Basic personal details',
      isCustomSection: false,
      fields: [
        {
          fieldCode: 'full_name', label: 'Trainer Name', helpText: null, translations: { mr: { label: 'प्रशिक्षकाचे नाव' } }, dataType: 'TEXT', options: null,
          rules: {}, isRequired: true, requiredStage: 'ON_SAVE', isSystemLocked: true, isCustom: false, sensitivity: 'PERSONAL', isExportable: true, sortOrder: 1,
        },
        {
          fieldCode: 'blood_group', label: 'Blood Group', helpText: null, translations: {}, dataType: 'SINGLE_CHOICE', options: ['A+', 'B+'],
          rules: {}, isRequired: false, requiredStage: null, isSystemLocked: false, isCustom: true, sensitivity: 'PERSONAL', isExportable: true, sortOrder: 10,
        },
      ],
    },
    {
      code: 'EXTRA',
      label: 'EXTRA',
      isCustomSection: true,
      fields: [
        {
          fieldCode: 'signed_form', label: 'Signed form', helpText: 'Scanned copy', translations: {}, dataType: 'FILE', options: null,
          rules: { extensions: ['pdf', 'png'], mimeTypes: ['application/pdf', 'image/png'], maxBytes: 5242880 }, isRequired: false, requiredStage: null,
          isSystemLocked: false, isCustom: true, sensitivity: 'RESTRICTED', isExportable: false, sortOrder: 1,
        },
      ],
    },
  ],
});

/*
 * GET /forms/TRAINER_PROFILE/sections: the standard sections, then the custom sections in use — EXTRA (on the
 * effective form) and HIDDEN_ONLY, whose fields are all hidden or archived (so not on the effective form).
 */
export const sections = (): FormSectionSummary[] => [
  { code: 'A', label: 'Basic personal details', isStandard: true, fieldCount: 9 },
  { code: 'B', label: 'Educational qualification', isStandard: true, fieldCount: 4 },
  { code: 'VERIFICATION', label: 'Verification and sign-off', isStandard: true, fieldCount: 0 },
  { code: 'EXTRA', label: null, isStandard: false, fieldCount: 1 },
  { code: 'HIDDEN_ONLY', label: null, isStandard: false, fieldCount: 2 },
];

export const page = <T,>(items: T[]) => ({ items, meta: { page: 1, limit: 25, total: items.length, totalPages: 1 } });

/* The panel's toasts are written into #toast-root (index.html); a test page has to provide it. */
export const ensureToastRoot = () => {
  if (!document.getElementById('toast-root')) {
    const root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
};
