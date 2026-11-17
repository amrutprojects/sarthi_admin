import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import ProgrammeView from '../pages/ProgrammeView';
import { programmeService } from '../services/programmeService';
import { PROGRAMME_FACT_ROWS, type ApiProgrammePage, type Bilingual } from '../types/programme.types';

/* The screen's collaborators are replaced at their public boundaries: the auth guard and the API service. */
const permissions = new Set<string>();
/* ProgrammeView imports Can from this exact path (not the modules/auth index), so this is the one to replace. */
vi.mock('../../../../modules/auth/components/Can', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/programmeService', () => ({
  programmeService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn(), setFactVisibility: vi.fn() },
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });

const programmeData = (over: Partial<ApiProgrammePage> = {}): ApiProgrammePage => ({
  id: 'p1',
  intro: pair('कार्यक्रमाचा परिचय', 'Programme introduction'),
  objectives: [pair('कौशल्य विकसित करणे', 'Build skills'), pair('रोजगार मिळवणे', 'Find employment')],
  methodology: [
    { label: pair('पद्धत', 'Delivery mode'), value: pair('वर्ग प्रशिक्षण', 'Classroom training') },
    { label: pair('कालावधी', 'Duration'), value: pair('सहा महिने', 'Six months') },
  ],
  assessment: [
    { component: pair('लेखी परीक्षा', 'Written exam'), min: 40, max: 100 },
    { component: pair('प्रात्यक्षिक', 'Practical'), min: 20, max: 50 },
  ],
  assessmentNote: pair('उत्तीर्ण होण्यासाठी दोन्ही आवश्यक.', 'Both are needed to pass.'),
  certification: [pair('प्रमाणपत्र दिले जाते', 'A certificate is awarded'), pair('डिजिटल पडताळणी', 'Digitally verifiable')],
  trainingModes: {
    title: pair('प्रशिक्षण पद्धती', 'Training modes offered'),
    modes: [
      { name: pair('ऑफलाइन', 'OFFLINE'), description: pair('केंद्रात वर्ग', 'Classes at the centre') },
      { name: pair('ऑनलाइन', 'ONLINE'), description: pair('घरून शिका', 'Learn from home') },
    ],
    note: pair('पद्धत केंद्रावर अवलंबून.', 'The mode depends on the centre.'),
  },
  facts: { idealMonths: '6', validityMonths: '12', securityDeposit: 125000, applyLeadDays: 30, partnerName: 'SUMAGO INFOTECH PVT LTD' },
  isPublished: true,
  updatedAt: '2026-10-22T10:00:00.000Z',
  hiddenFacts: [],
  ...over,
});

/* Shows where the screen has navigated to, so tab and link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route = '/cms/programme') =>
  renderWithProviders(
    <>
      <ProgrammeView />
      <Location />
    </>,
    { route },
  );

const TAB_LABELS = ['About the programme', 'Learning methodology', 'Assessment', 'Certification', 'Fact sheet', 'Training modes'];
/* The rows of the website's fact sheet box, in website order. */
const FACT_KEYS = ['totalHours', 'modules', 'electives', 'idealDuration', 'validity', 'securityDeposit', 'applyBefore', 'partner'];
const FACT_ENGLISH = ['Total hours', 'Modules', 'Electives', 'Ideal duration', 'Validity', 'Security deposit', 'Apply before', 'Partner'];
const FACT_MARATHI = ['एकूण तास', 'मॉड्यूल्स', 'ऐच्छिक क्षेत्रे', 'आदर्श कालावधी', 'वैधता', 'अनामत रक्कम', 'अर्ज कधी करावा', 'भागीदार'];

const tab = (name: string) => screen.getByRole('tab', { name });
const panel = () => screen.getByRole('tabpanel');
const tables = () => within(panel()).queryAllByRole('table');
const headers = (table: HTMLElement) =>
  within(table)
    .getAllByRole('columnheader')
    .map((h) => h.textContent);
