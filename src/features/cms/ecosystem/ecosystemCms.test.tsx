import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import EcosystemPage from './pages/EcosystemPage';
import EcosystemSettingsEdit from './pages/EcosystemSettingsEdit';
import ProgrammeCreate from './pages/ProgrammeCreate';
import ProgrammeEdit from './pages/ProgrammeEdit';
import { ecosystemService } from './services/ecosystemService';
import type { ApiEcosystemSection, ApiProgramme, Bilingual } from './types/ecosystem.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/ecosystemService', () => ({
  ecosystemService: {
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
const ALL = ['cms-ecosystem.view', 'cms-ecosystem.create', 'cms-ecosystem.update', 'cms-ecosystem.delete'];

const programme = (n: number, extra: Partial<ApiProgramme> = {}): ApiProgramme => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name: pair(`कार्ड ${n}`, `Card ${n}`),
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  icon: 'globe',
  link: null,
  linkLabel: BLANK,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const section = (): ApiEcosystemSection => ({
  id: 's1',
  heading: pair('अमृत प्रणाली', 'The AMRUT Ecosystem'),
  subtitle: pair('अमृत अंतर्गत विविध विभाग व उपक्रम', 'Departments and initiatives under AMRUT'),
  linkLabel: pair('अधिक जाणून घ्या →', 'Learn more →'),
  showSection: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
});

const toasts = () => document.getElementById('toast-root')!;
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/cms/amrut-ecosystem" element={<EcosystemPage />} />
      <Route path="/cms/amrut-ecosystem/create" element={<ProgrammeCreate />} />
      <Route path="/cms/amrut-ecosystem/settings" element={<EcosystemSettingsEdit />} />
      <Route path="/cms/amrut-ecosystem/:id/edit" element={<ProgrammeEdit />} />
    </Routes>,
    { route },
  );
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(ecosystemService.getSection).mockResolvedValue(section());
});

describe('The AMRUT Ecosystem list', () => {
  it('lists every card with icon, name, description, destination, order and status', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([
      programme(1),
      programme(2, { name: pair('अमृत कलश', 'AMRUT Kalash'), icon: 'award', link: '/programme' }),
      programme(3, { link: 'https://example.gov.in/x', isActive: false }),
    ]);
    renderAt('/cms/amrut-ecosystem');
    await screen.findByText('Card 1');
    expect(within(row('Card 1')).getByText(/No link/)).toBeInTheDocument();
    expect(within(row('AMRUT Kalash')).getByText('/programme')).toBeInTheDocument();
    expect(within(row('AMRUT Kalash')).getByRole('img', { name: 'Icon: Award / skills' })).toBeInTheDocument();
    expect(within(row('Card 3')).getByText(/example\.gov\.in/)).toBeInTheDocument();
    expect(within(row('Card 3')).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('3 listed, 2 shown on the website')).toBeInTheDocument();
    expect(await screen.findByText('अमृत प्रणाली')).toBeInTheDocument();
  });

  it('filters by search and status, and hides reordering while filtered', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2, { isActive: false })]);
    renderAt('/cms/amrut-ecosystem');
    await screen.findByText('Card 1');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search programmes' }), 'वर्णन 2');
    expect(screen.queryByText('Card 1')).toBeNull();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* up/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status filter' }), 'active');
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.queryByText('Card 2')).toBeNull();
  });

  it('shows an empty state and a retryable error', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt('/cms/amrut-ecosystem');
    expect(await screen.findByText('No programmes yet')).toBeInTheDocument();
    unmount();
    vi.mocked(ecosystemService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([programme(1)]);
    renderAt('/cms/amrut-ecosystem');
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Card 1')).toBeInTheDocument();
  });

  it('deletes the card named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2), programme(3)]);
    vi.mocked(ecosystemService.remove).mockResolvedValue();
    renderAt('/cms/amrut-ecosystem');
    await screen.findByText('Card 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Card 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete कार्ड 2 / Card 2?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(ecosystemService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Card 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(ecosystemService.remove).toHaveBeenCalledWith(programme(2).id));
    expect(ecosystemService.remove).toHaveBeenCalledTimes(1);
  });

  it('reorders by sending the whole list of ids', async () => {
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2), programme(3)]);
    vi.mocked(ecosystemService.reorder).mockResolvedValue([]);
    renderAt('/cms/amrut-ecosystem');
    await screen.findByText('Card 3');
    await userEvent.click(screen.getByRole('button', { name: 'Move Card 1 down' }));
    await waitFor(() => expect(ecosystemService.reorder).toHaveBeenCalledWith([programme(2).id, programme(1).id, programme(3).id]));
  });

  it('gives a view-only administrator no Add, Edit, Hide, Delete or reorder controls', async () => {
    auth.permissions = new Set(['cms-ecosystem.view']);
    vi.mocked(ecosystemService.list).mockResolvedValue([programme(1), programme(2)]);
    renderAt('/cms/amrut-ecosystem');
    await screen.findByText('Card 1');
    expect(screen.queryByRole('button', { name: /Add New Programme/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Hide|Move) / })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit settings' })).toBeNull();
  });
});

