import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import HighlightTab from '../components/HighlightTab';
import HighlightEdit from '../pages/HighlightEdit';
import HighlightForm, { toFormValues, toPayload } from '../pages/HighlightForm';
import { highlightService } from '../services/highlightService';
import type { ApiObjective, ApiProgrammeHighlight } from '../types/highlight.types';

/* The screen's collaborators are replaced at their public boundaries: the auth guard and the API service. */
const permissions = new Set<string>();
/* HighlightTab imports Can from this exact path (not the modules/auth index), so this is the one to replace. */
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/highlightService', () => ({
  highlightService: { get: vi.fn(), update: vi.fn(), setRowVisibility: vi.fn(), setRowLabel: vi.fn() },
}));

const AT = '2026-10-22T10:00:00.000Z';

const objective = (over: Partial<ApiObjective>): ApiObjective => ({
  id: 'o1',
  text: { mr: 'रोजगारक्षम कौशल्ये', en: 'Employable skills' },
  displayOrder: 0,
  isActive: true,
  ...over,
});

const highlightData = (over: Partial<ApiProgrammeHighlight> = {}): ApiProgrammeHighlight => ({
  id: 'h1',
  heading: { mr: 'अमृत कलश — कौशल्य कार्यक्रम', en: 'AMRUT Kalash — skills programme' },
  subheading: { mr: 'महाराष्ट्र संशोधन उन्नती', en: 'Maharashtra Research Upliftment' },
  tagline: { mr: 'तरुणांसाठी प्रशिक्षण.', en: 'Training for young people.' },
  certification: { mr: 'शासन मान्य प्रमाणपत्र', en: 'Government-recognised certificate' },
  objectives: [
    objective({}),
    objective({ id: 'o2', text: { mr: 'उद्योजकता', en: 'Entrepreneurship' }, displayOrder: 1 }),
    objective({ id: 'o3', text: { mr: 'जुने उद्दिष्ट', en: 'Retired objective' }, displayOrder: 2, isActive: false }),
  ],
  isPublished: true,
  hiddenRows: [],
  rowLabels: {},
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

/* Shows where the screen has navigated to, so link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

/* The Skill Development Diploma tab of Home Page Management, on its own. */
const renderTab = () =>
  renderWithProviders(
    <>
      <HighlightTab />
      <Location />
    </>,
    { route: '/cms/home-page?tab=diploma' },
  );

const headers = (table: HTMLElement) =>
  within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent);
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1);
const cellText = (row: HTMLElement, col: number) => within(row).getAllByRole('cell')[col].textContent;
/* A card of the tab, found by its heading. */
const card = (heading: RegExp) => screen.getByRole('heading', { name: heading }).closest('.card') as HTMLElement;

