import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { fmtDeadline, isExpired } from './constants';
import SchemeCreate from './pages/SchemeCreate';
import SchemeEdit from './pages/SchemeEdit';
import SchemesPage from './pages/SchemesPage';
import SchemesSettingsEdit from './pages/SchemesSettingsEdit';
import { schemesService } from './services/schemesService';
import type { ApiScheme, ApiSchemesSection, Bilingual } from './types/schemes.types';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/schemesService', () => ({
  schemesService: {
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
const ALL = ['cms-schemes.view', 'cms-schemes.create', 'cms-schemes.update', 'cms-schemes.delete'];

const scheme = (n: number, extra: Partial<ApiScheme> = {}): ApiScheme => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  title: pair(`योजना ${n}`, `Scheme ${n}`),
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  badge: BLANK,
  deadline: '2030-12-31',
  link: null,
  buttonLabel: BLANK,
  featured: false,
  displayOrder: n,
  isActive: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const section = (): ApiSchemesSection => ({
  id: 's1',
  heading: pair('अमृत योजना विभाग', 'AMRUT Schemes'),
  subtitle: pair(
    'अमृत संस्थेद्वारे राबवल्या जाणाऱ्या विविध प्रशिक्षण व विकास योजना.',
    'Training and development schemes implemented by AMRUT.',
  ),
  buttonLabel: pair('अधिक जाणून घ्या', 'Learn more'),
  showSection: true,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
});

const toasts = () => document.getElementById('toast-root')!;
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/cms/amrut-schemes" element={<SchemesPage />} />
      <Route path="/cms/amrut-schemes/create" element={<SchemeCreate />} />
      <Route path="/cms/amrut-schemes/settings" element={<SchemesSettingsEdit />} />
      <Route path="/cms/amrut-schemes/:id/edit" element={<SchemeEdit />} />
    </Routes>,
    { route },
  );
const row = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;

const fillRequired = async () => {
  await userEvent.type(screen.getByLabelText('Scheme title (Marathi) *'), 'अमृत सीएमएस चाचणी योजना');
  await userEvent.type(screen.getByLabelText('Scheme title (English) *'), 'AMRUT CMS Test Scheme');
  await userEvent.type(screen.getByLabelText('Description (Marathi) *'), 'चाचणी वर्णन');
  await userEvent.type(screen.getByLabelText('Description (English) *'), 'Test description');
};

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(schemesService.getSection).mockResolvedValue(section());
});

describe('AMRUT Schemes list', () => {
  it('lists every scheme with title, badge, last date, button destination, order and status', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([
      scheme(1, {
        title: pair('अमृत कलश - कौशल्य प्रशिक्षण', 'AMRUT Kalash - Skill Training'),
        badge: pair('हा कार्यक्रम', 'This programme'),
        deadline: '2027-03-31',
        link: '/programme',
        featured: true,
      }),
      scheme(2, { deadline: '2026-03-11' }),
      scheme(3, { deadline: null, link: 'https://example.gov.in/x', buttonLabel: pair('भेट द्या', 'Visit'), isActive: false }),
    ]);
    renderAt('/cms/amrut-schemes');
    await screen.findByText('AMRUT Kalash - Skill Training');
    const kalash = row('AMRUT Kalash - Skill Training');
    expect(within(kalash).getByText('This programme')).toBeInTheDocument();
    expect(within(kalash).getByText('Highlighted')).toBeInTheDocument();
    expect(within(kalash).getByText('31 Mar 2027')).toBeInTheDocument();
    expect(within(kalash).getByText('/programme')).toBeInTheDocument();
    expect(within(row('Scheme 2')).getByText('11 Mar 2026')).toBeInTheDocument();
    expect(within(row('Scheme 2')).getByText('Date passed')).toBeInTheDocument();
    expect(within(row('Scheme 2')).getByText(/No link/)).toBeInTheDocument();
    expect(within(row('Scheme 3')).getByText('No last date')).toBeInTheDocument();
    expect(within(row('Scheme 3')).getByText(/example\.gov\.in/)).toBeInTheDocument();
    expect(within(row('Scheme 3')).getByText('Visit')).toBeInTheDocument();
    expect(within(row('Scheme 3')).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('3 listed, 2 shown on the website')).toBeInTheDocument();
    expect(await screen.findByText('अमृत योजना विभाग')).toBeInTheDocument();
  });

  it('filters by search and status, and hides reordering while filtered', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2, { isActive: false })]);
    renderAt('/cms/amrut-schemes');
    await screen.findByText('Scheme 1');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search schemes' }), 'वर्णन 2');
    expect(screen.queryByText('Scheme 1')).toBeNull();
    expect(screen.getByText('Scheme 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Move .* up/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status filter' }), 'active');
    expect(screen.getByText('Scheme 1')).toBeInTheDocument();
    expect(screen.queryByText('Scheme 2')).toBeNull();
  });

  it('shows an empty state and a retryable error', async () => {
    vi.mocked(schemesService.list).mockResolvedValueOnce([]);
    const { unmount } = renderAt('/cms/amrut-schemes');
    expect(await screen.findByText('No schemes yet')).toBeInTheDocument();
    unmount();
    vi.mocked(schemesService.list)
      .mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([scheme(1)]);
    renderAt('/cms/amrut-schemes');
    expect(await screen.findByText(/Could not load data from the server/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Scheme 1')).toBeInTheDocument();
  });

  it('deletes the scheme named in the dialog, by id — and Cancel deletes nothing', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2), scheme(3)]);
    vi.mocked(schemesService.remove).mockResolvedValue();
    renderAt('/cms/amrut-schemes');
    await screen.findByText('Scheme 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Scheme 2' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Delete योजना 2 / Scheme 2?');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(schemesService.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Scheme 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(schemesService.remove).toHaveBeenCalledWith(scheme(2).id));
    expect(schemesService.remove).toHaveBeenCalledTimes(1);
  });

  it('reports a failed delete and keeps the list', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2)]);
    vi.mocked(schemesService.remove).mockRejectedValueOnce(new ApiError('Database unavailable', 500, 'INTERNAL_ERROR'));
    renderAt('/cms/amrut-schemes');
    await screen.findByText('Scheme 2');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Scheme 2' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('Database unavailable'));
    expect(screen.getByText('Scheme 2')).toBeInTheDocument();
  });

  it('reorders by sending the whole list of ids', async () => {
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2), scheme(3)]);
    vi.mocked(schemesService.reorder).mockResolvedValue([]);
    renderAt('/cms/amrut-schemes');
    await screen.findByText('Scheme 3');
    await userEvent.click(screen.getByRole('button', { name: 'Move Scheme 1 down' }));
    await waitFor(() => expect(schemesService.reorder).toHaveBeenCalledWith([scheme(2).id, scheme(1).id, scheme(3).id]));
  });

  it('gives a view-only administrator no Add, Edit, Hide, Delete or reorder controls', async () => {
    auth.permissions = new Set(['cms-schemes.view']);
    vi.mocked(schemesService.list).mockResolvedValue([scheme(1), scheme(2)]);
    renderAt('/cms/amrut-schemes');
    await screen.findByText('Scheme 1');
    expect(screen.queryByRole('button', { name: /Add New Scheme/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Hide|Move) / })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit settings' })).toBeNull();
  });
});

