import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import ContactView from '../pages/ContactView';
import { contactService } from '../services/contactService';
import { AMRUT, COORDINATORS, OFFICES, PARTNER, contactPage, listPage, resetToasts, toasts } from './fixtures';

/* The screen's collaborators are replaced at their public boundaries: the auth guard and the API service. */
const permissions = new Set<string>();
/* ContactView imports Can from this exact path (not the modules/auth index), so this is the one to replace. */
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/contactService', () => ({
  contactService: {
    get: vi.fn(),
    update: vi.fn(),
    setPublished: vi.fn(),
    setDistrictOfficesSection: vi.fn(),
    listCoordinators: vi.fn(),
    setCoordinatorStatus: vi.fn(),
    removeCoordinator: vi.fn(),
    listDistrictOffices: vi.fn(),
    setDistrictOfficeStatus: vi.fn(),
    removeDistrictOffice: vi.fn(),
  },
}));

const svc = vi.mocked(contactService);

/* Shows where the screen has navigated to, so tab and link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route = '/cms/contact') =>
  renderWithProviders(
    <>
      <ContactView />
      <Location />
    </>,
    { route },
  );

const tab = (name: string) => screen.getByRole('tab', { name });
const panel = () => screen.getByRole('tabpanel');
/* The open tab's panel, once the page has loaded. */
const openPanel = () => screen.findByRole('tabpanel');
/* The body rows of the tab's table, and the Field / Sr. No. / Content text of each. */
/* Rows with cells only, so a tab with more than one table (Helpline & WhatsApp) skips every header row. */
const bodyRows = () =>
  within(panel())
    .getAllByRole('row')
    .filter((r) => within(r).queryAllByRole('cell').length > 0);
const cellText = (row: HTMLElement, col: number) => within(row).getAllByRole('cell')[col].textContent;
const fields = () => bodyRows().map((r) => cellText(r, 1));
const row = (label: string) => bodyRows().find((r) => cellText(r, 1) === label) as HTMLElement;
/* Column headings without the sort arrows. */
const headings = () =>
  within(panel())
    .getAllByRole('columnheader')
    .map((h) => (h.textContent ?? '').replace(/[▲▼⇅]/g, ''));
const location = () => screen.getByTestId('location');