describe('<HighlightTab> — Skill Development Diploma', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(highlightService.get).mockReset().mockResolvedValue(highlightData());
  });

  it('shows the section text first, in both languages, with the section’s status', async () => {
    renderTab();

    await screen.findByRole('heading', { name: /Section text/ });
    expect(screen.getByText(/The programme band on the home page/)).toBeInTheDocument();
    const table = within(card(/Section text/)).getByRole('table');
    expect(headers(table)).toEqual(['Sr. No.', 'Field', 'Content']);
    expect(bodyRows(table).map((r) => cellText(r, 0))).toEqual(['1', '2', '3', '4']);
    expect(bodyRows(table).map((r) => cellText(r, 1))).toEqual(['Heading', 'Subheading', 'Tagline', 'Certification']);
    expect(screen.getByText('अमृत कलश — कौशल्य कार्यक्रम')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('AMRUT Kalash — skills programme')).toHaveAttribute('lang', 'en');
    expect(screen.getByText('महाराष्ट्र संशोधन उन्नती')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Maharashtra Research Upliftment')).toBeInTheDocument();
    expect(screen.getByText('तरुणांसाठी प्रशिक्षण.')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Training for young people.')).toBeInTheDocument();
    expect(screen.getByText('शासन मान्य प्रमाणपत्र')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Government-recognised certificate')).toBeInTheDocument();
    /* The section's published state, on the card as before. */
    expect(within(card(/Section text/)).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Marathi is shown first, English underneath/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    /* The section is one tab of Home Page Management: no tab strip of its own. */
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(highlightService.get).toHaveBeenCalledTimes(1);
  });

  it('lists the objectives under the text, in website order with their status', async () => {
    renderTab();
    const heading = await screen.findByRole('heading', { name: /Objectives/ });
    expect(screen.getByRole('heading', { name: /Section text/ }).compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const objectives = card(/Objectives/);
    expect(within(objectives).getByText('3 listed')).toHaveClass('tag');
    const table = within(objectives).getByRole('table');
    expect(headers(table)).toEqual(['Sr. No.', 'Objective', 'Status']);
    const rows = bodyRows(table);
    expect(rows.map((r) => cellText(r, 0))).toEqual(['1', '2', '3']);
    expect(within(rows[0]).getByText('रोजगारक्षम कौशल्ये')).toHaveAttribute('lang', 'mr');
    expect(within(rows[0]).getByText('Employable skills')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Entrepreneurship')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Active')).toBeInTheDocument();
    /* An inactive objective is still listed, and says so. */
    expect(within(rows[2]).getByText('Retired objective')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Inactive')).toBeInTheDocument();
    /* The objective keeps a minimum width, so a phone scrolls the table sideways instead of squeezing it. */
    expect(within(rows[0]).getAllByRole('cell')[1].firstElementChild).toHaveStyle({ minWidth: '9rem' });
  });

  it('says so when no objective is listed', async () => {
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ objectives: [] }));
    renderTab();

    await screen.findByRole('heading', { name: /Objectives/ });
    const objectives = card(/Objectives/);
    expect(within(objectives).getByText('No objectives are listed.')).toBeInTheDocument();
    expect(within(objectives).getByText('0 listed')).toBeInTheDocument();
    expect(within(objectives).queryByRole('table')).not.toBeInTheDocument();
  });

  it('has no Publish button: the tab’s "Show on website" switch shows and hides the band', async () => {
    permissions.add('updateHighlight');
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ isPublished: false }));
    renderTab();

    await screen.findByRole('heading', { name: /Section text/ });
    /* The card still says the band is off the website… */
    expect(within(card(/Section text/)).getByText('Inactive')).toBeInTheDocument();
    /* …without a second switch, and without claiming the website shows a built-in copy meanwhile. */
    expect(screen.queryByRole('button', { name: /^(Publish|Unpublish)$/ })).not.toBeInTheDocument();
    expect(screen.queryByText('This content is not published')).not.toBeInTheDocument();
    expect(screen.queryByText(/built-in copy/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit content' })).toBeInTheDocument();
  });

  it('no longer offers a separate publish call', async () => {
    const actual = await vi.importActual<{ highlightService: object }>('../services/highlightService');
    expect(actual.highlightService).not.toHaveProperty('setPublished');
  });

  it('opens the edit form from Edit content', async () => {
    permissions.add('updateHighlight');
    renderTab();

    await userEvent.click(await screen.findByRole('button', { name: 'Edit content' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/highlight/edit');
  });

  it('offers no Edit action to a view-only user', async () => {
    renderTab();

    await screen.findByRole('heading', { name: /Section text/ });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit content' })).not.toBeInTheDocument();
  });

  it('shows a load error with a retry, and no content until the section loads', async () => {
    vi.mocked(highlightService.get).mockRejectedValueOnce(new Error('down'));
    renderTab();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Section text/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Section text/ })).toBeInTheDocument();
    expect(highlightService.get).toHaveBeenCalledTimes(2);
  });
});

