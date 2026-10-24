import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { masterOptions } from '../../options';
import CoordinatorCreate from '../pages/CoordinatorCreate';
import CoordinatorEdit from '../pages/CoordinatorEdit';
import CoordinatorView from '../pages/CoordinatorView';
import { contactService } from '../services/contactService';
import { COORDINATORS, DISTRICTS, STATES, district, resetToasts, toasts } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/contactService', () => ({
  contactService: {
    allCoordinators: vi.fn(),
    getCoordinator: vi.fn(),
    createCoordinator: vi.fn(),
    updateCoordinator: vi.fn(),
    setCoordinatorStatus: vi.fn(),
    removeCoordinator: vi.fn(),
  },
}));
/* The district picker reads the public geography feed. */
vi.mock('../../options', () => ({ masterOptions: { states: vi.fn(), districtsOfState: vi.fn() } }));

const svc = vi.mocked(contactService);
const [ANITA, RAVI] = COORDINATORS as [(typeof COORDINATORS)[number], (typeof COORDINATORS)[number]];

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/contact/coordinators/create" element={<CoordinatorCreate />} />
        <Route path="/cms/contact/coordinators/:id/edit" element={<CoordinatorEdit />} />
        <Route path="/cms/contact/coordinators/:id" element={<CoordinatorView />} />
        <Route path="/cms/contact" element={<div>contact view</div>} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const location = () => screen.getByTestId('location');
const districtBox = (name: string) => screen.getByRole('checkbox', { name: new RegExp(`^${name}`) });
/* The district checkboxes on offer, in list order. */
const offered = () =>
  within(screen.getByRole('group', { name: /Districts covered/ }))
    .getAllByRole('checkbox')
    .map((c) => (c.closest('label')?.textContent ?? '').split(' · ')[0]);

