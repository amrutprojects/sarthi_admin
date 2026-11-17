import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import LiveDashboardTab from './components/LiveDashboardTab';
import CardEditorPage from './pages/CardEditorPage';
import CardView from './pages/CardView';
import LiveDashboardSettingsEdit from './pages/LiveDashboardSettingsEdit';
import StatEditorPage from './pages/StatEditorPage';
import StatView from './pages/StatView';
import { liveDashboardCardsService, liveDashboardService, liveDashboardStatsService } from './services/liveDashboardService';
import type {
  ApiLiveDashboardCard,
  ApiLiveDashboardDistrict,
  ApiLiveDashboardSettings,
  ApiLiveDashboardStat,
  Bilingual,
} from './types/livedashboard.types';
import { linkProblem } from './validation/livedashboard.validation';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/liveDashboardService', () => {
  const list = () => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  });
  return {
    liveDashboardCardsService: list(),
    liveDashboardStatsService: list(),
    liveDashboardService: { getSettings: vi.fn(), updateSettings: vi.fn(), listDistricts: vi.fn(), updateDistrict: vi.fn() },
  };
});
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const BLANK = pair('', '');
const ALL = ['cms-livedashboard.view', 'cms-livedashboard.create', 'cms-livedashboard.update', 'cms-livedashboard.delete'];
const T = { createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-02T10:00:00.000Z' };
const uuid = (prefix: number, n: number) => `00000000-0000-4000-800${prefix}-${String(n).padStart(12, '0')}`;

const settings = (extra: Partial<ApiLiveDashboardSettings> = {}): ApiLiveDashboardSettings => ({
  id: 'set-1',
  heading: pair('कार्यक्रम प्रगती – थेट डॅशबोर्ड', 'Programme Progress – Live Dashboard'),
  subtitle: pair('उपशीर्षक', 'Live figures'),
  showSection: true,
  disclaimer: pair('नमुना आकडे', 'Illustrative figures'),
  showDisclaimer: true,
  mapTitle: pair('जिल्हानिहाय प्रगती — महाराष्ट्र', 'District-wise progress — Maharashtra'),
  showMap: true,
  modesTitle: pair('प्रशिक्षण पद्धती', 'Training modes'),
  showModes: false,
  offlineLabel: pair('ऑफलाइन (केंद्र)', 'Offline (centre)'),
  onlineLabel: pair('ऑनलाइन (केंद्रीय)', 'Online (central)'),
  offlineCount: 800,
  onlineCount: 200,
  donutCenterLabel: pair('प्रवेशित', 'enrolled'),
  ...T,
  ...extra,
});

/* The seeded cards, as the home page showed them before the section was managed. */
const CARDS: [string, string, string, string, string, string, ApiLiveDashboardCard['tone']][] = [
  ['एकूण लक्ष्य', 'Total target', '2,000', 'विद्यार्थी', 'students', '/programme', 'blue'],
  ['प्राप्त अर्ज', 'Applications', '1,245', 'नोंदणी झालेली', 'registrations received', '/track', 'default'],
  ['पात्र उमेदवार', 'Eligible', '1,080', '87% अर्जांपैकी', '87% of applications', '/eligibility', 'blue'],
  ['प्रमाणित', 'Certified', '165', '', '', '', 'green'],
];
const card = (n: number, extra: Partial<ApiLiveDashboardCard> = {}): ApiLiveDashboardCard => {
  const [mr, en, value, dmr, den, link, tone] = CARDS[n - 1]!;
  return { id: uuid(1, n), label: pair(mr, en), value, detail: pair(dmr, den), link, tone, displayOrder: n, isActive: true, ...T, ...extra };
};

const STATS: [string, string, string][] = [
  ['मंजूर केंद्रे', 'Approved centres', '10'],
  ['सक्रिय बॅच', 'Active batches', '15'],
  ['प्रशिक्षक', 'Trainers', '12'],
];
const stat = (n: number, extra: Partial<ApiLiveDashboardStat> = {}): ApiLiveDashboardStat => {
  const [mr, en, value] = STATS[n - 1]!;
  return { id: uuid(2, n), label: pair(mr, en), value, displayOrder: n, isActive: true, ...T, ...extra };
};

const district = (n: number, extra: Partial<ApiLiveDashboardDistrict> = {}): ApiLiveDashboardDistrict => ({
  id: uuid(3, n),
  ...[
    { code: 'NDB', name: pair('नंदुरबार', 'Nandurbar'), status: 'TRAINING_ACTIVE' as const },
    { code: 'PUN', name: pair('पुणे', 'Pune'), status: 'CRITICAL' as const },
  ][n - 1]!,
  target: 8,
  enrolled: 11,
  trainingActive: 0,
  completed: 11,
  certified: 9,
  attendancePct: 88,
  displayOrder: n,
  ...T,
  ...extra,
});

function Location() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}
const location = () => screen.getByTestId('location');
const toasts = () => document.getElementById('toast-root')!;
const TAB = '/cms/home-page?tab=live-dashboard';
const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/home-page" element={<LiveDashboardTab />} />
        <Route path="/cms/live-dashboard/settings" element={<LiveDashboardSettingsEdit />} />
        <Route path="/cms/live-dashboard/cards/create" element={<CardEditorPage />} />
        <Route path="/cms/live-dashboard/cards/:id/edit" element={<CardEditorPage />} />
        <Route path="/cms/live-dashboard/cards/:id/view" element={<CardView />} />
        <Route path="/cms/live-dashboard/stats/create" element={<StatEditorPage />} />
        <Route path="/cms/live-dashboard/stats/:id/edit" element={<StatEditorPage />} />
        <Route path="/cms/live-dashboard/stats/:id/view" element={<StatView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

/* One card of the tab, by the start of its heading ("KPI cards", "Side figures", "Districts", "Section settings"). */
const part = (title: string) => screen.getByRole('heading', { name: new RegExp(`^${title}`) }).closest('.card') as HTMLElement;
const bodyRows = (title: string) => within(within(part(title)).getByRole('table')).getAllByRole('row').slice(1);
const rowOf = (title: string, text: string) => within(part(title)).getByText(text).closest('tr') as HTMLElement;
const kv = (key: string) => within(part('Section settings')).getByText(key, { selector: '.kv > span' }).nextElementSibling as HTMLElement;
const dialog = () => screen.getByRole('dialog');

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(liveDashboardService.getSettings).mockResolvedValue(settings());
  vi.mocked(liveDashboardCardsService.list).mockResolvedValue([card(1), card(2), card(3), card(4, { isActive: false })]);
  vi.mocked(liveDashboardStatsService.list).mockResolvedValue([stat(1), stat(2), stat(3)]);
  vi.mocked(liveDashboardService.listDistricts).mockResolvedValue([district(1), district(2)]);
});

