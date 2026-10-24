import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { announcementEditPath, announcementViewPath } from './constants';
import AnnouncementCreate from './pages/AnnouncementCreate';
import AnnouncementEdit from './pages/AnnouncementEdit';
import AnnouncementView from './pages/AnnouncementView';
import AnnouncementsTab from './components/AnnouncementsTab';
import AnnouncementsSettingsEdit from './pages/AnnouncementsSettingsEdit';
import { announcementsService } from './services/announcementsService';
import type { ApiAnnouncement, ApiAnnouncementsSection, Bilingual } from './types/announcements.types';
import { announcementChanges, announcementPayload, announcementToForm } from './validation/announcements.validation';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/announcementsService', () => ({
  announcementsService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
    getSection: vi.fn(),
    updateSection: vi.fn(),
  },
}));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const ALL = ['cms-announcements.view', 'cms-announcements.create', 'cms-announcements.update', 'cms-announcements.delete'];
/* The seeded item: the demo notice the website showed before the ticker could be managed. */
const DEMO = pair(
  'प्रात्यक्षिक आवृत्ती - नमुना माहिती. ही वास्तविक शासकीय आकडेवारी नाही.',
  'DEMO ENVIRONMENT - SAMPLE DATA. Not actual government programme performance.',
);

const announcement = (n: number, extra: Partial<ApiAnnouncement> = {}): ApiAnnouncement => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  title: pair(`सूचना ${n}`, `Notice ${n}`),
  detail: null,
  link: null,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const section = (): ApiAnnouncementsSection => ({
  id: 's1',
  label: pair('सूचना', 'Announcements'),
  showSection: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
});

const toasts = () => document.getElementById('toast-root')!;

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/home-page" element={<AnnouncementsTab />} />
        <Route path="/cms/announcements/create" element={<AnnouncementCreate />} />
        <Route path="/cms/announcements/settings" element={<AnnouncementsSettingsEdit />} />
        <Route path="/cms/announcements/:id/edit" element={<AnnouncementEdit />} />
        <Route path="/cms/announcements/:id/view" element={<AnnouncementView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const TAB = '/cms/home-page?tab=announcements';
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
/* The column headings, without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((th) => th.textContent!.replace(/[⇅▲▼]/g, ''));
/* The English title of each row, top to bottom. */
const titles = () => [...document.querySelectorAll('tbody tr')].map((tr) => tr.querySelector('b.lnk')?.textContent);
const SEARCH = 'Search title, detail or link...';
const search = (text: string) => userEvent.type(screen.getByPlaceholderText(SEARCH), text);
const info = () => screen.getByText(/^Showing/).closest('.info');

const fillTitle = async () => {
  await userEvent.type(screen.getByLabelText('Title (Marathi) *'), 'प्रवेश प्रक्रिया सुरू');
  await userEvent.type(screen.getByLabelText('Title (English) *'), 'Admissions are open');
};

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(announcementsService.list).mockResolvedValue([]);
  vi.mocked(announcementsService.getSection).mockResolvedValue(section());
});

