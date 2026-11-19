import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import { masterOptions } from '../../options';
import DistrictOfficeCreate from '../pages/DistrictOfficeCreate';
import DistrictOfficeEdit from '../pages/DistrictOfficeEdit';
import DistrictOfficeView from '../pages/DistrictOfficeView';
import { contactService } from '../services/contactService';
import { DISTRICTS, OFFICES, STATES, resetToasts, toasts } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/contactService', () => ({
  contactService: {
    allDistrictOffices: vi.fn(),
    getDistrictOffice: vi.fn(),
    createDistrictOffice: vi.fn(),
    updateDistrictOffice: vi.fn(),
    setDistrictOfficeStatus: vi.fn(),
    removeDistrictOffice: vi.fn(),
  },
}));
/* The district select reads the public geography feed. */
vi.mock('../../options', () => ({ masterOptions: { states: vi.fn(), districtsOfState: vi.fn() } }));

const svc = vi.mocked(contactService);
const [PUNE, KOLHAPUR] = OFFICES as [(typeof OFFICES)[number], (typeof OFFICES)[number]];

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/contact/offices/create" element={<DistrictOfficeCreate />} />
        <Route path="/cms/contact/offices/:id/edit" element={<DistrictOfficeEdit />} />
        <Route path="/cms/contact/offices/:id" element={<DistrictOfficeView />} />
        <Route path="/cms/contact" element={<div>contact view</div>} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const location = () => screen.getByTestId('location');
const districtSelect = () => screen.getByRole('combobox', { name: /^District\b/ });
const coordinatorMr = () => screen.getByLabelText(/^District Coordinator \(Marathi\)/);
const coordinatorEn = () => screen.getByLabelText(/^District Coordinator \(English\)/);
/* One row (label and value) of the "District office details" list on the View page. */
const detailRow = (label: string) =>
  screen
    .getAllByText(label)
    .map((el) => el.closest('.kv'))
    .find((el): el is Element => el !== null);
/* The district options, without the placeholder. */
const offered = () =>
  within(districtSelect())
    .getAllByRole('option')
    .slice(1)
    .map((o) => o.textContent);