/* The home page band's fact table, row by row: each row has its own Shown / Hidden switch. */
describe('<HighlightTab> fact table row switches', () => {
  const ROWS_EN = [
    'Total duration',
    'Ideal completion',
    'Candidature validity',
    'Per module',
    'Schedule',
    'Security deposit',
    'Certification',
  ];
  const ROWS_MR = ['एकूण कालावधी', 'आदर्श कालावधी', 'उमेदवारीची वैधता', 'प्रति मॉड्यूल', 'वेळापत्रक', 'अनामत रक्कम', 'प्रमाणपत्र'];
  const toasts = () => document.getElementById('toast-root') as HTMLElement;
  const switchOf = (english: string) => screen.getByRole('switch', { name: `Show ${english} in the home page fact table` });
  const rowsCard = () => card(/Fact table rows/);

  beforeEach(() => {
    permissions.clear();
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
    vi.mocked(highlightService.get).mockReset().mockResolvedValue(highlightData());
    vi.mocked(highlightService.setRowVisibility).mockReset();
  });

  it('lists all seven rows in website order, with Marathi, where each value comes from, and a switch', async () => {
    permissions.add('updateHighlight');
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });
    const table = within(rowsCard()).getByRole('table');
    expect(headers(table)).toEqual(['Sr. No.', 'Row', 'Value from', 'Status', 'Action']);
    const rows = bodyRows(table);
    expect(rows).toHaveLength(7);
    rows.forEach((row, i) => {
      expect(cellText(row, 0)).toBe(String(i + 1));
      expect(within(row).getByText(ROWS_EN[i]!)).toBeInTheDocument();
      expect(within(row).getByText(ROWS_MR[i]!)).toHaveAttribute('lang', 'mr');
      const toggle = within(row).getByRole('switch', { name: `Show ${ROWS_EN[i]} in the home page fact table` });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(toggle).toHaveClass('switch', 'on');
    });
    expect(rows.map((r) => cellText(r, 2)!.replace(/Also hidden.*/, ''))).toEqual([
      'Modules page',
      'Programme Page Management',
      'Programme Page Management',
      'Modules page',
      'Modules page',
      'Programme Page Management',
      'This section — Certification',
    ]);
    /* The four rows the Programme fact sheet's switches also hide say so. */
    const linked = rows.map((r) => /Also hidden when switched off in Programme Page Management → Fact sheet/.test(cellText(r, 2)!));
    expect(linked).toEqual([true, true, true, false, false, true, false]);
    expect(within(rowsCard()).getByText('7 of 7 shown')).toHaveClass('tag');
    /* The card comes after the objectives. */
    expect(screen.getByRole('heading', { name: /Objectives/ }).compareDocumentPosition(rowsCard())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('asks before hiding a row, then sends the PATCH and shows the section it answers with', async () => {
    permissions.add('updateHighlight');
    vi.mocked(highlightService.setRowVisibility).mockResolvedValue(highlightData({ hiddenRows: ['securityDeposit'] }));
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    await userEvent.click(switchOf('Security deposit'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Hide "Security deposit" from the home page fact table?');
    expect(dialog).toHaveTextContent('Its figure is not deleted');
    expect(highlightService.setRowVisibility).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Security deposit is now hidden from the home page fact table'));
    expect(highlightService.setRowVisibility).toHaveBeenCalledTimes(1);
    expect(highlightService.setRowVisibility).toHaveBeenCalledWith('securityDeposit', false);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    /* Refreshed from the PATCH answer, without a second GET. */
    expect(switchOf('Security deposit')).toHaveAttribute('aria-checked', 'false');
    expect(within(rowsCard()).getByText('6 of 7 shown')).toBeInTheDocument();
    expect(switchOf('Schedule')).toHaveAttribute('aria-checked', 'true');
    expect(highlightService.get).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the confirmation is cancelled', async () => {
    permissions.add('updateHighlight');
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    await userEvent.click(switchOf('Total duration'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(highlightService.setRowVisibility).not.toHaveBeenCalled();
    expect(switchOf('Total duration')).toHaveAttribute('aria-checked', 'true');
  });

  it('shows a hidden row again without asking', async () => {
    permissions.add('updateHighlight');
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ hiddenRows: ['totalDuration', 'certification'] }));
    vi.mocked(highlightService.setRowVisibility).mockResolvedValue(highlightData({ hiddenRows: ['totalDuration'] }));
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });
    expect(within(rowsCard()).getByText('5 of 7 shown')).toBeInTheDocument();
    expect(switchOf('Certification')).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(switchOf('Certification'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(toasts()).toHaveTextContent('Certification is now shown in the home page fact table'));
    expect(highlightService.setRowVisibility).toHaveBeenCalledWith('certification', true);
    await waitFor(() => expect(switchOf('Certification')).toHaveAttribute('aria-checked', 'true'));
    expect(switchOf('Total duration')).toHaveAttribute('aria-checked', 'false');
    expect(within(rowsCard()).getByText('6 of 7 shown')).toBeInTheDocument();
  });

  it('locks every switch while a change is on its way', async () => {
    permissions.add('updateHighlight');
    let answer!: (page: ApiProgrammeHighlight) => void;
    vi.mocked(highlightService.setRowVisibility).mockReturnValue(new Promise((resolve) => (answer = resolve)));
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ hiddenRows: ['schedule'] }));
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    await userEvent.click(switchOf('Schedule'));
    await waitFor(() => expect(switchOf('Per module')).toBeDisabled());
    screen.getAllByRole('switch').forEach((s) => expect(s).toBeDisabled());
    screen.getAllByRole('button', { name: /^Edit name of / }).forEach((b) => expect(b).toBeDisabled());
    answer(highlightData());
    await waitFor(() => expect(switchOf('Per module')).toBeEnabled());
    expect(switchOf('Schedule')).toHaveAttribute('aria-checked', 'true');
  });

  it('shows a refusal as the server sent it, and reloads so the switches show what the website has', async () => {
    permissions.add('updateHighlight');
    vi.mocked(highlightService.setRowVisibility).mockRejectedValue(new ApiError('You do not have permission to do this', 403, 'FORBIDDEN'));
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    await userEvent.click(switchOf('Candidature validity'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('You do not have permission to do this'));
    await waitFor(() => expect(highlightService.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByRole('switch', { name: 'Show Candidature validity in the home page fact table' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('gives a view-only administrator a Shown / Hidden badge per row instead of the switches', async () => {
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ hiddenRows: ['perModule'] }));
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit name/ })).not.toBeInTheDocument();
    expect(headers(within(rowsCard()).getByRole('table'))).toEqual(['Sr. No.', 'Row', 'Value from', 'Status']);
    const rows = bodyRows(within(rowsCard()).getByRole('table'));
    expect(rows.map((r) => cellText(r, 3))).toEqual(['Shown', 'Shown', 'Shown', 'Hidden', 'Shown', 'Shown', 'Shown']);
    expect(within(rowsCard()).getByText('6 of 7 shown')).toBeInTheDocument();
  });

  it('keeps the edit form’s save free of hiddenRows', () => {
    expect(toPayload(toFormValues(highlightData({ hiddenRows: ['schedule'] })))).not.toHaveProperty('hiddenRows');
  });
});

