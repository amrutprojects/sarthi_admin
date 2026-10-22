import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import EligibilityList from '../pages/EligibilityList';
import { eligibilityService } from '../services/eligibilityService';
import type { ApiEligibilityItem, ApiEligibilitySettings } from '../types/eligibility.types';

/* The screen's collaborators are replaced at their public boundaries: the auth module and the API service. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/eligibilityService', () => ({
  eligibilityService: { list: vi.fn(), count: vi.fn(), getSettings: vi.fn(), setStatus: vi.fn(), remove: vi.fn() },
}));

const AT = '2026-10-22T10:00:00.000Z';

const settings: ApiEligibilitySettings = {
  id: 's1',
  pageTitle: { mr: 'पात्रता', en: 'Eligibility' },
  pageSubtitle: { mr: 'कोण अर्ज करू शकतो', en: 'Who can apply' },
  criteriaHeading: { mr: 'पात्रता निकष', en: 'Eligibility criteria' },
  documentsHeading: { mr: 'आवश्यक कागदपत्रे', en: 'Required documents' },
  noteTitle: { mr: 'टीप', en: 'Note' },
  noteBody: { mr: 'सर्व कागदपत्रे मूळ असावीत.', en: 'All documents must be originals.' },
  createdAt: AT,
  updatedAt: AT,
};

const CRITERION: ApiEligibilityItem = {
  id: 'i1',
  kind: 'CRITERION',
  label: { mr: 'वय', en: 'Age' },
  value: { mr: '18 ते 45 वर्षे', en: '18 to 45 years' },
  displayOrder: 1,
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
};
const DOCUMENT: ApiEligibilityItem = {
  id: 'i2',
  kind: 'DOCUMENT',
  label: { mr: 'आधार कार्ड', en: 'Aadhaar card' },
  value: null,
  displayOrder: 1,
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
};

const page = (items: ApiEligibilityItem[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

/* Shows where the screen has navigated to, so tab and link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route = '/cms/eligibility') =>
  renderWithProviders(
    <>
      <EligibilityList />
      <Location />
    </>,
    { route },
  );

const tab = (name: string) => screen.getByRole('tab', { name });
const panel = () => screen.getByRole('tabpanel');
const toasts = () => document.getElementById('toast-root') as HTMLElement;

describe('<EligibilityList> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(eligibilityService.getSettings).mockReset().mockResolvedValue(settings);
    vi.mocked(eligibilityService.count).mockReset().mockResolvedValue(2);
    vi.mocked(eligibilityService.setStatus)
      .mockReset()
      .mockResolvedValue({ ...CRITERION, isActive: false });
    vi.mocked(eligibilityService.list)
      .mockReset()
      .mockImplementation(async (q) => page(q.kind === 'DOCUMENT' ? [DOCUMENT] : [CRITERION]));
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
  });

  it('opens on Page text, with the Modules-style tab strip and the page text as a table', async () => {
    renderAt();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Page text', 'Eligibility criteria', 'Required documents']);
    expect(tab('Page text')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs-fit');
    expect(tab('Page text')).toHaveAttribute('aria-controls', panel().id);

    const table = await within(panel()).findByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Sr. No.', 'Field', 'Content']);
    const fields = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell')[1].textContent);
    expect(fields).toEqual(['Page title', 'Page subtitle', 'Criteria heading', 'Documents heading', 'Note title', 'Note text']);
    expect(screen.getByText('पात्रता')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('All documents must be originals.')).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();

    /* The KPI row stays, counted by the backend; no list is loaded on this tab. */
    await waitFor(() => expect(eligibilityService.count).toHaveBeenCalledTimes(3));
    expect(eligibilityService.list).not.toHaveBeenCalled();
  });

  it('lists only the criteria on their tab, with their values, in website order, and keeps the tab in the URL', async () => {
    renderAt();
    await userEvent.click(tab('Eligibility criteria'));

    expect(await within(panel()).findByText('Age')).toBeInTheDocument();
    expect(within(panel()).getByText('18 to 45 years')).toBeInTheDocument();
    expect(within(panel()).getByText('18 ते 45 वर्षे')).toHaveAttribute('lang', 'mr');
    expect(screen.queryByText('Aadhaar card')).not.toBeInTheDocument();
    expect(eligibilityService.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'CRITERION', sortBy: 'displayOrder' }));
    expect(within(panel()).getByRole('columnheader', { name: /Value/ })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/eligibility?tab=criteria');
  });

  it('opens Required documents from the URL, without a Value column', async () => {
    renderAt('/cms/eligibility?tab=documents');

    expect(tab('Required documents')).toHaveAttribute('aria-selected', 'true');
    expect(await within(panel()).findByText('Aadhaar card')).toBeInTheDocument();
    expect(eligibilityService.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'DOCUMENT' }));
    expect(within(panel()).queryByRole('columnheader', { name: /Value/ })).not.toBeInTheDocument();
    expect(within(panel()).getByRole('columnheader', { name: /Document/ })).toBeInTheDocument();
  });

  it('opens a list tab from its KPI tile', async () => {
    renderAt();
    await userEvent.click(await screen.findByText('Required documents', { selector: '.kpi-t' }));

    expect(tab('Required documents')).toHaveAttribute('aria-selected', 'true');
    expect(await within(panel()).findByText('Aadhaar card')).toBeInTheDocument();
  });

  it('filters a list by status, keeping it to its own type', async () => {
    renderAt('/cms/eligibility?tab=criteria');
    await within(panel()).findByText('Age');

    await userEvent.selectOptions(within(panel()).getByRole('combobox', { name: /Status/ }), 'false');
    await waitFor(() =>
      expect(eligibilityService.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'CRITERION', status: 'false' })),
    );
  });

  it('deactivates a criterion after confirmation and refreshes the list and the totals', async () => {
    permissions.add('updateEligibility');
    renderAt('/cms/eligibility?tab=criteria');
    await within(panel()).findByText('Age');
    await waitFor(() => expect(eligibilityService.count).toHaveBeenCalledTimes(3));

    await userEvent.click(within(panel()).getByRole('switch'));
    expect(screen.getByText(/Deactivate "Age"\? It will no longer be shown in the eligibility criteria card/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, deactivate' }));

    expect(eligibilityService.setStatus).toHaveBeenCalledWith('i1', false);
    await waitFor(() => expect(toasts()).toHaveTextContent('Criterion deactivated'));
    await waitFor(() => expect(eligibilityService.count).toHaveBeenCalledTimes(6));
    expect(vi.mocked(eligibilityService.list).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('hides the Add and Edit page text actions from view-only users', async () => {
    renderAt();
    await within(panel()).findByRole('table');
    expect(screen.queryByRole('button', { name: /Add Criterion/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Document/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit page text/ })).not.toBeInTheDocument();
  });

  it('keeps the Add actions in the header on every tab and Edit page text on the Page text tab, for editors', async () => {
    permissions.add('createEligibility');
    permissions.add('updateEligibility');
    renderAt();

    /* Page text: both Add buttons sit in the header, outside the panel; Edit page text sits inside it. */
    expect(await within(panel()).findByRole('button', { name: /Edit page text/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Criterion/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Document/ })).toBeInTheDocument();
    expect(within(panel()).queryByRole('button', { name: /Add Criterion|Add Document/ })).not.toBeInTheDocument();

    /* A list tab keeps both Add buttons and drops Edit page text. */
    await userEvent.click(tab('Eligibility criteria'));
    await within(panel()).findByText('Age');
    expect(screen.getByRole('button', { name: /Add Criterion/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Document/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit page text/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Add Criterion/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/eligibility/create?kind=CRITERION');
  });

  it('opens Edit page text from the Page text tab', async () => {
    permissions.add('updateEligibility');
    renderAt();

    await userEvent.click(await within(panel()).findByRole('button', { name: /Edit page text/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/eligibility/page/edit');
  });

  it('opens Add Document from the header', async () => {
    permissions.add('createEligibility');
    renderAt('/cms/eligibility?tab=documents');

    await userEvent.click(screen.getByRole('button', { name: /Add Document/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/eligibility/create?kind=DOCUMENT');
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    renderAt();
    tab('Page text').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Eligibility criteria')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Eligibility criteria')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(tab('Required documents')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(tab('Page text')).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to Page text for an unknown tab', async () => {
    renderAt('/cms/eligibility?tab=nonsense');
    expect(tab('Page text')).toHaveAttribute('aria-selected', 'true');
    expect(await within(panel()).findByRole('table')).toBeInTheDocument();
  });
});
