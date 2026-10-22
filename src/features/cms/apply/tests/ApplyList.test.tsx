import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import ApplyList from '../pages/ApplyList';
import { applyService } from '../services/applyService';
import type { ApiApplyItem, ApiApplySettings } from '../types/apply.types';

/* The screen's collaborators are replaced at their public boundaries: the auth module and the API service. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/applyService', () => ({
  applyService: { list: vi.fn(), count: vi.fn(), getSettings: vi.fn(), publicDocuments: vi.fn() },
}));

const AT = '2026-10-22T10:00:00.000Z';

const settings: ApiApplySettings = {
  id: 's1',
  pageTitle: { mr: 'अर्ज कसा करावा', en: 'How to Apply' },
  pageSubtitle: { mr: 'नोंदणीपासून प्रवेशापर्यंतची संपूर्ण प्रक्रिया.', en: 'The complete process from registration to admission.' },
  noteTitle: { mr: 'महत्त्वाचे', en: 'Important' },
  noteBody: { mr: 'किमान 30 दिवस आधी अर्ज करावा.', en: 'Apply at least 30 days before.' },
  glanceHeading: { mr: 'लक्षात ठेवा', en: 'At a glance' },
  documentsHeading: { mr: 'आवश्यक कागदपत्रे', en: 'Documents to keep ready' },
  ctaText: { mr: 'अर्ज अधिकृत पोर्टलवर स्वीकारले जातात.', en: 'Applications are accepted on the portal.' },
  ctaLabel: { mr: 'Apply Now', en: 'Apply Now' },
  ctaUrl: 'https://app.mahaamrut.org.in/amrut-new/signup',
  ctaHint: { mr: 'ही लिंक नवीन टॅबमध्ये उघडेल', en: 'Opens in a new tab' },
  createdAt: AT,
  updatedAt: AT,
};

const item = (over: Partial<ApiApplyItem>): ApiApplyItem => ({
  id: 'i1',
  kind: 'STEP',
  label: { mr: 'ऑनलाइन अर्ज', en: 'Online application' },
  value: { mr: 'ऑनलाइन अर्ज करा.', en: 'Apply online.' },
  displayOrder: 1,
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

const STEP = item({});
const FACT = item({
  id: 'i2',
  kind: 'FACT',
  label: { mr: 'अनामत रक्कम', en: 'Security deposit' },
  value: { mr: '₹2,000 (परतावा योग्य)', en: '₹2,000 (refundable)' },
});
const DOCUMENTS = [
  { mr: 'आधार कार्ड', en: 'Aadhaar card' },
  { mr: 'छायाचित्र व स्वाक्षरी', en: 'Photograph and signature' },
];

const page = (items: ApiApplyItem[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

/* Shows where the screen has navigated to, so tab and link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route = '/cms/apply') =>
  renderWithProviders(
    <>
      <ApplyList />
      <Location />
    </>,
    { route },
  );

const TAB_NAMES = ['Page text', 'Application steps', 'At a glance', 'Documents to keep ready'];

const tab = (name: string) => screen.getByRole('tab', { name });
const panel = () => screen.getByRole('tabpanel');
/* The Page text card headed with a group's title. */
const card = async (title: string) =>
  (await within(panel()).findByRole('heading', { name: new RegExp(`^${title}`) })).closest('.card') as HTMLElement;
const headers = (table: HTMLElement) =>
  within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent);
/* The body rows of a table, without its header row. */
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1);