/* Each fact table row's name, in both languages, edited one row at a time like the Navigation Menu's item names. */
describe('<HighlightTab> fact table row names', () => {
  const CUSTOM = { mr: 'एकूण तास', en: 'Total hours' };
  const toasts = () => document.getElementById('toast-root') as HTMLElement;
  const switchOf = (english: string) => screen.getByRole('switch', { name: `Show ${english} in the home page fact table` });
  const rowsCard = () => card(/Fact table rows/);
  const rowOf = (english: string) => within(rowsCard()).getByText(english, { selector: 'b' }).closest('tr') as HTMLElement;
  const openEdit = async (english: string) => {
    await userEvent.click(screen.getByRole('button', { name: `Edit name of ${english}` }));
    return screen.getByRole('dialog');
  };
  const inputs = (dialog: HTMLElement) => ({
    mr: within(dialog).getByLabelText('Name (Marathi)') as HTMLInputElement,
    en: within(dialog).getByLabelText('Name (English)') as HTMLInputElement,
  });

  beforeEach(() => {
    permissions.clear();
    permissions.add('updateHighlight');
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
    vi.mocked(highlightService.get).mockReset().mockResolvedValue(highlightData());
    vi.mocked(highlightService.setRowVisibility).mockReset();
    vi.mocked(highlightService.setRowLabel).mockReset();
  });

  it('shows a row’s own name, with the switch, the hide question and its toast using it', async () => {
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ rowLabels: { totalDuration: CUSTOM } }));
    vi.mocked(highlightService.setRowVisibility).mockResolvedValue(
      highlightData({ rowLabels: { totalDuration: CUSTOM }, hiddenRows: ['totalDuration'] }),
    );
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const row = rowOf('Total hours');
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('Total hoursएकूण तासCustom name');
    expect(within(row).getByText('एकूण तास')).toHaveAttribute('lang', 'mr');
    expect(within(rowsCard()).queryByText('Total duration', { selector: 'b' })).not.toBeInTheDocument();
    expect(rowOf('Schedule')).toHaveTextContent('Default name');

    await userEvent.click(switchOf('Total hours'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Hide "Total hours" from the home page fact table?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Total hours is now hidden from the home page fact table'));
  });

  it('opens with the current name and saves a new one in both languages, trimmed, showing the PATCH answer', async () => {
    vi.mocked(highlightService.setRowLabel).mockResolvedValue(highlightData({ rowLabels: { totalDuration: CUSTOM } }));
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const dialog = await openEdit('Total duration');
    const { mr, en } = inputs(dialog);
    expect(mr).toHaveValue('एकूण कालावधी');
    expect(en).toHaveValue('Total duration');
    expect(mr).toHaveAttribute('maxLength', '40');
    expect(en).toHaveAttribute('maxLength', '40');
    expect(dialog).toHaveTextContent('Shown as the row name in the home page fact table. Leave both blank to use the default name.');
    /* No name of its own yet, so nothing to reset. */
    expect(within(dialog).queryByRole('button', { name: 'Reset to default' })).not.toBeInTheDocument();

    await userEvent.clear(mr);
    await userEvent.type(mr, '  एकूण तास ');
    await userEvent.clear(en);
    await userEvent.type(en, ' Total hours ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(toasts()).toHaveTextContent('Fact table row renamed to "Total hours"'));
    expect(highlightService.setRowLabel).toHaveBeenCalledTimes(1);
    expect(highlightService.setRowLabel).toHaveBeenCalledWith('totalDuration', CUSTOM);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(rowOf('Total hours')).toHaveTextContent('Custom name');
    /* Refreshed from the PATCH answer, without a second GET; only the name changed. */
    expect(highlightService.get).toHaveBeenCalledTimes(1);
    expect(highlightService.setRowVisibility).not.toHaveBeenCalled();
    expect(switchOf('Total hours')).toHaveAttribute('aria-checked', 'true');
  });

  it('refuses one half without the other, and saves both blank as the default name', async () => {
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ rowLabels: { schedule: { mr: 'वेळ', en: 'Timings' } } }));
    vi.mocked(highlightService.setRowLabel).mockResolvedValue(highlightData());
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const dialog = await openEdit('Timings');
    const { mr, en } = inputs(dialog);
    await userEvent.clear(en);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter the English name too, or leave both blank to use the default name');
    expect(en).toHaveAttribute('aria-invalid', 'true');
    expect(highlightService.setRowLabel).not.toHaveBeenCalled();

    await userEvent.clear(mr);
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('"Schedule" now uses its default name'));
    expect(highlightService.setRowLabel).toHaveBeenCalledWith('schedule', null);
    await waitFor(() => expect(rowOf('Schedule')).toHaveTextContent('Default name'));
  });

  it('refuses a name over 40 characters', async () => {
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ rowLabels: { perModule: { mr: 'मॉड्यूल', en: 'P'.repeat(41) } } }));
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const dialog = await openEdit('P'.repeat(41));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('English name must be at most 40 characters');
    expect(highlightService.setRowLabel).not.toHaveBeenCalled();
  });

  it('saves the default name typed back as the default name', async () => {
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ rowLabels: { certification: { mr: 'दाखला', en: 'Certificate' } } }));
    vi.mocked(highlightService.setRowLabel).mockResolvedValue(highlightData());
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const { mr, en } = inputs(await openEdit('Certificate'));
    await userEvent.clear(mr);
    await userEvent.type(mr, 'प्रमाणपत्र');
    await userEvent.clear(en);
    await userEvent.type(en, 'Certification');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(highlightService.setRowLabel).toHaveBeenCalledTimes(1));
    expect(highlightService.setRowLabel).toHaveBeenCalledWith('certification', null);
  });

  it('puts the default name back with "Reset to default"', async () => {
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ rowLabels: { securityDeposit: { mr: 'ठेव', en: 'Deposit' } } }));
    vi.mocked(highlightService.setRowLabel).mockResolvedValue(highlightData());
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const dialog = await openEdit('Deposit');
    expect(dialog).toHaveTextContent('Default name: Security deposit · अनामत रक्कम');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset to default' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('"Security deposit" now uses its default name'));
    expect(highlightService.setRowLabel).toHaveBeenCalledWith('securityDeposit', null);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(rowOf('Security deposit')).toHaveTextContent('Default name');
  });

  it('shows the server’s field messages on the form and keeps the dialog open', async () => {
    vi.mocked(highlightService.setRowLabel).mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.label.en', message: 'English name is not allowed' }]),
    );
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const dialog = await openEdit('Per module');
    await userEvent.type(inputs(dialog).en, ' fee');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('English name is not allowed'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(inputs(dialog).en).toHaveValue('Per module fee');
  });

  it('closes without sending anything on Cancel', async () => {
    renderTab();
    await screen.findByRole('heading', { name: /Fact table rows/ });

    const dialog = await openEdit('Schedule');
    await userEvent.type(inputs(dialog).en, ' times');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(highlightService.setRowLabel).not.toHaveBeenCalled();
  });

  it('keeps the edit form’s save free of rowLabels', () => {
    expect(toPayload(toFormValues(highlightData({ rowLabels: { schedule: CUSTOM } })))).not.toHaveProperty('rowLabels');
  });
});