describe('Live Dashboard tab', () => {
  it('shows the section settings, the KPI cards, the side figures and the districts', async () => {
    renderAt(TAB);
    await screen.findByText('Total target');
    await screen.findByText('Nandurbar');

    /* Settings: the texts in both languages, each part's switch, and the donut's centre figure (offline + online). */
    expect(kv('Heading')).toHaveTextContent('Programme Progress – Live Dashboard');
    expect(kv('Heading')).toHaveTextContent('कार्यक्रम प्रगती – थेट डॅशबोर्ड');
    expect(kv('District map card')).toHaveTextContent('Shown');
    expect(kv('Training modes card')).toHaveTextContent('Hidden');
    expect(kv('Offline')).toHaveTextContent('800 — Offline (centre) / ऑफलाइन (केंद्र)');
    expect(kv('Donut centre')).toHaveTextContent('1,000 — enrolled / प्रवेशित');
    expect(kv('Note under the section')).toHaveTextContent('Shown');

    /* KPI cards: label, value, detail, link and colour, in display order; the inactive one counted as not shown. */
    expect(bodyRows('KPI cards').map((r) => within(r).getByText(/./, { selector: 'b.lnk' }).textContent)).toEqual([
      'Total target',
      'Applications',
      'Eligible',
      'Certified',
    ]);
    const total = rowOf('KPI cards', 'Total target');
    expect(total).toHaveTextContent('2,000');
    expect(total).toHaveTextContent('students');
    expect(total).toHaveTextContent('/programme');
    expect(total).toHaveTextContent('Deep orange');
    const certified = rowOf('KPI cards', 'Certified');
    expect(certified).toHaveTextContent('Not a link');
    expect(certified).toHaveTextContent('Inactive');
    expect(within(part('KPI cards')).getByText('4 listed, 3 shown on the website')).toBeInTheDocument();

    /* Side figures: their own list. */
    expect(within(part('Side figures')).getByText('3 listed, 3 shown on the website')).toBeInTheDocument();
    expect(rowOf('Side figures', 'Approved centres')).toHaveTextContent('10');

    /* Districts: both names, the code, the status as a badge and every figure. */
    const pune = rowOf('Districts', 'Pune');
    expect(pune).toHaveTextContent('PUN');
    expect(pune).toHaveTextContent('पुणे');
    expect(within(pune).getByText('Critical')).toHaveClass('badge');
    expect(pune).toHaveTextContent('88%');
    expect(within(part('Districts')).getByText('2 districts')).toBeInTheDocument();
  });

  it('reorders a KPI card by sending the whole list of ids to the cards API, and a figure to the figures API', async () => {
    vi.mocked(liveDashboardCardsService.reorder).mockResolvedValue([]);
    vi.mocked(liveDashboardStatsService.reorder).mockResolvedValue([]);
    renderAt(TAB);
    await screen.findByText('Total target');
    await userEvent.click(screen.getByRole('button', { name: 'Move Total target down' }));
    expect(location()).toHaveTextContent(TAB);
    await waitFor(() => expect(liveDashboardCardsService.reorder).toHaveBeenCalledWith([card(2).id, card(1).id, card(3).id, card(4).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Trainers up' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Move Trainers up' }));
    await waitFor(() => expect(liveDashboardStatsService.reorder).toHaveBeenCalledWith([stat(1).id, stat(3).id, stat(2).id]));
    expect(liveDashboardCardsService.reorder).toHaveBeenCalledTimes(1);
  });

  it('deactivates and deletes the card named in the dialog, by id', async () => {
    vi.mocked(liveDashboardCardsService.setStatus).mockResolvedValue(card(2, { isActive: false }));
    vi.mocked(liveDashboardCardsService.remove).mockResolvedValue();
    renderAt(TAB);
    await screen.findByText('Applications');

    await userEvent.click(screen.getByRole('switch', { name: 'Applications: active' }));
    expect(dialog()).toHaveTextContent('Deactivate 1,245 — प्राप्त अर्ज / Applications?');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(liveDashboardCardsService.setStatus).toHaveBeenCalledWith(card(2).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('KPI card deactivated'));

    await userEvent.click(screen.getByRole('button', { name: 'Delete Eligible' }));
    expect(dialog()).toHaveTextContent('Delete 1,080 — पात्र उमेदवार / Eligible?');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(liveDashboardCardsService.remove).toHaveBeenCalledWith(card(3).id));
    await waitFor(() => expect(toasts()).toHaveTextContent('KPI card deleted'));
    expect(liveDashboardStatsService.remove).not.toHaveBeenCalled();
  });

  it('opens the settings page, the Add pages and a card’s View page', async () => {
    vi.mocked(liveDashboardCardsService.get).mockResolvedValue(card(1));
    const { unmount } = renderAt(TAB);
    await screen.findByText('Total target');
    await userEvent.click(screen.getByRole('button', { name: 'Edit settings' }));
    expect(location()).toHaveTextContent('/cms/live-dashboard/settings');
    unmount();

    const again = renderAt(TAB);
    await screen.findByText('Total target');
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }));
    expect(location()).toHaveTextContent('/cms/live-dashboard/cards/create');
    again.unmount();

    const third = renderAt(TAB);
    await screen.findByText('Total target');
    await userEvent.click(screen.getByRole('button', { name: 'Add figure' }));
    expect(location()).toHaveTextContent('/cms/live-dashboard/stats/create');
    third.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByText('Total target'));
    expect(location()).toHaveTextContent(`/cms/live-dashboard/cards/${card(1).id}/view`);
    expect(await screen.findByText('KPI card details')).toBeInTheDocument();
  });

  it('gives a view-only administrator no Add, Edit, switch, Delete, reorder or Edit settings, and no district Edit', async () => {
    auth.permissions = new Set(['cms-livedashboard.view']);
    renderAt(TAB);
    await screen.findByText('Total target');
    await screen.findByText('Nandurbar');
    expect(screen.getByRole('button', { name: 'View Total target' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Add card|Add figure|Edit settings)$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('prints managed text as text, never as HTML', async () => {
    vi.mocked(liveDashboardCardsService.list).mockResolvedValue([card(1, { label: pair('<img src=x>', '<script>x</script>') })]);
    const { container } = renderAt(TAB);
    expect(await screen.findByText('<script>x</script>')).toBeInTheDocument();
    expect(container.querySelector('tbody img, tbody script')).toBeNull();
  });
});

describe('a district’s Edit dialog', () => {
  it('sends only the changed figures, by the district’s code, with the version it was opened at', async () => {
    vi.mocked(liveDashboardService.updateDistrict).mockResolvedValue(district(2, { status: 'TRAINING_ACTIVE', enrolled: 40 }));
    renderAt(TAB);
    await screen.findByText('Pune');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Pune' }));
    expect(dialog()).toHaveTextContent('Edit district — Pune');
    expect(screen.getByLabelText('Status *')).toHaveValue('CRITICAL');
    expect(screen.getByLabelText('Enrolled *')).toHaveValue(11);

    await userEvent.selectOptions(screen.getByLabelText('Status *'), 'TRAINING_ACTIVE');
    fireEvent.change(screen.getByLabelText('Enrolled *'), { target: { value: '40' } });
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(liveDashboardService.updateDistrict).toHaveBeenCalledWith('PUN', {
        status: 'TRAINING_ACTIVE',
        enrolled: 40,
        expectedUpdatedAt: T.updatedAt,
      }),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Pune updated'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(liveDashboardService.listDistricts).toHaveBeenCalledTimes(2);
  });

  it('refuses an attendance over 100 and a negative or fractional figure before sending anything', async () => {
    renderAt(TAB);
    await screen.findByText('Pune');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Pune' }));
    fireEvent.change(screen.getByLabelText('Attendance % *'), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText('Target *'), { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText('Certified *'), { target: { value: '2.5' } });
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Attendance % must be a whole number from 0 to 100')).toBeInTheDocument();
    expect(screen.getByText('Target must be a whole number from 0 to 1,00,00,000')).toBeInTheDocument();
    expect(screen.getByText('Certified must be a whole number from 0 to 1,00,00,000')).toBeInTheDocument();
    expect(liveDashboardService.updateDistrict).not.toHaveBeenCalled();
  });

  it('stays open with what was typed when the save is refused as stale', async () => {
    vi.mocked(liveDashboardService.updateDistrict).mockRejectedValueOnce(
      new ApiError('This was changed after you opened it. Reload to see the latest version.', 409, 'CONFLICT'),
    );
    renderAt(TAB);
    await screen.findByText('Pune');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Pune' }));
    fireEvent.change(screen.getByLabelText('Target *'), { target: { value: '50' } });
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('This was changed after you opened it'));
    expect(screen.getByLabelText('Target *')).toHaveValue(50);
  });
});

describe('Section settings page', () => {
  it('saves every setting but the section switch, with the version it was opened at, and returns to the tab', async () => {
    vi.mocked(liveDashboardService.updateSettings).mockResolvedValue(settings());
    renderAt('/cms/live-dashboard/settings');
    expect(await screen.findByLabelText('Heading (English) *')).toHaveValue('Programme Progress – Live Dashboard');
    expect(screen.getByLabelText('Offline count *')).toHaveValue(800);
    expect(screen.getByRole('checkbox', { name: 'Show the training modes card on the website' })).not.toBeChecked();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show the training modes card on the website' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show the note on the website' }));
    fireEvent.change(screen.getByLabelText('Online count *'), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText('Map title (English) *'), { target: { value: '  District   progress ' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => expect(liveDashboardService.updateSettings).toHaveBeenCalledTimes(1));
    const body = vi.mocked(liveDashboardService.updateSettings).mock.calls[0]![0];
    expect(body).toEqual({
      heading: settings().heading,
      subtitle: settings().subtitle,
      disclaimer: settings().disclaimer,
      showDisclaimer: false,
      mapTitle: pair('जिल्हानिहाय प्रगती — महाराष्ट्र', 'District progress'),
      showMap: true,
      modesTitle: settings().modesTitle,
      showModes: true,
      offlineLabel: settings().offlineLabel,
      onlineLabel: settings().onlineLabel,
      offlineCount: 800,
      onlineCount: 250,
      donutCenterLabel: settings().donutCenterLabel,
      expectedUpdatedAt: T.updatedAt,
    });
    expect(body).not.toHaveProperty('showSection');
    await waitFor(() => expect(location()).toHaveTextContent(TAB));
    expect(toasts()).toHaveTextContent('Section settings updated');
  });

  it('names a missing title, a half-filled optional text and a bad count before sending anything', async () => {
    renderAt('/cms/live-dashboard/settings');
    await screen.findByLabelText('Heading (English) *');
    fireEvent.change(screen.getByLabelText('Map title (Marathi) *'), { target: { value: ' ' } });
    fireEvent.change(screen.getByLabelText('Subtitle (English)'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Offline count *'), { target: { value: '-5' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Map title (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Subtitle (English) is required when the Marathi text is filled in')).toBeInTheDocument();
    expect(screen.getByText('Offline count must be a whole number from 0 to 1,00,00,000')).toBeInTheDocument();
    expect(liveDashboardService.updateSettings).not.toHaveBeenCalled();
  });

  it('shows a field message the server returns', async () => {
    vi.mocked(liveDashboardService.updateSettings).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.heading.en', message: 'Heading (English) is too long' }]),
    );
    renderAt('/cms/live-dashboard/settings');
    await screen.findByLabelText('Heading (English) *');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (English) is too long')).toBeInTheDocument();
  });

  it('tells a view-only administrator they cannot change it', async () => {
    auth.permissions = new Set(['cms-livedashboard.view']);
    renderAt('/cms/live-dashboard/settings');
    expect(await screen.findByText('You can view this section but not change it')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
  });
});

describe('Add / Edit KPI card', () => {
  const fill = async () => {
    await userEvent.type(screen.getByLabelText('Title (Marathi) *'), 'मूल्यमापन झालेले');
    await userEvent.type(screen.getByLabelText('Title (English) *'), 'Assessed');
    await userEvent.type(screen.getByLabelText('Value *'), '180');
  };

  it('names the missing fields and refuses a link to another site', async () => {
    renderAt('/cms/live-dashboard/cards/create');
    await userEvent.click(await screen.findByRole('button', { name: 'Save card' }));
    expect(await screen.findByText('Title (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Value is required')).toBeInTheDocument();
    await fill();
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: 'https://example.com' } });
    fireEvent.change(screen.getByLabelText('Detail (English)'), { target: { value: 'pass rate' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save card' }));
    expect(await screen.findByText(/^Link must be a page of this website/)).toBeInTheDocument();
    expect(screen.getByText('Detail (Marathi) is required when the English text is filled in')).toBeInTheDocument();
    expect(liveDashboardCardsService.create).not.toHaveBeenCalled();
  });

  it('previews the card and saves it with an Idempotency-Key, a blank detail as a blank pair', async () => {
    vi.mocked(liveDashboardCardsService.create).mockResolvedValue(card(1));
    renderAt('/cms/live-dashboard/cards/create');
    await screen.findByLabelText('Title (Marathi) *');
    await fill();
    await userEvent.selectOptions(screen.getByLabelText('Colour *'), 'violet');
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: ' /verify ' } });
    expect(screen.getByTestId('kpi-preview-mr')).toHaveTextContent('मूल्यमापन झालेले180');
    expect(screen.getByTestId('kpi-preview-en')).toHaveTextContent('Assessed180');

    await userEvent.click(screen.getByRole('button', { name: 'Save card' }));
    await waitFor(() => expect(liveDashboardCardsService.create).toHaveBeenCalledTimes(1));
    const [body, key] = vi.mocked(liveDashboardCardsService.create).mock.calls[0]!;
    expect(body).toEqual({
      label: pair('मूल्यमापन झालेले', 'Assessed'),
      value: '180',
      detail: BLANK,
      link: '/verify',
      tone: 'violet',
      isActive: true,
    });
    expect(key).toBeTruthy();
    await waitFor(() => expect(location()).toHaveTextContent(TAB));
    expect(toasts()).toHaveTextContent('KPI card added');
  });

  it('edits only what changed, with the version it was opened at', async () => {
    vi.mocked(liveDashboardCardsService.get).mockResolvedValue(card(3));
    vi.mocked(liveDashboardCardsService.update).mockResolvedValue(card(3));
    renderAt(`/cms/live-dashboard/cards/${card(3).id}/edit`);
    expect(await screen.findByLabelText('Value *')).toHaveValue('1,080');
    expect(screen.getByLabelText('Link')).toHaveValue('/eligibility');
    fireEvent.change(screen.getByLabelText('Value *'), { target: { value: '1,100' } });
    fireEvent.change(screen.getByLabelText('Link'), { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(liveDashboardCardsService.update).toHaveBeenCalledWith(card(3).id, { value: '1,100', link: '', expectedUpdatedAt: T.updatedAt }),
    );
    await waitFor(() => expect(location()).toHaveTextContent(TAB));
  });

  it('shows a card’s details and preview on its View page, and deletes it from there', async () => {
    vi.mocked(liveDashboardCardsService.get).mockResolvedValue(card(1));
    vi.mocked(liveDashboardCardsService.remove).mockResolvedValue();
    renderAt(`/cms/live-dashboard/cards/${card(1).id}/view`);
    expect(await screen.findByText('KPI card details')).toBeInTheDocument();
    expect(screen.getByText('/programme')).toBeInTheDocument();
    expect(screen.getByText('Deep orange')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-preview-en')).toHaveTextContent('Total target2,000students');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(liveDashboardCardsService.remove).toHaveBeenCalledWith(card(1).id));
    await waitFor(() => expect(location()).toHaveTextContent(TAB));
  });
});