describe('Add New Programme', () => {
  it('names each missing field, including the icon', async () => {
    renderAt('/cms/amrut-ecosystem/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    expect(await screen.findByText('Programme name (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Description (English) is required')).toBeInTheDocument();
    expect(screen.getByText('Choose an icon')).toBeInTheDocument();
    expect(ecosystemService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsafe destination before sending anything', async () => {
    renderAt('/cms/amrut-ecosystem/create');
    await userEvent.type(screen.getByLabelText('Destination'), 'javascript:alert(1)');
    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    expect(
      await screen.findByText('Destination must be a page on this site starting with /, or an address starting with https://'),
    ).toBeInTheDocument();
    expect(ecosystemService.create).not.toHaveBeenCalled();
  });

  it('previews the card and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(ecosystemService.create)
      .mockRejectedValueOnce(new ApiError('A programme named "x" already exists.', 409, 'CONFLICT'))
      .mockResolvedValueOnce(programme(9));
    renderAt('/cms/amrut-ecosystem/create');
    await userEvent.type(screen.getByLabelText('Programme name (Marathi) *'), 'अमृत प्रणाली चाचणी');
    await userEvent.type(screen.getByLabelText('Programme name (English) *'), 'Ecosystem Test');
    await userEvent.type(screen.getByLabelText('Description (Marathi) *'), 'मराठी चाचणी वर्णन');
    await userEvent.type(screen.getByLabelText('Description (English) *'), 'Test description');
    await userEvent.click(screen.getByRole('radio', { name: 'Digital' }));
    await userEvent.type(screen.getByLabelText('Destination'), '/faq');

    const preview = screen.getByRole('figure', { name: 'Marathi preview' });
    expect(preview).toHaveTextContent('अमृत प्रणाली चाचणी');
    expect(preview).toHaveTextContent('मराठी चाचणी वर्णन');
    expect(preview).toHaveTextContent('अधिक जाणून घ्या →');

    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
    await userEvent.click(screen.getByRole('button', { name: 'Save programme' }));
    await waitFor(() => expect(ecosystemService.create).toHaveBeenCalledTimes(2));

    const [[body, key1], [, key2]] = vi.mocked(ecosystemService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({
      name: pair('अमृत प्रणाली चाचणी', 'Ecosystem Test'),
      description: pair('मराठी चाचणी वर्णन', 'Test description'),
      icon: 'monitor',
      link: '/faq',
      linkLabel: BLANK,
      isActive: true,
    });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });
});

describe('Edit Programme', () => {
  it('loads the saved record and sends only what changed', async () => {
    const saved = programme(4, { link: '/apply', icon: 'teacher' });
    vi.mocked(ecosystemService.get).mockResolvedValue(saved);
    vi.mocked(ecosystemService.update).mockResolvedValue(saved);
    renderAt(`/cms/amrut-ecosystem/${saved.id}/edit`);
    expect(await screen.findByLabelText('Destination')).toHaveValue('/apply');
    expect(screen.getByRole('radio', { name: 'Education' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'Award / skills' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(ecosystemService.update).toHaveBeenCalledWith(saved.id, { icon: 'award', expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(ecosystemService.get).mockResolvedValue(programme(5));
    renderAt(`/cms/amrut-ecosystem/${programme(5).id}/edit`);
    await userEvent.type(await screen.findByLabelText('Programme name (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(ecosystemService.update).not.toHaveBeenCalled();
  });
});

describe('Section settings', () => {
  it('requires the heading and default label, then saves with the loaded version', async () => {
    vi.mocked(ecosystemService.updateSection).mockResolvedValue(section());
    renderAt('/cms/amrut-ecosystem/settings');
    const heading = await screen.findByLabelText('Heading (Marathi) *');
    await userEvent.clear(heading);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (Marathi) is required')).toBeInTheDocument();
    expect(ecosystemService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(heading, 'नवीन शीर्षक');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show this section on the public website' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(ecosystemService.updateSection).toHaveBeenCalledWith({
        heading: pair('नवीन शीर्षक', 'The AMRUT Ecosystem'),
        subtitle: section().subtitle,
        linkLabel: section().linkLabel,
        showSection: false,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
  });
});
