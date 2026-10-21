import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import FormFieldList from '../pages/FormFieldList';
import { formFieldService } from '../services/formFieldService';
import { customField, effective, ensureToastRoot, formOptions, lockedField, page, sections, standardField } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth module and the API service. */
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

/* Toasts stay in #toast-root between tests; a test that reads one starts from none. */
const clearToasts = () => document.getElementById('toast-root')?.replaceChildren();

const rowOf = async (text: string) => (await screen.findByText(text, { selector: 'b' })).closest('tr') as HTMLTableRowElement;

describe('<FormFieldList>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(formFieldService.list).mockReset().mockResolvedValue(page([lockedField(), standardField(), customField()]));
    vi.mocked(formFieldService.count).mockReset().mockImplementation(async (f = {}) =>
      f.isCustom === 'true' ? 1 : f.isRequired === 'true' ? 2 : f.isVisible === 'false' ? 0 : 27,
    );
    vi.mocked(formFieldService.formOptions).mockReset().mockResolvedValue(formOptions);
    vi.mocked(formFieldService.effective).mockReset().mockResolvedValue(effective());
    vi.mocked(formFieldService.sections).mockReset().mockResolvedValue(sections());
    vi.mocked(formFieldService.setStatus).mockReset();
    vi.mocked(formFieldService.remove).mockReset();
    vi.mocked(formFieldService.restore).mockReset();
  });

  it('lists the Trainer Profile fields with order, key, label, type, compulsory, visible, origin, lock and status, and the KPI totals', async () => {
    renderWithProviders(<FormFieldList />);
    const locked = await rowOf('Trainer Name');
    expect(locked.cells[0]).toHaveTextContent('1');
    expect(locked.cells[1]).toHaveTextContent('A · 1Basic personal details');
    expect(locked.cells[2]).toHaveTextContent('full_name');
    expect(locked.cells[4]).toHaveTextContent('Text');
    expect(locked.cells[5]).toHaveTextContent('YesOn every save');
    expect(locked.cells[6]).toHaveTextContent('Yes');
    expect(locked.cells[7]).toHaveTextContent('Standard');
    expect(locked.cells[8]).toHaveTextContent('System locked');
    expect(within(locked.cells[9]).getByText('Active')).toBeInTheDocument();

    const custom = await rowOf('Blood Group');
    expect(custom.cells[0]).toHaveTextContent('3');
    expect(custom.cells[1]).toHaveTextContent('A · 10');
    expect(custom.cells[3]).toHaveTextContent('mr: रक्तगट');
    expect(custom.cells[4]).toHaveTextContent('Single choice3 options');
    expect(custom.cells[5]).toHaveTextContent('YesOn verification');
    expect(custom.cells[7]).toHaveTextContent('Custom');
    expect(custom.cells[8]).toHaveTextContent('—');

    expect((await screen.findByText('Fields of Trainer Profile')).closest('.kpi')).toHaveTextContent('27');
    expect(screen.getByText('Custom fields', { selector: '.kpi-t' }).closest('.kpi')).toHaveTextContent('1');
    expect(screen.getByText('Compulsory', { selector: '.kpi-t' }).closest('.kpi')).toHaveTextContent('2');
    expect(formFieldService.count).toHaveBeenCalledWith({ formCode: 'TRAINER_PROFILE', isCustom: 'true' });
    /* Trainer Profile by default, in form / section / order position. */
    expect(formFieldService.list).toHaveBeenCalledWith(expect.objectContaining({ formCode: 'TRAINER_PROFILE', sortBy: 'position', sortOrder: 'asc', page: 1 }));
    expect(screen.getByLabelText('Form')).toHaveValue('TRAINER_PROFILE');
  });

  it('shows the empty state', async () => {
    vi.mocked(formFieldService.list).mockResolvedValue(page([]));
    renderWithProviders(<FormFieldList />);
    expect(await screen.findByText(/This form has no fields yet/)).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(formFieldService.list).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<FormFieldList />);
    expect(await screen.findByText(/Database unavailable/)).toBeInTheDocument();
    vi.mocked(formFieldService.list).mockResolvedValue(page([customField()]));
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await rowOf('Blood Group')).toBeInTheDocument();
  });

  it('shows the write actions only for the permissions held, and disables what a standard field cannot do', async () => {
    const { unmount } = renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    expect(screen.queryByRole('button', { name: /Add Custom Field/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Blood Group' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Blood Group/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Blood Group' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Blood Group' })).toBeInTheDocument();
    unmount();

    permissions.add('viewLmsFormFields');
    permissions.add('createLmsFormField');
    permissions.add('updateLmsFormField');
    permissions.add('deleteLmsFormField');
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    expect(screen.getByRole('button', { name: /Add Custom Field/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Trainer Name' })).toBeEnabled();
    expect(screen.getByRole('switch', { name: 'Blood Group: active' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Delete Blood Group' })).toBeEnabled();
    /* Standard fields are configured, never archived or deleted (FIELD_STANDARD). */
    const del = screen.getByRole('button', { name: 'Delete Official Email' });
    expect(del).toBeDisabled();
    expect(del).toHaveAttribute('title', 'Standard fields cannot be deleted. Hide the field instead.');
    const sw = screen.getByRole('switch', { name: 'Trainer Name: active' });
    expect(sw).toBeDisabled();
    expect(sw).toHaveAttribute('title', 'Standard fields cannot be archived. Hide the field instead.');
  });

  it('asks for confirmation before archiving and deleting, and offers to restore what was deleted', async () => {
    permissions.add('updateLmsFormField');
    permissions.add('deleteLmsFormField');
    vi.mocked(formFieldService.setStatus).mockResolvedValue(customField({ isActive: false }));
    vi.mocked(formFieldService.remove).mockResolvedValue();
    vi.mocked(formFieldService.restore).mockResolvedValue(customField({ isActive: false }));
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');

    await userEvent.click(screen.getByRole('switch', { name: 'Blood Group: active' }));
    expect(screen.getByText(/Archive the custom field Blood Group\? It is no longer shown on the form/)).toBeInTheDocument();
    expect(formFieldService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, archive' }));
    await waitFor(() => expect(formFieldService.setStatus).toHaveBeenCalledWith('ff1', false));

    await userEvent.click(screen.getByRole('button', { name: 'Delete Blood Group' }));
    expect(screen.getByText(/Delete the custom field Blood Group \(blood_group\)\?/)).toBeInTheDocument();
    expect(formFieldService.remove).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(formFieldService.remove).toHaveBeenCalledWith('ff1'));

    await userEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(screen.getByText(/It comes back archived/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(formFieldService.restore).toHaveBeenCalledWith('ff1'));
    await waitFor(() => expect(screen.queryByText(/was deleted/)).not.toBeInTheDocument());
  });

  it('shows the FIELD_HAS_VALUES answer when a custom field with values cannot be deleted', async () => {
    permissions.add('deleteLmsFormField');
    vi.mocked(formFieldService.remove).mockRejectedValue(
      new ApiError('This custom field cannot be deleted while 2 records hold a value. Archive it instead.', 409, 'FIELD_HAS_VALUES'),
    );
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Blood Group' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('This custom field cannot be deleted while 2 records hold a value. Archive it instead.')).toBeInTheDocument();
    expect(screen.queryByText(/was deleted/)).not.toBeInTheDocument();
  });

  it('sends the section, origin, compulsory, visible and status filters to the API, with every section of the form offered', async () => {
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    const section = screen.getByLabelText('Section');
    expect(within(section).getByRole('option', { name: 'B · Educational qualification' })).toBeInTheDocument();
    expect(await within(section).findByRole('option', { name: 'EXTRA · Custom section' })).toBeInTheDocument();
    /* A custom section whose fields are all hidden or archived is not on the effective form, but is offered. */
    expect(within(section).getByRole('option', { name: 'HIDDEN_ONLY · Custom section' })).toBeInTheDocument();
    expect(formFieldService.sections).toHaveBeenCalledWith('TRAINER_PROFILE');
    await userEvent.selectOptions(section, 'A');
    await waitFor(() => expect(formFieldService.list).toHaveBeenLastCalledWith(expect.objectContaining({ formCode: 'TRAINER_PROFILE', sectionCode: 'A', page: 1 })));
    await userEvent.selectOptions(screen.getByLabelText('Standard / Custom'), 'true');
    await userEvent.selectOptions(screen.getByLabelText('Compulsory'), 'true');
    await userEvent.selectOptions(screen.getByLabelText('Visible'), 'false');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'false');
    await waitFor(() =>
      expect(formFieldService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ formCode: 'TRAINER_PROFILE', sectionCode: 'A', isCustom: 'true', isRequired: 'true', isVisible: 'false', status: 'false' }),
      ),
    );
  });

  it("offers the form's own sections when the sections cannot be read", async () => {
    vi.mocked(formFieldService.sections).mockRejectedValue(new ApiError('Database unavailable', 503, 'ERROR'));
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    const section = screen.getByLabelText('Section');
    expect(await within(section).findByRole('option', { name: 'VERIFICATION · Verification and sign-off' })).toBeInTheDocument();
    expect(within(section).queryByRole('option', { name: 'HIDDEN_ONLY · Custom section' })).not.toBeInTheDocument();
  });

  it('shows the Show deleted switch only to users who may delete', async () => {
    permissions.add('viewLmsFormFields');
    permissions.add('updateLmsFormField');
    const { unmount } = renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    expect(screen.queryByRole('switch', { name: 'Show deleted' })).not.toBeInTheDocument();
    unmount();

    permissions.add('deleteLmsFormField');
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    expect(screen.getByRole('switch', { name: 'Show deleted' })).toHaveAttribute('aria-checked', 'false');
  });

  it('lists only the deleted fields with Show deleted, badged Deleted with Restore as their only action', async () => {
    permissions.add('viewLmsFormFields');
    permissions.add('updateLmsFormField');
    permissions.add('deleteLmsFormField');
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    expect(formFieldService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: false }));

    const gone = customField({ id: 'ff9', fieldCode: 'old_note', label: 'Old Note', isActive: false });
    vi.mocked(formFieldService.list).mockImplementation(async (q) => ({ ...page(q.deleted ? [gone] : [customField()]), deleted: q.deleted }));
    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    await waitFor(() => expect(formFieldService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, page: 1, formCode: 'TRAINER_PROFILE' })));
    const row = await rowOf('Old Note');
    expect(screen.getByRole('switch', { name: 'Show deleted' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('heading', { name: /Deleted fields/ })).toBeInTheDocument();
    expect(within(row.cells[9]).getByText('Deleted')).toBeInTheDocument();
    expect(within(row).queryByText('Archived')).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Restore Old Note' })).toBeEnabled();
    expect(within(row).queryByRole('button', { name: 'View Old Note' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Edit Old Note' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Delete Old Note' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument();
    /* A deleted field has no page to open. */
    expect(row).toHaveClass('norow');

    /* The search and filters still apply to the deleted list. */
    await userEvent.selectOptions(screen.getByLabelText('Standard / Custom'), 'true');
    await waitFor(() => expect(formFieldService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, isCustom: 'true' })));

    vi.mocked(formFieldService.list).mockImplementation(async (q) => ({ ...page([]), deleted: q.deleted }));
    await userEvent.selectOptions(screen.getByLabelText('Visible'), 'false');
    expect(await screen.findByText('No deleted field matches the current search and filters.')).toBeInTheDocument();
  });

  it('restores a deleted field after confirmation and refreshes the list', async () => {
    clearToasts();
    permissions.add('deleteLmsFormField');
    const gone = customField({ id: 'ff9', fieldCode: 'old_note', label: 'Old Note', isActive: false });
    vi.mocked(formFieldService.list).mockImplementation(async (q) => ({ ...page(q.deleted ? [gone] : [customField()]), deleted: q.deleted }));
    vi.mocked(formFieldService.restore).mockResolvedValue(gone);
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    await userEvent.click(within(await rowOf('Old Note')).getByRole('button', { name: 'Restore Old Note' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Restore the custom field Old Note \(old_note\)\? It comes back archived/)).toBeInTheDocument();
    expect(formFieldService.restore).not.toHaveBeenCalled();
    const calls = vi.mocked(formFieldService.list).mock.calls.length;
    vi.mocked(formFieldService.list).mockImplementation(async (q) => ({ ...page([]), deleted: q.deleted }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(formFieldService.restore).toHaveBeenCalledWith('ff9'));
    await waitFor(() => expect(vi.mocked(formFieldService.list).mock.calls.length).toBeGreaterThan(calls));
    expect(formFieldService.list).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true }));
    expect(await screen.findByText('Custom field restored (archived)')).toBeInTheDocument();
    expect(await screen.findByText('This form has no deleted fields.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("shows the server's message when a restore is refused with 409", async () => {
    clearToasts();
    permissions.add('deleteLmsFormField');
    const gone = customField({ id: 'ff9', fieldCode: 'old_note', label: 'Old Note', isActive: false });
    vi.mocked(formFieldService.list).mockImplementation(async (q) => ({ ...page(q.deleted ? [gone] : [customField()]), deleted: q.deleted }));
    vi.mocked(formFieldService.restore).mockRejectedValue(
      new ApiError('A field with this label already exists in the form', 409, 'CONFLICT', [{ field: 'label', message: 'This label is already used in the form.' }]),
    );
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    await userEvent.click(screen.getByRole('switch', { name: 'Show deleted' }));
    await userEvent.click(within(await rowOf('Old Note')).getByRole('button', { name: 'Restore Old Note' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('A field with this label already exists in the form: This label is already used in the form.')).toBeInTheDocument();
    expect(screen.queryByText('Custom field restored (archived)')).not.toBeInTheDocument();
    /* Still deleted: the row keeps its badge. */
    expect(within(await rowOf('Old Note')).getByText('Deleted')).toBeInTheDocument();
  });

  it('previews the effective form by section, in the chosen language', async () => {
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    await userEvent.click(screen.getByRole('tab', { name: 'Effective form preview' }));
    expect(formFieldService.effective).toHaveBeenCalledWith('TRAINER_PROFILE');
    const a = await screen.findByRole('region', { name: 'Section Basic personal details' });
    expect(within(a).getByLabelText(/Trainer Name/)).toBeDisabled();
    expect(within(a).getByText('Compulsory · On every save')).toBeInTheDocument();
    expect(within(a).getByRole('option', { name: 'B+' })).toBeInTheDocument();
    const extra = screen.getByRole('region', { name: 'Section EXTRA' });
    expect(within(extra).getByText('Custom section')).toBeInTheDocument();
    expect(within(extra).getByText(/Scanned copy · PDF, PNG up to 5 MB/)).toBeInTheDocument();
    expect(within(extra).getByText('Not exported')).toBeInTheDocument();
    expect(screen.getByText(/3 visible fields in 2 sections · 1 compulsory/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Marathi (mr)' }));
    expect(within(a).getByLabelText(/प्रशिक्षकाचे नाव/)).toBeInTheDocument();
    /* No Marathi label: the default label is shown. */
    expect(within(a).getByLabelText(/Blood Group/)).toBeInTheDocument();
  });

  it('shows an error on the preview with a working Retry', async () => {
    vi.mocked(formFieldService.effective).mockRejectedValue(new ApiError('Form not found', 404, 'NOT_FOUND'));
    renderWithProviders(<FormFieldList />);
    await rowOf('Blood Group');
    await userEvent.click(screen.getByRole('tab', { name: 'Effective form preview' }));
    expect(await screen.findByText(/Form not found/)).toBeInTheDocument();
    vi.mocked(formFieldService.effective).mockResolvedValue({ ...effective(), sections: [] });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No visible field')).toBeInTheDocument();
  });
});
