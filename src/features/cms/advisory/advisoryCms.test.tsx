import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError, request } from '../../../services/api-client';
import type * as ApiClientModule from '../../../services/api-client';
import type * as AdvisoryServiceModule from './services/advisoryService';
import { ADVISORY_PATH, advisoryMemberEditPath, advisoryMemberViewPath } from './constants';
import AdvisoryList from './pages/AdvisoryList';
import AdvisoryMemberCreate from './pages/AdvisoryMemberCreate';
import AdvisoryMemberEdit from './pages/AdvisoryMemberEdit';
import AdvisoryMemberView from './pages/AdvisoryMemberView';
import AdvisorySettingsEdit from './pages/AdvisorySettingsEdit';
import { advisoryService } from './services/advisoryService';
import type { ApiAdvisoryGroup, ApiAdvisoryMember, ApiAdvisorySection, Bilingual, BilingualList } from './types/advisory.types';
import {
  PROFILE_TOO_LONG,
  emptyMemberForm,
  groupChanges,
  memberChanges,
  memberFormError,
  memberPayload,
  memberServerErrors,
  memberToForm,
  toItems,
  validateGroupForm,
  validateMemberForm,
} from './validation/advisory.validation';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/advisoryService', () => ({
  photoSrc: (url: string | null) => (url ? `/api/v1${url}` : null),
  advisoryService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
    getSection: vi.fn(),
    updateSection: vi.fn(),
    listGroups: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    setGroupStatus: vi.fn(),
    removeGroup: vi.fn(),
    reorderGroups: vi.fn(),
  },
}));
/* Only the service tests at the end reach `request`; the pages talk to the mocked service above. */
vi.mock('../../../services/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClientModule>()),
  request: vi.fn(),
}));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const BLANK = pair('', '');
const items = (mr: string[], en: string[]): BilingualList => ({ mr, en });
const NONE = items([], []);
const ALL = ['cms-advisory.view', 'cms-advisory.create', 'cms-advisory.update', 'cms-advisory.delete'];
const LIST_HINT =
  "One item per line. Fill either language or both — the website shows the visitor's language, or the other one when that is blank.";

/* A blank profile: every list empty, as the API returns it. */
const NO_PROFILE = {
  experience: BLANK,
  administrativeRoles: NONE,
  keyAchievements: NONE,
  majorContributions: NONE,
  researchLeadership: NONE,
  education: NONE,
};

/* A profile filled the way biographies usually arrive: some parts in both languages, some in one only. */
const PROFILE = {
  experience: pair('तांत्रिक शिक्षणातील ३० वर्षे', '30 years in technical education'),
  administrativeRoles: items(['कुलगुरू'], ['Vice Chancellor', 'Director, Technical Education']),
  keyAchievements: items([], ['Set up the AMRUT skill lab', 'National teaching award, 2020']),
  majorContributions: NONE,
  researchLeadership: items(['ऊर्जा संशोधन केंद्र'], []),
  education: items(['पीएच.डी.'], ['Ph.D., IIT Bombay']),
};

