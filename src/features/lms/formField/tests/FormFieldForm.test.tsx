import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import FormFieldCreate from '../pages/FormFieldCreate';
import FormFieldEdit from '../pages/FormFieldEdit';
import { formFieldService } from '../services/formFieldService';
import { customField, ensureToastRoot, formOptions, lockedField, sections, standardField } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/formFieldService', () => ({
  formFieldService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), restore: vi.fn(), count: vi.fn(),
    formOptions: vi.fn(), effective: vi.fn(), sections: vi.fn(),
  },
}));

const SYSTEM_LOCKED = 'This field is required by the system and cannot be changed in this way.';
const STANDARD = 'This is a standard field of the form: only its label, help text, visibility, compulsory rule, section and order can change.';
const TYPE_LOCKED = 'The type cannot be changed because values already exist.';

const save = () => userEvent.click(screen.getByRole('button', { name: /Add custom field|Save changes/ }));
const setDate = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
  fireEvent.blur(el);
};

const renderCreate = (route = '/lms/form-fields/create?formCode=TRAINER_PROFILE') =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/form-fields/create" element={<FormFieldCreate />} />
      <Route path="/lms/form-fields/:id" element={<div>view page</div>} />
    </Routes>,
    { route },
  );

describe('Form field form (Add custom field)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('createLmsFormField');
    vi.mocked(formFieldService.formOptions).mockReset().mockResolvedValue(formOptions);
    vi.mocked(formFieldService.sections).mockReset().mockResolvedValue(sections());
    vi.mocked(formFieldService.create).mockReset();
  });

  it('tells a user without the add permission instead of showing the form', async () => {
    permissions.clear();
    renderCreate();
    expect(await screen.findByText('You can view the form fields but not add one')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add custom field' })).not.toBeInTheDocument();
    expect(formFieldService.formOptions).not.toHaveBeenCalled();
    expect(formFieldService.sections).not.toHaveBeenCalled();
  });

  it('offers every section of the form, custom ones in use included (hidden and archived fields counted)', async () => {
    vi.mocked(formFieldService.create).mockResolvedValue(customField({ id: 'new3' }));
    renderCreate();
    await userEvent.type(await screen.findByLabelText('Label *'), 'Locker Number');
    const section = screen.getByLabelText('Section *');
    expect(formFieldService.sections).toHaveBeenCalledWith('TRAINER_PROFILE');
    expect(within(section).getByRole('option', { name: 'A · Basic personal details (9 fields)' })).toBeInTheDocument();
    expect(within(section).getByRole('option', { name: 'VERIFICATION · Verification and sign-off (0 fields)' })).toBeInTheDocument();
    expect(within(section).getByRole('option', { name: 'EXTRA · Custom section (1 field)' })).toBeInTheDocument();
    expect(within(section).getByRole('option', { name: 'New custom section…' })).toBeInTheDocument();

    /* An existing custom section is picked, not typed. */
    await userEvent.selectOptions(section, 'HIDDEN_ONLY');
    expect(screen.queryByLabelText('Custom Section Code *')).not.toBeInTheDocument();
    await save();
    await waitFor(() => expect(formFieldService.create).toHaveBeenCalled());
    expect(vi.mocked(formFieldService.create).mock.calls[0][0]).toMatchObject({ fieldCode: 'locker_number', sectionCode: 'HIDDEN_ONLY' });
  });

  it('pre-selects a custom section in use from the listing', async () => {
    renderCreate('/lms/form-fields/create?formCode=TRAINER_PROFILE&sectionCode=HIDDEN_ONLY');
    await screen.findByLabelText('Label *');
    expect(screen.getByLabelText('Section *')).toHaveValue('HIDDEN_ONLY');
    expect(screen.queryByLabelText('Custom Section Code *')).not.toBeInTheDocument();
  });

  it("offers the form's own sections when the sections cannot be read, and a new custom section can still be typed", async () => {
    vi.mocked(formFieldService.sections).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderCreate('/lms/form-fields/create?formCode=TRAINER_PROFILE&sectionCode=EXTRA');
    await screen.findByLabelText('Label *');
    const section = screen.getByLabelText('Section *');
    expect(within(section).getByRole('option', { name: 'A · Basic personal details' })).toBeInTheDocument();
    expect(within(section).queryByRole('option', { name: /HIDDEN_ONLY/ })).not.toBeInTheDocument();
    /* EXTRA is not known: it is shown as a custom section code. */
    expect(screen.getByLabelText('Custom Section Code *')).toHaveValue('EXTRA');
  });

  it('shows the field messages on submit and sends nothing while invalid', async () => {
    renderCreate();
    await screen.findByLabelText('Label *');
    expect(screen.getByLabelText('Form *')).toHaveValue('TRAINER_PROFILE');
    expect(screen.getByLabelText('Data Type *')).toHaveValue('TEXT');
    await save();
    expect(await screen.findByText('Enter a label.')).toBeInTheDocument();
    expect(screen.getByText('Enter a field key.')).toBeInTheDocument();
    expect(screen.getByText('Select a section.')).toBeInTheDocument();
    expect(screen.getByLabelText('Label *')).toHaveAttribute('aria-invalid', 'true');

    await userEvent.type(screen.getByLabelText('Field Key *'), '9bad-key');
    expect(await screen.findByText('Use 2–60 lower-case letters, digits and underscores, starting with a letter.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Order'), '-1');
    fireEvent.blur(screen.getByLabelText('Order'));
    expect(await screen.findByText('Must be at least 0')).toBeInTheDocument();

    /* A hidden field cannot be compulsory. */
    await userEvent.click(screen.getByRole('checkbox', { name: /^Compulsory/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /^Visible/ }));
    expect(await screen.findByText('A hidden field cannot be compulsory.')).toBeInTheDocument();
    expect(formFieldService.create).not.toHaveBeenCalled();
  });

  it('suggests the field key from the label until the key is typed', async () => {
    renderCreate();
    await userEvent.type(await screen.findByLabelText('Label *'), 'Blood Group (ABO)');
    expect(screen.getByLabelText('Field Key *')).toHaveValue('blood_group_abo');
    await userEvent.clear(screen.getByLabelText('Field Key *'));
    await userEvent.type(screen.getByLabelText('Field Key *'), 'abo');
    await userEvent.type(screen.getByLabelText('Label *'), ' type');
    expect(screen.getByLabelText('Field Key *')).toHaveValue('abo');
  });

  it('offers the rules of each data type: length and pattern, min / max, date bounds, selection counts with options', async () => {
    renderCreate();
    await screen.findByLabelText('Label *');
    /* Text: length and pattern. */
    expect(screen.getByLabelText('Minimum length')).toBeInTheDocument();
    expect(screen.getByLabelText('Pattern')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Minimum length'), '10');
    await userEvent.type(screen.getByLabelText('Maximum length'), '5');
    await userEvent.type(screen.getByLabelText('Pattern'), '(abc');
    await save();
    expect(await screen.findByText('Must not be greater than the maximum length')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid regular expression')).toBeInTheDocument();

    /* Number: minimum / maximum and whole numbers; no pattern. */
    await userEvent.selectOptions(screen.getByLabelText('Data Type *'), 'NUMBER');
    expect(screen.queryByLabelText('Pattern')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Minimum value')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum value')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Whole numbers only')[0]).toHaveAttribute('type', 'checkbox');

    /* Date: bounds. */
    await userEvent.selectOptions(screen.getByLabelText('Data Type *'), 'DATE');
    setDate(screen.getByLabelText('Earliest date'), '2026-12-31');
    setDate(screen.getByLabelText('Latest date'), '2026-01-01');
    expect(screen.getAllByLabelText('Not in the future')[0]).toHaveAttribute('type', 'checkbox');
    expect(await screen.findByText('Must not be later than the latest date')).toBeInTheDocument();

    /* File: the fixed rule. */
    await userEvent.selectOptions(screen.getByLabelText('Data Type *'), 'FILE');
    expect(screen.getByText('Fixed by the specification: PDF, JPG, JPEG, PNG up to 5 MB.')).toBeInTheDocument();

    /* Multiple choice: options (at least one, each once) and selection counts within the option count. */
    await userEvent.selectOptions(screen.getByLabelText('Data Type *'), 'MULTIPLE_CHOICE');
    expect(await screen.findByText('Add at least one option for a choice field.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Add option/ }));
    await userEvent.type(screen.getByLabelText('Option 1'), 'Hindi');
    await userEvent.click(screen.getByRole('button', { name: /Add option/ }));
    await userEvent.type(screen.getByLabelText('Option 2'), ' hindi ');
    await userEvent.type(screen.getByLabelText('Maximum selections'), '5');
    await save();
    expect(await screen.findByText('Each option can be listed only once.')).toBeInTheDocument();
    expect(screen.getByText('Must be at most the number of options (2)')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 2')).toHaveAttribute('aria-invalid', 'true');
    expect(formFieldService.create).not.toHaveBeenCalled();
  });

  it('adds a custom field in a custom section with its per-language label, options and rules, and goes to its page', async () => {
    vi.mocked(formFieldService.create).mockResolvedValue(customField({ id: 'new1' }));
    renderCreate();
    await userEvent.type(await screen.findByLabelText('Label *'), '  Languages   Spoken ');
    await userEvent.selectOptions(screen.getByLabelText('Section *'), '__custom__');
    await userEvent.type(screen.getByLabelText('Custom Section Code *'), 'extra_info');
    await userEvent.type(screen.getByLabelText('Label in Marathi'), 'बोलल्या जाणाऱ्या भाषा');
    await userEvent.selectOptions(screen.getByLabelText('Data Type *'), 'MULTIPLE_CHOICE');
    for (const [i, o] of ['Marathi', 'Hindi', 'English'].entries()) {
      await userEvent.click(screen.getByRole('button', { name: /Add option/ }));
      await userEvent.type(screen.getByLabelText(`Option ${i + 1}`), o);
    }
    await userEvent.type(screen.getByLabelText('Minimum selections'), '1');
    await userEvent.type(screen.getByLabelText('Maximum selections'), '2');
    await userEvent.click(screen.getByRole('checkbox', { name: /^Compulsory/ }));
    await userEvent.selectOptions(screen.getByLabelText('Compulsory From'), 'ON_SAVE');
    await userEvent.selectOptions(screen.getByLabelText('Sensitivity'), 'PERSONAL');
    /* The preview follows the form. */
    expect(screen.getByRole('group', { name: 'Languages Spoken' })).toHaveTextContent(/Marathi\s*Hindi\s*English/);
    expect(screen.getByText('Choose 1–2')).toBeInTheDocument();
    await save();

    await waitFor(() =>
      expect(formFieldService.create).toHaveBeenCalledWith({
        formCode: 'TRAINER_PROFILE',
        fieldCode: 'languages_spoken',
        label: 'Languages Spoken',
        helpText: null,
        translations: { mr: { label: 'बोलल्या जाणाऱ्या भाषा' } },
        sectionCode: 'EXTRA_INFO',
        dataType: 'MULTIPLE_CHOICE',
        options: ['Marathi', 'Hindi', 'English'],
        rules: { minSelected: 1, maxSelected: 2 },
        isVisible: true,
        isRequired: true,
        requiredStage: 'ON_SAVE',
        sensitivity: 'PERSONAL',
        isExportable: true,
        isActive: true,
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('pre-selects the section from the listing and sends only the rules of the chosen type', async () => {
    vi.mocked(formFieldService.create).mockResolvedValue(customField({ id: 'new2' }));
    renderCreate('/lms/form-fields/create?formCode=TRAINER_PROFILE&sectionCode=B');
    await userEvent.type(await screen.findByLabelText('Label *'), 'Passing Year');
    expect(screen.getByLabelText('Section *')).toHaveValue('B');
    await userEvent.type(screen.getByLabelText('Minimum length'), '4');
    await userEvent.selectOptions(screen.getByLabelText('Data Type *'), 'NUMBER');
    await userEvent.type(screen.getByLabelText('Minimum value'), '1950');
    await userEvent.click(screen.getAllByLabelText('Whole numbers only')[0]);
    await userEvent.type(screen.getByLabelText('Order'), '3');
    await save();
    await waitFor(() => expect(formFieldService.create).toHaveBeenCalled());
    const body = vi.mocked(formFieldService.create).mock.calls[0][0];
    expect(body).toMatchObject({ fieldCode: 'passing_year', sectionCode: 'B', sortOrder: 3, dataType: 'NUMBER', options: null, rules: { min: 1950, integer: true } });
    expect(body.rules).not.toHaveProperty('minLength');
  });

  it('shows a 409 duplicate label in a language on that language, with the server summary, keeping the values', async () => {
    vi.mocked(formFieldService.create).mockRejectedValue(
      new ApiError('A field with this label already exists in the form', 409, 'CONFLICT', [
        { field: 'translations.mr.label', message: 'This label is already used in the form in Marathi.' },
      ]),
    );
    renderCreate();
    await userEvent.type(await screen.findByLabelText('Label *'), 'Mother Tongue');
    await userEvent.selectOptions(screen.getByLabelText('Section *'), 'A');
    await userEvent.type(screen.getByLabelText('Label in Marathi'), 'मातृभाषा');
    await save();
    expect(await screen.findByText('This label is already used in the form in Marathi.')).toBeInTheDocument();
    expect(screen.getByText('A field with this label already exists in the form')).toBeInTheDocument();
    expect(screen.getByLabelText('Label in Marathi')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Label in Marathi')).toHaveValue('मातृभाषा');
  });

  it('puts 409 key / base-label answers and 422 rule answers on their fields', async () => {
    vi.mocked(formFieldService.create).mockRejectedValue(
      new ApiError('A field with this key already exists in the form', 409, 'CONFLICT', [{ field: 'fieldCode', message: 'This field key is already used in the form.' }]),
    );
    renderCreate();
    await userEvent.type(await screen.findByLabelText('Label *'), 'Remarks');
    await userEvent.selectOptions(screen.getByLabelText('Section *'), 'A');
    await save();
    expect(await screen.findByText('This field key is already used in the form.')).toBeInTheDocument();
    expect(screen.getByLabelText('Field Key *')).toHaveAttribute('aria-invalid', 'true');

    vi.mocked(formFieldService.create).mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.rules.maxLength', message: 'Must be at most 10000' },
        { field: 'label', message: 'This label is already used in the form in English.' },
      ]),
    );
    await userEvent.type(screen.getByLabelText('Maximum length'), '50');
    await save();
    expect(await screen.findByText('Must be at most 10000')).toBeInTheDocument();
    expect(screen.getByText('This label is already used in the form in English.')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum length')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Form field form (Edit)', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    permissions.add('updateLmsFormField');
    vi.mocked(formFieldService.formOptions).mockReset().mockResolvedValue(formOptions);
    vi.mocked(formFieldService.sections).mockReset().mockResolvedValue(sections());
    vi.mocked(formFieldService.update).mockReset();
    vi.mocked(formFieldService.setStatus).mockReset();
    vi.mocked(formFieldService.get).mockReset();
  });

  const renderEdit = (id = 'ff0') =>
    renderWithProviders(
      <Routes>
        <Route path="/lms/form-fields/:id/edit" element={<FormFieldEdit />} />
        <Route path="/lms/form-fields/:id" element={<div>view page</div>} />
      </Routes>,
      { route: `/lms/form-fields/${id}/edit` },
    );

  it('tells a user without the update permission instead of showing the form', async () => {
    permissions.clear();
    renderEdit();
    expect(await screen.findByText('You can view this field but not change it')).toBeInTheDocument();
    expect(formFieldService.get).not.toHaveBeenCalled();
  });

  it('locks what a system-locked standard field cannot change, explains why, and sends only what it can', async () => {
    vi.mocked(formFieldService.get).mockResolvedValue(lockedField());
    vi.mocked(formFieldService.update).mockResolvedValue(lockedField());
    renderEdit();
    expect(await screen.findByDisplayValue('Trainer Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Field Key')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /^Visible/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /^Compulsory/ })).toBeDisabled();
    expect(screen.getByLabelText('Compulsory From')).toBeDisabled();
    expect(screen.getByLabelText('Data Type *')).toBeDisabled();
    expect(screen.getByLabelText('Sensitivity')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /^Exportable/ })).toBeDisabled();
    expect(screen.getAllByText(SYSTEM_LOCKED, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(STANDARD, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Minimum length')).not.toBeInTheDocument();
    /* Standard fields are never archived. */
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
    expect(screen.getByText('Standard fields cannot be archived. Hide the field instead.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Label *'));
    await userEvent.type(screen.getByLabelText('Label *'), 'Trainer Full Name');
    await userEvent.type(screen.getByLabelText('Label in Marathi'), 'प्रशिक्षकाचे पूर्ण नाव');
    await userEvent.clear(screen.getByLabelText('Order'));
    await userEvent.type(screen.getByLabelText('Order'), '2');
    await save();
    expect(formFieldService.update).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() =>
      expect(formFieldService.update).toHaveBeenCalledWith('ff0', {
        label: 'Trainer Full Name',
        helpText: null,
        translations: { mr: { label: 'प्रशिक्षकाचे पूर्ण नाव' } },
        sectionCode: 'A',
        sortOrder: 2,
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('lets a standard field change visibility and compulsory rule, but not its type or classification', async () => {
    vi.mocked(formFieldService.get).mockResolvedValue(standardField());
    vi.mocked(formFieldService.update).mockResolvedValue(standardField());
    renderEdit('ff2');
    expect(await screen.findByDisplayValue('Official Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Type *')).toHaveValue('EMAIL');
    expect(screen.getByLabelText('Data Type *')).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: /^Compulsory/ }));
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() => expect(formFieldService.update).toHaveBeenCalled());
    const body = vi.mocked(formFieldService.update).mock.calls[0][1];
    expect(body).toMatchObject({ isVisible: true, isRequired: true, requiredStage: 'ON_VERIFICATION' });
    for (const key of ['dataType', 'options', 'rules', 'sensitivity', 'isExportable']) expect(body).not.toHaveProperty(key);
  });

  it('keeps the type of a custom field holding values (FIELD_TYPE_LOCKED) but saves its options and classification', async () => {
    vi.mocked(formFieldService.get).mockResolvedValue(customField({ storedValues: 3, typeLocked: true }));
    vi.mocked(formFieldService.update).mockResolvedValue(customField());
    renderEdit('ff1');
    expect(await screen.findByDisplayValue('Blood Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Type *')).toBeDisabled();
    expect(screen.getAllByText(TYPE_LOCKED, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3 records hold a value/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Option 3')).toHaveValue('O+');
    await userEvent.click(screen.getByRole('button', { name: /Add option/ }));
    await userEvent.type(screen.getByLabelText('Option 4'), 'AB+');
    await userEvent.click(screen.getByRole('checkbox', { name: /^Exportable/ }));
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() =>
      expect(formFieldService.update).toHaveBeenCalledWith('ff1', {
        label: 'Blood Group',
        helpText: 'As on the medical record',
        translations: { mr: { label: 'रक्तगट' } },
        sectionCode: 'A',
        sortOrder: 10,
        isVisible: true,
        isRequired: true,
        requiredStage: 'ON_VERIFICATION',
        options: ['A+', 'B+', 'O+', 'AB+'],
        rules: {},
        sensitivity: 'PERSONAL',
        isExportable: false,
      }),
    );
  });

  it('shows the server FIELD_TYPE_LOCKED answer on the data type', async () => {
    vi.mocked(formFieldService.get).mockResolvedValue(customField());
    vi.mocked(formFieldService.update).mockRejectedValue(
      new ApiError(TYPE_LOCKED, 409, 'FIELD_TYPE_LOCKED', [{ field: 'dataType', message: TYPE_LOCKED }]),
    );
    renderEdit('ff1');
    await screen.findByDisplayValue('Blood Group');
    await userEvent.selectOptions(screen.getByLabelText('Data Type *'), 'MULTIPLE_CHOICE');
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() => expect(screen.getByLabelText('Data Type *')).toHaveAttribute('aria-invalid', 'true'));
    expect(within(screen.getByLabelText('Data Type *').closest('.fld') as HTMLElement).getByRole('alert')).toHaveTextContent(TYPE_LOCKED);
  });

  it('shows the custom section a field is in as picked from the list, and can move it to another section in use', async () => {
    vi.mocked(formFieldService.get).mockResolvedValue(customField({ sectionCode: 'EXTRA', sectionLabel: 'EXTRA' }));
    vi.mocked(formFieldService.update).mockResolvedValue(customField());
    renderEdit('ff1');
    await screen.findByDisplayValue('Blood Group');
    expect(formFieldService.sections).toHaveBeenCalledWith('TRAINER_PROFILE');
    expect(screen.getByLabelText('Section *')).toHaveValue('EXTRA');
    expect(screen.queryByLabelText('Custom Section Code *')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Section *'), 'HIDDEN_ONLY');
    await save();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
    await waitFor(() => expect(formFieldService.update).toHaveBeenCalled());
    expect(vi.mocked(formFieldService.update).mock.calls[0][1]).toMatchObject({ sectionCode: 'HIDDEN_ONLY' });
  });

  it('archives a custom field from the form after confirmation', async () => {
    vi.mocked(formFieldService.get).mockResolvedValue(customField());
    vi.mocked(formFieldService.setStatus).mockResolvedValue(customField({ isActive: false }));
    renderEdit('ff1');
    await userEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(screen.getByText(/its stored values are kept/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, archive' }));
    await waitFor(() => expect(formFieldService.setStatus).toHaveBeenCalledWith('ff1', false));
  });
});
