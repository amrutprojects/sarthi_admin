import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import ContactView from '../pages/ContactView';
import { contactService } from '../services/contactService';
import type { ApiContactOrganization, ApiContactPage, ApiCoordinator, ApiDistrictOffice } from '../types/contact.types';

/* The screen's collaborators are replaced at their public boundaries: the auth guard and the API service. */
const permissions = new Set<string>();
/* ContactView imports Can from this exact path (not the modules/auth index), so this is the one to replace. */
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/contactService', () => ({ contactService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() } }));

const AT = '2026-10-22T10:00:00.000Z';

const AMRUT: ApiContactOrganization = {
  id: 'o1',
  orgType: 'AMRUT',
  name: { mr: 'अमृत', en: 'AMRUT' },
  role: null,
  address: { mr: 'पुणे कार्यालय', en: 'Pune office' },
  email: 'info@example.org',
  phone: '+91 97301 51450',
  websiteUrl: null,
  helpdeskHours: null,
  displayOrder: 1,
  isActive: true,
};

const PARTNER: ApiContactOrganization = {
  id: 'o2',
  orgType: 'IMPLEMENTATION_PARTNER',
  name: { mr: 'भागीदार संस्था', en: 'Partner Organisation' },
  role: { mr: 'कार्यक्रम अंमलबजावणी', en: 'Programme delivery' },
  address: null,
  email: 'desk@example.org',
  phone: null,
  websiteUrl: null,
  helpdeskHours: { mr: 'सोम ते शनि', en: 'Mon to Sat' },
  displayOrder: 2,
  isActive: true,
};

const district = (id: string, name: string) => ({ id, name, code: id.toUpperCase() });

/* Two coordinator cards: the districts are deliberately not alphabetical, so the order shown is the order sent. */
const COORDINATORS: ApiCoordinator[] = [
  {
    id: 'c1',
    name: 'Anita Patil',
    phone: '+91 98220 11111',
    email: 'anita@example.org',
    districts: [district('d3', 'Satara'), district('d1', 'Pune'), district('d2', 'Kolhapur')],
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'c2',
    name: 'Ravi Shinde',
    phone: '+91 98220 22222',
    email: null,
    districts: [],
    displayOrder: 2,
    isActive: false,
  },
];

/* One office filled in, one with every optional field blank. */
const OFFICES: ApiDistrictOffice[] = [
  {
    id: 'f1',
    district: district('d1', 'Pune'),
    collectorName: 'Dr. S. Deshmukh',
    address: { mr: 'जिल्हाधिकारी कार्यालय, पुणे', en: 'Collectorate, Pune' },
    phone: '020 2612 3456',
    email: 'collector.pune@example.org',
    officeHours: { mr: 'सोम ते शुक्र', en: 'Mon to Fri' },
    isActive: true,
  },
  {
    id: 'f2',
    district: district('d2', 'Kolhapur'),
    collectorName: null,
    address: null,
    phone: null,
    email: null,
    officeHours: null,
    isActive: false,
  },
];

const contactPage =(over: Partial<ApiContactPage> = {}): ApiContactPage => ({
  id: 'p1',
  pageTitle: { mr: 'संपर्क', en: 'Contact us' },
  pageSubtitle: { mr: 'आमच्याशी बोला', en: 'Talk to us' },
  isPublished: true,
  createdAt: AT,
  updatedAt: AT,
  organizations: [AMRUT, PARTNER],
  coordinators: [],
  districtOffices: [],
  ...over,
});

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
/* The body rows of the tab's table, and the Field / Sr. No. / Content text of each. */
const bodyRows = () => within(panel()).getAllByRole('row').slice(1);
const cellText = (row: HTMLElement, col: number) => within(row).getAllByRole('cell')[col].textContent;
const fields = () => bodyRows().map((r) => cellText(r, 1));
const row = (label: string) => bodyRows().find((r) => cellText(r, 1) === label) as HTMLElement;
const toasts = () => document.getElementById('toast-root') as HTMLElement;