const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1);
const cell = (row: HTMLElement, col: number) => within(row).getAllByRole('cell')[col];
const column = (table: HTMLElement, col: number) => bodyRows(table).map((r) => cell(r, col).textContent);
/* A bilingual cell: its Marathi line is marked lang="mr", its English line lang="en". */
const expectPair = (row: HTMLElement, col: number, mr: string, en: string) => {
  expect(within(cell(row, col)).getByText(mr)).toHaveAttribute('lang', 'mr');
  expect(within(cell(row, col)).getByText(en)).toHaveAttribute('lang', 'en');
};
const toasts = () => document.getElementById('toast-root') as HTMLElement;
const switchOf = (english: string) => screen.getByRole('switch', { name: `Show ${english} in the fact sheet` });
const factRow = (english: string) => screen.getByText(english, { selector: 'b' }).closest('tr') as HTMLElement;

describe('<ProgrammeView> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(programmeService.get).mockReset().mockResolvedValue(programmeData());
    vi.mocked(programmeService.setPublished).mockReset().mockResolvedValue(programmeData());
    /* The panel shell's toast container, which the publish toasts are appended to. */
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
  });

  it('opens on About the programme, with one tab per part of the public page', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'About the programme' });
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(TAB_LABELS);
    expect(tab('About the programme')).toHaveAttribute('aria-selected', 'true');
    /* The panel's standard tab strip, as on Modules Page Management, each tab naming the panel it opens. */
    expect(screen.getByRole('tablist')).toHaveClass('tabs', 'tabs-fit');
    expect(screen.getByRole('tablist')).toHaveAccessibleName('Programme page sections');
    expect(tab('About the programme')).toHaveAttribute('aria-controls', panel().id);
    for (const name of TAB_LABELS) expect(document.getElementById(tab(name).getAttribute('aria-controls')!)).not.toBeNull();

    const [intro, objectives] = tables();
    expect(headers(intro)).toEqual(['Sr. No.', 'Field', 'Content']);
    expect(column(intro, 1)).toEqual(['Introduction']);
    expectPair(bodyRows(intro)[0], 2, 'कार्यक्रमाचा परिचय', 'Programme introduction');
    expect(within(panel()).getByText('Active')).toBeInTheDocument();

    expect(within(panel()).getByRole('heading', { name: /^Objectives/ })).toBeInTheDocument();
    expect(headers(objectives)).toEqual(['Sr. No.', 'Objective']);
    expect(column(objectives, 0)).toEqual(['1', '2']);
    expectPair(bodyRows(objectives)[0], 1, 'कौशल्य विकसित करणे', 'Build skills');
    expectPair(bodyRows(objectives)[1], 1, 'रोजगार मिळवणे', 'Find employment');
    /* A long text keeps a minimum width, so a phone scrolls the table sideways instead of squeezing it. */
    expect(cell(bodyRows(objectives)[0], 1).firstElementChild).toHaveStyle({ minWidth: '9rem' });

    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    expect(document.querySelector('.kpi')).toBeNull();
    expect(programmeService.get).toHaveBeenCalledTimes(1);
  });

  it('falls back to About the programme for an unknown tab', async () => {
    renderAt('/cms/programme?tab=nonsense');
    expect(await screen.findByRole('tab', { name: 'About the programme' })).toHaveAttribute('aria-selected', 'true');
    expect(column(tables()[0], 1)).toEqual(['Introduction']);
  });

  it('lists the learning methodology, label and description, and keeps the tab in the URL', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('tab', { name: 'Learning methodology' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cms/programme?tab=methodology');
    const [table] = tables();
    expect(headers(table)).toEqual(['Sr. No.', 'Label', 'Description']);
    expect(column(table, 0)).toEqual(['1', '2']);
    const [first, second] = bodyRows(table);
    expectPair(first, 1, 'पद्धत', 'Delivery mode');
    expectPair(first, 2, 'वर्ग प्रशिक्षण', 'Classroom training');
    expectPair(second, 1, 'कालावधी', 'Duration');
    expectPair(second, 2, 'सहा महिने', 'Six months');
  });

  it('opens Assessment from the URL, with the passing criteria and the note under the table', async () => {
    renderAt('/cms/programme?tab=assessment');

    expect(await screen.findByRole('tab', { name: 'Assessment' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel()).getByRole('heading', { name: /Assessment & passing criteria/ })).toBeInTheDocument();
    const [criteria, note] = tables();
    expect(headers(criteria)).toEqual(['Sr. No.', 'Component', 'Minimum', 'Out of']);
    const [exam, practical] = bodyRows(criteria);
    expectPair(exam, 1, 'लेखी परीक्षा', 'Written exam');
    expectPair(practical, 1, 'प्रात्यक्षिक', 'Practical');
    expect(column(criteria, 2)).toEqual(['40', '20']);
    expect(column(criteria, 3)).toEqual(['100', '50']);
    expect(cell(exam, 2)).toHaveClass('mono');
    expect(cell(exam, 3)).toHaveClass('mono');

    expect(column(note, 1)).toEqual(['Assessment note']);
    expectPair(bodyRows(note)[0], 2, 'उत्तीर्ण होण्यासाठी दोन्ही आवश्यक.', 'Both are needed to pass.');
  });

  it('lists the certification points', async () => {
    renderAt('/cms/programme?tab=certification');

    await screen.findByRole('tab', { name: 'Certification' });
    const [table] = tables();
    expect(headers(table)).toEqual(['Sr. No.', 'Certification point']);
    expect(column(table, 0)).toEqual(['1', '2']);
    expectPair(bodyRows(table)[0], 1, 'प्रमाणपत्र दिले जाते', 'A certificate is awarded');
    expectPair(bodyRows(table)[1], 1, 'डिजिटल पडताळणी', 'Digitally verifiable');
  });

  it('shows the fact sheet figures as the old view did, and says which ones come from the modules', async () => {
    renderAt('/cms/programme?tab=facts');

    expect(await screen.findByRole('heading', { name: /Programme fact sheet/ })).toBeInTheDocument();
    const [table] = tables();
    expect(headers(table)).toEqual(['Sr. No.', 'Field', 'Content', 'Status']);
    expect(column(table, 0)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(bodyRows(table).map((r) => within(cell(r, 1)).getByText(/./, { selector: 'b' }).textContent)).toEqual(FACT_ENGLISH);
    expect(column(table, 2)).toEqual([
      ...Array<string>(3).fill('Calculated from the Modules page'),
      '6 months',
      '12 months',
      '₹1,25,000',
      '30 days',
      'SUMAGO INFOTECH PVT LTD',
    ]);
    expect(within(panel()).getByText(/summed from the modules on the Modules page/)).toBeInTheDocument();
  });

  it('shows the training modes box, and every mode in both languages', async () => {
    renderAt('/cms/programme?tab=modes');

    await screen.findByRole('tab', { name: 'Training modes' });
    const [box, modes] = tables();
    expect(column(box, 1)).toEqual(['Box title', 'Note under the modes']);
    expectPair(bodyRows(box)[0], 2, 'प्रशिक्षण पद्धती', 'Training modes offered');
    expectPair(bodyRows(box)[1], 2, 'पद्धत केंद्रावर अवलंबून.', 'The mode depends on the centre.');

    expect(headers(modes)).toEqual(['Sr. No.', 'Mode name', 'Description']);
    expect(column(modes, 0)).toEqual(['1', '2']);
    const [offline, online] = bodyRows(modes);
    /* The old view showed only the English name; both languages are shown now. */
    expectPair(offline, 1, 'ऑफलाइन', 'OFFLINE');
    expectPair(offline, 2, 'केंद्रात वर्ग', 'Classes at the centre');
    expectPair(online, 1, 'ऑनलाइन', 'ONLINE');
    expectPair(online, 2, 'घरून शिका', 'Learn from home');
  });

  it('says so instead of showing an empty table when a list has no rows', async () => {
    vi.mocked(programmeService.get).mockResolvedValue(
      programmeData({
        objectives: [],
        methodology: [],
        assessment: [],
        certification: [],
        trainingModes: { ...programmeData().trainingModes, modes: [] },
      }),
    );
    renderAt();

    const hint = async (tabName: string, text: string, tablesLeft: number) => {
      await userEvent.click(tab(tabName));
      const line = within(panel()).getByText(text);
      expect(line).toHaveClass('hint');
      expect(line.parentElement).toHaveClass('card-b');
      /* Only the field tables (introduction, assessment note, training modes box) remain. */
      expect(tables()).toHaveLength(tablesLeft);
    };
    await screen.findByRole('tab', { name: 'About the programme' });
    await hint('About the programme', 'No objectives are listed.', 1);
    await hint('Learning methodology', 'No methodology rows are listed.', 0);
    await hint('Assessment', 'No assessment rows are listed.', 1);
    await hint('Certification', 'No certification points are listed.', 0);
    await hint('Training modes', 'No training modes are listed.', 1);
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    renderAt();
    await screen.findByRole('tab', { name: 'About the programme' });
    expect(tab('About the programme')).toHaveAttribute('tabindex', '0');
    expect(tab('Learning methodology')).toHaveAttribute('tabindex', '-1');

    tab('About the programme').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('Learning methodology')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Learning methodology')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(tab('Training modes')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(tab('About the programme')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowLeft}');
    expect(tab('Training modes')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Home}');
    expect(tab('About the programme')).toHaveAttribute('aria-selected', 'true');
  });

  it('warns that an unpublished page is not live, on every tab, and publishes it', async () => {
    permissions.add('updateProgrammePage');
    vi.mocked(programmeService.get).mockResolvedValue(programmeData({ isPublished: false }));
    renderAt();

    await screen.findByRole('tab', { name: 'About the programme' });
    expect(screen.getByText('This content is not published')).toBeInTheDocument();
    expect(within(panel()).getByText('Inactive')).toBeInTheDocument();
    await userEvent.click(tab('Fact sheet'));
    expect(screen.getByText('This content is not published')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    expect(programmeService.setPublished).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toasts()).toHaveTextContent('Programme page published'));
    await waitFor(() => expect(programmeService.get).toHaveBeenCalledTimes(2));
  });

  it('unpublishes a published page', async () => {
    permissions.add('updateProgrammePage');
    renderAt();

    await screen.findByRole('tab', { name: 'About the programme' });
    expect(screen.queryByText('This content is not published')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(programmeService.setPublished).toHaveBeenCalledWith(false);
    await waitFor(() => expect(toasts()).toHaveTextContent('Programme page unpublished'));
    await waitFor(() => expect(programmeService.get).toHaveBeenCalledTimes(2));
  });

  it('opens the edit form from Edit content', async () => {
    permissions.add('updateProgrammePage');
    renderAt('/cms/programme?tab=modes');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit content' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/programme/edit');
  });

  it('offers no Publish, Unpublish or Edit actions to a view-only user', async () => {
    renderAt();

    await screen.findByRole('tab', { name: 'About the programme' });
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit content' })).not.toBeInTheDocument();
  });

  it('shows a load error with a retry, and no tabs until the page loads', async () => {
    vi.mocked(programmeService.get).mockRejectedValueOnce(new Error('down'));
    renderAt();

    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('tab', { name: 'About the programme' })).toBeInTheDocument();
    expect(programmeService.get).toHaveBeenCalledTimes(2);
  });
});

