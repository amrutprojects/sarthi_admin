import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { boardMemberEditPath, boardMemberViewPath } from './constants';
import BoardMemberCreate from './pages/BoardMemberCreate';
import BoardMemberEdit from './pages/BoardMemberEdit';
import BoardMemberView from './pages/BoardMemberView';
import BoardMembersTab from './components/BoardMembersTab';
import BoardSettingsEdit from './pages/BoardSettingsEdit';
import { boardService } from './services/boardService';
import type { ApiBoardMember, ApiBoardSection, Bilingual } from './types/board.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/boardService', () => ({
  photoSrc: (url: string | null) => (url ? `/api/v1${url}` : null),
  boardService: {
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
const BLANK = pair('', '');
const ALL = ['cms-board.view', 'cms-board.create', 'cms-board.update', 'cms-board.delete'];

const member = (n: number, extra: Partial<ApiBoardMember> = {}): ApiBoardMember => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name: `Member ${n}`,
  category: pair(`गट ${n}`, `Group ${n}`),
  designation: pair(`पद ${n}`, `Designation ${n}`),
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  subtitle: BLANK,
  photoUrl: null,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const section = (): ApiBoardSection => ({
  id: 's1',
  heading: pair('मान्यवर व संचालक मंडळ', 'Leadership & Governing Board'),
  subtitle: pair('उपशीर्षक', 'Subtitle'),
  noticeTitle: pair('सूचना', 'Notice'),
  noticeBody: pair('सूचना मजकूर', 'Notice text'),
  showNotice: true,
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
        <Route path="/cms/home-page" element={<BoardMembersTab />} />
        <Route path="/cms/board-members/create" element={<BoardMemberCreate />} />
        <Route path="/cms/board-members/settings" element={<BoardSettingsEdit />} />
        <Route path="/cms/board-members/:id/edit" element={<BoardMemberEdit />} />
        <Route path="/cms/board-members/:id/view" element={<BoardMemberView />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const TAB = '/cms/home-page?tab=board';
const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
/* The column headings, without the sort arrows. */
const headings = () => screen.getAllByRole('columnheader').map((th) => th.textContent!.replace(/[⇅▲▼]/g, ''));
/* The name cell of each row, top to bottom: the name, or the placeholder while it is to be filled. */
const names = () =>
  [...document.querySelectorAll('tbody tr')].map((tr) => (tr.querySelector('b.lnk, i.muted') as HTMLElement | null)?.textContent);
const search = (text: string) => userEvent.type(screen.getByPlaceholderText('Search name, designation or category...'), text);

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(boardService.list).mockResolvedValue([]);
  vi.mocked(boardService.getSection).mockResolvedValue(section());
});

describe('Board Members list', () => {
  it('is a FAQ-style table: Sr. No., Order, Name with the designation, Photo, Category, Status, Updated and Action', async () => {
    vi.mocked(boardService.list).mockResolvedValue([
      member(1, { photoUrl: '/cms/board-members/photos/a.png' }),
      member(2, { name: null, isActive: false, description: BLANK }),
    ]);
    renderAt(TAB);

    await screen.findByText('Member 1');
    expect(screen.getByRole('heading', { name: /Board Members/ })).toHaveTextContent('Board Members live from the backend');
    expect(headings()).toEqual(['Sr. No.', 'Order', 'Name', 'Photo', 'Category', 'Status', 'Updated', 'Action']);
    const first = row('Member 1');
    expect(within(first).getByRole('img', { name: 'Photo of Member 1' })).toHaveAttribute('src', '/api/v1/cms/board-members/photos/a.png');
    expect(within(first).getByText('Designation 1')).toBeInTheDocument();
    expect(within(first).getByText('पद 1')).toBeInTheDocument();
    expect(within(first).getByText('गट 1')).toBeInTheDocument();
    expect(within(first).getByText('Group 1')).toBeInTheDocument();
    expect(within(first).getByText('Active')).toBeInTheDocument();
    const placeholder = row('— name to be filled —');
    expect(within(placeholder).getByText('Designation 2')).toBeInTheDocument();
    expect(within(placeholder).getByText('Inactive')).toBeInTheDocument();
    /* Sr. No. counts the rows; Order is the saved display order. */
    expect(within(first).getAllByRole('cell')[0]).toHaveTextContent('1');
    expect(screen.getByText(/^Showing/).closest('.info')).toHaveTextContent('Showing 1-2 of 2 records');
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('15');
    /* Section settings summary */
    expect(await screen.findByText('Leadership & Governing Board')).toBeInTheDocument();
  });

  it('shows No records found when there are no members, and a retryable error', async () => {
    vi.mocked(boardService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt(TAB);
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText(/Use Add Member to create the first card/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Add Member/ })).toHaveLength(1);
    unmount();

    vi.mocked(boardService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([member(1)]);
    renderAt(TAB);
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Member 1')).toBeInTheDocument();
  });

  it('keeps Add Member and Edit settings in the tab head', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1)]);
    renderAt(TAB);
    await screen.findByText('Member 1');
    const head = document.querySelector('.cms-tab-head') as HTMLElement;
    await userEvent.click(within(head).getByRole('button', { name: /Add Member/ }));
    expect(currentPath()).toBe('/cms/board-members/create');
  });

  it('opens Edit settings from the tab head', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1)]);
    renderAt(TAB);
    const head = document.querySelector('.cms-tab-head') as HTMLElement;
    const settings = within(head).getByRole('button', { name: /Edit settings/ });
    await waitFor(() => expect(settings).toBeEnabled());
    await userEvent.click(settings);
    expect(currentPath()).toBe('/cms/board-members/settings');
  });

  it('opens the View page from the eye button and from the row, and the Edit page from the pencil', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1), member(2)]);
    vi.mocked(boardService.get).mockResolvedValue(member(2));
    const { unmount } = renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'View Member 2' }));
    expect(currentPath()).toBe(boardMemberViewPath(member(2).id));
    expect(currentPath()).toBe(`/cms/board-members/${member(2).id}/view`);
    unmount();

    const again = renderAt(TAB);
    await userEvent.click(await screen.findByText('Member 1'));
    expect(currentPath()).toBe(boardMemberViewPath(member(1).id));
    again.unmount();

    renderAt(TAB);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Member 2' }));
    expect(currentPath()).toBe(boardMemberEditPath(member(2).id));
    expect(currentPath()).toBe(`/cms/board-members/${member(2).id}/edit`);
  });

  it('switches a member off through the status toggle after asking, by id', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1), member(2)]);
    vi.mocked(boardService.setStatus).mockResolvedValue(member(2, { isActive: false }));
    renderAt(TAB);
    await userEvent.click(await screen.findByRole('switch', { name: 'Member 2: active' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Deactivate Member 2?');
    expect(boardService.setStatus).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Yes, deactivate' }));
    await waitFor(() => expect(boardService.setStatus).toHaveBeenCalledWith(member(2).id, false));
    await waitFor(() => expect(toasts()).toHaveTextContent('Member deactivated'));
    expect(boardService.list).toHaveBeenCalledTimes(2);
    expect(currentPath()).toBe(TAB);
  });

  it('deletes the member named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1), member(2), member(3)]);
    vi.mocked(boardService.remove).mockResolvedValue();
    renderAt(TAB);
    await screen.findByText('Member 2');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Member 2' }));
    let dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Member 2?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(boardService.remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Member 2' }));
    dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(boardService.remove).toHaveBeenCalledWith(member(2).id));
    expect(boardService.remove).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toasts()).toHaveTextContent('Member deleted'));
    expect(currentPath()).toBe(TAB);
  });

  it('searches names, designations and categories in both languages', async () => {
    vi.mocked(boardService.list).mockResolvedValue([
      member(1, { name: 'Anil Patil' }),
      member(2, { name: 'Sunita Rao', designation: pair('अध्यक्ष', 'Chairperson') }),
      member(3, { name: null, category: pair('राज्य शासन', 'State Government') }),
    ]);
    renderAt(TAB);
    await screen.findByText('Anil Patil');

    await search('chair');
    await waitFor(() => expect(names()).toEqual(['Sunita Rao']));
    expect(screen.getByText('filtered')).toBeInTheDocument();
    expect(screen.getByText(/^Showing/).closest('.info')).toHaveTextContent('Showing 1-1 of 1 records');

    await userEvent.clear(screen.getByPlaceholderText('Search name, designation or category...'));
    await search('राज्य');
    await waitFor(() => expect(names()).toEqual(['— name to be filled —']));

    await userEvent.clear(screen.getByPlaceholderText('Search name, designation or category...'));
    await search('nobody');
    expect(await screen.findByText('No records found')).toBeInTheDocument();
    expect(screen.getByText('No member matches the current search.')).toBeInTheDocument();
    expect(boardService.list).toHaveBeenCalledTimes(1);
  });

  it('sorts by name, keeping unnamed members last, and pages 15 at a time', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1, { name: 'Zubin' }), member(2, { name: null }), member(3, { name: 'Anil' })]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Zubin');
    expect(names()).toEqual(['Zubin', '— name to be filled —', 'Anil']);
    await userEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    expect(names()).toEqual(['Anil', 'Zubin', '— name to be filled —']);
    await userEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    expect(names()).toEqual(['Zubin', 'Anil', '— name to be filled —']);
    unmount();

    vi.mocked(boardService.list).mockResolvedValue(Array.from({ length: 17 }, (_, i) => member(i + 1)));
    renderAt(TAB);
    await screen.findByText('Member 15');
    expect(screen.queryByText('Member 16')).toBeNull();
    expect(screen.getByText(/^Showing/).closest('.info')).toHaveTextContent('Showing 1-15 of 17 records');
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Member 17')).toBeInTheDocument();
    expect(screen.getByText(/^Showing/).closest('.info')).toHaveTextContent('Showing 16-17 of 17 records');
  });

  it('reorders by sending the whole list of ids, across pages too', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1), member(2), member(3)]);
    vi.mocked(boardService.reorder).mockResolvedValue([]);
    const { unmount } = renderAt(TAB);
    await screen.findByText('Member 3');
    expect(screen.getByRole('button', { name: 'Move Member 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Member 3 down' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Move Member 3 up' }));
    await waitFor(() => expect(boardService.reorder).toHaveBeenCalledWith([member(1).id, member(3).id, member(2).id]));
    await waitFor(() => expect(toasts()).toHaveTextContent('Display order updated'));
    /* The buttons stay on the list page. */
    expect(currentPath()).toBe(TAB);
    unmount();

    const many = Array.from({ length: 17 }, (_, i) => member(i + 1));
    vi.mocked(boardService.list).mockResolvedValue(many);
    vi.mocked(boardService.reorder).mockClear();
    renderAt(TAB);
    await screen.findByText('Member 15');
    await userEvent.click(screen.getByRole('button', { name: 'Move Member 15 down' }));
    const ids = many.map((m) => m.id);
    [ids[14], ids[15]] = [ids[15]!, ids[14]!];
    await waitFor(() => expect(boardService.reorder).toHaveBeenCalledWith(ids));
  });

  it('allows re-ordering only while the table shows the website order: by Order ascending, nothing searched', async () => {
    vi.mocked(boardService.list).mockResolvedValue([member(1), member(2), member(3)]);
    renderAt(TAB);
    await screen.findByText('Member 3');
    const up = () => screen.getByRole('button', { name: 'Move Member 3 up' });
    expect(up()).toBeEnabled();

    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(names()).toEqual(['Member 3', 'Member 2', 'Member 1']);
    expect(up()).toBeDisabled();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await userEvent.click(screen.getByRole('columnheader', { name: /Updated/ }));
    expect(up()).toBeDisabled();
    await userEvent.click(screen.getByRole('columnheader', { name: /Order/ }));
    expect(up()).toBeEnabled();

    await search('Member 3');
    await waitFor(() => expect(names()).toEqual(['Member 3']));
    expect(up()).toBeDisabled();
    expect(boardService.reorder).not.toHaveBeenCalled();
  });

  it('gives a view-only administrator View only: no Add, Edit, status switch, Delete, reorder or Edit settings', async () => {
    auth.permissions = new Set(['cms-board.view']);
    vi.mocked(boardService.list).mockResolvedValue([member(1), member(2)]);
    renderAt(TAB);
    await screen.findByText('Member 1');
    expect(screen.getByRole('button', { name: 'View Member 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add Member/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Hide|Move) / })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit settings/ })).toBeNull();
  });
});

describe('View Member', () => {
  const viewed = () =>
    member(7, {
      photoUrl: '/cms/board-members/photos/v.png',
      subtitle: pair('उपशीर्षक 7', 'Subtitle 7'),
    });

  it('shows every field in both languages, with the breadcrumbs of its Home Page Management tab', async () => {
    vi.mocked(boardService.get).mockResolvedValue(viewed());
    renderAt(boardMemberViewPath(viewed().id));

    expect(await screen.findByRole('heading', { name: /Member 7/ })).toHaveTextContent('Member 7Order 7');
    expect(boardService.get).toHaveBeenCalledWith(viewed().id);
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Leadership & Governing Board', 'View']);
    const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;
    expect(within(field('Photo')).getByRole('img', { name: 'Photo of Member 7' })).toHaveAttribute(
      'src',
      '/api/v1/cms/board-members/photos/v.png',
    );
    expect(field('Name')).toHaveTextContent('Member 7');
    expect(field('Category (badge)')).toHaveTextContent('गट 7Group 7');
    expect(field('Designation')).toHaveTextContent('पद 7Designation 7');
    expect(field('Description')).toHaveTextContent('वर्णन 7Description 7');
    expect(field('Subtitle')).toHaveTextContent('उपशीर्षक 7Subtitle 7');
    expect(field('Display order')).toHaveTextContent('7');
    expect(within(field('Status')).getByText('Active')).toBeInTheDocument();
    expect(field('On the website')).toHaveTextContent('Shown in the Leadership & Governing Board section');
    expect(field('Created')).not.toHaveTextContent('—');
    expect(field('Last updated')).not.toHaveTextContent('—');
  });

  it('marks a missing name, photo and blank texts', async () => {
    vi.mocked(boardService.get).mockResolvedValue(member(8, { name: null, description: BLANK, isActive: false }));
    renderAt(boardMemberViewPath(member(8).id));
    expect(await screen.findByRole('heading', { name: /Designation 8/ })).toBeInTheDocument();
    const field = (label: string) => screen.getByText(label, { selector: 'td b' }).closest('tr') as HTMLElement;
    expect(field('Name')).toHaveTextContent('Not yet available');
    expect(field('Photo')).toHaveTextContent('No photo');
    expect(field('Description')).toHaveTextContent('—');
    expect(within(field('Status')).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });

  it('edits, deactivates and deletes (after asking) the member, and goes Back to the tab', async () => {
    vi.mocked(boardService.get).mockResolvedValue(viewed());
    vi.mocked(boardService.setStatus).mockResolvedValue(viewed());
    vi.mocked(boardService.remove).mockResolvedValue();
    const { unmount } = renderAt(boardMemberViewPath(viewed().id));

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(boardService.setStatus).toHaveBeenCalledWith(viewed().id, false));
    await waitFor(() => expect(boardService.get).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Delete Member 7?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(boardService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(boardService.remove).toHaveBeenCalledWith(viewed().id));
    await waitFor(() => expect(currentPath()).toBe(TAB));
    unmount();

    const again = renderAt(boardMemberViewPath(viewed().id));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(currentPath()).toBe(boardMemberEditPath(viewed().id));
    again.unmount();

    renderAt(boardMemberViewPath(viewed().id));
    await screen.findByRole('button', { name: 'Edit' });
    await userEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(currentPath()).toBe(TAB);
  });

  it('gives a view-only administrator no Edit, Activate / Deactivate or Delete', async () => {
    auth.permissions = new Set(['cms-board.view']);
    vi.mocked(boardService.get).mockResolvedValue(viewed());
    renderAt(boardMemberViewPath(viewed().id));
    await screen.findByRole('heading', { name: /Member 7/ });
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Deactivate|Activate)$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument();
  });

  it('shows a retryable error when the member cannot be loaded', async () => {
    vi.mocked(boardService.get)
      .mockRejectedValueOnce(new ApiError('Board member not found', 404, 'NOT_FOUND'))
      .mockResolvedValueOnce(viewed());
    renderAt(boardMemberViewPath(viewed().id));
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Member 7/ })).toBeInTheDocument();
  });
});