describe('<ContactView> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(contactService.get).mockReset().mockResolvedValue(contactPage());
    vi.mocked(contactService.setPublished).mockReset().mockResolvedValue(contactPage());
    /* The panel shell's toast container, which the publish toasts are appended to. */
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
  });

  it('opens on Page information, with one tab per section of the public page', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    ['Page information', 'AMRUT contact details', 'Implementation partner', 'District / cluster coordinators', 'District offices'].forEach((name, i) =>
      expect(tabs[i]).toHaveAccessibleName(name),
    );
    expect(tab('Page information')).toHaveAttribute('aria-selected', 'true');
    /* The panel's standard tab strip, as on Modules Page Management, each tab naming the panel it opens. */
    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs-fit');
    expect(tab('Page information')).toHaveAttribute('aria-controls', panel().id);
    expect(panel()).toHaveAttribute('aria-labelledby', tab('Page information').id);

    /* The banner as a read-only table, both languages of each line. */
    expect(
      within(panel())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Sr. No.', 'Field', 'Content']);
    expect(fields()).toEqual(['Page title', 'Page subtitle']);
    expect(screen.getByText('संपर्क')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Contact us')).toBeInTheDocument();
    expect(screen.getByText('आमच्याशी बोला')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Talk to us')).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();

    /* No summary tiles above the tabs: the page opens straight on its sections. */
    expect(document.querySelector('.kpi')).toBeNull();
    expect(contactService.get).toHaveBeenCalledTimes(1);
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
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/contact?tab=amrut');
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
    vi.mocked(contactService.get).mockResolvedValue(contactPage({ organizations: [AMRUT, { ...PARTNER, isActive: false }] }));
    renderAt('/cms/contact?tab=partner');

    await screen.findByRole('tab', { name: 'Implementation partner' });
    expect(within(panel()).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Hidden: this card is not sent to the website.')).toBeInTheDocument();
    expect(within(panel()).getByRole('table')).toBeInTheDocument();
    expect(fields()).toEqual(['Organisation name', 'Role', 'Programme desk', 'Helpdesk hours']);
  });

  it('says so when a card is not configured', async () => {
    vi.mocked(contactService.get).mockResolvedValue(contactPage({ organizations: [PARTNER] }));
    renderAt('/cms/contact?tab=amrut');

    await screen.findByRole('tab', { name: 'AMRUT contact details' });
    expect(screen.getByText('This card is not configured.')).toBeInTheDocument();
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument();
  });

  it('says so on both card tabs when neither card is configured', async () => {
    vi.mocked(contactService.get).mockResolvedValue(contactPage({ organizations: [] }));
    renderAt();

    await userEvent.click(await screen.findByRole('tab', { name: 'AMRUT contact details' }));
    expect(within(panel()).getByText('This card is not configured.')).toBeInTheDocument();
    await userEvent.click(tab('Implementation partner'));
    expect(within(panel()).getByText('This card is not configured.')).toBeInTheDocument();
  });

  it('lists the coordinators on their tab in the order sent, each with its districts and status', async () => {
    vi.mocked(contactService.get).mockResolvedValue(contactPage({ coordinators: COORDINATORS }));
    renderAt();
    await userEvent.click(await screen.findByRole('tab', { name: 'District / cluster coordinators' }));

    expect(tab('District / cluster coordinators')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/contact?tab=coordinators');
    expect(within(panel()).getByRole('heading', { name: /District \/ cluster coordinators/ })).toHaveTextContent('2 on the page');
    expect(
      within(panel())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Sr. No.', 'Name', 'Phone', 'Email', 'Districts covered', 'Status']);
    expect(bodyRows().map((r) => cellText(r, 0))).toEqual(['1', '2']);
    expect(bodyRows().map((r) => cellText(r, 1))).toEqual(['Anita Patil', 'Ravi Shinde']);

    const [anita, ravi] = bodyRows();
    expect(cellText(anita, 2)).toBe('+91 98220 11111');
    expect(cellText(anita, 3)).toBe('anita@example.org');
    /* The districts in the order the API sent them, not re-sorted. */
    expect(cellText(anita, 4)).toBe('Satara, Pune, Kolhapur');
    expect(within(anita).getByText('Active')).toBeInTheDocument();
    /* No email and no districts read as dashes; a hidden card shows as Inactive. */
    expect(cellText(ravi, 3)).toBe('—');
    expect(cellText(ravi, 4)).toBe('—');
    expect(within(ravi).getByText('Inactive')).toBeInTheDocument();
    /* One save updates the whole page, so the time stays under this tab too. */
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('shows the district offices from the URL, with a dash for each blank field', async () => {
    vi.mocked(contactService.get).mockResolvedValue(contactPage({ districtOffices: OFFICES }));
    renderAt('/cms/contact?tab=offices');

    expect(await screen.findByRole('tab', { name: 'District offices' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByRole('heading', { name: /District offices/ })).toHaveTextContent('2 districts');
    expect(
      within(panel())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Sr. No.', 'District', 'District Collector', 'Address', 'Phone', 'Email', 'Office hours', 'Status']);
    expect(bodyRows().map((r) => cellText(r, 0))).toEqual(['1', '2']);
    expect(bodyRows().map((r) => cellText(r, 1))).toEqual(['Pune', 'Kolhapur']);

    const [pune, kolhapur] = bodyRows();
    expect(cellText(pune, 2)).toBe('Dr. S. Deshmukh');
    /* Bilingual fields Marathi first, English underneath. */
    expect(within(pune).getByText('जिल्हाधिकारी कार्यालय, पुणे')).toHaveAttribute('lang', 'mr');
    expect(within(pune).getByText('Collectorate, Pune')).toBeInTheDocument();
    expect(cellText(pune, 4)).toBe('020 2612 3456');
    expect(cellText(pune, 5)).toBe('collector.pune@example.org');
    expect(within(pune).getByText('सोम ते शुक्र')).toHaveAttribute('lang', 'mr');
    expect(within(pune).getByText('Mon to Fri')).toBeInTheDocument();
    expect(within(pune).getByText('Active')).toBeInTheDocument();

    /* Every optional field left blank reads as a dash, never "null" or an empty cell. */
    expect([2, 3, 4, 5, 6].map((c) => cellText(kolhapur, c))).toEqual(['—', '—', '—', '—', '—']);
    expect(within(kolhapur).getByText('Inactive')).toBeInTheDocument();
  });

  it('gives the empty-state hints when no coordinators or district offices are added', async () => {
    renderAt('/cms/contact?tab=coordinators');

    expect(await screen.findByRole('tab', { name: 'District / cluster coordinators' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByText('None added. The website shows its built-in coordinator list.')).toBeInTheDocument();
    expect(within(panel()).getByRole('heading', { name: /District \/ cluster coordinators/ })).toHaveTextContent('0 on the page');
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument();

    await userEvent.click(tab('District offices'));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/contact?tab=offices');
    expect(
      within(panel()).getByText('None added. Each district page shows “to be supplied from official records”.'),
    ).toBeInTheDocument();
    expect(within(panel()).getByRole('heading', { name: /District offices/ })).toHaveTextContent('0 districts');
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/contact?tab=amrut');

    await userEvent.keyboard('{End}');
    expect(tab('District offices')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Page information')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab('District offices')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(tab('Page information')).toHaveAttribute('aria-selected', 'true');
    expect(fields()).toEqual(['Page title', 'Page subtitle']);
  });

  it('warns that an unpublished page is not live, and publishes it', async () => {
    permissions.add('updateContactPage');
    vi.mocked(contactService.get).mockResolvedValue(contactPage({ isPublished: false }));
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    expect(screen.getByText('This content is not published')).toBeInTheDocument();
    /* The warning sits above the tabs, so it stays on every tab. */
    await userEvent.click(tab('AMRUT contact details'));
    expect(screen.getByText('This content is not published')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(contactService.setPublished).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toasts()).toHaveTextContent('Contact page published'));
    await waitFor(() => expect(contactService.get).toHaveBeenCalledTimes(2));
  });

  it('unpublishes a published page', async () => {
    permissions.add('updateContactPage');
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    expect(screen.queryByText('This content is not published')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(contactService.setPublished).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toasts()).toHaveTextContent('Contact page unpublished'));
    await waitFor(() => expect(contactService.get).toHaveBeenCalledTimes(2));
  });

  it('opens the edit form from Edit content', async () => {
    permissions.add('updateContactPage');
    renderAt('/cms/contact?tab=partner');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit content' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/contact/edit');
  });

  it('offers no Publish, Unpublish or Edit actions to a view-only user', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'Page information' });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit content' })).not.toBeInTheDocument();
  });

  it('shows a load error with a retry, and no tabs until the page loads', async () => {
    vi.mocked(contactService.get).mockRejectedValueOnce(new Error('down'));
    renderAt();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('tab', { name: 'Page information' })).toBeInTheDocument();
    expect(contactService.get).toHaveBeenCalledTimes(2);
  });
});