describe('<ProgrammeView> fact sheet row switches', () => {
  beforeEach(() => {
    permissions.clear();
    permissions.add('updateProgrammePage');
    vi.mocked(programmeService.get).mockReset().mockResolvedValue(programmeData());
    vi.mocked(programmeService.setPublished).mockReset();
    vi.mocked(programmeService.setFactVisibility).mockReset();
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
  });

  const openFacts = async () => {
    renderAt('/cms/programme?tab=facts');
    await screen.findByRole('heading', { name: /Programme fact sheet/ });
  };

  it('lists all eight rows in website order, each with its Marathi label and a switch', async () => {
    await openFacts();

    const rows = bodyRows(tables()[0]!);
    expect(rows).toHaveLength(8);
    rows.forEach((row, i) => {
      expect(cell(row, 1)).toHaveTextContent(`${FACT_ENGLISH[i]}${FACT_MARATHI[i]}`);
      expect(within(cell(row, 1)).getByText(FACT_MARATHI[i]!)).toHaveAttribute('lang', 'mr');
      const toggle = within(cell(row, 3)).getByRole('switch', { name: `Show ${FACT_ENGLISH[i]} in the fact sheet` });
      expect(toggle).toBeChecked();
      expect(toggle).toHaveClass('switch', 'on');
      expect(cell(row, 3)).toHaveTextContent('Shown');
    });
    expect(screen.getByText('8 of 8 shown')).toHaveClass('tag');
  });

  it('hides a row after asking, sending only that row, and shows the page the PATCH answers with', async () => {
    vi.mocked(programmeService.setFactVisibility).mockResolvedValue(programmeData({ hiddenFacts: ['securityDeposit'] }));
    await openFacts();

    await userEvent.click(switchOf('Security deposit'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(`Hide "Security deposit" from the website's fact sheet?`);
    expect(dialog).toHaveTextContent('Its figure is not deleted');
    expect(programmeService.setFactVisibility).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Security deposit is now hidden from the fact sheet'));
    expect(programmeService.setFactVisibility).toHaveBeenCalledTimes(1);
    expect(programmeService.setFactVisibility).toHaveBeenCalledWith('securityDeposit', false);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    /* Refreshed from the PATCH answer: no second GET. */
    expect(switchOf('Security deposit')).not.toBeChecked();
    expect(factRow('Security deposit')).toHaveTextContent('Hidden');
    expect(factRow('Security deposit')).toHaveTextContent('₹1,25,000');
    expect(switchOf('Partner')).toBeChecked();
    expect(screen.getByText('7 of 8 shown')).toBeInTheDocument();
    expect(programmeService.get).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when hiding is cancelled', async () => {
    await openFacts();

    await userEvent.click(switchOf('Total hours'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(programmeService.setFactVisibility).not.toHaveBeenCalled();
    expect(switchOf('Total hours')).toBeChecked();
  });

  it('shows a hidden row again without asking', async () => {
    vi.mocked(programmeService.get).mockResolvedValue(programmeData({ hiddenFacts: ['totalHours', 'partner'] }));
    vi.mocked(programmeService.setFactVisibility).mockResolvedValue(programmeData({ hiddenFacts: ['totalHours'] }));
    await openFacts();

    expect(switchOf('Partner')).not.toBeChecked();
    expect(switchOf('Total hours')).not.toBeChecked();
    expect(screen.getByText('6 of 8 shown')).toBeInTheDocument();

    await userEvent.click(switchOf('Partner'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(toasts()).toHaveTextContent('Partner is now shown in the fact sheet'));
    expect(programmeService.setFactVisibility).toHaveBeenCalledWith('partner', true);
    await waitFor(() => expect(switchOf('Partner')).toBeChecked());
    expect(switchOf('Total hours')).not.toBeChecked();
    expect(screen.getByText('7 of 8 shown')).toBeInTheDocument();
  });

  it('shows a refusal as the server sent it, and reloads so the switches show what the website has', async () => {
    vi.mocked(programmeService.setFactVisibility).mockRejectedValue(
      new ApiError('You do not have permission to do this', 403, 'FORBIDDEN'),
    );
    await openFacts();

    await userEvent.click(switchOf('Validity'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Not permitted: You do not have permission to do this'));
    await waitFor(() => expect(programmeService.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(switchOf('Validity')).toBeChecked();
    expect(screen.getByText('8 of 8 shown')).toBeInTheDocument();
  });

  it('shows the server’s page again after a reload, not the copy a switch answered with', async () => {
    vi.mocked(programmeService.setFactVisibility).mockResolvedValue(programmeData({ hiddenFacts: ['modules'] }));
    vi.mocked(programmeService.setPublished).mockResolvedValue(programmeData({ isPublished: false }));
    await openFacts();

    await userEvent.click(switchOf('Modules'));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(switchOf('Modules')).not.toBeChecked());

    vi.mocked(programmeService.get).mockResolvedValue(programmeData({ hiddenFacts: ['modules'], isPublished: false }));
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
    expect(await screen.findByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByText('This content is not published')).toBeInTheDocument();
    expect(switchOf('Modules')).not.toBeChecked();
  });

  it('gives a view-only administrator a Shown / Hidden badge per row instead of the switches', async () => {
    permissions.clear();
    vi.mocked(programmeService.get).mockResolvedValue(programmeData({ hiddenFacts: ['electives', 'applyBefore'] }));
    await openFacts();

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(within(factRow('Electives')).getByText('Hidden')).toHaveClass('badge');
    expect(within(factRow('Apply before')).getByText('Hidden')).toHaveClass('badge');
    expect(within(factRow('Total hours')).getByText('Shown')).toHaveClass('badge');
    expect(screen.getAllByText('Shown', { selector: '.badge' })).toHaveLength(6);
    expect(screen.getByText('6 of 8 shown')).toBeInTheDocument();
  });

  it('knows the eight row keys the server and the website use', () => {
    expect(PROGRAMME_FACT_ROWS.map((r) => r.key)).toEqual(FACT_KEYS);
    expect(PROGRAMME_FACT_ROWS.map((r) => r.label.en)).toEqual(FACT_ENGLISH);
    expect(PROGRAMME_FACT_ROWS.map((r) => r.label.mr)).toEqual(FACT_MARATHI);
  });
});