describe('Add New Scheme', () => {
  it('names each missing required field', async () => {
    renderAt('/cms/amrut-schemes/create');
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(await screen.findByText('Scheme title (Marathi) is required')).toBeInTheDocument();
    expect(screen.getByText('Scheme title (English) is required')).toBeInTheDocument();
    expect(screen.getByText('Description (English) is required')).toBeInTheDocument();
    expect(schemesService.create).not.toHaveBeenCalled();
  });

  it('refuses an unsafe destination, a half-filled badge and an impossible date before sending anything', async () => {
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.type(screen.getByLabelText('Destination'), 'javascript:alert(1)');
    await userEvent.type(screen.getByLabelText('Badge (Marathi)'), 'नवीन');
    /* A date input yields only YYYY-MM-DD or ''; typed text can still reach it in browsers without a picker. */
    const date = screen.getByLabelText('Last date');
    date.setAttribute('type', 'text');
    await userEvent.type(date, '2026-02-30');
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(
      await screen.findByText('Destination must be a page on this site starting with /, or an address starting with https://'),
    ).toBeInTheDocument();
    expect(screen.getByText('Badge (English) is required when the Marathi text is filled in')).toBeInTheDocument();
    expect(screen.getByText('Last date is not a real calendar date')).toBeInTheDocument();
    expect(schemesService.create).not.toHaveBeenCalled();
  });

  it('previews the card and saves it with an Idempotency-Key, renewing the key after a refusal', async () => {
    vi.mocked(schemesService.create)
      .mockRejectedValueOnce(new ApiError('A scheme titled "x" already exists.', 409, 'CONFLICT'))
      .mockResolvedValueOnce(scheme(9));
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.type(screen.getByLabelText('Badge (Marathi)'), 'नवीन');
    await userEvent.type(screen.getByLabelText('Badge (English)'), 'New');
    await userEvent.type(screen.getByLabelText('Last date'), '2027-01-15');
    await userEvent.type(screen.getByLabelText('Destination'), '/apply');

    const preview = screen.getByRole('figure', { name: 'Marathi preview' });
    expect(preview).toHaveTextContent('अमृत सीएमएस चाचणी योजना');
    expect(preview).toHaveTextContent('नवीन');
    expect(preview).toHaveTextContent('अंतिम दिनांक: 15 Jan 2027');
    expect(preview).toHaveTextContent('अधिक जाणून घ्या');
    expect(screen.getByRole('figure', { name: 'English preview' })).toHaveTextContent('Last date: 15 Jan 2027');

    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('already exists'));
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    await waitFor(() => expect(schemesService.create).toHaveBeenCalledTimes(2));

    const [[body, key1], [, key2]] = vi.mocked(schemesService.create).mock.calls as [unknown, string][];
    expect(body).toEqual({
      title: pair('अमृत सीएमएस चाचणी योजना', 'AMRUT CMS Test Scheme'),
      description: pair('चाचणी वर्णन', 'Test description'),
      badge: pair('नवीन', 'New'),
      deadline: '2027-01-15',
      link: '/apply',
      buttonLabel: BLANK,
      featured: false,
      isActive: true,
    });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('saves a scheme with no badge, no last date and no link', async () => {
    vi.mocked(schemesService.create).mockResolvedValueOnce(scheme(9));
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    await waitFor(() => expect(schemesService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(schemesService.create).mock.calls[0]![0]).toMatchObject({ badge: BLANK, deadline: null, link: null });
  });

  it('shows the server’s field message on the field', async () => {
    vi.mocked(schemesService.create).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.deadline', message: 'Last date must be between the years 2000 and 2100' },
      ]),
    );
    renderAt('/cms/amrut-schemes/create');
    await fillRequired();
    await userEvent.click(screen.getByRole('button', { name: 'Save scheme' }));
    expect(await screen.findByText('Last date must be between the years 2000 and 2100')).toBeInTheDocument();
  });
});