describe('<ApplyList> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(applyService.getSettings).mockReset().mockResolvedValue(settings);
    vi.mocked(applyService.publicDocuments).mockReset().mockResolvedValue(DOCUMENTS);
    vi.mocked(applyService.count).mockReset().mockResolvedValue(3);
    vi.mocked(applyService.list)
      .mockReset()
      .mockImplementation(async (q) => page(q.kind === 'FACT' ? [FACT] : [STEP]));
  });

  it('shows one tab per section of the public page in the Modules-style strip, opening on Page text', async () => {
    renderAt();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(TAB_NAMES);
    TAB_NAMES.forEach((name, i) => expect(tabs[i]).toHaveAccessibleName(name));
    expect(tab('Page text')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs-fit');
    expect(tab('Page text')).toHaveAttribute('aria-controls', panel().id);

    /* No count badges on the tabs, even once the totals have loaded: the KPI tiles carry them. */
    await waitFor(() => expect(applyService.count).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(screen.getByText('Documents to keep ready', { selector: '.kpi-t' }).parentElement).toHaveTextContent('2'));
    tabs.forEach((t) => expect(t.querySelector('.cnt')).toBeNull());

    /* No list on this tab. */
    expect(applyService.list).not.toHaveBeenCalled();
  });

  it('shows the page text as one table per place it appears on the website, Marathi first', async () => {
    renderAt();

    const expected: [string, string[]][] = [
      ['Page heading', ['Page title', 'Page subtitle']],
      ['Important note', ['Note title', 'Note text']],
      ['Apply box', ['Apply box text', 'Apply button label', 'Portal link', 'Apply button hint']],
      ['Card headings', ['At-a-glance heading', 'Documents heading']],
    ];
    for (const [title, fields] of expected) {
      const table = within(await card(title)).getByRole('table');
      expect(headers(table)).toEqual(['Sr. No.', 'Field', 'Content']);
      expect(bodyRows(table).map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(fields.map((_f, i) => String(i + 1)));
      expect(bodyRows(table).map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual(fields);
    }

    expect(within(await card('Page heading')).getByText('अर्ज कसा करावा')).toHaveAttribute('lang', 'mr');
    expect(within(await card('Page heading')).getByText('How to Apply')).toHaveAttribute('lang', 'en');
    /* The portal link, once for both languages, opens in a new tab. */
    expect(within(await card('Apply box')).getByRole('link', { name: settings.ctaUrl })).toHaveAttribute('target', '_blank');
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it('lists only the application steps on their tab, in website order, and keeps the tab in the URL', async () => {
    permissions.add('createApplyItem');
    renderAt();
    await userEvent.click(tab('Application steps'));

    expect(tab('Application steps')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Application steps')).toHaveAttribute('aria-controls', panel().id);
    expect(await within(panel()).findByText('Online application')).toBeInTheDocument();
    expect(screen.queryByText('Security deposit')).not.toBeInTheDocument();
    expect(applyService.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'STEP', sortBy: 'displayOrder', sortOrder: 'asc' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/apply?tab=steps');
    expect(
      within(panel())
        .getByText(/note shown under the steps/)
        .closest('.sec-note'),
    ).toHaveTextContent('The "Important" note shown under the steps is edited on the Page text tab.');

    /* The header action follows the tab. */
    expect(screen.getByRole('button', { name: /Add Step/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add At-a-glance Row/ })).not.toBeInTheDocument();
  });

  it('opens At a glance from the URL, with its card heading and its own Add button', async () => {
    permissions.add('createApplyItem');
    renderAt('/cms/apply?tab=facts');

    expect(tab('At a glance')).toHaveAttribute('aria-selected', 'true');
    expect(await within(panel()).findByText('Security deposit')).toBeInTheDocument();
    expect(screen.queryByText('Online application')).not.toBeInTheDocument();
    expect(applyService.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'FACT', sortBy: 'displayOrder' }));
    expect(await within(panel()).findByText('लक्षात ठेवा')).toBeInTheDocument();
    expect(within(panel()).getByText(/Card heading on the website/)).toHaveTextContent('change it on the Page text tab.');

    await userEvent.click(screen.getByRole('button', { name: /Add At-a-glance Row/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/apply/create?kind=FACT');
  });

  it('shows the documents list as the website does, as table rows, edited in Eligibility Page Management', async () => {
    permissions.add('viewEligibility');
    renderAt('/cms/apply?tab=documents');

    const table = await within(panel()).findByRole('table');
    expect(headers(table)).toEqual(['Sr. No.', 'Document']);
    const rows = bodyRows(table);
    expect(rows.map((r) => within(r).getAllByRole('cell')[0].textContent)).toEqual(['1', '2']);
    expect(rows.map((r) => within(r).getByText(/./, { selector: '[lang="en"]' }).textContent)).toEqual([
      'Aadhaar card',
      'Photograph and signature',
    ]);
    expect(within(rows[0]).getByText('आधार कार्ड')).toHaveAttribute('lang', 'mr');
    expect(within(panel()).getByText('2 listed')).toBeInTheDocument();
    expect(within(panel()).getByText('आवश्यक कागदपत्रे')).toBeInTheDocument();
    expect(within(panel()).getByText(/Edited in Eligibility Page Management/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Manage in Eligibility Page Management/ }));
    /* Straight to the Required documents tab, where the list is edited. */
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/eligibility?tab=documents');
  });

  it('says so when the website lists no documents', async () => {
    vi.mocked(applyService.publicDocuments).mockResolvedValue([]);
    renderAt('/cms/apply?tab=documents');

    expect(await within(panel()).findByText('No documents are listed')).toBeInTheDocument();
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument();
    expect(within(panel()).getByText('0 listed')).toBeInTheDocument();
    expect(within(panel()).getByText(/Edited in Eligibility Page Management/)).toBeInTheDocument();
  });

  it('opens a tab from its KPI tile', async () => {
    renderAt();
    await userEvent.click(await screen.findByText('At-a-glance rows', { selector: '.kpi-t' }));

    expect(tab('At a glance')).toHaveAttribute('aria-selected', 'true');
    expect(await within(panel()).findByText('Security deposit')).toBeInTheDocument();
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    renderAt();
    tab('Page text').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Application steps')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Application steps')).toHaveFocus();
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/apply?tab=steps');
    await userEvent.keyboard('{End}');
    expect(tab('Documents to keep ready')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Documents to keep ready')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(tab('Page text')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Page text')).toHaveFocus();
  });

  it('falls back to Page text for an unknown tab', async () => {
    renderAt('/cms/apply?tab=nonsense');
    expect(tab('Page text')).toHaveAttribute('aria-selected', 'true');
    expect(await within(panel()).findByRole('heading', { name: /Page heading/ })).toBeInTheDocument();
  });

  it('offers no Edit or Add actions to a view-only user', async () => {
    renderAt();
    await within(panel()).findByRole('heading', { name: /Page heading/ });
    expect(screen.queryByRole('button', { name: /Edit Page Text/ })).not.toBeInTheDocument();

    await userEvent.click(tab('Application steps'));
    await within(panel()).findByText('Online application');
    expect(screen.queryByRole('button', { name: /Add Step/ })).not.toBeInTheDocument();

    await userEvent.click(tab('Documents to keep ready'));
    await within(panel()).findByRole('table');
    expect(screen.queryByRole('button', { name: /Manage in Eligibility/ })).not.toBeInTheDocument();
  });

  it('shows the Edit Page Text action to an editor on the Page text tab', async () => {
    permissions.add('updateApplyPage');
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: /Edit Page Text/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/apply/page/edit');
  });
});