const member = (n: number, extra: Partial<ApiAdvisoryMember> = {}): ApiAdvisoryMember => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name: pair(`सदस्य ${n}`, `Member ${n}`),
  designation: pair(`पद ${n}`, `Position ${n}`),
  ...NO_PROFILE,
  photoUrl: null,
  groupId: null,
  group: null,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const group = (n: number, extra: Partial<ApiAdvisoryGroup> = {}): ApiAdvisoryGroup => ({
  id: `10000000-0000-4000-8000-00000000000${n}`,
  name: pair(`गट ${n}`, `Group ${n}`),
  displayOrder: n,
  isActive: true,
  memberCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

/* An Advisory Committee member in the given group, as the API returns it: the id and the group's name. */
const inGroupOf = (g: ApiAdvisoryGroup) => ({ groupId: g.id, group: { id: g.id, name: g.name } });

const section = (): ApiAdvisorySection => ({
  id: 's1',
  heading: pair('सारथी सल्लागार समिती', 'Sarthi Advisory Committee'),
  subtitle: pair('तज्ज्ञ सल्लागार समिती सदस्य', 'The expert Advisory Committee members'),
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
});

const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) =>
  c.charCodeAt(0),
);
const toasts = () => document.getElementById('toast-root')!;

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/advisory-committee" element={<AdvisoryList />} />
        <Route path="/cms/advisory-committee/create" element={<AdvisoryMemberCreate />} />
        <Route path="/cms/advisory-committee/settings" element={<AdvisorySettingsEdit />} />
        <Route path="/cms/advisory-committee/:id/edit" element={<AdvisoryMemberEdit />} />
        <Route path="/cms/advisory-committee/:id/view" element={<AdvisoryMemberView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const LIST = ADVISORY_PATH;
const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
/* The column headings, without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((th) => th.textContent!.replace(/[⇅▲▼]/g, ''));
const names = () => [...document.querySelectorAll('tbody tr b.lnk')].map((b) => b.textContent);

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(advisoryService.list).mockResolvedValue([]);
  vi.mocked(advisoryService.getSection).mockResolvedValue(section());
  vi.mocked(advisoryService.listGroups).mockResolvedValue([]);
});

describe('Advisory Committee list', () => {
  it('renders the section settings and the Advisory Committee members from the API, in display order', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([
      member(1, { photoUrl: '/cms/advisory-committee/photos/a.png' }),
      member(2, { isActive: false, designation: BLANK }),
    ]);
    renderAt(LIST);

    await screen.findByText('Member 1');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Advisory Committee Management');
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Advisory Committee Management']);
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Photo', 'Name', 'Position', 'Group', 'Status', 'Action']);

    const first = row('Member 1');
    expect(within(first).getByRole('img', { name: 'Photo of Member 1' })).toHaveAttribute(
      'src',
      '/api/v1/cms/advisory-committee/photos/a.png',
    );
    expect(within(first).getByText('सदस्य 1')).toBeInTheDocument();
    expect(within(first).getByText('Position 1')).toBeInTheDocument();
    expect(within(first).getByText('पद 1')).toBeInTheDocument();
    expect(within(first).getByRole('switch', { name: 'Member 1: active' })).toHaveAttribute('aria-checked', 'true');

    const second = row('Member 2');
    expect(within(second).getByRole('switch', { name: 'Member 2: inactive' })).toHaveAttribute('aria-checked', 'false');
    /* A blank position shows a dash, and so does "no group". */
    expect(within(second).getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('2 listed, 1 shown on the website')).toBeInTheDocument();
    expect(names()).toEqual(['Member 1', 'Member 2']);

    /* Section settings card */
    expect(await screen.findByText('Sarthi Advisory Committee')).toBeInTheDocument();
    expect(screen.getByText('सारथी सल्लागार समिती')).toBeInTheDocument();
    expect(screen.getByText('The expert Advisory Committee members')).toBeInTheDocument();
  });

  it('shows the loading state, the empty state, and a retryable error', async () => {
    let resolve: (v: ApiAdvisoryMember[]) => void = () => {};
    vi.mocked(advisoryService.list).mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const loading = renderAt(LIST);
    expect(document.querySelector('table[aria-busy="true"]')).not.toBeNull();
    resolve([]);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/Use Add Advisory Committee member to add the first one/)).toBeInTheDocument();
    loading.unmount();

    vi.mocked(advisoryService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([member(1)]);
    renderAt(LIST);
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Member 1')).toBeInTheDocument();
  });

  it('opens Add Advisory Committee member, and Edit settings once the settings have loaded', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([member(1)]);
    const { unmount } = renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: /Add Advisory Committee member/ }));
    expect(currentPath()).toBe('/cms/advisory-committee/create');
    unmount();

    renderAt(LIST);
    const settings = screen.getByRole('button', { name: /Edit settings/ });
    await waitFor(() => expect(settings).toBeEnabled());
    await userEvent.click(settings);
    expect(currentPath()).toBe('/cms/advisory-committee/settings');
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([member(1), member(2)]);
    vi.mocked(advisoryService.get).mockResolvedValue(member(2));
    const { unmount } = renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: 'View Member 2' }));
    expect(currentPath()).toBe(`/cms/advisory-committee/${member(2).id}/view`);
    unmount();

    const again = renderAt(LIST);
    await userEvent.click(await screen.findByText('Member 1'));
    expect(currentPath()).toBe(advisoryMemberViewPath(member(1).id));
    again.unmount();

    renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Member 2' }));
    expect(currentPath()).toBe(`/cms/advisory-committee/${member(2).id}/edit`);
  });

  it('hides an Advisory Committee member through the status switch after asking, by id', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([member(1), member(2)]);
    vi.mocked(advisoryService.setStatus).mockResolvedValue(member(2, { isActive: false }));
    renderAt(LIST);
    await userEvent.click(await screen.findByRole('switch', { name: 'Member 2: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Hide Member 2 from the website?');
    expect(advisoryService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(advisoryService.setStatus).toHaveBeenCalledWith(member(2).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Advisory Committee member hidden from the website'));
    expect(advisoryService.list).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(LIST);
  });

  it('deletes the Advisory Committee member named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([member(1), member(2), member(3)]);
    vi.mocked(advisoryService.remove).mockResolvedValue();
    renderAt(LIST);
    await screen.findByText('Member 2');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Member 2' }));
    let dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Member 2?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(advisoryService.remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Member 2' }));
    dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(advisoryService.remove).toHaveBeenCalledWith(member(2).id));
    expect(advisoryService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Advisory Committee member deleted'));
    expect(advisoryService.list).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(LIST);
  });

  it('reorders by sending the whole list of ids, only while the table shows the website order', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([member(1), member(2), member(3)]);
    vi.mocked(advisoryService.reorder).mockResolvedValue([]);
    renderAt(LIST);
    await screen.findByText('Member 3');
    expect(screen.getByRole('button', { name: 'Move Member 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Member 3 down' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Move Member 3 up' }));
    await waitFor(() => expect(advisoryService.reorder).toHaveBeenCalledWith([member(1).id, member(3).id, member(2).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    expect(currentPath()).toBe(LIST);

    /* Sorted by name descending, the table no longer shows the website order. */
    await userEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    await userEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    expect(names()).toEqual(['Member 3', 'Member 2', 'Member 1']);
    expect(screen.getByRole('button', { name: 'Move Member 2 up' })).toBeDisabled();
    expect(screen.getByText('Sort by Order, ascending, with no search to reorder.')).toBeInTheDocument();
    expect(advisoryService.reorder).toHaveBeenCalledTimes(1);
  });

  it('searches names and positions in both languages', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([
      member(1, { name: pair('अनिल पाटील', 'Anil Patil') }),
      member(2, { name: pair('सुनीता राव', 'Sunita Rao'), designation: pair('प्राचार्य, आयटीआय पुणे', 'Principal, ITI Pune') }),
    ]);
    renderAt(LIST);
    await screen.findByText('Anil Patil');
    const box = screen.getByPlaceholderText('Search name or position...');
    await userEvent.type(box, 'iti pune');
    await waitFor(() => expect(names()).toEqual(['Sunita Rao']));
    await userEvent.clear(box);
    await userEvent.type(box, 'प्राचार्य');
    await waitFor(() => expect(names()).toEqual(['Sunita Rao']));
    await userEvent.clear(box);
    await userEvent.type(box, 'अनिल');
    await waitFor(() => expect(names()).toEqual(['Anil Patil']));
    await userEvent.clear(box);
    await userEvent.type(box, 'nobody');
    expect(await screen.findByText('No Advisory Committee member matches the current search.')).toBeInTheDocument();
  });

  it('gives a view-only administrator View only: no Add, Edit, status switch, Delete, reorder or Edit settings', async () => {
    auth.permissions = new Set(['cms-advisory.view']);
    vi.mocked(advisoryService.list).mockResolvedValue([member(1), member(2)]);
    renderAt(LIST);
    await screen.findByText('Member 1');
    expect(screen.getByRole('button', { name: 'View Member 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Advisory Committee member/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit settings/ })).toBeNull();
    /* The status is still shown, as a badge. */
    expect(within(row('Member 1')).getByText('Active')).toBeInTheDocument();
  });
});

describe('View Advisory Committee member', () => {
  const viewed = () => member(7, { photoUrl: '/cms/advisory-committee/photos/v.png' });
  const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;

  it('shows every field in both languages, under the Advisory Committee Management breadcrumbs', async () => {
    vi.mocked(advisoryService.get).mockResolvedValue(viewed());
    renderAt(advisoryMemberViewPath(viewed().id));

    expect(await screen.findByRole('heading', { name: /Member 7/ })).toHaveTextContent('Member 7Order 7');
    expect(advisoryService.get).toHaveBeenCalledWith(viewed().id);
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Advisory Committee Management', 'View']);
    expect(within(field('Photo')).getByRole('img', { name: 'Photo of Member 7' })).toHaveAttribute(
      'src',
      '/api/v1/cms/advisory-committee/photos/v.png',
    );
    expect(field('Name')).toHaveTextContent('सदस्य 7Member 7');
    expect(field('Position')).toHaveTextContent('पद 7Position 7');
    expect(screen.queryByText('Organisation', { selector: 'td b' })).toBeNull();
    expect(screen.queryByText('Expertise', { selector: 'td b' })).toBeNull();
    expect(field('On the website')).toHaveTextContent('Shown on the Advisory Committee page');
  });

  it('shows the profile: Experience as text and each list as bullets, per language, naming a blank language', async () => {
    vi.mocked(advisoryService.get).mockResolvedValue(member(7, PROFILE));
    renderAt(advisoryMemberViewPath(member(7).id));
    await screen.findByRole('heading', { name: /Member 7/ });

    expect(field('Experience')).toHaveTextContent('तांत्रिक शिक्षणातील ३० वर्षे30 years in technical education');

    const bullets = (label: string, lang: 'mr' | 'en') =>
      [...field(label).querySelectorAll(`[lang="${lang}"] li`)].map((li) => li.textContent);
    expect(bullets('Administrative Roles', 'mr')).toEqual(['कुलगुरू']);
    expect(bullets('Administrative Roles', 'en')).toEqual(['Vice Chancellor', 'Director, Technical Education']);
    expect(bullets('Education', 'en')).toEqual(['Ph.D., IIT Bombay']);

    /* Filled in one language only: the blank one is named, with what the website shows instead. */
    expect(bullets('Key Achievements', 'en')).toEqual(['Set up the AMRUT skill lab', 'National teaching award, 2020']);
    expect(field('Key Achievements')).toHaveTextContent('Marathi: blank — the website shows the English text instead');
    expect(field('Research Leadership')).toHaveTextContent('English: blank — the website shows the Marathi text instead');

    /* Blank in both: a dash (the website leaves the section out). */
    expect(field('Major Contributions').querySelectorAll('td')[2]).toHaveTextContent(/^—$/);
    expect(within(field('Major Contributions')).queryByRole('listitem')).toBeNull();
  });

  it('marks a missing photo and blank texts', async () => {
    vi.mocked(advisoryService.get).mockResolvedValue(member(8, { designation: BLANK, isActive: false }));
    renderAt(advisoryMemberViewPath(member(8).id));
    await screen.findByRole('heading', { name: /Member 8/ });
    expect(field('Photo')).toHaveTextContent('No photo');
    expect(field('Position')).toHaveTextContent('—');
    for (const label of [
      'Experience',
      'Administrative Roles',
      'Key Achievements',
      'Major Contributions',
      'Research Leadership',
      'Education',
    ]) {
      expect(field(label).querySelectorAll('td')[2]).toHaveTextContent(/^—$/);
    }
    expect(field('On the website')).toHaveTextContent('Hidden from the website');
    expect(screen.getByRole('button', { name: 'Show on website' })).toBeInTheDocument();
    expect(field('Group')).toHaveTextContent('No group — listed first on the website, without a heading');
  });

  it("shows the Advisory Committee member's group in both languages, and says when a hidden group hides the Advisory Committee member", async () => {
    const g = group(1, { name: pair('अमृत', 'AMRUT'), isActive: false });
    vi.mocked(advisoryService.get).mockResolvedValue(member(7, inGroupOf(g)));
    vi.mocked(advisoryService.listGroups).mockResolvedValue([g]);
    renderAt(advisoryMemberViewPath(member(7).id));
    await screen.findByRole('heading', { name: /Member 7/ });

    await waitFor(() => expect(field('Group')).toHaveTextContent('Hidden group — the website shows neither its heading nor its Advisory Committee members'));
    expect(field('Group')).toHaveTextContent('अमृतAMRUT');
    expect(field('On the website')).toHaveTextContent('Hidden from the website: its group is hidden');
  });

  it('hides, deletes (after asking) and edits the Advisory Committee member', async () => {
    vi.mocked(advisoryService.get).mockResolvedValue(viewed());
    vi.mocked(advisoryService.setStatus).mockResolvedValue(viewed());
    vi.mocked(advisoryService.remove).mockResolvedValue();
    const { unmount } = renderAt(advisoryMemberViewPath(viewed().id));

    await userEvent.click(await screen.findByRole('button', { name: 'Hide from website' }));
    await waitFor(() => expect(advisoryService.setStatus).toHaveBeenCalledWith(viewed().id, false));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete Member 7?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(advisoryService.remove).toHaveBeenCalledWith(viewed().id));
    await waitFor(() => expect(currentPath()).toBe(LIST));
    unmount();

    renderAt(advisoryMemberViewPath(viewed().id));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(currentPath()).toBe(advisoryMemberEditPath(viewed().id));
  });

  it('gives a view-only administrator no Edit, Hide or Delete', async () => {
    auth.permissions = new Set(['cms-advisory.view']);
    vi.mocked(advisoryService.get).mockResolvedValue(viewed());
    renderAt(advisoryMemberViewPath(viewed().id));
    await screen.findByRole('heading', { name: /Member 7/ });
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Hide from website|Show on website)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });
});

describe('Add Advisory Committee member', () => {
  it('requires the name in both languages', async () => {
    renderAt('/cms/advisory-committee/create');
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Advisory Committee Management', 'Add Advisory Committee member']);
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    expect(await screen.findByText('Name (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Name (English) is required')).toBeInTheDocument();
    expect(advisoryService.create).not.toHaveBeenCalled();
  });

  it('shows Position, Group, Experience and the five profile lists — each list in Marathi and English, with the one-item-per-line hint', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([group(1)]);
    renderAt('/cms/advisory-committee/create');
    expect(screen.getByLabelText('Position (Marathi)')).toBeInTheDocument();
    expect(await within(screen.getByLabelText('Group')).findByRole('option', { name: 'Group 1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Experience (English)').tagName).toBe('TEXTAREA');
    for (const label of ['Administrative Roles', 'Key Achievements', 'Major Contributions', 'Research Leadership', 'Education']) {
      expect(screen.getByLabelText(`${label} (Marathi)`).tagName).toBe('TEXTAREA');
      expect(screen.getByLabelText(`${label} (English)`).tagName).toBe('TEXTAREA');
    }
    expect(screen.getAllByText(LIST_HINT)).toHaveLength(5);
    expect(screen.queryByLabelText(/Organisation|Expertise|Designation/)).toBeNull();
  });

  it('refuses a position filled in one language only, naming the missing half', async () => {
    renderAt('/cms/advisory-committee/create');
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल पाटील');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil Patil');
    await userEvent.type(screen.getByLabelText('Position (English)'), 'Senior Advisor');
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));

    expect(await screen.findByText('Position (Marathi) is required when the English text is filled in')).toBeInTheDocument();
    expect(screen.getByLabelText('Position (Marathi)')).toHaveAttribute('aria-invalid', 'true');
    expect(advisoryService.create).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Position (Marathi)'), 'वरिष्ठ सल्लागार');
    expect(screen.queryByText('Position (Marathi) is required when the English text is filled in')).toBeNull();
  });

  it('accepts a profile filled in one language only, one item per line, without the bullets', async () => {
    vi.mocked(advisoryService.create).mockResolvedValue(member(9));
    renderAt('/cms/advisory-committee/create');
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल पाटील');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil Patil');
    await userEvent.type(screen.getByLabelText('Experience (English)'), '30 years in technical education');
    await userEvent.click(screen.getByLabelText('Key Achievements (English)'));
    await userEvent.paste('• Set up the AMRUT skill lab\n\n  - National award, 2020  \n2) 1.5 lakh trainees\n*\n');
    await userEvent.click(screen.getByLabelText('Education (Marathi)'));
    await userEvent.paste('पीएच.डी.');
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));

    await waitFor(() => expect(advisoryService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(advisoryService.create).mock.calls[0]![0]).toEqual({
      name: pair('अनिल पाटील', 'Anil Patil'),
      designation: BLANK,
      experience: pair('', '30 years in technical education'),
      administrativeRoles: NONE,
      keyAchievements: items([], ['Set up the AMRUT skill lab', 'National award, 2020', '1.5 lakh trainees']),
      majorContributions: NONE,
      researchLeadership: NONE,
      education: items(['पीएच.डी.'], []),
      isActive: true,
    });
  });

  it('refuses more than 30 items, or an item over 400 characters, naming its line', async () => {
    renderAt('/cms/advisory-committee/create');
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल पाटील');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil Patil');
    await userEvent.click(screen.getByLabelText('Administrative Roles (English)'));
    await userEvent.paste(Array.from({ length: 31 }, (_, i) => `Role ${i + 1}`).join('\n'));
    await userEvent.click(screen.getByLabelText('Education (Marathi)'));
    await userEvent.paste(`पीएच.डी.\n\n${'अ'.repeat(401)}`);
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));

    expect(
      await screen.findByText('Administrative Roles (English) may have at most 30 items, one per line (it has 31)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Education (Marathi), line 3: an item must be at most 400 characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Education (Marathi)')).toHaveAttribute('aria-invalid', 'true');
    expect(advisoryService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsupported or renamed photo before uploading anything', async () => {
    renderAt('/cms/advisory-committee/create');
    const input = document.getElementById('advisory-photo-input') as HTMLInputElement;
    await userEvent.upload(input, new File(['GIF89a....'], 'photo.gif', { type: 'image/gif' }), { applyAccept: false });
    expect(await screen.findByText('The photo must be a JPEG, PNG or WebP image')).toBeInTheDocument();
    const big = new File([PNG, new Uint8Array(5 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await userEvent.upload(input, big, { applyAccept: false });
    expect(await screen.findByText('The photo is larger than 5 MB')).toBeInTheDocument();
  });

  it('lets a rejected photo be set aside, so the Advisory Committee member can still be added without one', async () => {
    vi.mocked(advisoryService.create).mockResolvedValue(member(9));
    renderAt('/cms/advisory-committee/create');
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल पाटील');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil Patil');
    const input = document.getElementById('advisory-photo-input') as HTMLInputElement;
    await userEvent.upload(input, new File(['GIF89a....'], 'photo.gif', { type: 'image/gif' }), { applyAccept: false });
    expect(await screen.findByText('The photo must be a JPEG, PNG or WebP image')).toBeInTheDocument();

    /* While the error stands, saving is refused… */
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    expect(advisoryService.create).not.toHaveBeenCalled();

    /* …and there is a way out that does not mean leaving the page. */
    await userEvent.click(screen.getByRole('button', { name: 'Continue without a photo' }));
    expect(screen.queryByText('The photo must be a JPEG, PNG or WebP image')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    await waitFor(() => expect(advisoryService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(advisoryService.create).mock.calls[0]![1]).toBeNull();
  });

  it('clears a photo error when the admin picks Clear after a valid then an invalid file', async () => {
    renderAt('/cms/advisory-committee/create');
    const input = document.getElementById('advisory-photo-input') as HTMLInputElement;
    await userEvent.upload(input, new File([PNG], 'face.png', { type: 'image/png' }));
    expect(await screen.findByText(/uploaded when you save/)).toBeInTheDocument();
    await userEvent.upload(input, new File(['GIF89a....'], 'photo.gif', { type: 'image/gif' }), { applyAccept: false });
    expect(await screen.findByText('The photo must be a JPEG, PNG or WebP image')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText('The photo must be a JPEG, PNG or WebP image')).toBeNull();
    expect(screen.queryByText(/uploaded when you save/)).toBeNull();
  });

  it('saves the bilingual text with the chosen photo in one request', async () => {
    vi.mocked(advisoryService.create).mockResolvedValue(member(9));
    renderAt('/cms/advisory-committee/create');
    const photo = new File([PNG], 'face.png', { type: 'image/png' });
    await userEvent.upload(document.getElementById('advisory-photo-input') as HTMLInputElement, photo);
    expect(await screen.findByText(/uploaded when you save/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल  पाटील ');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil Patil');
    await userEvent.type(screen.getByLabelText('Position (Marathi)'), 'प्राचार्य, आयटीआय पुणे');
    await userEvent.type(screen.getByLabelText('Position (English)'), 'Principal, ITI Pune');
    await userEvent.click(screen.getByLabelText('Administrative Roles (Marathi)'));
    await userEvent.paste('प्राचार्य\nविभाग प्रमुख');
    await userEvent.click(screen.getByLabelText('Administrative Roles (English)'));
    await userEvent.paste('Principal\nHead of Department');
    await userEvent.click(screen.getByRole('checkbox', { name: /Shown on the website/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));

    await waitFor(() => expect(advisoryService.create).toHaveBeenCalledTimes(1));
    const [input, file] = vi.mocked(advisoryService.create).mock.calls[0]!;
    expect(file).toBe(photo);
    expect(input).toEqual({
      name: pair('अनिल पाटील', 'Anil Patil'),
      designation: pair('प्राचार्य, आयटीआय पुणे', 'Principal, ITI Pune'),
      ...NO_PROFILE,
      administrativeRoles: items(['प्राचार्य', 'विभाग प्रमुख'], ['Principal', 'Head of Department']),
      isActive: false,
    });
    await waitFor(() => expect(currentPath()).toBe(LIST));
    expect(toasts()).toHaveTextContent('Advisory Committee member added');
  });

  it('sends no photo when none was chosen, and shows a server message on its field', async () => {
    vi.mocked(advisoryService.create).mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.name.en', message: 'Name (English) is not allowed' }]),
    );
    renderAt('/cms/advisory-committee/create');
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil');
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    expect(await screen.findByText('Name (English) is not allowed')).toBeInTheDocument();
    expect(vi.mocked(advisoryService.create).mock.calls[0]![1]).toBeNull();
    expect(screen.getByLabelText('Name (Marathi) *')).toHaveValue('अनिल');
    expect(currentPath()).toBe('/cms/advisory-committee/create');
  });

  it('shows a server message about one list item on that list, naming the line the item is on', async () => {
    vi.mocked(advisoryService.create).mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.keyAchievements.en.1', message: 'Key Achievements (English) item 2 contains characters that are not allowed' },
      ]),
    );
    renderAt('/cms/advisory-committee/create');
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil');
    const area = screen.getByLabelText('Key Achievements (English)');
    await userEvent.click(area);
    await userEvent.paste('First\n\n• Second');
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));

    expect(
      await screen.findByText('Line 3: Key Achievements (English) item 2 contains characters that are not allowed'),
    ).toBeInTheDocument();
    expect(area).toHaveAttribute('aria-invalid', 'true');
    expect(area).toHaveValue('First\n\n• Second');
    expect(toasts()).not.toHaveTextContent('Validation failed');
  });

  it('shows a server message with no field on this form as a toast, not swallowed', async () => {
    vi.mocked(advisoryService.create).mockRejectedValue(
      new ApiError('Unrecognized key: organisation', 422, 'VALIDATION_ERROR', [
        { field: 'body', message: 'Unrecognized key: organisation' },
      ]),
    );
    renderAt('/cms/advisory-committee/create');
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil');
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Unrecognized key: organisation'));
    expect(currentPath()).toBe('/cms/advisory-committee/create');
  });

  it('explains the missing permission instead of showing the form', () => {
    auth.permissions = new Set(['cms-advisory.view']);
    renderAt('/cms/advisory-committee/create');
    expect(screen.getByText('You can view this section but not add Advisory Committee members')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Advisory Committee member' })).toBeNull();
  });
});

