import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import HighlightView from '../pages/HighlightView';
import { highlightService } from '../services/highlightService';
import type { ApiObjective, ApiProgrammeHighlight } from '../types/highlight.types';

/* The screen's collaborators are replaced at their public boundaries: the auth guard and the API service. */
const permissions = new Set<string>();
/* HighlightView imports Can from this exact path (not the modules/auth index), so this is the one to replace. */
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/highlightService', () => ({ highlightService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() } }));

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
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

/* Shows where the screen has navigated to, so tab and link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route = '/cms/highlight') =>
  renderWithProviders(
    <>
      <HighlightView />
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
/* The Field column of the tab's table. */
const fields = () => bodyRows(within(panel()).getByRole('table')).map((r) => cellText(r, 1));
const toasts = () => document.getElementById('toast-root') as HTMLElement;

describe('<HighlightView> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(highlightService.get).mockReset().mockResolvedValue(highlightData());
    vi.mocked(highlightService.setPublished).mockReset().mockResolvedValue(highlightData());
    /* The panel shell's toast container, which the publish toasts are appended to. */
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
  });

  it('opens on the Section text, with one tab per section of the edit form', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'Section text' });
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Section text', 'Objectives']);
    expect(tab('Section text')).toHaveAttribute('aria-selected', 'true');
    /* The panel's standard tab strip, as on Modules Page Management, each tab naming the panel it opens. */
    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs-fit');
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Home programme section');
    expect(tab('Section text')).toHaveAttribute('aria-controls', panel().id);

    const table = within(panel()).getByRole('table');
    expect(headers(table)).toEqual(['Sr. No.', 'Field', 'Content']);
    expect(bodyRows(table).map((r) => cellText(r, 0))).toEqual(['1', '2', '3', '4']);
    expect(fields()).toEqual(['Heading', 'Subheading', 'Tagline', 'Certification']);
    expect(screen.getByText('अमृत कलश — कौशल्य कार्यक्रम')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('AMRUT Kalash — skills programme')).toHaveAttribute('lang', 'en');
    expect(screen.getByText('महाराष्ट्र संशोधन उन्नती')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Maharashtra Research Upliftment')).toBeInTheDocument();
    expect(screen.getByText('तरुणांसाठी प्रशिक्षण.')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Training for young people.')).toBeInTheDocument();
    expect(screen.getByText('शासन मान्य प्रमाणपत्र')).toHaveAttribute('lang', 'mr');
    expect(screen.getByText('Government-recognised certificate')).toBeInTheDocument();
    /* The section's published state, on the card as before. */
    const card = within(panel())
      .getByRole('heading', { name: /Section text/ })
      .closest('.card') as HTMLElement;
    expect(within(card).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Marathi is shown first, English underneath/)).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(document.querySelector('.kpi')).toBeNull();
    expect(highlightService.get).toHaveBeenCalledTimes(1);
  });

  it('falls back to the Section text for an unknown tab', async () => {
    renderAt('/cms/highlight?tab=nonsense');
    expect(await screen.findByRole('tab', { name: 'Section text' })).toHaveAttribute('aria-selected', 'true');
    expect(fields()).toEqual(['Heading', 'Subheading', 'Tagline', 'Certification']);
  });

  it('lists the objectives in website order with their status, and keeps the tab in the URL', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('tab', { name: 'Objectives' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cms/highlight?tab=objectives');
    expect(tab('Objectives')).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByText('3 listed')).toHaveClass('tag');

    const table = within(panel()).getByRole('table');
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
    renderAt('/cms/highlight?tab=objectives');

    expect(await screen.findByRole('tab', { name: 'Objectives' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByText('No objectives are listed.')).toBeInTheDocument();
    expect(within(panel()).getByText('0 listed')).toBeInTheDocument();
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument();
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    renderAt();
    await screen.findByRole('tab', { name: 'Section text' });
    expect(tab('Section text')).toHaveAttribute('tabindex', '0');
    expect(tab('Objectives')).toHaveAttribute('tabindex', '-1');

    tab('Section text').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Objectives')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Objectives')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Section text')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{End}');
    expect(tab('Objectives')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(tab('Section text')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Section text')).toHaveFocus();
  });

  it('warns that an unpublished section is not live, on every tab, and publishes it', async () => {
    permissions.add('updateHighlight');
    vi.mocked(highlightService.get).mockResolvedValue(highlightData({ isPublished: false }));
    renderAt();

    await screen.findByRole('tab', { name: 'Section text' });
    expect(screen.getByText('This content is not published')).toBeInTheDocument();
    const card = within(panel())
      .getByRole('heading', { name: /Section text/ })
      .closest('.card') as HTMLElement;
    expect(within(card).getByText('Inactive')).toBeInTheDocument();
    await userEvent.click(tab('Objectives'));
    expect(screen.getByText('This content is not published')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(highlightService.setPublished).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toasts()).toHaveTextContent('Section published'));
    await waitFor(() => expect(highlightService.get).toHaveBeenCalledTimes(2));
  });

  it('unpublishes a published section', async () => {
    permissions.add('updateHighlight');
    renderAt();

    await screen.findByRole('tab', { name: 'Section text' });
    expect(screen.queryByText('This content is not published')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(highlightService.setPublished).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toasts()).toHaveTextContent('Section unpublished'));
    await waitFor(() => expect(highlightService.get).toHaveBeenCalledTimes(2));
  });

  it('opens the edit form from Edit content', async () => {
    permissions.add('updateHighlight');
    renderAt('/cms/highlight?tab=objectives');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit content' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/highlight/edit');
  });

  it('offers no Publish, Unpublish or Edit actions to a view-only user', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'Section text' });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit content' })).not.toBeInTheDocument();
  });

  it('shows a load error with a retry, and no tabs until the section loads', async () => {
    vi.mocked(highlightService.get).mockRejectedValueOnce(new Error('down'));
    renderAt();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('tab', { name: 'Section text' })).toBeInTheDocument();
    expect(highlightService.get).toHaveBeenCalledTimes(2);
  });
});