describe('Announcements list', () => {
  it('is a FAQ-style table: Sr. No., Order, Title, Link, Status, Updated and Action', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([
      announcement(1, { title: DEMO }),
      announcement(2, { link: '/apply', detail: pair('अर्ज करा', 'Apply now') }),
      announcement(3, { link: 'https://example.gov.in/x', isActive: false }),
    ]);
    renderAt(TAB);

    await screen.findByText(DEMO.en);
    expect(screen.getByRole('heading', { name: /^Announcements/ })).toHaveTextContent('Announcements live from the backend');
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Title', 'Link', 'Status', 'Updated', 'Action']);
    const demo = row(DEMO.en);
    /* English in the brand colour, Marathi underneath, as the FAQ question. */
    expect(within(demo).getByText(DEMO.en)).toHaveClass('lnk');
    expect(within(demo).getByText(DEMO.mr)).toBeInTheDocument();
    expect(within(demo).getByText('No link')).toBeInTheDocument();
    expect(within(demo).getByText('Active')).toBeInTheDocument();
    expect(within(row('Notice 2')).getByText('/apply')).toBeInTheDocument();
    expect(within(row('Notice 3')).getByText(/example\.gov\.in/)).toBeInTheDocument();
    expect(within(row('Notice 3')).getByText('Inactive')).toBeInTheDocument();
    /* Sr. No. counts the rows; Order is the saved display order. */
    expect(within(demo).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(info()).toHaveTextContent('Showing 1-3 of 3 records');
    expect(screen.getByText('3 listed, 2 shown on the website')).toBeInTheDocument();
    /* Ticker settings summary */
    const settings = screen.getByRole('heading', { name: 'Ticker settings' }).closest('.card') as HTMLElement;
    expect(await within(settings).findByText('सूचना')).toBeInTheDocument();
    expect(within(settings).getByText('Shown')).toBeInTheDocument();
  });

  it('shows No records found when there are no announcements, and a retryable error', async () => {
    vi.mocked(announcementsService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt(TAB);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/Use Add announcement to create the first one/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add announcement/ })).toHaveLength(1);
    unmount();

    vi.mocked(announcementsService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([announcement(1)]);
    renderAt(TAB);
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Notice 1')).toBeInTheDocument();
  });

  it('keeps Add announcement and Edit settings in the tab head', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([announcement(1)]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Notice 1');
    let head = document.querySelector('.cms-tab-head') as HTMLElement;
    await userEvent.click(within(head).getByRole('button', { name: /Add announcement/ }));
    expect(currentPath()).toBe('/cms/announcements/create');
    unmount();

    renderAt(TAB);
    head = document.querySelector('.cms-tab-head') as HTMLElement;
    const settings = within(head).getByRole('button', { name: /Edit settings/ });
    await waitFor(() => expect(settings).toBeEnabled());
    await userEvent.click(settings);
    expect(currentPath()).toBe('/cms/announcements/settings');
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([announcement(1), announcement(2)]);
    vi.mocked(announcementsService.get).mockResolvedValue(announcement(2));
    const { unmount } = renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'View Notice 2' }));
    expect(currentPath()).toBe(announcementViewPath(announcement(2).id));
    expect(currentPath()).toBe(`/cms/announcements/${announcement(2).id}/view`);
    unmount();

    const again = renderAt(TAB);
    await userEvent.click(await screen.findByText('Notice 1'));
    expect(currentPath()).toBe(announcementViewPath(announcement(1).id));
    again.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Notice 2' }));
    expect(currentPath()).toBe(announcementEditPath(announcement(2).id));
  });

  it('switches an announcement off through the status toggle after asking, by id', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([announcement(1), announcement(2)]);
    vi.mocked(announcementsService.setStatus).mockResolvedValue(announcement(2, { isActive: false }));
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Notice 2: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Deactivate सूचना 2 / Notice 2?');
    expect(announcementsService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(announcementsService.setStatus).toHaveBeenCalledWith(announcement(2).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Announcement deactivated'));
    expect(announcementsService.list).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(TAB);
  });

  it('deletes the announcement named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([announcement(1), announcement(2), announcement(3)]);
    vi.mocked(announcementsService.remove).mockResolvedValue();
    renderAt(TAB);
    await screen.findByText('Notice 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Notice 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete सूचना 2 / Notice 2?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(announcementsService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Notice 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(announcementsService.remove).toHaveBeenCalledWith(announcement(2).id));
    expect(announcementsService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Announcement deleted'));
    expect(currentPath()).toBe(TAB);
  });

  it('searches titles, details and links in both languages', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([
      announcement(1),
      announcement(2, { detail: pair('नवीन तुकडी', 'New batch') }),
      announcement(3, { link: '/apply' }),
    ]);
    renderAt(TAB);
    await screen.findByText('Notice 1');

    await search('सूचना 1');
    await waitFor(() => expect(titles()).toEqual(['Notice 1']));
    expect(screen.getByText('filtered')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('new batch');
    await waitFor(() => expect(titles()).toEqual(['Notice 2']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('/apply');
    await waitFor(() => expect(titles()).toEqual(['Notice 3']));

    await userEvent.clear(screen.getByPlaceholderText(SEARCH));
    await search('nothing like it');
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('No announcement matches the current search.')).toBeInTheDocument();
    expect(announcementsService.list).toHaveBeenCalledTimes(1);
  });

  it('reorders by sending the whole list of ids', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([announcement(1), announcement(2), announcement(3)]);
    vi.mocked(announcementsService.reorder).mockResolvedValue([]);
    renderAt(TAB);
    await screen.findByText('Notice 3');
    expect(screen.getByRole('button', { name: 'Move Notice 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Notice 3 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Notice 1 down' }));
    await waitFor(() =>
      expect(announcementsService.reorder).toHaveBeenCalledWith([announcement(2).id, announcement(1).id, announcement(3).id]),
    );
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    expect(currentPath()).toBe(TAB);
  });

  it('allows re-ordering only while the table shows the website order: by Order ascending, nothing searched', async () => {
    vi.mocked(announcementsService.list).mockResolvedValue([announcement(1), announcement(2), announcement(3)]);
    renderAt(TAB);
    await screen.findByText('Notice 3');
    const up = () => screen.getByRole('button', { name: 'Move Notice 3 up' });
    expect(up()).toBeEnabled();

    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(titles()).toEqual(['Notice 3', 'Notice 2', 'Notice 1']);
    expect(up()).toBeDisabled();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await search('Notice 3');
    await waitFor(() => expect(titles()).toEqual(['Notice 3']));
    expect(up()).toBeDisabled();
    expect(announcementsService.reorder).not.toHaveBeenCalled();
  });

  it('gives a view-only administrator View only: no Add, Edit, status switch, Delete, reorder or Edit settings', async () => {
    auth.permissions = new Set(['cms-announcements.view']);
    vi.mocked(announcementsService.list).mockResolvedValue([announcement(1), announcement(2)]);
    renderAt(TAB);
    await screen.findByText('Notice 1');
    expect(screen.getByRole('button', { name: 'View Notice 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add announcement/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit settings/ })).toBeNull();
  });
});

describe('View Announcement', () => {
  const viewed = () =>
    announcement(7, { detail: pair('३१ मार्चपर्यंत अर्ज करा', 'Apply by 31 March'), link: 'https://example.gov.in/notice' });
  const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;

  it('shows every field in both languages, with the breadcrumbs of its Home Page Management tab', async () => {
    vi.mocked(announcementsService.get).mockResolvedValue(viewed());
    renderAt(announcementViewPath(viewed().id));

    expect(await screen.findByRole('heading', { name: /Notice 7/ })).toHaveTextContent('Notice 7Order 7');
    expect(announcementsService.get).toHaveBeenCalledWith(viewed().id);
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Announcements', 'View']);
    expect(field('Title')).toHaveTextContent('सूचना 7Notice 7');
    expect(field('Detail')).toHaveTextContent('३१ मार्चपर्यंत अर्ज कराApply by 31 March');
    expect(field('Link')).toHaveTextContent('https://example.gov.in/notice');
    expect(field('Link')).toHaveTextContent('Another site, opened in a new tab');
    expect(field('Display order')).toHaveTextContent('7');
    expect(within(field('Status')).getByText('Active')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Scrolls past in the announcements ticker');
    /* The item as the ticker prints it, after the ticker's label, in both languages. */
    await waitFor(() => expect(screen.getByRole('figure', { name: 'Marathi preview' })).toHaveTextContent('सूचनासूचना 7 — ३१ मार्चपर्यंत'));
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('AnnouncementsNotice 7 — Apply by 31 March');
  });

  it('marks no detail and no link', async () => {
    vi.mocked(announcementsService.get).mockResolvedValue(announcement(8, { isActive: false }));
    renderAt(announcementViewPath(announcement(8).id));
    expect(await screen.findByRole('heading', { name: /Notice 8/ })).toBeInTheDocument();
    expect(field('Detail')).toHaveTextContent('—');
    expect(field('Link')).toHaveTextContent('No link');
    expect(within(field('Status')).getByText('Inactive')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Hidden from the website');
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('edits, deactivates and deletes (after asking) the announcement, and goes Back to the tab', async () => {
    vi.mocked(announcementsService.get).mockResolvedValue(viewed());
    vi.mocked(announcementsService.setStatus).mockResolvedValue(viewed());
    vi.mocked(announcementsService.remove).mockResolvedValue();
    const { unmount } = renderAt(announcementViewPath(viewed().id));

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(announcementsService.setStatus).toHaveBeenCalledWith(viewed().id, false));
    await waitFor(() => expect(announcementsService.get).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete सूचना 7 / Notice 7?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(announcementsService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(announcementsService.remove).toHaveBeenCalledWith(viewed().id));
    await waitFor(() => expect(currentPath()).toBe(TAB));
    unmount();

    const again = renderAt(announcementViewPath(viewed().id));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(currentPath()).toBe(announcementEditPath(viewed().id));
    again.unmount();

    renderAt(announcementViewPath(viewed().id));
    await screen.findByRole('button', { name: 'Edit' });
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(currentPath()).toBe(TAB);
  });

  it('gives a view-only administrator no Edit, Activate / Deactivate or Delete', async () => {
    auth.permissions = new Set(['cms-announcements.view']);
    vi.mocked(announcementsService.get).mockResolvedValue(viewed());
    renderAt(announcementViewPath(viewed().id));
    await screen.findByRole('heading', { name: /Notice 7/ });
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Deactivate|Activate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });
});

describe('Add announcement', () => {
  it('names each missing required field', async () => {
    renderAt('/cms/announcements/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save announcement' }));
    expect(await screen.findByText('Title (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Title (English) is required')).toBeInTheDocument();
    expect(announcementsService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsafe link and a half-filled detail before sending anything', async () => {
    renderAt('/cms/announcements/create');
    await fillTitle();
    await userEvent.type(screen.getByLabelText('Link'), 'javascript:alert(1)');
    await userEvent.type(screen.getByLabelText('Detail (Marathi)'), 'अर्ज करा');
    await userEvent.click(screen.getByRole('button', { name: 'Save announcement' }));
    expect(
      await screen.findByText('Destination must be a page on this site starting with /, or a web address starting with https:// or www.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Detail (English) is required when the Marathi text is filled in')).toBeInTheDocument();
    expect(announcementsService.create).not.toHaveBeenCalled();
  });

  it('previews the item and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(announcementsService.create)
      .mockRejectedValueOnce(new ApiError('An announcement titled "x" already exists.', 409, 'CONFLICT'))
      .mockResolvedValueOnce(announcement(9));
    renderAt('/cms/announcements/create');
    await fillTitle();
    await userEvent.type(screen.getByLabelText('Detail (Marathi)'), 'आजच अर्ज करा');
    await userEvent.type(screen.getByLabelText('Detail (English)'), 'Apply today');
    await userEvent.type(screen.getByLabelText('Link'), '/apply');

    const preview = screen.getByRole('figure', { name: 'Marathi preview' });
    expect(preview).toHaveTextContent('सूचना');
    expect(preview).toHaveTextContent('प्रवेश प्रक्रिया सुरू — आजच अर्ज करा');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('Admissions are open — Apply today');

    await userEvent.click(screen.getByRole('button', { name: 'Save announcement' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
    await userEvent.click(screen.getByRole('button', { name: 'Save announcement' }));
    await waitFor(() => expect(announcementsService.create).toHaveBeenCalledTimes(2));

    const [[body, key1], [, key2]] = vi.mocked(announcementsService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({
      title: pair('प्रवेश प्रक्रिया सुरू', 'Admissions are open'),
      detail: pair('आजच अर्ज करा', 'Apply today'),
      link: '/apply',
      isActive: true,
    });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('saves an announcement with no detail and no link, and returns to the tab', async () => {
    vi.mocked(announcementsService.create).mockResolvedValueOnce(announcement(9));
    renderAt('/cms/announcements/create');
    await fillTitle();
    await userEvent.click(screen.getByRole('button', { name: 'Save announcement' }));
    await waitFor(() => expect(announcementsService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(announcementsService.create).mock.calls[0]![0]).toMatchObject({ detail: null, link: null });
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Announcement added');
  });

  it('shows the server’s field message on the field', async () => {
    vi.mocked(announcementsService.create).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.link', message: 'Enter a full address, e.g. https://example.gov.in' },
      ]),
    );
    renderAt('/cms/announcements/create');
    await fillTitle();
    await userEvent.click(screen.getByRole('button', { name: 'Save announcement' }));
    expect(await screen.findByText('Enter a full address, e.g. https://example.gov.in')).toBeInTheDocument();
  });

  it('tells an administrator without the Add permission so, with no form', async () => {
    auth.permissions = new Set(['cms-announcements.view']);
    renderAt('/cms/announcements/create');
    expect(await screen.findByText('You can view this section but not add announcements')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save announcement' })).toBeNull();
  });
});

describe('Edit announcement', () => {
  it('loads the saved record and sends only what changed', async () => {
    const saved = announcement(4, { link: '/apply', detail: pair('तपशील', 'Detail') });
    vi.mocked(announcementsService.get).mockResolvedValue(saved);
    vi.mocked(announcementsService.update).mockResolvedValue(saved);
    renderAt(`/cms/announcements/${saved.id}/edit`);
    expect(await screen.findByLabelText('Link')).toHaveValue('/apply');
    expect(screen.getByLabelText('Detail (English)')).toHaveValue('Detail');
    await userEvent.clear(screen.getByLabelText('Link'));
    await userEvent.type(screen.getByLabelText('Link'), '/faq');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(announcementsService.update).toHaveBeenCalledWith(saved.id, { link: '/faq', expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('can clear the detail and the link', async () => {
    const saved = announcement(6, { link: '/apply', detail: pair('तपशील', 'Detail') });
    vi.mocked(announcementsService.get).mockResolvedValue(saved);
    vi.mocked(announcementsService.update).mockResolvedValue(saved);
    renderAt(`/cms/announcements/${saved.id}/edit`);
    await userEvent.clear(await screen.findByLabelText('Detail (Marathi)'));
    await userEvent.clear(screen.getByLabelText('Detail (English)'));
    await userEvent.clear(screen.getByLabelText('Link'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(announcementsService.update).toHaveBeenCalledWith(saved.id, { detail: null, link: null, expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(announcementsService.get).mockResolvedValue(announcement(5));
    renderAt(`/cms/announcements/${announcement(5).id}/edit`);
    await userEvent.type(await screen.findByLabelText('Title (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(announcementsService.update).not.toHaveBeenCalled();
  });
});

describe('Ticker settings', () => {
  it('requires the label, then saves it and the visibility with the loaded version', async () => {
    vi.mocked(announcementsService.updateSection).mockResolvedValue(section());
    renderAt('/cms/announcements/settings');
    expect(await screen.findByRole('heading', { name: 'Ticker Settings' })).toBeInTheDocument();
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Announcements', 'Ticker settings']);
    const label = await screen.findByLabelText('Label (English) *');
    await userEvent.clear(label);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Label (English) is required')).toBeInTheDocument();
    expect(announcementsService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(label, 'Notices');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show the ticker on the public website' }));
    expect(screen.getByText(/While hidden, the website leaves the whole strip out/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(announcementsService.updateSection).toHaveBeenCalledWith({
        label: pair('सूचना', 'Notices'),
        showSection: false,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
    await waitFor(() => expect(currentPath()).toBe(TAB));
  });

  it('gives a view-only administrator no form', async () => {
    auth.permissions = new Set(['cms-announcements.view']);
    renderAt('/cms/announcements/settings');
    expect(await screen.findByText('You can view this section but not change it')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
  });
});

describe('announcement payloads', () => {
  it('normalise whitespace like the server and send a blank detail as null', () => {
    const values = {
      title: pair('  प्रवेश   सुरू ', ' Admissions\n open '),
      detail: pair('  ', ''),
      link: '  ',
      displayOrder: '',
      isActive: true,
    };
    expect(announcementPayload(values)).toEqual({
      title: pair('प्रवेश सुरू', 'Admissions open'),
      detail: null,
      link: null,
      isActive: true,
    });
    expect(announcementPayload({ ...values, displayOrder: ' 3 ' })).toMatchObject({ displayOrder: 3 });
  });

  it('send nothing but the version when nothing changed', () => {
    const saved = announcement(2, { detail: pair('तपशील', 'Detail'), link: '/apply' });
    expect(announcementChanges(saved, announcementToForm(saved))).toEqual({ expectedUpdatedAt: saved.updatedAt });
    const blank = announcement(3);
    expect(announcementChanges(blank, announcementToForm(blank))).toEqual({ expectedUpdatedAt: blank.updatedAt });
  });
});