describe('Edit Advisory Committee member', () => {
  it('loads the saved record and sends only what changed, with the version it was opened at', async () => {
    const saved = member(4, { photoUrl: '/cms/advisory-committee/photos/b.png' });
    vi.mocked(advisoryService.get).mockResolvedValue(saved);
    vi.mocked(advisoryService.update).mockResolvedValue(saved);
    renderAt(advisoryMemberEditPath(saved.id));

    const position = await screen.findByLabelText('Position (English)');
    expect(position).toHaveValue('Position 4');
    expect(screen.getByLabelText('Name (Marathi) *')).toHaveValue('सदस्य 4');
    expect(screen.getByRole('img', { name: 'Photo preview' }).querySelector('img')).toHaveAttribute(
      'src',
      '/api/v1/cms/advisory-committee/photos/b.png',
    );

    await userEvent.clear(position);
    await userEvent.type(position, 'New position');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(advisoryService.update).toHaveBeenCalledTimes(1));
    expect(vi.mocked(advisoryService.update).mock.calls[0]).toEqual([
      saved.id,
      { designation: pair('पद 4', 'New position'), expectedUpdatedAt: saved.updatedAt },
      null,
    ]);
  });

  it('clears the position when both languages are emptied', async () => {
    const saved = member(4);
    vi.mocked(advisoryService.get).mockResolvedValue(saved);
    vi.mocked(advisoryService.update).mockResolvedValue(saved);
    renderAt(advisoryMemberEditPath(saved.id));
    await userEvent.clear(await screen.findByLabelText('Position (Marathi)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Position (Marathi) is required when the English text is filled in')).toBeInTheDocument();
    expect(advisoryService.update).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText('Position (English)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(advisoryService.update).toHaveBeenCalledWith(saved.id, { designation: BLANK, expectedUpdatedAt: saved.updatedAt }, null),
    );
  });

  it('loads each profile list one item per line, and sends only the parts that changed', async () => {
    const saved = member(4, PROFILE);
    vi.mocked(advisoryService.get).mockResolvedValue(saved);
    vi.mocked(advisoryService.update).mockResolvedValue(saved);
    renderAt(advisoryMemberEditPath(saved.id));

    const roles = await screen.findByLabelText('Administrative Roles (English)');
    expect(roles).toHaveValue('Vice Chancellor\nDirector, Technical Education');
    expect(screen.getByLabelText('Key Achievements (Marathi)')).toHaveValue('');
    expect(screen.getByLabelText('Experience (English)')).toHaveValue('30 years in technical education');

    /* Adding a Marathi list next to an English-only one, and emptying one language of the experience. */
    await userEvent.click(screen.getByLabelText('Key Achievements (Marathi)'));
    await userEvent.paste('• अमृत कौशल्य प्रयोगशाळा');
    await userEvent.clear(screen.getByLabelText('Experience (Marathi)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(advisoryService.update).toHaveBeenCalledTimes(1));
    expect(vi.mocked(advisoryService.update).mock.calls[0]).toEqual([
      saved.id,
      {
        experience: pair('', '30 years in technical education'),
        keyAchievements: items(['अमृत कौशल्य प्रयोगशाळा'], PROFILE.keyAchievements.en),
        expectedUpdatedAt: saved.updatedAt,
      },
      null,
    ]);
  });

  it('sends nothing but the version when a list is only re-typed with bullets and blank lines', async () => {
    const saved = member(4, PROFILE);
    vi.mocked(advisoryService.get).mockResolvedValue(saved);
    vi.mocked(advisoryService.update).mockResolvedValue(saved);
    renderAt(advisoryMemberEditPath(saved.id));
    const roles = await screen.findByLabelText('Administrative Roles (English)');
    await userEvent.clear(roles);
    await userEvent.click(roles);
    await userEvent.paste('- Vice Chancellor\n\n- Director,  Technical Education\n');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(advisoryService.update).toHaveBeenCalledWith(saved.id, { expectedUpdatedAt: saved.updatedAt }, null));
  });

  it('removes the photo only when asked', async () => {
    const saved = member(5, { photoUrl: '/cms/advisory-committee/photos/c.png' });
    vi.mocked(advisoryService.get).mockResolvedValue(saved);
    vi.mocked(advisoryService.update).mockResolvedValue(saved);
    renderAt(advisoryMemberEditPath(saved.id));
    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(advisoryService.update).toHaveBeenCalledWith(saved.id, { expectedUpdatedAt: saved.updatedAt, removePhoto: true }, null),
    );
  });

  it('shows the conflict message when someone else saved first, and stays on the form', async () => {
    const saved = member(6);
    vi.mocked(advisoryService.get).mockResolvedValue(saved);
    vi.mocked(advisoryService.update).mockRejectedValue(
      new ApiError('This Advisory Committee member was changed after you opened it. Reload to see the latest version.', 409, 'CONFLICT'),
    );
    renderAt(advisoryMemberEditPath(saved.id));
    await userEvent.type(await screen.findByLabelText('Name (English) *'), ' Jr');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('This Advisory Committee member was changed after you opened it.'));
    expect(currentPath()).toBe(advisoryMemberEditPath(saved.id));
  });
});