describe('<ContactView> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    svc.get.mockReset().mockResolvedValue(contactPage());
    svc.setPublished.mockReset().mockResolvedValue(contactPage());
    svc.setDistrictOfficesSection.mockReset().mockResolvedValue(contactPage());
    svc.listCoordinators.mockReset().mockResolvedValue(listPage(COORDINATORS));
    svc.listDistrictOffices.mockReset().mockResolvedValue(listPage(OFFICES));
    svc.setCoordinatorStatus.mockReset().mockResolvedValue({ ...COORDINATORS[0]!, isActive: false });
    svc.removeCoordinator.mockReset().mockResolvedValue(undefined);
    svc.setDistrictOfficeStatus.mockReset().mockResolvedValue({ ...OFFICES[1]!, isActive: true });
    svc.removeDistrictOffice.mockReset().mockResolvedValue(undefined);
    resetToasts();
  });

  it('opens on Page information, with one tab per section of the public page', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(7);
    [
      'Page information',
      'AMRUT contact details',
      'Implementation partner',
      'Helpline & WhatsApp',
      'Division / cluster coordinators',
      'District offices',
      'Training centres',
    ].forEach((name, i) => expect(tabs[i]).toHaveAccessibleName(name));
    expect(tab('Page information')).toHaveAttribute('aria-selected', 'true');
    /* The panel's standard tab strip, as on Modules Page Management, each tab naming the panel it opens. */
    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs-fit');
    expect(tab('Page information')).toHaveAttribute('aria-controls', panel().id);
    expect(panel()).toHaveAttribute('aria-labelledby', tab('Page information').id);

    /* The banner as a read-only table, both languages of each line. */
    expect(headings()).toEqual(['Sr. No.', 'Field', 'Content']);
    expect(fields()).toEqual(['Page title', 'Page subtitle']);
    expect(screen.getByText('संपर्क')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Contact us')).toBeInTheDocument();
    expect(screen.getByText('आमच्याशी बोला')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Talk to us')).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();

    /* No summary tiles above the tabs: the page opens straight on its sections, and no list is loaded yet. */
    expect(document.querySelector('.kpi')).toBeNull();
    expect(svc.get).toHaveBeenCalledTimes(1);
    expect(svc.listCoordinators).not.toHaveBeenCalled();
    expect(svc.listDistrictOffices).not.toHaveBeenCalled();
  });

  it('falls back to Page information for an unknown tab', async () => {
    renderAt('/cms/contact?tab=nonsense');
    expect(await screen.findByRole('tab', { name: 'Page information' })).toHaveAttribute('aria-selected', 'true');
    expect(fields()).toEqual(['Page title', 'Page subtitle']);
  });

  it('shows the AMRUT card rows on their tab and keeps the tab in the URL', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('tab', { name: 'AMRUT contact details' }));

    expect(tab('AMRUT contact details')).toHaveAttribute('aria-selected', 'true');
    expect(location()).toHaveTextContent('/cms/contact?tab=amrut');
    expect(screen.getByRole('heading', { name: /AMRUT contact details/ })).toBeInTheDocument();

    expect(fields()).toEqual(['Organisation name', 'Address', 'Email', 'Phone', 'Website']);
    expect(bodyRows().map((r) => cellText(r, 0))).toEqual(['1', '2', '3', '4', '5']);
    /* An empty value is a dash; single-language values once, bilingual ones Marathi first. */
    expect(cellText(row('Website'), 2)).toBe('—');
    expect(within(row('Email')).getByText('info@example.org')).toBeInTheDocument();
    expect(within(row('Phone')).getByText('+91 97301 51450')).toBeInTheDocument();
    expect(within(row('Address')).getByText('पुणे कार्यालय')).toHaveAttribute('lang', 'mr');
    expect(within(row('Address')).getByText('Pune office')).toBeInTheDocument();
    expect(within(row('Organisation name')).getByText('अमृत')).toHaveAttribute('lang', 'mr');
    expect(within(row('Organisation name')).getByText('AMRUT')).toBeInTheDocument();
  });

  it('opens the Implementation partner tab from the URL', async () => {
    renderAt('/cms/contact?tab=partner');

    expect(await screen.findByRole('tab', { name: 'Implementation partner' })).toHaveAttribute('aria-selected', 'true');
    expect(fields()).toEqual(['Organisation name', 'Role', 'Programme desk', 'Helpdesk hours']);
    expect(within(row('Programme desk')).getByText('desk@example.org')).toBeInTheDocument();
    expect(within(row('Role')).getByText('Programme delivery')).toBeInTheDocument();
    expect(screen.getByText('Mon to Sat')).toBeInTheDocument();
    expect(screen.getByText('सोम ते शनि')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Partner Organisation')).toBeInTheDocument();
  });

  it('flags an inactive card on its tab and table', async () => {
    svc.get.mockResolvedValue(contactPage({ organizations: [AMRUT, { ...PARTNER, isActive: false }] }));
    renderAt('/cms/contact?tab=partner');

    await screen.findByRole('tab', { name: 'Implementation partner' });
    expect(within(panel()).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Hidden: this card is not sent to the website.')).toBeInTheDocument();
    expect(within(panel()).getByRole('table')).toBeInTheDocument();
    expect(fields()).toEqual(['Organisation name', 'Role', 'Programme desk', 'Helpdesk hours']);
  });

  it('says so when a card is not configured', async () => {
    svc.get.mockResolvedValue(contactPage({ organizations: [PARTNER] }));
    renderAt('/cms/contact?tab=amrut');

    await screen.findByRole('tab', { name: 'AMRUT contact details' });
    expect(screen.getByText('This card is not configured.')).toBeInTheDocument();
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument();
  });

  it('says so on both card tabs when neither card is configured', async () => {
    svc.get.mockResolvedValue(contactPage({ organizations: [] }));
    renderAt();

    await userEvent.click(await screen.findByRole('tab', { name: 'AMRUT contact details' }));
    expect(within(panel()).getByText('This card is not configured.')).toBeInTheDocument();
    await userEvent.click(tab('Implementation partner'));
    expect(within(panel()).getByText('This card is not configured.')).toBeInTheDocument();
  });

  it('shows the Helpline & WhatsApp details, saying what a blank number or message falls back to', async () => {
    renderAt('/cms/contact?tab=helpline');

    expect(await screen.findByRole('tab', { name: 'Helpline & WhatsApp' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByRole('heading', { name: /Helpline & WhatsApp/ })).toBeInTheDocument();
    expect(fields()).toEqual(['WhatsApp number', 'Pre-filled message', 'Phone', 'Email', 'Hours', 'Implementation Partner']);
    /* Neither set: the button uses the AMRUT card's phone and the website's own message. */
    expect(cellText(row('WhatsApp number'), 2)).toBe('Not set: the AMRUT phone number (+91 97301 51450) is used.');
    expect(cellText(row('Pre-filled message'), 2)).toBe('Not set: the website’s default message is used.');
    /* The Helpline popup has no fields of its own: the card says where it reads from. */
    expect(within(panel()).getByText(/The Helpline popup shows the AMRUT phone and email \(AMRUT contact details tab\)/)).toBeInTheDocument();
    /* Saved with the banner and the cards, so it shares their time. */
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('lists the Programme Helpline popup’s four values with where each is edited', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=helpline');

    expect(await within(await openPanel()).findByRole('heading', { name: /Programme Helpline/ })).toBeInTheDocument();
    /* Phone and email from the AMRUT card, hours and name from the partner card, both languages where there are two. */
    expect(cellText(row('Phone'), 2)).toBe('+91 97301 51450');
    expect(cellText(row('Email'), 2)).toBe('info@example.org');
    expect(within(row('Hours')).getByText('सोम ते शनि')).toBeInTheDocument();
    expect(within(row('Hours')).getByText('Mon to Sat')).toBeInTheDocument();
    expect(within(row('Implementation Partner')).getByText('भागीदार संस्था')).toBeInTheDocument();
    expect(within(row('Implementation Partner')).getByText('Partner Organisation')).toBeInTheDocument();

    await userEvent.click(within(panel()).getByRole('button', { name: 'Edit phone & email' }));
    expect(location()).toHaveTextContent('/cms/contact/amrut/edit');
  });

  it('opens the partner card’s Edit page for the Helpline hours and partner name', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=helpline');

    await userEvent.click(await within(await openPanel()).findByRole('button', { name: 'Edit hours & partner' }));
    expect(location()).toHaveTextContent('/cms/contact/partner/edit');
  });

  it('says when a hidden card leaves the Helpline popup on the built-in values', async () => {
    svc.get.mockResolvedValue(contactPage({ organizations: [{ ...AMRUT, isActive: false }, PARTNER] }));
    renderAt('/cms/contact?tab=helpline');

    await within(await openPanel()).findByRole('heading', { name: /Programme Helpline/ });
    expect(within(panel()).getByText(/The AMRUT contact details card is hidden/)).toBeInTheDocument();
    expect(cellText(row('Phone'), 2)).toBe('Not set: the website’s built-in phone number is used.');
    expect(within(row('Hours')).getByText('Mon to Sat')).toBeInTheDocument();
  });

  it('shows a saved WhatsApp number and message, Marathi first', async () => {
    svc.get.mockResolvedValue(
      contactPage({ whatsappNumber: '919876543210', whatsappMessage: { mr: 'नमस्कार, माहिती हवी आहे.', en: 'Hello, I would like to know more.' } }),
    );
    renderAt('/cms/contact?tab=helpline');

    await screen.findByRole('tab', { name: 'Helpline & WhatsApp' });
    expect(cellText(row('WhatsApp number'), 2)).toBe('919876543210');
    expect(within(row('Pre-filled message')).getByText('नमस्कार, माहिती हवी आहे.')).toHaveAttribute('lang', 'mr');
    expect(within(row('Pre-filled message')).getByText('Hello, I would like to know more.')).toBeInTheDocument();
  });

  it.each([
    ['page', 'Page information', '/cms/contact/page/edit'],
    ['amrut', 'AMRUT contact details', '/cms/contact/amrut/edit'],
    ['partner', 'Implementation partner', '/cms/contact/partner/edit'],
    ['helpline', 'Helpline & WhatsApp', '/cms/contact/helpline/edit'],
  ])('opens the %s section on its own Edit page from the Edit button on its tab', async (key, name, target) => {
    permissions.add('updateContactPage');
    renderAt(`/cms/contact?tab=${key}`);

    expect(await screen.findByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    /* No single "Edit content" button for the whole page any more. */
    expect(screen.queryByRole('button', { name: 'Edit content' })).not.toBeInTheDocument();
    await userEvent.click(within(panel()).getByRole('button', { name: 'Edit' }));
    expect(location()).toHaveTextContent(target);
  });

  it('offers an Edit button even for a card that is not configured yet, so it can be filled in', async () => {
    permissions.add('updateContactPage');
    svc.get.mockResolvedValue(contactPage({ organizations: [PARTNER] }));
    renderAt('/cms/contact?tab=amrut');

    await userEvent.click(await within(await openPanel()).findByRole('button', { name: 'Edit' }));
    expect(location()).toHaveTextContent('/cms/contact/amrut/edit');
  });

  it('lists the coordinators on their tab, FAQ-style, in website order with their districts in the order saved', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('tab', { name: 'Division / cluster coordinators' }));

    expect(tab('Division / cluster coordinators')).toHaveAttribute('aria-selected', 'true');
    expect(location()).toHaveTextContent('/cms/contact?tab=coordinators');
    expect(within(panel()).getByRole('heading', { name: /Division \/ cluster coordinators/ })).toHaveTextContent('live from the backend');
    expect(await within(await openPanel()).findByText('Anita Patil')).toBeInTheDocument();
    expect(svc.listCoordinators).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 15, search: '', sortBy: 'displayOrder', sortOrder: 'asc' }),
    );

    expect(headings()).toEqual(['Sr. No.', 'Order', 'Name', 'Districts covered', 'Status', 'Updated', 'Action']);
    expect(bodyRows().map((r) => cellText(r, 0))).toEqual(['1', '2']);
    expect(bodyRows().map((r) => cellText(r, 1))).toEqual(['1', '2']);

    const [anita, ravi] = bodyRows();
    /* The name with the phone and email underneath, as the FAQ question has its Marathi underneath. */
    expect(within(anita!).getByText('Anita Patil')).toHaveClass('lnk');
    expect(within(anita!).getByText('+91 98220 11111 · anita@example.org')).toBeInTheDocument();
    /* The districts in the order the API sent them, not re-sorted. */
    expect(cellText(anita!, 3)).toBe('Satara, Pune, Kolhapur');
    expect(within(anita!).getByText('Active')).toBeInTheDocument();
    /* No email shows the phone alone, no districts reads as a dash, and a hidden card shows as Inactive. */
    expect(within(ravi!).getByText('+91 98XXX 22222')).toBeInTheDocument();
    expect(cellText(ravi!, 3)).toBe('—');
    expect(within(ravi!).getByText('Inactive')).toBeInTheDocument();
    /* The view-only user gets the View button only. */
    expect(within(anita!).getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(within(anita!).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(anita!).queryByRole('switch')).not.toBeInTheDocument();
    expect(within(anita!).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    expect(within(panel()).getByText(/Showing/)).toHaveTextContent('Showing 1-2 of 2 records');
    expect(within(panel()).getByRole('combobox', { name: 'Rows per page' })).toHaveValue('15');
    /* Each row carries its own Updated time, so the page-wide one is not repeated here. */
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });

  it.each([
    ['View', '/cms/contact/coordinators/c1'],
    ['Edit', '/cms/contact/coordinators/c1/edit'],
  ])('opens a coordinator from its %s action', async (action, target) => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=coordinators');
    const anita = (await within(await openPanel()).findByText('Anita Patil')).closest('tr') as HTMLElement;

    await userEvent.click(within(anita).getByRole('button', { name: action }));
    expect(location()).toHaveTextContent(target);
  });

  it('opens a coordinator by clicking its row, for a user who may view it', async () => {
    permissions.add('viewContactPage');
    renderAt('/cms/contact?tab=coordinators');

    await userEvent.click(await within(await openPanel()).findByText('+91 98XXX 22222'));
    expect(location()).toHaveTextContent('/cms/contact/coordinators/c2');
  });

  it('switches a coordinator off after confirmation and reloads the list', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=coordinators');
    await within(await openPanel()).findByText('Anita Patil');

    await userEvent.click(screen.getByRole('switch', { name: 'Anita Patil: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Deactivate "Anita Patil"? The card will no longer be shown on the public Contact page.');
    expect(svc.setCoordinatorStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));

    expect(svc.setCoordinatorStatus).toHaveBeenCalledWith('c1', false);
    await waitFor(() => expect(toasts()).toHaveTextContent('Coordinator deactivated'));
    await waitFor(() => expect(svc.listCoordinators).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks before deleting a coordinator, and deletes it only once confirmed', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=coordinators');
    const anita = (await within(await openPanel()).findByText('Anita Patil')).closest('tr') as HTMLElement;

    await userEvent.click(within(anita).getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/Delete "Anita Patil"\? The card is removed from the public Contact page/);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(svc.removeCoordinator).not.toHaveBeenCalled();

    await userEvent.click(within(anita).getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(svc.removeCoordinator).toHaveBeenCalledWith('c1');
    await waitFor(() => expect(toasts()).toHaveTextContent('Coordinator deleted'));
    await waitFor(() => expect(svc.listCoordinators).toHaveBeenCalledTimes(2));
  });

  it('searches, sorts and pages the coordinators on the backend', async () => {
    svc.listCoordinators.mockResolvedValue(listPage(COORDINATORS, { total: 20, totalPages: 2 }));
    renderAt('/cms/contact?tab=coordinators');
    await within(await openPanel()).findByText('Anita Patil');
    expect(within(panel()).getByText(/Showing/)).toHaveTextContent('Showing 1-15 of 20 records');

    await userEvent.click(within(panel()).getByRole('button', { name: '2' }));
    await waitFor(() => expect(svc.listCoordinators).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    await userEvent.click(within(panel()).getByRole('columnheader', { name: /Name/ }));
    await waitFor(() =>
      expect(svc.listCoordinators).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'name', sortOrder: 'asc', page: 1 })),
    );

    await userEvent.type(within(panel()).getByPlaceholderText('Search name, phone or district...'), 'Satara');
    await waitFor(() =>
      expect(svc.listCoordinators).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Satara', page: 1, sortBy: 'name' })),
    );
    expect(await within(await openPanel()).findByText('filtered')).toBeInTheDocument();

    await userEvent.selectOptions(within(panel()).getByRole('combobox', { name: 'Rows per page' }), '25');
    await waitFor(() => expect(svc.listCoordinators).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 25, page: 1 })));
  });

  it('shows the district offices from the URL, with the district code under the name and a dash for each blank field', async () => {
    renderAt('/cms/contact?tab=offices');

    expect(await screen.findByRole('tab', { name: 'District offices' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByRole('heading', { name: /District offices/ })).toHaveTextContent('live from the backend');
    expect(await within(await openPanel()).findByText('Dr. S. Deshmukh')).toBeInTheDocument();
    expect(svc.listDistrictOffices).toHaveBeenCalledWith(expect.objectContaining({ page: 1, sortBy: 'district', sortOrder: 'asc' }));

    expect(headings()).toEqual(['Sr. No.', 'District', 'District Coordinator', 'Phone / Email', 'Office hours', 'Status', 'Updated', 'Action']);
    expect(bodyRows().map((r) => cellText(r, 0))).toEqual(['1', '2']);

    const [pune, kolhapur] = bodyRows();
    expect(within(pune!).getByText('Pune')).toHaveClass('lnk');
    expect(within(pune!).getByText('D1')).toBeInTheDocument();
    /* The District Coordinator in both languages, Marathi first. */
    expect(cellText(pune!, 2)).toBe('डॉ. एस. देशमुखDr. S. Deshmukh');
    expect(within(pune!).getByText('डॉ. एस. देशमुख')).toHaveAttribute('lang', 'mr');
    expect(within(pune!).getByText('Dr. S. Deshmukh')).toHaveAttribute('lang', 'en');
    expect(within(pune!).getByText('020 2612 3456')).toBeInTheDocument();
    expect(within(pune!).getByText('collector.pune@example.org')).toBeInTheDocument();
    /* Bilingual hours Marathi first, English underneath. */
    expect(within(pune!).getByText('सोम ते शुक्र')).toHaveAttribute('lang', 'mr');
    expect(within(pune!).getByText('Mon to Fri')).toBeInTheDocument();
    expect(within(pune!).getByText('Active')).toBeInTheDocument();

    /* Every optional field left blank reads as a dash, never "null" or an empty cell. */
    expect([2, 3, 4].map((c) => cellText(kolhapur!, c))).toEqual(['—', '—', '—']);
    expect(within(kolhapur!).getByText('Inactive')).toBeInTheDocument();
  });

  it('switches on and deletes a district office from its row, each after confirmation', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=offices');
    const kolhapur = (await within(await openPanel()).findByText('Kolhapur')).closest('tr') as HTMLElement;

    await userEvent.click(within(kolhapur).getByRole('switch', { name: 'Kolhapur: inactive' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Activate the Kolhapur district office?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, activate' }));
    expect(svc.setDistrictOfficeStatus).toHaveBeenCalledWith('f2', true);
    await waitFor(() => expect(toasts()).toHaveTextContent('District office activated'));

    await userEvent.click(within(kolhapur).getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete the Kolhapur district office?');
    expect(svc.removeDistrictOffice).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(svc.removeDistrictOffice).toHaveBeenCalledWith('f2');
    await waitFor(() => expect(toasts()).toHaveTextContent('District office deleted'));
    await waitFor(() => expect(svc.listDistrictOffices).toHaveBeenCalledTimes(3));
  });

  it.each([
    ['View', '/cms/contact/offices/f2'],
    ['Edit', '/cms/contact/offices/f2/edit'],
  ])('opens a district office from its %s action', async (action, target) => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=offices');
    const kolhapur = (await within(await openPanel()).findByText('Kolhapur')).closest('tr') as HTMLElement;

    await userEvent.click(within(kolhapur).getByRole('button', { name: action }));
    expect(location()).toHaveTextContent(target);
  });

  it('searches and sorts the district offices on the backend', async () => {
    renderAt('/cms/contact?tab=offices');
    await within(await openPanel()).findByText('Dr. S. Deshmukh');

    await userEvent.click(within(panel()).getByRole('columnheader', { name: /District Coordinator/ }));
    await waitFor(() =>
      expect(svc.listDistrictOffices).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'collectorName', sortOrder: 'asc' })),
    );
    await userEvent.type(within(panel()).getByPlaceholderText('Search district, coordinator, phone or email...'), 'pune');
    await waitFor(() => expect(svc.listDistrictOffices).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'pune', page: 1 })));
  });

  it('gives the empty-state messages when no coordinators or district offices are added', async () => {
    svc.listCoordinators.mockResolvedValue(listPage([]));
    svc.listDistrictOffices.mockResolvedValue(listPage([]));
    renderAt('/cms/contact?tab=coordinators');

    expect(await within(await openPanel()).findByText(/No coordinators have been added yet, so the website shows its built-in list/)).toBeInTheDocument();
    expect(within(panel()).getByText(/Showing/)).toHaveTextContent('Showing 0-0 of 0 records');

    await userEvent.click(tab('District offices'));
    expect(location()).toHaveTextContent('/cms/contact?tab=offices');
    expect(
      await within(await openPanel()).findByText(/No district offices have been added yet, so each district page shows no District Office Coordinator details/),
    ).toBeInTheDocument();
  });

  it('offers no Add buttons on the list tabs to a view-only user', async () => {
    renderAt('/cms/contact?tab=coordinators');
    await within(await openPanel()).findByText('Anita Patil');
    expect(screen.queryByRole('button', { name: 'Add coordinator' })).not.toBeInTheDocument();

    await userEvent.click(tab('District offices'));
    await within(await openPanel()).findByText('Dr. S. Deshmukh');
    expect(screen.queryByRole('button', { name: 'Add district office' })).not.toBeInTheDocument();
  });

  it('opens Add coordinator from its tab', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=coordinators');

    await userEvent.click(await within(await openPanel()).findByRole('button', { name: 'Add coordinator' }));
    expect(location()).toHaveTextContent('/cms/contact/coordinators/create');
  });

  it('opens Add district office from its tab', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=offices');

    await userEvent.click(await screen.findByRole('button', { name: 'Add district office' }));
    expect(location()).toHaveTextContent('/cms/contact/offices/create');
  });

  it('moves between tabs with the arrow, Home and End keys, as on the Modules page', async () => {
    renderAt();
    await screen.findByRole('tab', { name: 'Page information' });
    /* One tab stop: only the open tab is reachable with Tab. */
    expect(tab('Page information')).toHaveAttribute('tabindex', '0');
    expect(tab('AMRUT contact details')).toHaveAttribute('tabindex', '-1');

    tab('Page information').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('AMRUT contact details')).toHaveAttribute('aria-selected', 'true');
    expect(tab('AMRUT contact details')).toHaveFocus();
    expect(location()).toHaveTextContent('/cms/contact?tab=amrut');

    await userEvent.keyboard('{End}');
    expect(tab('Training centres')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Page information')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab('Training centres')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(tab('Page information')).toHaveAttribute('aria-selected', 'true');
    expect(fields()).toEqual(['Page title', 'Page subtitle']);
  });

  it('warns that an unpublished page is not live, and publishes it', async () => {
    permissions.add('updateContactPage');
    svc.get.mockResolvedValue(contactPage({ isPublished: false }));
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    expect(screen.getByText('This content is not published')).toBeInTheDocument();
    /* The warning sits above the tabs, so it stays on every tab. */
    await userEvent.click(tab('AMRUT contact details'));
    expect(screen.getByText('This content is not published')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(svc.setPublished).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toasts()).toHaveTextContent('Contact page published'));
    await waitFor(() => expect(svc.get).toHaveBeenCalledTimes(2));
  });

  it('unpublishes a published page', async () => {
    permissions.add('updateContactPage');
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    expect(screen.queryByText('This content is not published')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(svc.setPublished).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toasts()).toHaveTextContent('Contact page unpublished'));
    await waitFor(() => expect(svc.get).toHaveBeenCalledTimes(2));
  });

  it('offers no Publish, Unpublish or Edit actions to a view-only user', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    await userEvent.click(tab('AMRUT contact details'));
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('hides the District offices section after asking, from its tab, and reloads the page', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=offices');

    const bar = within(await openPanel());
    const toggle = await bar.findByRole('switch', { name: 'Show on website' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(bar.getByText('Shown on the website')).toBeInTheDocument();

    await userEvent.click(toggle);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Hide District offices from the website?');
    expect(svc.setDistrictOfficesSection).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));

    expect(svc.setDistrictOfficesSection).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toasts()).toHaveTextContent('District offices are now hidden on the website'));
    await waitFor(() => expect(svc.get).toHaveBeenCalledTimes(2));
    /* The page's publication is a different switch, untouched. */
    expect(svc.setPublished).not.toHaveBeenCalled();
  });

  it('shows a hidden District offices section again without asking', async () => {
    permissions.add('updateContactPage');
    svc.get.mockResolvedValue(contactPage({ showDistrictOffices: false }));
    renderAt('/cms/contact?tab=offices');

    const toggle = await within(await openPanel()).findByRole('switch', { name: 'Show on website' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(within(panel()).getByText('Hidden from the website')).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(svc.setDistrictOfficesSection).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toasts()).toHaveTextContent('District offices are now shown on the website'));
  });

  it('gives a view-only user the District offices state, not the switch', async () => {
    svc.get.mockResolvedValue(contactPage({ showDistrictOffices: false }));
    renderAt('/cms/contact?tab=offices');

    const open = within(await openPanel());
    expect(await open.findByText('Hidden')).toBeInTheDocument();
    expect(open.queryByRole('switch', { name: 'Show on website' })).not.toBeInTheDocument();
  });

  it('says the District offices switch waits for publishing while the page is unpublished', async () => {
    permissions.add('updateContactPage');
    svc.get.mockResolvedValue(contactPage({ isPublished: false }));
    renderAt('/cms/contact?tab=offices');

    expect(await within(await openPanel()).findByText(/This switch applies once it is published/)).toBeInTheDocument();
  });

  it('shows a load error with a retry, and no tabs until the page loads', async () => {
    svc.get.mockRejectedValueOnce(new Error('down'));
    renderAt();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('tab', { name: 'Page information' })).toBeInTheDocument();
    expect(svc.get).toHaveBeenCalledTimes(2);
  });
});