describe('Edit Scheme', () => {
  it('loads the saved record and sends only what changed', async () => {
    const saved = scheme(4, { link: '/apply', deadline: '2026-06-30', badge: pair('नवीन', 'New') });
    vi.mocked(schemesService.get).mockResolvedValue(saved);
    vi.mocked(schemesService.update).mockResolvedValue(saved);
    renderAt(`/cms/amrut-schemes/${saved.id}/edit`);
    expect(await screen.findByLabelText('Destination')).toHaveValue('/apply');
    expect(screen.getByLabelText('Last date')).toHaveValue('2026-06-30');
    expect(screen.getByLabelText('Badge (English)')).toHaveValue('New');
    await userEvent.clear(screen.getByLabelText('Last date'));
    await userEvent.type(screen.getByLabelText('Last date'), '2027-07-31');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(schemesService.update).toHaveBeenCalledWith(saved.id, { deadline: '2027-07-31', expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('can clear the last date and the badge', async () => {
    const saved = scheme(6, { badge: pair('नवीन', 'New') });
    vi.mocked(schemesService.get).mockResolvedValue(saved);
    vi.mocked(schemesService.update).mockResolvedValue(saved);
    renderAt(`/cms/amrut-schemes/${saved.id}/edit`);
    await userEvent.click(await screen.findByRole('button', { name: 'Clear date' }));
    await userEvent.clear(screen.getByLabelText('Badge (Marathi)'));
    await userEvent.clear(screen.getByLabelText('Badge (English)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(schemesService.update).toHaveBeenCalledWith(saved.id, { deadline: null, badge: BLANK, expectedUpdatedAt: saved.updatedAt }),
    );
  });

  it('asks before discarding changes on Cancel, and saves nothing', async () => {
    vi.mocked(schemesService.get).mockResolvedValue(scheme(5));
    renderAt(`/cms/amrut-schemes/${scheme(5).id}/edit`);
    await userEvent.type(await screen.findByLabelText('Scheme title (English) *'), ' X');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('This form has unsaved changes.');
    expect(schemesService.update).not.toHaveBeenCalled();
  });
});

describe('Section settings', () => {
  it('requires the heading and default button label, then saves with the loaded version', async () => {
    vi.mocked(schemesService.updateSection).mockResolvedValue(section());
    renderAt('/cms/amrut-schemes/settings');
    const heading = await screen.findByLabelText('Heading (English) *');
    await userEvent.clear(heading);
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Heading (English) is required')).toBeInTheDocument();
    expect(schemesService.updateSection).not.toHaveBeenCalled();

    await userEvent.type(heading, 'Schemes of AMRUT');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show this section on the public website' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() =>
      expect(schemesService.updateSection).toHaveBeenCalledWith({
        heading: pair('अमृत योजना विभाग', 'Schemes of AMRUT'),
        subtitle: section().subtitle,
        buttonLabel: section().buttonLabel,
        showSection: false,
        expectedUpdatedAt: section().updatedAt,
      }),
    );
  });
});

describe('Deadline helpers', () => {
  it('formats like the website and never shifts the day', () => {
    expect(fmtDeadline('2027-03-31')).toBe('31 Mar 2027');
    expect(fmtDeadline('2026-06-09')).toBe('9 Jun 2026');
    expect(fmtDeadline(null)).toBe('');
    expect(isExpired('2026-03-11', '2026-10-22')).toBe(true);
    expect(isExpired('2026-10-22', '2026-10-22')).toBe(false);
    expect(isExpired(null, '2026-10-22')).toBe(false);
  });
});
