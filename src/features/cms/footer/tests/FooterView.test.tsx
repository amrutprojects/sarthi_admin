import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import FooterView from '../pages/FooterView';
import { footerService } from '../services/footerService';
import type { ApiFooter, ApiFooterLink } from '../types/footer.types';

/* The screen's collaborators are replaced at their public boundaries: the auth guard and the API service. */
const permissions = new Set<string>();
/* FooterView imports Can from this exact path (not the modules/auth index), so this is the one to replace. */
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/footerService', () => ({ footerService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() } }));

const AT = '2026-10-22T10:00:00.000Z';

const link = (over: Partial<ApiFooterLink>): ApiFooterLink => ({
  id: 'l1',
  kind: 'INTERNAL',
  label: { mr: 'मुख्यपृष्ठ', en: 'Home' },
  href: '/home',
  displayOrder: 1,
  isActive: true,
  ...over,
});

const footerData = (over: Partial<ApiFooter> = {}): ApiFooter => ({
  id: 'f1',
  about: {
    heading: { mr: 'अमृत विषयी', en: 'About AMRUT' },
    body: { mr: 'कौशल्य विकास कार्यक्रम.', en: 'A skill development programme.' },
    partnerLabel: { mr: 'अंमलबजावणी भागीदार', en: 'Implementation partner' },
    partnerName: 'SUMAGO Infotech',
  },
  linkColumns: [
    {
      id: 'c1',
      heading: { mr: 'दुवे', en: 'Quick links' },
      displayOrder: 1,
      isActive: true,
      links: [
        link({}),
        link({ id: 'l2', kind: 'EXTERNAL', label: { mr: 'पोर्टल', en: 'Portal' }, href: 'https://example.org/portal', displayOrder: 2 }),
        link({ id: 'l3', kind: 'UNAVAILABLE', label: { mr: 'लवकरच', en: 'Coming soon' }, href: null, displayOrder: 3, isActive: false }),
      ],
    },
    { id: 'c2', heading: { mr: 'मदत', en: 'Help' }, displayOrder: 2, isActive: false, links: [] },
  ],
  contact: {
    heading: { mr: 'संपर्क', en: 'Contact' },
    address: { mr: 'पुणे', en: 'Pune' },
    email: 'info@example.org',
    phone: '+91 97301 51450',
    links: [link({ id: 'l4', kind: 'TEXT', label: { mr: 'सोम ते शनि', en: 'Mon to Sat' }, href: null })],
  },
  bottom: {
    copyright: { mr: '© {year} अमृत', en: '© {year} AMRUT' },
    disclaimer: { mr: 'अस्वीकरण', en: 'Disclaimer text' },
  },
  isPublished: true,
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

/* Shows where the screen has navigated to, so tab and link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route = '/cms/footer') =>
  renderWithProviders(
    <>
      <FooterView />
      <Location />
    </>,
    { route },
  );

const tab = (name: string) => screen.getByRole('tab', { name });
const panel = () => screen.getByRole('tabpanel');
const headers = (table: HTMLElement) =>
  within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent);
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1);
const cellText = (row: HTMLElement, col: number) => within(row).getAllByRole('cell')[col].textContent;
/* The Field column of the tab's first table. */
const fields = () => bodyRows(within(panel()).getAllByRole('table')[0]).map((r) => cellText(r, 1));
const toasts = () => document.getElementById('toast-root') as HTMLElement;

describe('<FooterView> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(footerService.get).mockReset().mockResolvedValue(footerData());
    vi.mocked(footerService.setPublished).mockReset().mockResolvedValue(footerData());
    /* The panel shell's toast container, which the publish toasts are appended to. */
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
  });

  it('opens on the About column, with one tab per part of the public footer', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'About column' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['About column', 'Link columns', 'Contact column', 'Bottom bar']);
    expect(tab('About column')).toHaveAttribute('aria-selected', 'true');
    /* The panel's standard tab strip, as on Modules Page Management, each tab naming the panel it opens. */
    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs-fit');
    expect(tab('About column')).toHaveAttribute('aria-controls', panel().id);

    const table = within(panel()).getByRole('table');
    expect(headers(table)).toEqual(['Sr. No.', 'Field', 'Content']);
    expect(fields()).toEqual(['Heading', 'About text', 'Partner label', 'Partner name']);
    expect(screen.getByText('अमृत विषयी')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('About AMRUT')).toBeInTheDocument();
    expect(screen.getByText('कौशल्य विकास कार्यक्रम.')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('SUMAGO Infotech')).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(document.querySelector('.kpi')).toBeNull();
    expect(footerService.get).toHaveBeenCalledTimes(1);
  });

  it('falls back to the About column for an unknown tab', async () => {
    renderAt('/cms/footer?tab=nonsense');
    expect(await screen.findByRole('tab', { name: 'About column' })).toHaveAttribute('aria-selected', 'true');
    expect(fields()).toEqual(['Heading', 'About text', 'Partner label', 'Partner name']);
  });

  it('lists each link column with its heading and lines, and keeps the tab in the URL', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('tab', { name: 'Link columns' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cms/footer?tab=links');
    expect(within(panel()).getByRole('heading', { name: 'Link column 1' })).toBeInTheDocument();
    expect(within(panel()).getByRole('heading', { name: 'Link column 2' })).toBeInTheDocument();
    expect(screen.getByText('दुवे')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Quick links')).toBeInTheDocument();

    const [lines] = within(panel()).getAllByRole('table');
    expect(headers(lines)).toEqual(['Sr. No.', 'Line', 'Type', 'Link', 'Status']);
    const rows = bodyRows(lines);
    expect(rows.map((r) => cellText(r, 0))).toEqual(['1', '2', '3']);
    expect(rows.map((r) => cellText(r, 2))).toEqual(['Page on this site', 'External website', 'Not available yet']);
    expect(cellText(rows[0], 3)).toBe('/home');
    expect(cellText(rows[1], 3)).toBe('https://example.org/portal');
    /* A line with no destination shows a dash; an inactive line says so. */
    expect(cellText(rows[2], 3)).toBe('—');
    expect(within(rows[2]).getByText('Inactive')).toBeInTheDocument();
    expect(within(rows[0]).getByText('मुख्यपृष्ठ')).toHaveAttribute('lang', 'mr');
    /* The line and its link keep a minimum width, so a phone scrolls the table sideways instead of squeezing them. */
    expect(within(rows[0]).getAllByRole('cell')[1].firstElementChild).toHaveStyle({ minWidth: '9rem' });
    expect(within(rows[1]).getByText('https://example.org/portal')).toHaveStyle({ minWidth: '10rem', display: 'block' });

    /* The second column has no lines, and is inactive. */
    expect(screen.getByText('No lines.')).toBeInTheDocument();
    const second = within(panel()).getByRole('heading', { name: 'Link column 2' }).closest('.card') as HTMLElement;
    expect(within(second).getByText('Inactive')).toBeInTheDocument();
  });

  it('says so when no link column is configured', async () => {
    vi.mocked(footerService.get).mockResolvedValue(footerData({ linkColumns: [] }));
    renderAt('/cms/footer?tab=links');

    await screen.findByRole('tab', { name: 'Link columns' });
    expect(within(panel()).getByText('No link columns are configured.')).toBeInTheDocument();
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument();
  });

  it('opens the Contact column from the URL, with its extra lines', async () => {
    renderAt('/cms/footer?tab=contact');

    expect(await screen.findByRole('tab', { name: 'Contact column' })).toHaveAttribute('aria-selected', 'true');
    expect(fields()).toEqual(['Heading', 'Address', 'Email', 'Phone']);
    expect(screen.getByText('info@example.org')).toBeInTheDocument();
    expect(screen.getByText('+91 97301 51450')).toBeInTheDocument();
    expect(screen.getByText('पुणे')).toHaveAttribute('lang', 'mr');

    const extra = within(panel()).getAllByRole('table')[1];
    expect(headers(extra)).toEqual(['Sr. No.', 'Line', 'Type', 'Link', 'Status']);
    expect(cellText(bodyRows(extra)[0], 2)).toBe('Plain text');
    expect(within(extra).getByText('Mon to Sat')).toBeInTheDocument();
  });

  it('shows the bottom bar and how {year} is filled in', async () => {
    renderAt('/cms/footer?tab=bottom');

    await screen.findByRole('tab', { name: 'Bottom bar' });
    expect(fields()).toEqual(['Copyright', 'Disclaimer']);
    expect(screen.getByText('© {year} AMRUT')).toBeInTheDocument();
    expect(screen.getByText('Disclaimer text')).toBeInTheDocument();
    expect(screen.getByText(/in the copyright line is replaced with the current year/)).toBeInTheDocument();
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    renderAt();
    await screen.findByRole('tab', { name: 'About column' });
    expect(tab('About column')).toHaveAttribute('tabindex', '0');
    expect(tab('Link columns')).toHaveAttribute('tabindex', '-1');

    tab('About column').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Link columns')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Link columns')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(tab('Bottom bar')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('About column')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab('Bottom bar')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(tab('About column')).toHaveAttribute('aria-selected', 'true');
  });

  it('warns that an unpublished footer is not live, on every tab, and publishes it', async () => {
    permissions.add('updateFooter');
    vi.mocked(footerService.get).mockResolvedValue(footerData({ isPublished: false }));
    renderAt();

    await screen.findByRole('tab', { name: 'About column' });
    expect(screen.getByText('This content is not published')).toBeInTheDocument();
    await userEvent.click(tab('Bottom bar'));
    expect(screen.getByText('This content is not published')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(footerService.setPublished).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toasts()).toHaveTextContent('Footer published'));
    await waitFor(() => expect(footerService.get).toHaveBeenCalledTimes(2));
  });

  it('unpublishes a published footer', async () => {
    permissions.add('updateFooter');
    renderAt();

    await screen.findByRole('tab', { name: 'About column' });
    expect(screen.queryByText('This content is not published')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(footerService.setPublished).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toasts()).toHaveTextContent('Footer unpublished'));
    await waitFor(() => expect(footerService.get).toHaveBeenCalledTimes(2));
  });

  it('opens the edit form from Edit content', async () => {
    permissions.add('updateFooter');
    renderAt('/cms/footer?tab=contact');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit content' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/footer/edit');
  });

  it('offers no Publish, Unpublish or Edit actions to a view-only user', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'About column' });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit content' })).not.toBeInTheDocument();
  });

  it('shows a load error with a retry, and no tabs until the footer loads', async () => {
    vi.mocked(footerService.get).mockRejectedValueOnce(new Error('down'));
    renderAt();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('tab', { name: 'About column' })).toBeInTheDocument();
    expect(footerService.get).toHaveBeenCalledTimes(2);
  });
});