describe('district office pages', () => {
  beforeEach(() => {
    permissions.clear();
    permissions.add('updateContactPage');
    vi.mocked(masterOptions.states).mockReset().mockResolvedValue(STATES);
    vi.mocked(masterOptions.districtsOfState).mockReset().mockResolvedValue(DISTRICTS);
    /* Pune and Kolhapur already have an office. */
    svc.allDistrictOffices.mockReset().mockResolvedValue(OFFICES);
    svc.getDistrictOffice.mockReset().mockResolvedValue(PUNE);
    svc.createDistrictOffice.mockReset();
    svc.updateDistrictOffice.mockReset();
    svc.setDistrictOfficeStatus.mockReset();
    svc.removeDistrictOffice.mockReset().mockResolvedValue(undefined);
    resetToasts();
  });

  describe('Add district office', () => {
    it('offers only the districts with no office yet, and requires one', async () => {
      renderAt('/cms/contact/offices/create');

      await screen.findByRole('option', { name: 'Satara (Maharashtra)' });
      expect(offered()).toEqual(['Satara (Maharashtra)', 'Nashik (Maharashtra)']);

      await userEvent.click(screen.getByRole('button', { name: 'Create district office' }));
      expect(await screen.findByText('District is required')).toBeInTheDocument();
      expect(districtSelect()).toHaveAttribute('aria-invalid', 'true');
      expect(svc.createDistrictOffice).not.toHaveBeenCalled();
    });

    it('keeps an optional pair to both languages or neither, and sends every blank field as null', async () => {
      svc.createDistrictOffice.mockResolvedValue({ ...PUNE, id: 'f9' });
      renderAt('/cms/contact/offices/create');
      await screen.findByRole('option', { name: 'Satara (Maharashtra)' });

      await userEvent.selectOptions(districtSelect(), 'd3');
      await userEvent.type(coordinatorMr(), ' ए. पवार ');
      await userEvent.type(screen.getByLabelText(/^Office address \(Marathi\)/), 'सातारा');
      await userEvent.click(screen.getByRole('button', { name: 'Create district office' }));
      expect(await screen.findByText('District Coordinator (English) is required when Marathi is given')).toBeInTheDocument();
      expect(coordinatorEn()).toHaveAttribute('aria-invalid', 'true');
      expect(coordinatorMr()).not.toHaveAttribute('aria-invalid');
      expect(screen.getByText('Office address (English) is required when Marathi is given')).toBeInTheDocument();
      expect(svc.createDistrictOffice).not.toHaveBeenCalled();

      await userEvent.type(coordinatorEn(), ' A. Pawar ');
      expect(screen.queryByText('District Coordinator (English) is required when Marathi is given')).not.toBeInTheDocument();
      await userEvent.type(screen.getByLabelText(/^Office address \(English\)/), 'Satara');
      await userEvent.type(screen.getByLabelText(/^Official contact number/), '21XXX 12345');
      expect(screen.getByText(/Official contact number may use digits, spaces, brackets and hyphens/)).toBeInTheDocument();
      await userEvent.clear(screen.getByLabelText(/^Official contact number/));
      await userEvent.click(screen.getByRole('button', { name: 'Create district office' }));

      await waitFor(() =>
        expect(svc.createDistrictOffice).toHaveBeenCalledWith({
          districtId: 'd3',
          collectorName: { mr: 'ए. पवार', en: 'A. Pawar' },
          address: { mr: 'सातारा', en: 'Satara' },
          phone: null,
          email: null,
          officeHours: null,
          isActive: true,
        }),
      );
      await waitFor(() => expect(toasts()).toHaveTextContent('District office created'));
      expect(location()).toHaveTextContent('/cms/contact/offices/f9');
    });

    it('shows the 409 for a district that already has an office on the district select', async () => {
      svc.createDistrictOffice.mockRejectedValue(
        new ApiError('Conflict', 409, 'CONFLICT', [{ field: 'districtId', message: 'Satara already has an office entry' }]),
      );
      renderAt('/cms/contact/offices/create');
      await screen.findByRole('option', { name: 'Satara (Maharashtra)' });

      await userEvent.selectOptions(districtSelect(), 'd3');
      await userEvent.click(screen.getByRole('button', { name: 'Create district office' }));

      expect(await screen.findByText('Satara already has an office entry')).toBeInTheDocument();
      expect(districtSelect()).toHaveAttribute('aria-invalid', 'true');
      expect(toasts()).toBeEmptyDOMElement();
      /* The select is reloaded, so it offers the districts as they are now. */
      await waitFor(() => expect(svc.allDistrictOffices).toHaveBeenCalledTimes(2));
      expect(location()).toHaveTextContent('/cms/contact/offices/create');
    });

    it('returns to the district offices tab on Cancel', async () => {
      renderAt('/cms/contact/offices/create');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(location()).toHaveTextContent('/cms/contact?tab=offices');
    });
  });

  describe('Edit district office', () => {
    it('offers its own district beside the free ones, and saves the fields after confirmation', async () => {
      svc.updateDistrictOffice.mockResolvedValue(PUNE);
      renderAt('/cms/contact/offices/f1/edit');

      await screen.findByRole('option', { name: 'Pune (Maharashtra)' });
      expect(offered()).toEqual(['Pune (Maharashtra)', 'Satara (Maharashtra)', 'Nashik (Maharashtra)']);
      expect(districtSelect()).toHaveValue('d1');
      /* The District Coordinator in both languages, Marathi first, as with the address and office hours. */
      expect(coordinatorMr()).toHaveValue('डॉ. एस. देशमुख');
      expect(coordinatorMr()).toHaveAttribute('lang', 'mr');
      expect(coordinatorMr()).toHaveAttribute('maxlength', '150');
      expect(coordinatorEn()).toHaveValue('Dr. S. Deshmukh');
      expect(coordinatorEn()).toHaveAttribute('lang', 'en');
      expect(coordinatorEn()).toHaveAttribute('maxlength', '150');
      expect(screen.queryByLabelText(/^District Coordinator$/)).not.toBeInTheDocument();
      /* The district first, then the coordinator pair, then the address. */
      const order = [districtSelect(), coordinatorMr(), coordinatorEn(), screen.getByLabelText(/^Office address \(Marathi\)/)];
      for (let i = 1; i < order.length; i++) {
        expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
      expect(screen.getByLabelText(/^Office hours \(English\)/)).toHaveValue('Mon to Fri');
      /* Status has its own endpoint, so it is shown, not edited, here. */
      expect(screen.queryByRole('combobox', { name: /Show on website/ })).not.toBeInTheDocument();

      const phone = screen.getByLabelText(/^Official contact number/);
      await userEvent.clear(phone);
      await userEvent.type(phone, '020 2612 9999');
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('Are you sure you want to save the changes to the Pune district office?');
      expect(svc.updateDistrictOffice).not.toHaveBeenCalled();
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));

      await waitFor(() =>
        expect(svc.updateDistrictOffice).toHaveBeenCalledWith('f1', {
          districtId: 'd1',
          collectorName: { mr: 'डॉ. एस. देशमुख', en: 'Dr. S. Deshmukh' },
          address: { mr: 'जिल्हाधिकारी कार्यालय, पुणे', en: 'Collectorate, Pune' },
          phone: '020 2612 9999',
          email: 'collector.pune@example.org',
          officeHours: { mr: 'सोम ते शुक्र', en: 'Mon to Fri' },
        }),
      );
      await waitFor(() => expect(toasts()).toHaveTextContent('District office updated'));
      expect(location()).toHaveTextContent('/cms/contact/offices/f1');
    });

    it("puts the server's message about a whole pair on its Marathi half", async () => {
      svc.updateDistrictOffice.mockRejectedValue(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.officeHours', message: 'Office hours are not valid' }]),
      );
      renderAt('/cms/contact/offices/f1/edit');
      await screen.findByRole('option', { name: 'Pune (Maharashtra)' });

      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));
      expect(await screen.findByText('Office hours are not valid')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Office hours \(Marathi\)/)).toHaveAttribute('aria-invalid', 'true');
    });

    it("puts the server's message about the whole District Coordinator pair on its Marathi half", async () => {
      svc.updateDistrictOffice.mockRejectedValue(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
          { field: 'body.collectorName', message: 'District Coordinator must be given in both languages or neither' },
        ]),
      );
      renderAt('/cms/contact/offices/f1/edit');
      await screen.findByRole('option', { name: 'Pune (Maharashtra)' });

      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));
      expect(await screen.findByText('District Coordinator must be given in both languages or neither')).toBeInTheDocument();
      expect(coordinatorMr()).toHaveAttribute('aria-invalid', 'true');
      expect(coordinatorEn()).not.toHaveAttribute('aria-invalid');
      expect(toasts()).toBeEmptyDOMElement();

      /* Editing either half clears the server's message. */
      await userEvent.type(coordinatorEn(), ' ');
      expect(screen.queryByText('District Coordinator must be given in both languages or neither')).not.toBeInTheDocument();
    });

    it('will not save the District Coordinator in Marathi only', async () => {
      renderAt('/cms/contact/offices/f1/edit');
      await screen.findByRole('option', { name: 'Pune (Maharashtra)' });

      await userEvent.clear(coordinatorEn());
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(await screen.findByText('District Coordinator (English) is required when Marathi is given')).toBeInTheDocument();
      expect(coordinatorEn()).toHaveAttribute('aria-invalid', 'true');
      expect(coordinatorMr()).not.toHaveAttribute('aria-invalid');
      /* Blocked before the confirmation is even asked. */
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(svc.updateDistrictOffice).not.toHaveBeenCalled();
    });

    it('sends a District Coordinator cleared in both languages as null', async () => {
      svc.updateDistrictOffice.mockResolvedValue({ ...PUNE, collectorName: null });
      renderAt('/cms/contact/offices/f1/edit');
      await screen.findByRole('option', { name: 'Pune (Maharashtra)' });

      await userEvent.clear(coordinatorMr());
      await userEvent.clear(coordinatorEn());
      expect(screen.queryByText(/District Coordinator \((Marathi|English)\) is required/)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, save' }));

      await waitFor(() => expect(svc.updateDistrictOffice).toHaveBeenCalledWith('f1', expect.objectContaining({ collectorName: null })));
      await waitFor(() => expect(toasts()).toHaveTextContent('District office updated'));
    });
  });

  describe('View district office', () => {
    it('shows both languages and the details, and opens Edit', async () => {
      renderAt('/cms/contact/offices/f1');

      expect(await screen.findByRole('heading', { name: /Pune district office/ })).toHaveTextContent('D1');
      expect(screen.getByText('जिल्हाधिकारी कार्यालय, पुणे').closest('[lang]')).toHaveAttribute('lang', 'mr');
      expect(screen.getByText('Collectorate, Pune').closest('[lang]')).toHaveAttribute('lang', 'en');
      /* The District Coordinator in each language's card, and both spellings in the details. */
      const marathiName = screen.getAllByText('डॉ. एस. देशमुख');
      const englishName = screen.getAllByText('Dr. S. Deshmukh');
      expect(marathiName).toHaveLength(2);
      expect(englishName).toHaveLength(2);
      for (const el of marathiName) expect(el.closest('[lang]')).toHaveAttribute('lang', 'mr');
      for (const el of englishName) expect(el.closest('[lang]')).toHaveAttribute('lang', 'en');
      // The name is labelled as on the form and the website: District Coordinator, not Collector.
      expect(detailRow('District Coordinator')).toHaveTextContent('District Coordinatorडॉ. एस. देशमुखDr. S. Deshmukh');
      expect(screen.queryByText(/District Collector/)).toBeNull();
      expect(screen.queryByText('[object Object]')).toBeNull();
      expect(screen.getByText('Official contact number')).toBeInTheDocument();
      expect(screen.queryByText('Official phone')).toBeNull();
      expect(screen.getByText('collector.pune@example.org')).toBeInTheDocument();
      expect(screen.getByText("Shown on the district's page")).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(location()).toHaveTextContent('/cms/contact/offices/f1/edit');
    });

    it('shows what the website prints for a blank office, and deletes it after confirmation', async () => {
      svc.getDistrictOffice.mockResolvedValue(KOLHAPUR);
      renderAt('/cms/contact/offices/f2');

      /* The District Coordinator, address and office hours, in each language's card. */
      expect(await screen.findAllByText('To be supplied from official records')).toHaveLength(6);
      expect(detailRow('District Coordinator')).toHaveTextContent('District Coordinator—');
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('Delete the Kolhapur district office?');
      expect(svc.removeDistrictOffice).not.toHaveBeenCalled();
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

      expect(svc.removeDistrictOffice).toHaveBeenCalledWith('f2');
      await waitFor(() => expect(toasts()).toHaveTextContent('District office deleted'));
      expect(location()).toHaveTextContent('/cms/contact?tab=offices');
    });

    it('offers no actions to a view-only user, and goes Back to the tab', async () => {
      permissions.clear();
      renderAt('/cms/contact/offices/f1');

      await screen.findByRole('heading', { name: /Pune district office/ });
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(location()).toHaveTextContent('/cms/contact?tab=offices');
    });
  });
});