describe('fact table row API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends one row’s switch as PATCH /cms/highlight/rows/<key> {show}, and returns the section it answers with', async () => {
    /* The real service and api-client, down to the request; the module mock above replaces them for the screens only. */
    const { highlightService: real } = await vi.importActual<{ highlightService: typeof highlightService }>('../services/highlightService');
    const answer = highlightData({ hiddenRows: ['securityDeposit'] });
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        ({
          ok: true,
          status: 200,
          statusText: '',
          json: () => Promise.resolve({ success: true, message: 'Updated', data: answer }),
        }) as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await real.setRowVisibility('securityDeposit', false)).toEqual(answer);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(new URL(url, 'http://admin.test').pathname).toMatch(/\/cms\/highlight\/rows\/securityDeposit$/);
    expect(init).toMatchObject({ method: 'PATCH', body: JSON.stringify({ show: false }) });

    await real.setRowVisibility('certification', true);
    expect(fetchMock.mock.calls[1]![0]).toMatch(/\/cms\/highlight\/rows\/certification$/);
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ show: true }) });
  });

  it('sends one row’s name as PATCH /cms/highlight/rows/<key> {label}, and null for the default name', async () => {
    const { highlightService: real } = await vi.importActual<{ highlightService: typeof highlightService }>('../services/highlightService');
    const name = { mr: 'वेळ', en: 'Timings' };
    const answer = highlightData({ rowLabels: { schedule: name } });
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        ({
          ok: true,
          status: 200,
          statusText: '',
          json: () => Promise.resolve({ success: true, message: 'Updated', data: answer }),
        }) as Response,
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await real.setRowLabel('schedule', name)).toEqual(answer);
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/cms\/highlight\/rows\/schedule$/);
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ label: name }) });

    await real.setRowLabel('schedule', null);
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ label: null }) });
  });
});