describe('Add / Edit side figure', () => {
  it('adds a figure with an Idempotency-Key', async () => {
    vi.mocked(liveDashboardStatsService.create).mockResolvedValue(stat(1));
    renderAt('/cms/live-dashboard/stats/create');
    await userEvent.type(await screen.findByLabelText('Label (Marathi) *'), 'जिल्हे मार्गावर');
    await userEvent.type(screen.getByLabelText('Label (English) *'), 'Districts on track');
    await userEvent.type(screen.getByLabelText('Value *'), '21 / 36');
    await userEvent.click(screen.getByRole('button', { name: 'Save figure' }));
    await waitFor(() =>
      expect(liveDashboardStatsService.create).toHaveBeenCalledWith(
        { label: pair('जिल्हे मार्गावर', 'Districts on track'), value: '21 / 36', isActive: true },
        expect.any(String),
      ),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Figure added'));
  });

  it('edits only what changed', async () => {
    vi.mocked(liveDashboardStatsService.get).mockResolvedValue(stat(2));
    vi.mocked(liveDashboardStatsService.update).mockResolvedValue(stat(2));
    renderAt(`/cms/live-dashboard/stats/${stat(2).id}/edit`);
    expect(await screen.findByLabelText('Value *')).toHaveValue('15');
    fireEvent.change(screen.getByLabelText('Value *'), { target: { value: '18' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(liveDashboardStatsService.update).toHaveBeenCalledWith(stat(2).id, { value: '18', expectedUpdatedAt: T.updatedAt }),
    );
  });

  it('refuses a figure value over 30 characters', async () => {
    renderAt('/cms/live-dashboard/stats/create');
    fireEvent.change(await screen.findByLabelText('Value *'), { target: { value: '9'.repeat(31) } });
    await userEvent.click(screen.getByRole('button', { name: 'Save figure' }));
    expect(await screen.findByText('Value must be at most 30 characters')).toBeInTheDocument();
    expect(liveDashboardStatsService.create).not.toHaveBeenCalled();
  });
});

describe('the card link rule', () => {
  it('takes blank or a page of this site, and nothing else — the same rule as the server', () => {
    for (const ok of ['', '  ', '/', '/programme', '/district-office?code=PUN', '/faq#apply']) expect(linkProblem(ok)).toBeUndefined();
    for (const bad of ['programme', '//evil.example', 'https://example.com', 'javascript:alert(1)', '/a b', '/a\\b', `/${'a'.repeat(200)}`])
      expect(linkProblem(bad)).toBeDefined();
  });
});