describe('Add Member', () => {
  it('names each missing field, and requires a name unless it is marked as not yet available', async () => {
    renderAt('/cms/board-members/create');
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));
    expect(await screen.findByText('Name is required — or tick "Name not yet available"')).toBeInTheDocument();
    expect(screen.getByText('Category (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Designation (English) is required')).toBeInTheDocument();
    expect(boardService.create).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('checkbox', { name: /Name not yet available/ }));
    expect(screen.queryByText('Name is required — or tick "Name not yet available"')).toBeNull();
  });

  it('refuses an unsupported or renamed file before uploading anything', async () => {
    renderAt('/cms/board-members/create');
    const input = document.getElementById('board-photo-input') as HTMLInputElement;
    await userEvent.upload(input, new File(['GIF89a....'], 'photo.gif', { type: 'image/gif' }), { applyAccept: false });
    expect(await screen.findByText('The photo must be a JPEG, PNG or WebP image')).toBeInTheDocument();
    await userEvent.upload(input, new File([PNG], 'photo.jpg', { type: 'image/jpeg' }), { applyAccept: false });
    expect(await screen.findByText(/this is a PNG image, so name it \.png/)).toBeInTheDocument();
    const big = new File([PNG, new Uint8Array(5 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await userEvent.upload(input, big, { applyAccept: false });
    expect(await screen.findByText('The photo is larger than 5 MB')).toBeInTheDocument();
  });

  it('previews the chosen photo and saves Marathi text with it in one request', async () => {
    vi.mocked(boardService.create).mockResolvedValue(member(9));
    renderAt('/cms/board-members/create');
    const photo = new File([PNG], 'face.png', { type: 'image/png' });
    await userEvent.upload(document.getElementById('board-photo-input') as HTMLInputElement, photo);
    expect(await screen.findByText(/uploaded when you save/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo preview' }).querySelector('img')).toHaveAttribute('src', 'blob:preview');

    await userEvent.type(screen.getByLabelText('Name *'), 'CMS Test Member');
    await userEvent.type(screen.getByLabelText('Category (Marathi) *'), 'चाचणी');
    await userEvent.type(screen.getByLabelText('Category (English) *'), 'Test');
    await userEvent.type(screen.getByLabelText('Designation (Marathi) *'), 'चाचणी पद');
    await userEvent.type(screen.getByLabelText('Designation (English) *'), 'Test designation');
    await userEvent.type(screen.getByLabelText('Description (Marathi)'), 'मराठी वर्णन');
    await userEvent.type(screen.getByLabelText('Description (English)'), 'English description');
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));

    await waitFor(() => expect(boardService.create).toHaveBeenCalledTimes(1));
    const [input, file] = vi.mocked(boardService.create).mock.calls[0]!;
    expect(file).toBe(photo);
    expect(input).toEqual({
      name: 'CMS Test Member',
      category: pair('चाचणी', 'Test'),
      designation: pair('चाचणी पद', 'Test designation'),
      description: pair('मराठी वर्णन', 'English description'),
      subtitle: BLANK,
      isActive: true,
    });
  });

  it('keeps what was typed and shows the server message on the field when the save is refused', async () => {
    vi.mocked(boardService.create).mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'photo', message: 'The photo must be a JPEG, PNG or WebP image' },
      ]),
    );
    renderAt('/cms/board-members/create');
    await userEvent.click(screen.getByRole('checkbox', { name: /Name not yet available/ }));
    for (const [label, text] of [
      ['Category (Marathi) *', 'अ'],
      ['Category (English) *', 'A'],
      ['Designation (Marathi) *', 'ब'],
      ['Designation (English) *', 'B'],
    ]) {
      await userEvent.type(screen.getByLabelText(label!), text!);
    }
    await userEvent.click(screen.getByRole('button', { name: 'Add member' }));
    expect(await screen.findByText('The photo must be a JPEG, PNG or WebP image')).toBeInTheDocument();
    expect(vi.mocked(boardService.create).mock.calls[0]![0].name).toBeNull();
    expect(screen.getByLabelText('Category (Marathi) *')).toHaveValue('अ');
  });

  it('asks before discarding typed changes on Cancel', async () => {
    renderAt('/cms/board-members/create');
    await userEvent.type(screen.getByLabelText('Name *'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(boardService.create).not.toHaveBeenCalled();
  });
});

