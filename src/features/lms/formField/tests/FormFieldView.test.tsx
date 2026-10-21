import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import FormFieldView from '../pages/FormFieldView';
import { formFieldService } from '../services/formFieldService';
import { customField, ensureToastRoot, formOptions, lockedField } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/formFieldService', () => ({
  formFieldService: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn(), restore: vi.fn(), count: vi.fn(),
    formOptions: vi.fn(), effective: vi.fn(),
  },
}));

const renderView = (id = 'ff1') =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/form-fields/:id" element={<FormFieldView />} />
      <Route path="/lms/form-fields/:id/edit" element={<div>edit page</div>} />
    </Routes>,
    { route: `/lms/form-fields/${id}` },
  );

const grantAll = () => ['viewLmsFormFields', 'updateLmsFormField', 'deleteLmsFormField'].forEach((p) => permissions.add(p));

describe('<FormFieldView>', () => {
  beforeEach(() => {
    ensureToastRoot();
    permissions.clear();
    vi.mocked(formFieldService.get).mockReset().mockResolvedValue(customField());
    vi.mocked(formFieldService.formOptions).mockReset().mockResolvedValue(formOptions);
    vi.mocked(formFieldService.setStatus).mockReset();
    vi.mocked(formFieldService.remove).mockReset();
    vi.mocked(formFieldService.restore).mockReset();
  });

  it('shows the details, labels per language, rules and a preview, without write actions', async () => {
    renderView();
    expect(await screen.findByRole('heading', { name: /Blood Group/ })).toBeInTheDocument();
    expect(screen.getByText('Trainer Profile · Section A · Basic personal details')).toBeInTheDocument();
    expect(screen.getByText('Data type').nextSibling).toHaveTextContent('Single choice');
    expect(screen.getByText('Yes · On verification')).toBeInTheDocument();
    expect(screen.getByText('A+, B+, O+')).toBeInTheDocument();
    const labels = await screen.findByRole('table', { name: 'Labels per language' });
    expect(within(labels).getByText('रक्तगट')).toBeInTheDocument();
    expect(within(labels).getByText('Default: Blood Group')).toBeInTheDocument();
    expect(screen.getByLabelText(/Blood Group/)).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Preview language'), 'mr');
    expect(screen.getByLabelText(/रक्तगट/)).toBeInTheDocument();

    for (const name of ['Edit', 'Archive', 'Delete']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('explains what a system-locked standard field cannot do and disables archive and delete', async () => {
    grantAll();
    vi.mocked(formFieldService.get).mockResolvedValue(lockedField());
    renderView('ff0');
    expect(await screen.findByText(/This field is required by the system and cannot be changed in this way\./)).toBeInTheDocument();
    expect(screen.getByText(/This is a standard field of the form: only its label, help text/)).toBeInTheDocument();
    const del = screen.getByRole('button', { name: 'Delete' });
    expect(del).toBeDisabled();
    expect(del).toHaveAttribute('title', 'Standard fields cannot be deleted. Hide the field instead.');
    expect(screen.getByRole('button', { name: 'Archive' })).toHaveAttribute('title', 'Standard fields cannot be archived. Hide the field instead.');
    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
  });

  it('blocks deleting a custom field that holds values (FIELD_HAS_VALUES) and says the type is locked', async () => {
    grantAll();
    vi.mocked(formFieldService.get).mockResolvedValue(customField({ storedValues: 2, typeLocked: true }));
    renderView();
    const message = 'This custom field cannot be deleted while 2 records hold a value. Archive it instead.';
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText('The type cannot be changed because values already exist.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveAttribute('title', message);
    expect(screen.getByRole('button', { name: 'Archive' })).toBeEnabled();
  });

  it('archives after confirmation', async () => {
    grantAll();
    vi.mocked(formFieldService.setStatus).mockResolvedValue(customField({ isActive: false }));
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(formFieldService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, archive' }));
    await waitFor(() => expect(formFieldService.setStatus).toHaveBeenCalledWith('ff1', false));
  });

  it('deletes a custom field without values after confirmation and offers to restore it', async () => {
    grantAll();
    vi.mocked(formFieldService.remove).mockResolvedValue();
    vi.mocked(formFieldService.restore).mockResolvedValue(customField({ isActive: false }));
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByText(/Delete the custom field Blood Group \(blood_group\)\?/)).toBeInTheDocument();
    expect(formFieldService.remove).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(formFieldService.remove).toHaveBeenCalledWith('ff1'));
    expect(await screen.findByText('This custom field has been deleted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(formFieldService.restore).toHaveBeenCalledWith('ff1'));
    await waitFor(() => expect(screen.queryByText('This custom field has been deleted.')).not.toBeInTheDocument());
  });

  it('shows a load error with a working Retry', async () => {
    vi.mocked(formFieldService.get).mockRejectedValue(new ApiError('Form field not found', 404, 'NOT_FOUND'));
    renderView();
    expect(await screen.findByText(/Form field not found/)).toBeInTheDocument();
    vi.mocked(formFieldService.get).mockResolvedValue(customField());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Blood Group/ })).toBeInTheDocument();
  });
});