describe('Section settings', () => {
  it('requires the heading in both languages and the subtitle in both or neither, then saves with the loaded version', async () => {
    vi.mocked(advisoryService.updateSection).mockResolvedValue(section());
    renderAt('/cms/advisory-committee/settings');
    const headingMr = await screen.findByLabelText('Heading (Marathi) *');
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Advisory Committee Management', 'Section settings']);
    await userEvent.clear(headingMr);
    await userEvent.clear(screen.getByLabelText('Subtitle (English)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Subtitle (English) is required when the Marathi text is filled in')).toBeInTheDocument();
    expect(advisoryService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(headingMr, 'सल्लागार समिती');
    await userEvent.clear(screen.getByLabelText('Subtitle (Marathi)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(advisoryService.updateSection).toHaveBeenCalledWith({
        heading: pair('सल्लागार समिती', 'Sarthi Advisory Committee'),
        subtitle: BLANK,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
    await waitFor(() => expect(currentPath()).toBe(LIST));
    expect(toasts()).toHaveTextContent('Section settings updated');
  });

  it('shows the conflict message when the settings were changed elsewhere', async () => {
    vi.mocked(advisoryService.updateSection).mockRejectedValue(
      new ApiError('The section settings were changed after you opened them.', 409, 'CONFLICT'),
    );
    renderAt('/cms/advisory-committee/settings');
    await userEvent.type(await screen.findByLabelText('Heading (English) *'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The section settings were changed after you opened them.'));
    expect(currentPath()).toBe('/cms/advisory-committee/settings');
  });
});

describe('advisoryService', () => {
  const real = () => vi.importActual<typeof AdvisoryServiceModule>('./services/advisoryService');
  const input = {
    name: pair('अनिल', 'Anil'),
    designation: BLANK,
    ...NO_PROFILE,
    keyAchievements: items(['पहिले'], ['First', 'Second']),
    isActive: true,
  };

  beforeEach(() => {
    vi.mocked(request).mockResolvedValue({ success: true, message: 'ok', data: null } as never);
  });

  it('sends JSON without a photo, and multipart (data + photo) with one', async () => {
    const { advisoryService: svc } = await real();
    await svc.create(input, null);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee', { method: 'POST', body: input });

    const photo = new File([PNG], 'face.png', { type: 'image/png' });
    await svc.create(input, photo);
    const body = vi.mocked(request).mock.lastCall![1]!.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(JSON.parse(body.get('data') as string)).toEqual(input);
    expect((body.get('photo') as File).name).toBe('face.png');

    const changes = { expectedUpdatedAt: '2026-10-02T10:00:00.000Z', removePhoto: true };
    await svc.update('id/1', changes, null);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/id%2F1', { method: 'PATCH', body: changes });
  });

  it('uses the contract paths for status, delete, reorder and settings', async () => {
    const { advisoryService: svc } = await real();
    await svc.setStatus('m1', false);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/m1/status', { method: 'PATCH', body: { isActive: false } });
    await svc.remove('m1');
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/m1', { method: 'DELETE' });
    await svc.reorder(['b', 'a']);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/order', { method: 'PUT', body: { ids: ['b', 'a'] } });
    await svc.getSection();
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/settings');
    const settings = { heading: pair('अ', 'A'), subtitle: BLANK, expectedUpdatedAt: 'v1' };
    await svc.updateSection(settings);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/settings', { method: 'PUT', body: settings });
    await svc.list();
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee');
  });

  it('uses the contract paths for the groups', async () => {
    const { advisoryService: svc } = await real();
    await svc.listGroups();
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/groups');
    const created = { name: pair('अमृत', 'AMRUT'), isActive: true };
    await svc.createGroup(created);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/groups', { method: 'POST', body: created });
    const changes = { isActive: false, expectedUpdatedAt: 'v1' };
    await svc.updateGroup('g/1', changes);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/groups/g%2F1', { method: 'PATCH', body: changes });
    await svc.setGroupStatus('g1', true);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/groups/g1/status', { method: 'PATCH', body: { isActive: true } });
    await svc.removeGroup('g1');
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/groups/g1', { method: 'DELETE' });
    await svc.reorderGroups(['b', 'a']);
    expect(request).toHaveBeenLastCalledWith('/cms/advisory-committee/groups/order', { method: 'PUT', body: { ids: ['b', 'a'] } });
  });
});

describe('advisory validation', () => {
  const named = { ...emptyMemberForm(), name: pair('अनिल', 'Anil') };

  it('reads a list one item per line: trimmed, bullet markers and numbering stripped, blank lines dropped', () => {
    expect(toItems('• One\r\n\n  -  Two  \n* Three\n– Four\n5. Five\n6) Six\n•\n\n')).toEqual([
      'One',
      'Two',
      'Three',
      'Four',
      'Five',
      'Six',
    ]);
    /* Only a marker at the start is stripped, and (but for •) only when a space follows it. */
    expect(toItems('1.5 lakh trainees\nA - B\n2020: award\n-5 °C\n•Tight')).toEqual([
      '1.5 lakh trainees',
      'A - B',
      '2020: award',
      '-5 °C',
      'Tight',
    ]);
    expect(toItems('')).toEqual([]);
  });

  it('strips numbering in Marathi digits too ("१." / "१)"), still keeping an item that only starts with a number', () => {
    expect(toItems('१. पहिले\n२) दुसरे\n१०. दहावे\n१.५ लाख प्रशिक्षणार्थी\n२०२०: पुरस्कार\n१२३४. चार अंकी')).toEqual([
      'पहिले',
      'दुसरे',
      'दहावे',
      '१.५ लाख प्रशिक्षणार्थी',
      '२०२०: पुरस्कार',
      /* At most three digits, as for "1." numbering: a year-like number is part of the item. */
      '१२३४. चार अंकी',
    ]);
  });

  it('turns a refusal of the save as a whole into a form message: too large means the lists are too long', () => {
    expect(memberFormError(413, 'Request body too large', [])).toBe(PROFILE_TOO_LONG);
    expect(memberFormError(400, 'Invalid upload: Field value too long', [])).toBe(PROFILE_TOO_LONG);
    expect(
      memberFormError(422, 'Validation failed', [
        { field: 'body.data', message: 'The Advisory Committee member is larger than 256 KB; shorten the profile' },
      ]),
    ).toBe(PROFILE_TOO_LONG);
    /* Another message about "data" is shown as worded. */
    expect(memberFormError(422, 'Validation failed', [{ field: 'body.data', message: 'data must be valid JSON' }])).toBe(
      'data must be valid JSON',
    );
    /* A field's own "too long" stays on that field, and other refusals are not about the whole form. */
    expect(memberFormError(422, 'Validation failed', [{ field: 'body.name.en', message: 'Name (English) is too long' }])).toBeUndefined();
    expect(memberFormError(422, 'Validation failed', [{ field: 'photo', message: 'The photo is larger than 5 MB' }])).toBeUndefined();
    expect(memberFormError(400, 'Malformed JSON request body', [])).toBeUndefined();
    expect(memberFormError(409, 'This Advisory Committee member was changed after you opened it.', [])).toBeUndefined();
  });

  it('sends a group only when one is chosen, and null to take an Advisory Committee member out of its group', () => {
    expect(memberPayload(named)).not.toHaveProperty('groupId');
    expect(memberPayload({ ...named, groupId: 'g1' }).groupId).toBe('g1');
    const saved = member(1, { groupId: 'g1', group: { id: 'g1', name: pair('अमृत', 'AMRUT') } });
    expect(memberToForm(saved).groupId).toBe('g1');
    expect(memberChanges(saved, memberToForm(saved))).toEqual({ expectedUpdatedAt: saved.updatedAt });
    expect(memberChanges(saved, { ...memberToForm(saved), groupId: '' })).toEqual({ groupId: null, expectedUpdatedAt: saved.updatedAt });
    expect(memberChanges(member(2), { ...memberToForm(member(2)), groupId: 'g2' })).toEqual({
      groupId: 'g2',
      expectedUpdatedAt: member(2).updatedAt,
    });
  });

  it('requires a group name in both languages, up to 200 characters, and sends only what changed', () => {
    expect(validateGroupForm({ name: pair(' ', ''), isActive: true })).toEqual({
      'name.mr': 'Group name (Marathi) is required',
      'name.en': 'Group name (English) is required',
    });
    const long = validateGroupForm({ name: pair('अ'.repeat(200), 'A'.repeat(201)), isActive: true });
    expect(long['name.mr']).toBeUndefined();
    expect(long['name.en']).toBe('Group name (English) must be at most 200 characters');

    const saved = group(1);
    expect(groupChanges(saved, { name: pair(' गट  1', 'Group 1'), isActive: true })).toEqual({ expectedUpdatedAt: saved.updatedAt });
    expect(groupChanges(saved, { name: saved.name, isActive: false })).toEqual({ isActive: false, expectedUpdatedAt: saved.updatedAt });
  });

  it('lets each profile part be filled in one language only, and checks only the limits', () => {
    const oneLanguage = validateMemberForm({ ...named, experience: pair('', 'Thirty years'), education: pair('पीएच.डी.', '') });
    expect(Object.values(oneLanguage).filter(Boolean)).toEqual([]);
    const errors = validateMemberForm({
      ...named,
      experience: pair('x'.repeat(1001), ''),
      designation: pair('प'.repeat(301), 'P'.repeat(301)),
      researchLeadership: pair('', `ok\n${'r'.repeat(400)}`),
    });
    expect(errors['experience.mr']).toBe('Experience (Marathi) must be at most 1000 characters');
    expect(errors['designation.en']).toBe('Position (English) must be at most 300 characters');
    /* Exactly 400 characters is allowed. */
    expect(errors['researchLeadership.en']).toBeUndefined();
  });

  it('compares lists item by item, so an unchanged list is never sent', () => {
    const saved = member(1, PROFILE);
    expect(memberChanges(saved, memberToForm(saved))).toEqual({ expectedUpdatedAt: saved.updatedAt });
    const edited = { ...memberToForm(saved), education: pair('पीएच.डी.', 'Ph.D., IIT Bombay\nM.Tech., COEP') };
    expect(memberChanges(saved, edited)).toEqual({
      education: items(['पीएच.डी.'], ['Ph.D., IIT Bombay', 'M.Tech., COEP']),
      expectedUpdatedAt: saved.updatedAt,
    });
  });

  it('maps server field paths onto the form, a list item onto its list naming its line', () => {
    const sent = { ...named, education: pair('', '\nB.E.\n\n- M.E.') };
    expect(
      memberServerErrors(
        [
          { field: 'body.education.en.1', message: 'Too long' },
          { field: 'body.education.mr.4', message: 'Not allowed' },
          { field: 'body.designation.mr', message: 'Position (Marathi) is required' },
          { field: 'body.keyAchievements', message: 'Key Achievements must be a list' },
          { field: 'body.organisation', message: 'Unrecognized key' },
          { field: 'body', message: 'Unrecognized key' },
          { message: 'No field' },
        ],
        sent,
      ),
    ).toEqual({
      'education.en': 'Line 4: Too long',
      /* An item the form cannot find (the server read the lines differently) is named by its number. */
      'education.mr': 'Item 5: Not allowed',
      'designation.mr': 'Position (Marathi) is required',
      keyAchievements: 'Key Achievements must be a list',
    });
  });
});

describe('Advisory groups (list page)', () => {
  const AMRUT = group(1, { name: pair('अमृत', 'AMRUT'), memberCount: 2 });
  const COEP = group(2, { name: pair('सीओईपी', 'COEP'), isActive: false, memberCount: 1 });
  const card = () => screen.getByRole('heading', { name: /^Groups/ }).closest('.card') as HTMLElement;
  const groupRows = () => within(card()).getAllByRole('row').slice(1);
  const optionTexts = (select: HTMLElement) =>
    within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);

  it('explains what groups are for while there are none, and offers no group filter', async () => {
    vi.mocked(advisoryService.list).mockResolvedValue([member(1)]);
    renderAt(LIST);
    expect(await screen.findByText(/Optional: show Advisory Committee members under headings such as the organisation they belong to/)).toBeInTheDocument();
    await screen.findByText('Member 1');
    expect(screen.queryByLabelText('Group')).toBeNull();
    expect(screen.getByRole('button', { name: /Add group/ })).toBeInTheDocument();
  });

  it("lists the groups in website order with their Advisory Committee member counts, and each Advisory Committee member's group, hidden groups marked", async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT, COEP]);
    vi.mocked(advisoryService.list).mockResolvedValue([member(1, inGroupOf(AMRUT)), member(2, inGroupOf(COEP)), member(3)]);
    renderAt(LIST);
    await screen.findByText('2 Advisory Committee members');

    const [first, second] = groupRows();
    expect(groupRows()).toHaveLength(2);
    expect(first).toHaveTextContent('AMRUT');
    expect(within(first!).getByText('अमृत')).toHaveAttribute('lang', 'mr');
    expect(within(first!).getByRole('switch', { name: 'Group AMRUT: active' })).toHaveAttribute('aria-checked', 'true');
    expect(second).toHaveTextContent('COEP');
    expect(second).toHaveTextContent('1 Advisory Committee member');
    expect(within(second!).getByRole('switch', { name: 'Group COEP: inactive' })).toHaveAttribute('aria-checked', 'false');

    await screen.findByText('Member 1');
    expect(within(row('Member 1')).getByText('AMRUT')).toBeInTheDocument();
    expect(within(row('Member 2')).getByText('(hidden)')).toBeInTheDocument();
    /* Member 2 is active, but its group is hidden, so the website does not show it. */
    expect(screen.getByText('3 listed, 2 shown on the website')).toBeInTheDocument();
  });

  it('adds a group in a dialog, requiring the name in both languages', async () => {
    vi.mocked(advisoryService.createGroup).mockResolvedValue(group(1));
    renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: /Add group/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Add group');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add group' }));
    expect(await within(dialog).findByText('Group name (Marathi) is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Group name (English) is required')).toBeInTheDocument();
    expect(advisoryService.createGroup).not.toHaveBeenCalled();

    const long = 'ACADEMY OF MAHARASHTRA RESEARCH, UPLIFTMENT AND TRAINING (AMRUT)';
    await userEvent.type(within(dialog).getByLabelText('Group name (Marathi) *'), 'अमृत');
    await userEvent.type(within(dialog).getByLabelText('Group name (English) *'), ` ${long}  `);
    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Shown on the website/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add group' }));

    await waitFor(() => expect(advisoryService.createGroup).toHaveBeenCalledWith({ name: pair('अमृत', long), isActive: false }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(toasts()).toHaveTextContent('Group added');
    expect(advisoryService.listGroups).toHaveBeenCalledTimes(2);
    expect(advisoryService.list).toHaveBeenCalledTimes(2);
  });

  it('keeps the dialog open with what was typed when the server refuses a duplicate name', async () => {
    vi.mocked(advisoryService.createGroup).mockRejectedValue(new ApiError('A group named "AMRUT" already exists.', 409, 'CONFLICT'));
    renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: /Add group/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Group name (Marathi) *'), 'अमृत');
    await userEvent.type(within(dialog).getByLabelText('Group name (English) *'), 'AMRUT');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add group' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('A group named "AMRUT" already exists.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Group name (English) *')).toHaveValue('AMRUT');
  });

  it('edits a group, sending only what changed with the version it was opened at', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT]);
    vi.mocked(advisoryService.updateGroup).mockResolvedValue(AMRUT);
    renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit group AMRUT' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Edit group');
    expect(within(dialog).getByLabelText('Group name (Marathi) *')).toHaveValue('अमृत');
    const en = within(dialog).getByLabelText('Group name (English) *');
    await userEvent.clear(en);
    await userEvent.type(en, 'AMRUT Pune');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save group' }));

    await waitFor(() =>
      expect(advisoryService.updateGroup).toHaveBeenCalledWith(AMRUT.id, {
        name: pair('अमृत', 'AMRUT Pune'),
        expectedUpdatedAt: AMRUT.updatedAt,
      }),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Group updated'));
    /* The Advisory Committee members table shows the group names too, so it is reloaded with the groups. */
    expect(advisoryService.list).toHaveBeenCalledTimes(2);
  });

  it('hides a group through its switch after asking, by id', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT]);
    vi.mocked(advisoryService.setGroupStatus).mockResolvedValue({ ...AMRUT, isActive: false });
    renderAt(LIST);
    await userEvent.click(await screen.findByRole('switch', { name: 'Group AMRUT: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Hide group "AMRUT" from the website? Its heading and the Advisory Committee members in it are hidden with it');
    expect(advisoryService.setGroupStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, hide' }));
    await waitFor(() => expect(advisoryService.setGroupStatus).toHaveBeenCalledWith(AMRUT.id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Group hidden from the website'));
    expect(advisoryService.setStatus).not.toHaveBeenCalled();
  });

  it('says a group with Advisory Committee members needs them moved first, deletes an empty group — and Cancel deletes nothing', async () => {
    const EMPTY = group(3, { name: pair('रिक्त', 'Empty') });
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT, COEP, EMPTY]);
    vi.mocked(advisoryService.list).mockResolvedValue([member(1, inGroupOf(AMRUT)), member(2, inGroupOf(AMRUT))]);
    vi.mocked(advisoryService.removeGroup).mockResolvedValue({ membersUngrouped: 0 });
    renderAt(LIST);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete group COEP' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Delete group "COEP"? Its 1 Advisory Committee member must first move to another group, or out of every group.',
    );
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete group AMRUT' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Delete group "AMRUT"? Its 2 Advisory Committee members must first move to another group, or out of every group.',
    );
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(advisoryService.removeGroup).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete group Empty' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete group "Empty"? It has no Advisory Committee members.');
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(advisoryService.removeGroup).toHaveBeenCalledWith(EMPTY.id));
    await waitFor(() => expect(toasts()).toHaveTextContent('Group deleted'));
    expect(advisoryService.removeGroup).toHaveBeenCalledTimes(1);
    expect(advisoryService.remove).not.toHaveBeenCalled();
    /* Both lists are reloaded after a group is deleted. */
    expect(advisoryService.listGroups).toHaveBeenCalledTimes(2);
    expect(advisoryService.list).toHaveBeenCalledTimes(2);
  });

  it('reorders the groups by sending every group id in the new order', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([group(1), group(2), group(3)]);
    vi.mocked(advisoryService.reorderGroups).mockResolvedValue([]);
    renderAt(LIST);
    await screen.findByRole('button', { name: 'Move group Group 3 up' });
    expect(screen.getByRole('button', { name: 'Move group Group 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move group Group 3 down' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Move group Group 3 up' }));
    await waitFor(() => expect(advisoryService.reorderGroups).toHaveBeenCalledWith([group(1).id, group(3).id, group(2).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Group order updated'));
    expect(advisoryService.reorder).not.toHaveBeenCalled();
  });

  it('reloads the groups when the reorder is refused, rather than keep a stale order', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([group(1), group(2)]);
    vi.mocked(advisoryService.reorderGroups).mockRejectedValue(new ApiError('The groups changed meanwhile.', 409, 'CONFLICT'));
    renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: 'Move group Group 2 up' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The groups changed meanwhile.'));
    await waitFor(() => expect(advisoryService.listGroups).toHaveBeenCalledTimes(2));
  });

  it('gives a view-only administrator the groups without Add, Edit, Delete, reorder or the switch', async () => {
    auth.permissions = new Set(['cms-advisory.view']);
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT, COEP]);
    renderAt(LIST);
    await screen.findByText('2 Advisory Committee members');
    expect(screen.queryByRole('button', { name: /Add group/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /group/ })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(within(groupRows()[1]!).getByText('Inactive')).toBeInTheDocument();
  });

  it('filters the Advisory Committee members by group, and moves an Advisory Committee member within the chosen group', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT, COEP]);
    vi.mocked(advisoryService.list).mockResolvedValue([
      member(1, inGroupOf(AMRUT)),
      member(2),
      member(3, inGroupOf(AMRUT)),
      member(4, inGroupOf(COEP)),
    ]);
    vi.mocked(advisoryService.reorder).mockResolvedValue([]);
    renderAt(LIST);
    const filter = await screen.findByLabelText('Group');
    expect(optionTexts(filter)).toEqual(['All groups', 'No group', 'AMRUT', 'COEP (hidden)']);
    await screen.findByText('Member 4');

    await userEvent.selectOptions(filter, AMRUT.id);
    await waitFor(() => expect(names()).toEqual(['Member 1', 'Member 3']));
    expect(screen.getByText('filtered')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Member 3 down' })).toBeDisabled();

    /* Up from Member 3 is Member 1 — the Advisory Committee member above it under the AMRUT heading — not Member 2. */
    await userEvent.click(screen.getByRole('button', { name: 'Move Member 3 up' }));
    await waitFor(() => expect(advisoryService.reorder).toHaveBeenCalledWith([member(3).id, member(2).id, member(1).id, member(4).id]));

    await userEvent.selectOptions(filter, 'none');
    await waitFor(() => expect(names()).toEqual(['Member 2']));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(names()).toEqual(['Member 1', 'Member 2', 'Member 3', 'Member 4']));
  });
});