describe('coordinator pages', () => {
  beforeEach(() => {
    permissions.clear();
    permissions.add('updateContactPage');
    vi.mocked(masterOptions.states).mockReset().mockResolvedValue(STATES);
    vi.mocked(masterOptions.districtsOfState).mockReset().mockResolvedValue(DISTRICTS);
    /* Anita covers Satara, Pune and Kolhapur; Ravi covers none. */
    svc.allCoordinators.mockReset().mockResolvedValue([ANITA, RAVI]);
    svc.getCoordinator.mockReset().mockResolvedValue(ANITA);
    svc.createCoordinator.mockReset();
    svc.updateCoordinator.mockReset();
    svc.setCoordinatorStatus.mockReset();
    svc.removeCoordinator.mockReset().mockResolvedValue(undefined);
    resetToasts();
  });

  describe('Add coordinator', () => {
    beforeEach(() => {
      /* Nobody but Ravi (Satara) covers a district yet. */
      svc.allCoordinators.mockResolvedValue([{ ...RAVI, districts: [district('d3', 'Satara')] }]);
    });

    it('names each problem on submit and sends nothing while the form is invalid', async () => {
      renderAt('/cms/contact/coordinators/create');
      await screen.findByRole('checkbox', { name: /^Pune/ });

      await userEvent.click(screen.getByRole('button', { name: 'Create coordinator' }));
      expect(await screen.findByText('Coordinator name is required')).toBeInTheDocument();
      expect(screen.getByText('Phone is required')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Name/)).toHaveAttribute('aria-invalid', 'true');

      /* X may mask a digit, other letters may not. */
      await userEvent.type(screen.getByLabelText(/^Phone/), '98ABC 41201');
      expect(screen.getByText(/Phone may use digits \(or X for a masked digit\)/)).toBeInTheDocument();
      await userEvent.clear(screen.getByLabelText(/^Phone/));
      await userEvent.type(screen.getByLabelText(/^Phone/), '98XXX 41201');
      expect(screen.queryByText(/Phone may use digits/)).not.toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/^Email/), 'bad');
      expect(screen.getByText('Email must be a valid email address')).toBeInTheDocument();
      expect(svc.createCoordinator).not.toHaveBeenCalled();
    });

    it('lists every district of the master, marks the one another coordinator covers, and sends the ticked ones in order', async () => {
      svc.createCoordinator.mockResolvedValue({ ...ANITA, id: 'c9' });
      renderAt('/cms/contact/coordinators/create');
      await screen.findByRole('checkbox', { name: /^Pune/ });

      expect(offered()).toEqual(['Pune', 'Kolhapur', 'Satara', 'Nashik']);
      /* Satara is listed with who holds it now, and can still be ticked. */
      expect(districtBox('Satara')).toBeEnabled();
      expect(districtBox('Satara').closest('label')).toHaveTextContent('now with Ravi Shinde');
      expect(districtBox('Pune').closest('label')).not.toHaveTextContent('now with');

      await userEvent.type(screen.getByLabelText(/^Name/), ' Meera ');
      await userEvent.type(screen.getByLabelText(/^Phone/), '98XXX 41201');
      await userEvent.click(districtBox('Nashik'));
      await userEvent.click(districtBox('Pune'));
      await userEvent.click(screen.getByRole('button', { name: 'Create coordinator' }));

      await waitFor(() =>
        expect(svc.createCoordinator).toHaveBeenCalledWith({
          name: 'Meera',
          phone: '98XXX 41201',
          email: null,
          districtIds: ['d4', 'd1'],
          isActive: true,
        }),
      );
      await waitFor(() => expect(toasts()).toHaveTextContent('Coordinator created'));
      expect(location()).toHaveTextContent('/cms/contact/coordinators/c9');
    });

    it('asks before taking a district from the coordinator that covers it, then sends moveDistricts', async () => {
      svc.createCoordinator.mockResolvedValue({ ...ANITA, id: 'c9' });
      renderAt('/cms/contact/coordinators/create');
      await screen.findByRole('checkbox', { name: /^Pune/ });

      await userEvent.type(screen.getByLabelText(/^Name/), 'Meera');
      await userEvent.type(screen.getByLabelText(/^Phone/), '98XXX 41201');
      await userEvent.click(districtBox('Pune'));
      await userEvent.click(districtBox('Satara'));
      await userEvent.click(screen.getByRole('button', { name: 'Create coordinator' }));

      /* Only the district that is taken from someone is listed, and nothing is sent yet. */
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent('Satara — now with Ravi Shinde');
      expect(dialog).not.toHaveTextContent('Pune');
      expect(svc.createCoordinator).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, save' }));
      await waitFor(() =>
        expect(svc.createCoordinator).toHaveBeenCalledWith({
          name: 'Meera',
          phone: '98XXX 41201',
          email: null,
          districtIds: ['d1', 'd3'],
          isActive: true,
          moveDistricts: true,
        }),
      );
    });

    it('shows the 409 for a district another coordinator took meanwhile on the districts field', async () => {
      svc.createCoordinator.mockRejectedValue(
        new ApiError('Conflict', 409, 'CONFLICT', [{ field: 'districtIds', message: 'Pune is already covered by Anita Patil' }]),
      );
      renderAt('/cms/contact/coordinators/create');
      await screen.findByRole('checkbox', { name: /^Pune/ });

      await userEvent.type(screen.getByLabelText(/^Name/), 'Meera Joshi');
      await userEvent.type(screen.getByLabelText(/^Phone/), '98765 41201');
      await userEvent.click(districtBox('Pune'));
      await userEvent.click(screen.getByRole('button', { name: 'Create coordinator' }));

      expect(await screen.findByText('Pune is already covered by Anita Patil')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Districts covered/ })).toHaveAttribute('aria-describedby', 'co-districts-error');
      expect(toasts()).toBeEmptyDOMElement();
      /* The picker is reloaded, so it shows the districts as they are now. */
      await waitFor(() => expect(svc.allCoordinators).toHaveBeenCalledTimes(2));
      expect(location()).toHaveTextContent('/cms/contact/coordinators/create');

      /* Changing the districts clears the server's complaint about them. */
      await userEvent.click(districtBox('Pune'));
      expect(screen.queryByText('Pune is already covered by Anita Patil')).not.toBeInTheDocument();
    });

    it('returns to the coordinators tab on Back', async () => {
      renderAt('/cms/contact/coordinators/create');
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(location()).toHaveTextContent('/cms/contact?tab=coordinators');
    });
  });

  describe('Edit coordinator', () => {
    it('keeps the saved district order, appends newly ticked districts, and saves after confirmation', async () => {
      svc.updateCoordinator.mockResolvedValue(ANITA);
      renderAt('/cms/contact/coordinators/c1/edit');

      expect(await screen.findByLabelText(/^Name/)).toHaveValue('Anita Patil');
      expect(screen.getByLabelText(/^Phone/)).toHaveValue('+91 98220 11111');
      expect(screen.getByLabelText(/^Display Order/)).toHaveValue('1');
      await screen.findByRole('checkbox', { name: /^Nashik/ });
      /* Its own districts stay on offer, ticked; nobody else covers Nashik, so it is offered too. */
      expect(offered()).toEqual(['Pune', 'Kolhapur', 'Satara', 'Nashik']);
      expect(districtBox('Satara')).toBeChecked();
      expect(districtBox('Pune')).toBeChecked();
      expect(districtBox('Kolhapur')).toBeChecked();
      expect(districtBox('Nashik')).not.toBeChecked();
      /* Status has its own endpoint, so it is shown, not edited, here. */
      expect(screen.queryByRole('combobox', { name: /Show on website/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument();

      await userEvent.click(districtBox('Pune'));
      await userEvent.click(districtBox('Nashik'));
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('Are you sure you want to save the changes to this coordinator?');
      expect(svc.updateCoordinator).not.toHaveBeenCalled();
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));

      await waitFor(() =>
        expect(svc.updateCoordinator).toHaveBeenCalledWith('c1', {
          name: 'Anita Patil',
          phone: '+91 98220 11111',
          email: 'anita@example.org',
          districtIds: ['d3', 'd2', 'd4'],
          displayOrder: 1,
        }),
      );
      await waitFor(() => expect(toasts()).toHaveTextContent('Coordinator updated'));
      expect(location()).toHaveTextContent('/cms/contact/coordinators/c1');
    });

    it('lists every district of the master, names the coordinator that has each taken one, and moves a ticked one after confirmation', async () => {
      svc.getCoordinator.mockResolvedValue({ ...RAVI, districts: [] });
      svc.allCoordinators.mockResolvedValue([ANITA, { ...RAVI, districts: [] }]);
      svc.updateCoordinator.mockResolvedValue({ ...RAVI, districts: [] });
      renderAt('/cms/contact/coordinators/c2/edit');

      await screen.findByRole('checkbox', { name: /^Nashik/ });
      expect(offered()).toEqual(['Pune', 'Kolhapur', 'Satara', 'Nashik']);
      for (const name of ['Pune', 'Kolhapur', 'Satara']) {
        expect(districtBox(name)).toBeEnabled();
        expect(districtBox(name).closest('label')).toHaveTextContent('now with Anita Patil');
      }
      expect(districtBox('Nashik').closest('label')).not.toHaveTextContent('now with');
      expect(screen.queryByText(/No districts available/)).not.toBeInTheDocument();

      await userEvent.click(districtBox('Pune'));
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveTextContent('Pune — now with Anita Patil');
      expect(svc.updateCoordinator).not.toHaveBeenCalled();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, save' }));
      await waitFor(() =>
        expect(svc.updateCoordinator).toHaveBeenCalledWith('c2', {
          name: 'Ravi Shinde',
          phone: '+91 98XXX 22222',
          email: null,
          districtIds: ['d1'],
          displayOrder: 2,
          moveDistricts: true,
        }),
      );
    });

    it('requires the display order, and shows the 400 for an unknown district on the districts field', async () => {
      svc.updateCoordinator.mockRejectedValue(
        new ApiError('One or more selected districts do not exist', 400, 'BAD_REQUEST', [{ field: 'districtIds', message: 'Unknown district' }]),
      );
      renderAt('/cms/contact/coordinators/c1/edit');

      const order = await screen.findByLabelText(/^Display Order/);
      await userEvent.clear(order);
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(await screen.findByText('Display order is required')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await userEvent.type(order, '3');
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));
      expect(await screen.findByText('Unknown district')).toBeInTheDocument();
      expect(svc.updateCoordinator).toHaveBeenCalledWith('c1', expect.objectContaining({ displayOrder: 3 }));
    });

    it('returns to the coordinator on Back', async () => {
      renderAt('/cms/contact/coordinators/c1/edit');
      await screen.findByLabelText(/^Name/);
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(location()).toHaveTextContent('/cms/contact/coordinators/c1');
    });
  });

  describe('View coordinator', () => {
    it('shows every field and the districts in the order saved, and opens Edit', async () => {
      renderAt('/cms/contact/coordinators/c1');

      expect(await screen.findByRole('heading', { name: /Anita Patil/ })).toHaveTextContent('Order 1');
      expect(screen.getByText('+91 98220 11111')).toBeInTheDocument();
      expect(screen.getByText('anita@example.org')).toBeInTheDocument();
      expect(screen.getByText('Shown on the public Contact page')).toBeInTheDocument();
      const table = screen.getByRole('table');
      expect(
        within(table)
          .getAllByRole('row')
          .slice(1)
          .map((r) => within(r).getAllByRole('cell').map((c) => c.textContent)),
      ).toEqual([
        ['1', 'Satara', 'D3'],
        ['2', 'Pune', 'D1'],
        ['3', 'Kolhapur', 'D2'],
      ]);

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(location()).toHaveTextContent('/cms/contact/coordinators/c1/edit');
    });

    it('deletes after confirmation and returns to the coordinators tab', async () => {
      renderAt('/cms/contact/coordinators/c1');

      await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('Delete "Anita Patil"?');
      expect(svc.removeCoordinator).not.toHaveBeenCalled();
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

      expect(svc.removeCoordinator).toHaveBeenCalledWith('c1');
      await waitFor(() => expect(toasts()).toHaveTextContent('Coordinator deleted'));
      expect(location()).toHaveTextContent('/cms/contact?tab=coordinators');
    });

    it('switches the coordinator off from the header', async () => {
      svc.setCoordinatorStatus.mockResolvedValue({ ...ANITA, isActive: false });
      renderAt('/cms/contact/coordinators/c1');

      await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
      expect(svc.setCoordinatorStatus).toHaveBeenCalledWith('c1', false);
      await waitFor(() => expect(toasts()).toHaveTextContent('Coordinator deactivated'));
      await waitFor(() => expect(svc.getCoordinator).toHaveBeenCalledTimes(2));
    });

    it('shows a coordinator with no email or districts, without actions for a view-only user, and goes Back to the tab', async () => {
      permissions.clear();
      svc.getCoordinator.mockResolvedValue(RAVI);
      renderAt('/cms/contact/coordinators/c2');

      expect(await screen.findByText('No districts assigned yet.')).toBeInTheDocument();
      expect(screen.getByText('Hidden from the public Contact page')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Activate' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(location()).toHaveTextContent('/cms/contact?tab=coordinators');
    });
  });
});
