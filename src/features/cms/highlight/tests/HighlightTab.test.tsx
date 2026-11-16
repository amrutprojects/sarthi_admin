import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
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
vi.mock('../services/highlightService', () => ({ highlightService: { get: vi.fn(), update: vi.fn() } }));

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
