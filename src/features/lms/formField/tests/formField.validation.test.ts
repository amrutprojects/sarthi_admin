import { describe, expect, it } from 'vitest';
import { customField, formOptions, lockedField } from './fixtures';
import {
  createFormFieldPayload, emptyFormFieldForm, formFieldFormFrom, formFieldSchema, formFieldServerErrors, suggestFieldCode, updateFormFieldPayload,
  type FormFieldFormValues,
} from '../validation/formField.validation';

const sections = formOptions.forms[0].sections;
const ctx = { requiredStages: formOptions.requiredStages, sensitivities: formOptions.sensitivities };
const createSchema = formFieldSchema({ mode: 'create', isCustom: true, ...ctx });

const base = (over: Partial<FormFieldFormValues> = {}): FormFieldFormValues => ({
  ...emptyFormFieldForm({ formCode: 'TRAINER_PROFILE', languages: formOptions.languages, sections }),
  fieldCode: 'remarks',
  label: 'Remarks',
  sectionCode: 'A',
  ...over,
});

/* Messages by path, as the form shows them. */
const errorsOf = (v: FormFieldFormValues, schema = createSchema) => {
  const r = schema.safeParse(v);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('form field validation (mirrors form-field.validator.ts / form-field.rules.ts)', () => {
  it('accepts the Table 40 defaults with a key, label and section', () => {
    expect(errorsOf(base())).toEqual({});
  });

  it('checks key, label, help text, per-language labels, section and order like the server', () => {
    expect(
      errorsOf(
        base({
          fieldCode: 'Bad Key',
          label: 'x'.repeat(81),
          helpText: 'h'.repeat(201),
          translations: { en: { label: '', helpText: '' }, mr: { label: 'म'.repeat(81), helpText: '' } },
          sectionCode: '1ab',
          sortOrder: '100001',
        }),
      ),
    ).toEqual({
      fieldCode: 'Use 2–60 lower-case letters, digits and underscores, starting with a letter.',
      label: 'Must be at most 80 characters',
      helpText: 'Must be at most 200 characters',
      'translations.mr.label': 'Must be at most 80 characters',
      sectionCode: 'Use 1–40 capital letters, digits and underscores, starting with a letter.',
      sortOrder: 'Must be at most 100000',
    });
    expect(errorsOf(base({ fieldCode: '', label: '   ', sectionCode: '' }))).toMatchObject({
      fieldCode: 'Enter a field key.',
      label: 'Enter a label.',
      sectionCode: 'Select a section.',
    });
    /* A custom section is upper-cased, as the server does. */
    expect(errorsOf(base({ customSection: true, sectionCode: 'extra_info' }))).toEqual({});
  });

  it('refuses a compulsory hidden field', () => {
    expect(errorsOf(base({ isVisible: false, isRequired: true }))).toEqual({ isRequired: 'A hidden field cannot be compulsory.' });
  });

  it('checks the rules of the data type only', () => {
    const rules = { ...base().rules, minLength: '5', maxLength: '0', pattern: '[', min: 'abc' };
    expect(errorsOf(base({ rules }))).toEqual({
      'rules.maxLength': 'Must be at least 1',
      'rules.pattern': 'Enter a valid regular expression',
    });
    expect(errorsOf(base({ dataType: 'NUMBER', rules: { ...base().rules, min: '10', max: '-2.5' } }))).toEqual({ 'rules.min': 'Must not be greater than the maximum value' });
    expect(errorsOf(base({ dataType: 'DATE', rules: { ...base().rules, minDate: '2026-02-30' } }))).toEqual({ 'rules.minDate': 'Enter a valid date' });
    expect(errorsOf(base({ dataType: 'LONG_TEXT', rules: { ...base().rules, minLength: '1.5', maxLength: '10001' } }))).toEqual({
      'rules.minLength': 'Enter a whole number',
      'rules.maxLength': 'Must be at most 10000',
    });
  });

  it('needs options for a choice type, each once, with selection counts within their number', () => {
    expect(errorsOf(base({ dataType: 'SINGLE_CHOICE' }))).toEqual({ options: 'Add at least one option for a choice field.' });
    expect(
      errorsOf(
        base({
          dataType: 'MULTIPLE_CHOICE',
          options: [{ value: 'Yes' }, { value: ' yes ' }, { value: '' }],
          rules: { ...base().rules, minSelected: '4', maxSelected: '2' },
        }),
      ),
    ).toEqual({
      'options.1.value': 'Each option can be listed only once.',
      'options.2.value': 'Enter the option.',
      'rules.minSelected': 'Must not be greater than the maximum selections',
    });
  });

  it('does not check the catalogue type, options or rules of a standard field', () => {
    const schema = formFieldSchema({ mode: 'edit', isCustom: false, ...ctx });
    const values = formFieldFormFrom(lockedField({ dataType: 'SIGN_OFF' }), formOptions.languages, sections);
    expect(errorsOf(values, schema)).toEqual({});
  });

  it('builds the create payload: collapsed label, upper-case section, typed rules of the type, null options off a choice type', () => {
    const v = base({
      label: '  Blood   Group ',
      helpText: '  ',
      sectionCode: 'extra',
      customSection: true,
      translations: { en: { label: '', helpText: '' }, mr: { label: ' रक्त  गट ', helpText: 'मदत' } },
      dataType: 'TEXT',
      options: [{ value: 'stale' }],
      rules: { ...base().rules, maxLength: '3', min: '5', integer: true },
    });
    expect(createFormFieldPayload(v)).toEqual({
      formCode: 'TRAINER_PROFILE',
      fieldCode: 'remarks',
      label: 'Blood Group',
      helpText: null,
      translations: { mr: { label: 'रक्त गट', helpText: 'मदत' } },
      sectionCode: 'EXTRA',
      dataType: 'TEXT',
      options: null,
      rules: { maxLength: 3 },
      isVisible: true,
      isRequired: false,
      requiredStage: 'ON_VERIFICATION',
      sensitivity: 'INTERNAL',
      isExportable: true,
      isActive: true,
    });
  });

  it('builds the update payload with only what the field may change', () => {
    const custom = customField({ typeLocked: true });
    expect(updateFormFieldPayload(formFieldFormFrom(custom, formOptions.languages, sections), custom)).not.toHaveProperty('dataType');
    const locked = lockedField();
    expect(Object.keys(updateFormFieldPayload(formFieldFormFrom(locked, formOptions.languages, sections), locked)).sort()).toEqual(
      ['helpText', 'label', 'sectionCode', 'sortOrder', 'translations'].sort(),
    );
  });

  it('maps the server field names onto the form', () => {
    expect(
      formFieldServerErrors(
        [
          { field: 'body.rules.min', message: 'a' },
          { field: 'body.options.2', message: 'b' },
          { field: 'translations.mr.label', message: 'c' },
          { field: 'translations.hi.label', message: 'not a form language' },
          { field: 'dataType', message: 'd' },
          { field: 'body', message: 'Provide at least one field to update' },
        ],
        ['en', 'mr'],
      ),
    ).toEqual([
      { path: 'rules.min', message: 'a' },
      { path: 'options.2.value', message: 'b' },
      { path: 'translations.mr.label', message: 'c' },
      { path: 'dataType', message: 'd' },
    ]);
  });

  it('suggests a key from the label', () => {
    expect(suggestFieldCode('  2nd Blood-Group (ABO) ')).toBe('nd_blood_group_abo');
    expect(suggestFieldCode('रक्तगट')).toBe('');
  });
});
