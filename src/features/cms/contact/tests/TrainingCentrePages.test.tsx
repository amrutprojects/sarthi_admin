import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { masterOptions } from '../../options';
import TrainingCentreCreate from '../pages/TrainingCentreCreate';
import TrainingCentreEdit from '../pages/TrainingCentreEdit';
import TrainingCentreList from '../pages/TrainingCentreList';
import TrainingCentresSectionBar from '../pages/TrainingCentresSectionBar';
import TrainingCentreView from '../pages/TrainingCentreView';
import { trainingCentreService } from '../services/trainingCentreService';
import type { ApiTrainingCentre } from '../types/trainingCentre.types';
import { DISTRICTS, STATES, contactPage, resetToasts, toasts } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/trainingCentreService', () => ({
  trainingCentreService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    setSection: vi.fn(),
  },
}));
/* The district selects read the public geography feed. */
vi.mock('../../options', () => ({ masterOptions: { states: vi.fn(), districtsOfState: vi.fn() } }));

const svc = vi.mocked(trainingCentreService);

const centre = (over: Partial<ApiTrainingCentre> = {}): ApiTrainingCentre => ({
  id: 'c1',
  district: { id: 'd1', name: 'Pune', code: 'PUN' },
  name: { mr: 'हवेली कौशल्य विकास केंद्र', en: 'Haveli Skill Development Centre' },
  address: { mr: 'हवेली, पुणे', en: 'Haveli, Pune' },
  managerName: { mr: 'सुनील पवार', en: 'Sunil Pawar' },
  phone: '+91 98XXX 51200',
  email: null,
  displayOrder: 0,
  isActive: true,
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T10:00:00.000Z',
  ...over,
});
const SECOND = centre({ id: 'c2', name: { mr: 'दुसरे केंद्र', en: 'Second Centre' }, managerName: null, displayOrder: 1, isActive: false });

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/contact/centres/create" element={<TrainingCentreCreate />} />
        <Route path="/cms/contact/centres/:id/edit" element={<TrainingCentreEdit />} />
        <Route path="/cms/contact/centres/:id" element={<TrainingCentreView />} />
        <Route path="/cms/contact" element={<TrainingCentreList />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const location = () => screen.getByTestId('location');

beforeEach(() => {
  permissions.clear();
  permissions.add('viewContactPage');
  permissions.add('updateContactPage');
  vi.mocked(masterOptions.states).mockReset().mockResolvedValue(STATES);
  vi.mocked(masterOptions.districtsOfState).mockReset().mockResolvedValue(DISTRICTS);
  svc.list.mockReset().mockResolvedValue({ items: [centre(), SECOND] });
  svc.get.mockReset().mockResolvedValue(centre());
  svc.create.mockReset();
  svc.update.mockReset();
  svc.setStatus.mockReset();
  svc.remove.mockReset().mockResolvedValue(undefined);
  svc.setSection.mockReset().mockResolvedValue(contactPage({ showTrainingCentres: false }));
  resetToasts();
});

describe('Training centres tab', () => {
  it('lists every centre with its district, manager and status, and adds more', async () => {
    renderAt('/cms/contact?tab=centres');
    const first = (await screen.findByText('Haveli Skill Development Centre')).closest('tr') as HTMLElement;
    expect(within(first).getByText('Pune')).toBeInTheDocument();
    expect(within(first).getByText('हवेली कौशल्य विकास केंद्र')).toBeInTheDocument();
    expect(within(first).getByText('Sunil Pawar')).toBeInTheDocument();
    expect(within(first).getByText('Active')).toBeInTheDocument();
    expect(within(screen.getByText('Second Centre').closest('tr') as HTMLElement).getByText('Inactive')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Add training centre/ }));
    expect(location()).toHaveTextContent('/cms/contact/centres/create');
  });

  it('narrows the list to one district', async () => {
    renderAt('/cms/contact?tab=centres');
    await screen.findByText('Haveli Skill Development Centre');
    const filter = screen.getByRole('combobox', { name: 'Filter by district' });
    await waitFor(() => expect(within(filter).getAllByRole('option')).toHaveLength(DISTRICTS.length + 1));
    await userEvent.selectOptions(filter, 'd2');
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), 'd2'));
  });

  it('deactivates a centre after asking', async () => {
    svc.setStatus.mockResolvedValue(centre({ isActive: false }));
    renderAt('/cms/contact?tab=centres');
    const row = (await screen.findByText('Haveli Skill Development Centre')).closest('tr') as HTMLElement;
    await userEvent.click(within(row).getByRole('switch'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('It will no longer be listed on the Pune page.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(svc.setStatus).toHaveBeenCalledWith('c1', false));
  });

  it('shows no write controls to a view-only user', async () => {
    permissions.delete('updateContactPage');
    renderAt('/cms/contact?tab=centres');
    await screen.findByText('Haveli Skill Development Centre');
    expect(screen.queryByRole('button', { name: /Add training centre/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});

describe('Add training centre', () => {
  it('requires a district and the name in both languages', async () => {
    renderAt('/cms/contact/centres/create');
    await userEvent.click(await screen.findByRole('button', { name: 'Create training centre' }));
    expect(await screen.findByText('District is required')).toBeInTheDocument();
    expect(screen.getByText('Centre name (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Centre name (English) is required')).toBeInTheDocument();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('sends the centre, blanks as null, and opens it', async () => {
    svc.create.mockResolvedValue(centre({ id: 'new' }));
    renderAt('/cms/contact/centres/create');
    const district = screen.getByRole('combobox', { name: /^District\b/ });
    await waitFor(() => expect(within(district).getAllByRole('option').length).toBeGreaterThan(1));
    await userEvent.selectOptions(district, 'd2');
    await userEvent.type(screen.getByLabelText(/^Centre name \(Marathi\)/), 'करवीर केंद्र');
    await userEvent.type(screen.getByLabelText(/^Centre name \(English\)/), ' Karvir Centre ');
    await userEvent.type(screen.getByLabelText(/^Phone/), '+91 98XXX 51209');
    await userEvent.click(screen.getByRole('button', { name: 'Create training centre' }));

    await waitFor(() =>
      expect(svc.create).toHaveBeenCalledWith({
        districtId: 'd2',
        name: { mr: 'करवीर केंद्र', en: 'Karvir Centre' },
        address: null,
        managerName: null,
        phone: '+91 98XXX 51209',
        email: null,
        isActive: true,
      }),
    );
    expect(toasts()).toHaveTextContent('Training centre created');
    expect(location()).toHaveTextContent('/cms/contact/centres/new');
  });

  it('asks for the other half of an address and shows the server messages on the fields', async () => {
    svc.create.mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.email', message: 'Must be a valid email address' }]),
    );
    renderAt('/cms/contact/centres/create');
    const district = screen.getByRole('combobox', { name: /^District\b/ });
    await waitFor(() => expect(within(district).getAllByRole('option').length).toBeGreaterThan(1));
    await userEvent.selectOptions(district, 'd1');
    await userEvent.type(screen.getByLabelText(/^Centre name \(Marathi\)/), 'केंद्र');
    await userEvent.type(screen.getByLabelText(/^Centre name \(English\)/), 'Centre');
    await userEvent.type(screen.getByLabelText(/^Address \(Marathi\)/), 'पुणे');
    await userEvent.click(screen.getByRole('button', { name: 'Create training centre' }));
    expect(await screen.findByText('Address (English) is required when Marathi is given')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^Address \(English\)/), 'Pune');
    await userEvent.type(screen.getByLabelText(/^Email/), 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: 'Create training centre' }));
    expect(await screen.findByText('Must be a valid email address')).toBeInTheDocument();
  });
});

describe('Edit and view a training centre', () => {
  it('saves the changed centre after confirming', async () => {
    svc.update.mockResolvedValue(centre());
    renderAt('/cms/contact/centres/c1/edit');
    const en = await screen.findByLabelText(/^Centre name \(English\)/);
    expect(en).toHaveValue('Haveli Skill Development Centre');
    expect(screen.getByLabelText(/^Display order/)).toHaveValue('0');
    await userEvent.clear(en);
    await userEvent.type(en, 'Haveli Centre');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Yes, save' }));

    await waitFor(() =>
      expect(svc.update).toHaveBeenCalledWith('c1', {
        districtId: 'd1',
        name: { mr: 'हवेली कौशल्य विकास केंद्र', en: 'Haveli Centre' },
        address: { mr: 'हवेली, पुणे', en: 'Haveli, Pune' },
        managerName: { mr: 'सुनील पवार', en: 'Sunil Pawar' },
        phone: '+91 98XXX 51200',
        email: null,
        displayOrder: 0,
      }),
    );
    expect(location()).toHaveTextContent('/cms/contact/centres/c1');
  });

  it('shows both languages and deletes the centre', async () => {
    renderAt('/cms/contact/centres/c1');
    expect((await screen.findAllByText('Haveli Skill Development Centre')).length).toBeGreaterThan(0);
    expect(screen.getByText('हवेली, पुणे').closest('[lang]')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Sunil Pawar').closest('[lang]')).toHaveAttribute('lang', 'en');
    expect(screen.getByText('+91 98XXX 51200')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('c1'));
    expect(location()).toHaveTextContent('/cms/contact?tab=centres');
  });
});

describe('Training centres "Show on website" switch', () => {
  it('hides the card after asking, and shows it again without asking', async () => {
    const onSaved = vi.fn();
    const { rerender } = renderWithProviders(<TrainingCentresSectionBar page={contactPage({ showTrainingCentres: true })} onSaved={onSaved} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Show on website' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Hide training centres from the website?');
    expect(svc.setSection).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(svc.setSection).toHaveBeenCalledWith(false));
    expect(onSaved).toHaveBeenCalled();

    rerender(<TrainingCentresSectionBar page={contactPage({ showTrainingCentres: false })} onSaved={onSaved} />);
    expect(screen.getByText('Hidden from the website')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Show on website' }));
    await waitFor(() => expect(svc.setSection).toHaveBeenLastCalledWith(true));
  });

  it('is a Shown / Hidden badge for a view-only user', () => {
    permissions.delete('updateContactPage');
    renderWithProviders(<TrainingCentresSectionBar page={contactPage({ showTrainingCentres: false })} onSaved={vi.fn()} />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });
});