describe('Advisory Committee member group', () => {
  const AMRUT = group(1, { name: pair('अमृत', 'AMRUT') });
  const COEP = group(2, { name: pair('सीओईपी', 'COEP'), isActive: false });
  const optionTexts = (select: HTMLElement) =>
    within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);
  const fillName = async () => {
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल पाटील');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil Patil');
  };

  it('offers No group and every group in website order, hidden ones marked, and sends the chosen one', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT, COEP]);
    vi.mocked(advisoryService.create).mockResolvedValue(member(9));
    renderAt('/cms/advisory-committee/create');
    const select = screen.getByLabelText('Group');
    expect(select).toHaveValue('');
    await waitFor(() => expect(optionTexts(select)).toEqual(['No group', 'AMRUT', 'COEP (hidden)']));

    await fillName();
    await userEvent.selectOptions(select, COEP.id);
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    await waitFor(() => expect(advisoryService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(advisoryService.create).mock.calls[0]![0]).toMatchObject({
      name: pair('अनिल पाटील', 'Anil Patil'),
      groupId: COEP.id,
    });
  });

  it("starts from the Advisory Committee member's group — named while the groups load — and takes the Advisory Committee member out of it with null", async () => {
    const saved = member(4, inGroupOf(AMRUT));
    vi.mocked(advisoryService.get).mockResolvedValue(saved);
    vi.mocked(advisoryService.update).mockResolvedValue(saved);
    let resolve: (v: ApiAdvisoryGroup[]) => void = () => {};
    vi.mocked(advisoryService.listGroups).mockReturnValue(new Promise((r) => (resolve = r)));
    renderAt(advisoryMemberEditPath(saved.id));

    const select = await screen.findByLabelText('Group');
    expect(select).toHaveValue(AMRUT.id);
    expect(optionTexts(select)).toEqual(['No group', 'AMRUT']);
    resolve([AMRUT, COEP]);
    await waitFor(() => expect(optionTexts(select)).toEqual(['No group', 'AMRUT', 'COEP (hidden)']));
    expect(select).toHaveValue(AMRUT.id);

    await userEvent.selectOptions(select, '');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(advisoryService.update).toHaveBeenCalledWith(saved.id, { groupId: null, expectedUpdatedAt: saved.updatedAt }, null),
    );
  });

  it('shows the server message about the group on the Group select', async () => {
    vi.mocked(advisoryService.listGroups).mockResolvedValue([AMRUT]);
    vi.mocked(advisoryService.create).mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.groupId', message: 'Choose an existing group' }]),
    );
    renderAt('/cms/advisory-committee/create');
    await fillName();
    const select = screen.getByLabelText('Group');
    await waitFor(() => expect(optionTexts(select)).toContain('AMRUT'));
    await userEvent.selectOptions(select, AMRUT.id);
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    expect(await screen.findByText('Choose an existing group')).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(toasts()).not.toHaveTextContent('Validation failed');
  });

  it('still offers No group when the groups cannot be loaded, with a retry', async () => {
    vi.mocked(advisoryService.listGroups)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([AMRUT]);
    renderAt('/cms/advisory-committee/create');
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    expect(optionTexts(screen.getByLabelText('Group'))).toEqual(['No group']);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(optionTexts(screen.getByLabelText('Group'))).toEqual(['No group', 'AMRUT']));
  });
});