describe('Edit Member', () => {
  it('loads the saved record and sends only what changed, keeping the photo', async () => {
    const saved = member(4, { photoUrl: '/cms/board-members/photos/b.png' });
    vi.mocked(boardService.get).mockResolvedValue(saved);
    vi.mocked(boardService.update).mockResolvedValue(saved);
    renderAt(`/cms/board-members/${saved.id}/edit`);

    const designation = await screen.findByLabelText('Designation (English) *');
    expect(designation).toHaveValue('Designation 4');
    expect(screen.getByLabelText('Name *')).toHaveValue('Member 4');
    expect(screen.getByRole('img', { name: 'Photo preview' }).querySelector('img')).toHaveAttribute(
      'src',
      '/api/v1/cms/board-members/photos/b.png',
    );

    await userEvent.clear(designation);
    await userEvent.type(designation, 'New designation');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(boardService.update).toHaveBeenCalledTimes(1));
    expect(vi.mocked(boardService.update).mock.calls[0]).toEqual([
      saved.id,
      { designation: pair('पद 4', 'New designation'), expectedUpdatedAt: saved.updatedAt },
      null,
    ]);
  });

  it('removes the photo only when asked', async () => {
    const saved = member(5, { photoUrl: '/cms/board-members/photos/c.png' });
    vi.mocked(boardService.get).mockResolvedValue(saved);
    vi.mocked(boardService.update).mockResolvedValue(saved);
    renderAt(`/cms/board-members/${saved.id}/edit`);
    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(boardService.update).toHaveBeenCalledWith(saved.id, { expectedUpdatedAt: saved.updatedAt, removePhoto: true }, null),
    );
  });

  it('shows the conflict message when someone else saved first', async () => {
    const saved = member(6);
    vi.mocked(boardService.get).mockResolvedValue(saved);
    vi.mocked(boardService.update).mockRejectedValue(new ApiError('This member was changed after you opened it.', 409, 'CONFLICT'));
    renderAt(`/cms/board-members/${saved.id}/edit`);
    await userEvent.type(await screen.findByLabelText('Name *'), ' Jr');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('This member was changed after you opened it.'));
  });
});

describe('Section settings', () => {
  it('requires notice text while the notice is shown, then saves with the loaded version', async () => {
    vi.mocked(boardService.updateSection).mockResolvedValue(section());
    renderAt('/cms/board-members/settings');
    const body = await screen.findByLabelText('Notice text (Marathi) *');
    await userEvent.clear(body);
    await userEvent.clear(screen.getByLabelText('Notice text (English) *'));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Notice text (Marathi) is required while the notice is shown')).toBeInTheDocument();
    expect(boardService.updateSection).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show the notice on the website' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(boardService.updateSection).toHaveBeenCalledWith({
        heading: section().heading,
        subtitle: section().subtitle,
        noticeTitle: section().noticeTitle,
        noticeBody: BLANK,
        showNotice: false,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
  });
});