/* Whether the website shows the band is the tab's "Show on website" switch alone: the edit page neither shows nor sends it. */
describe('<HighlightEdit> — no publish control of its own', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    /* The save's "Programme section updated" toast needs its container. */
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    vi.mocked(highlightService.get).mockReset();
    vi.mocked(highlightService.update).mockReset().mockResolvedValue(highlightData());
  });

  it('has no Visibility card in the edit form', () => {
    renderWithProviders(<HighlightForm initial={toFormValues(highlightData())} onSave={vi.fn()} backTo="/cms/home-page?tab=diploma" />);

    expect(screen.queryByRole('heading', { name: 'Visibility' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Publish this section/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/unpublished/)).not.toBeInTheDocument();
    /* The objectives' own Visible ticks stay: they are not the section's flag. */
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('saves the text without isPublished, so a band hidden by the switch meanwhile stays hidden', async () => {
    /* Hidden on the switch: a save must not put the flag back as this page found it, nor at all. */
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ isPublished: false }));
    renderWithProviders(
      <>
        <HighlightEdit />
        <Location />
      </>,
      { route: '/cms/highlight/edit' },
    );

    const heading = await screen.findByLabelText(/^Heading \(English\)/);
    await userEvent.clear(heading);
    await userEvent.type(heading, 'New band heading');
    await userEvent.click(screen.getByRole('button', { name: 'Save section' }));

    await waitFor(() => expect(highlightService.update).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(highlightService.update).mock.calls[0]![0];
    expect(sent).not.toHaveProperty('isPublished');
    expect(Object.keys(sent).sort()).toEqual(['certification', 'heading', 'objectives', 'subheading', 'tagline']);
    expect(sent.heading.en).toBe('New band heading');
    expect(toPayload(toFormValues(highlightData({ isPublished: true })))).not.toHaveProperty('isPublished');
    expect(await screen.findByTestId('location')).toHaveTextContent('/cms/home-page?tab=diploma');
  });
});