describe('Advisory Committee member save refused for its size', () => {
  const fillName = async () => {
    await userEvent.type(screen.getByLabelText('Name (Marathi) *'), 'अनिल');
    await userEvent.type(screen.getByLabelText('Name (English) *'), 'Anil');
  };

  it.each([
    ['a 413 from the body limit', new ApiError('Request body too large', 413, 'PAYLOAD_TOO_LARGE')],
    ['a 400 from the upload field limit', new ApiError('Invalid upload: Field value too long', 400, 'BAD_REQUEST')],
    [
      'a 422 on the "data" field',
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.data', message: 'The Advisory Committee member is too large to save' }]),
    ],
  ])('says the profile is too long on the form, not in a toast, for %s', async (_case, err) => {
    vi.mocked(advisoryService.create).mockRejectedValue(err);
    renderAt('/cms/advisory-committee/create');
    await fillName();
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));

    expect(await screen.findByText(PROFILE_TOO_LONG)).toBeInTheDocument();
    expect(screen.getByText(PROFILE_TOO_LONG).closest('[role="alert"]')).not.toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(toasts()).not.toHaveTextContent(err.message);
    expect(currentPath()).toBe('/cms/advisory-committee/create');
    expect(screen.getByLabelText('Name (English) *')).toHaveValue('Anil');
  });

  it('shows another message about the "data" field on the form as worded, and clears it on the next save', async () => {
    vi.mocked(advisoryService.create)
      .mockRejectedValueOnce(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.data', message: 'data must be valid JSON' }]),
      )
      .mockResolvedValueOnce(member(9));
    renderAt('/cms/advisory-committee/create');
    await fillName();
    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    expect(await screen.findByText('data must be valid JSON')).toBeInTheDocument();
    expect(screen.queryByText(PROFILE_TOO_LONG)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Add Advisory Committee member' }));
    await waitFor(() => expect(currentPath()).toBe(LIST));
  });
});
