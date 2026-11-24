import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import MasterTab from '../components/MasterTab';
import { MASTERS } from '../config';
import { masterFormSchema } from '../schemas/masterSchema';
import { masterApi } from '../services/masterApi';
import type { MasterRecord } from '../types';

const permissions = new Set<string>();
vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: 'me' }, permissions }) }));
vi.mock('../services/masterApi', () => ({
  masterApi: { list: vi.fn(), options: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn(), remove: vi.fn() },
}));

const region = MASTERS.find((m) => m.key === 'region')!;
const docTypes = MASTERS.find((m) => m.key === 'documentType')!;
const castes = MASTERS.find((m) => m.key === 'caste')!;
const record = (over: Partial<MasterRecord> = {}): MasterRecord => ({
  id: 'r1',
  code: 'PUN',
  name: 'Pune',
  description: null,
  isActive: true,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...over,
});
const page = (items: MasterRecord[]) => ({ items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } });

describe('<MasterTab>', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(masterApi.list).mockReset();
    vi.mocked(masterApi.create).mockReset();
    vi.mocked(masterApi.setStatus).mockReset();
  });

  it('shows a loading state, then the records', async () => {
    vi.mocked(masterApi.list).mockResolvedValue(page([record(), record({ id: 'r2', code: 'NAS', name: 'Nashik', isActive: false })]));
    renderWithProviders(<MasterTab master={region} />);
    expect(screen.getByLabelText('Loading regions')).toBeInTheDocument();
    expect(await screen.findByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('Nashik')).toBeInTheDocument();
  });

  it('shows empty, error and forbidden states', async () => {
    vi.mocked(masterApi.list).mockResolvedValue(page([]));
    const { unmount } = renderWithProviders(<MasterTab master={region} />);
    expect(await screen.findByText('No regions yet.')).toBeInTheDocument();
    unmount();

    vi.mocked(masterApi.list).mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderWithProviders(<MasterTab master={region} />);
    expect(await screen.findByText(/do not have permission to view regions/)).toBeInTheDocument();
  });

  it('shows actions only for the permissions the user holds', async () => {
    vi.mocked(masterApi.list).mockResolvedValue(page([record()]));
    const { unmount } = renderWithProviders(<MasterTab master={region} />);
    await screen.findByText('Pune');
    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add region/ })).not.toBeInTheDocument();
    /* Without regions.status the switch shows the state but is disabled. */
    expect(screen.getByRole('switch', { name: 'Status of Pune' })).toBeDisabled();
    unmount();

    ['regions.create', 'regions.update', 'regions.status', 'regions.delete'].forEach((p) => permissions.add(p));
    renderWithProviders(<MasterTab master={region} />);
    await screen.findByText('Pune');
    expect(screen.getByRole('button', { name: /Add region/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    vi.mocked(masterApi.setStatus).mockResolvedValue(record({ isActive: false }));
    const toggle = screen.getByRole('switch', { name: 'Status of Pune' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);
    await waitFor(() => expect(masterApi.setStatus).toHaveBeenCalledWith(region, 'r1', false));
  });

  it('passes search, status and sort to the API', async () => {
    vi.mocked(masterApi.list).mockResolvedValue(page([record()]));
    renderWithProviders(<MasterTab master={region} />);
    await screen.findByText('Pune');
    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'inactive');
    await userEvent.type(screen.getByLabelText('Search regions'), 'nas');
    await userEvent.click(screen.getByRole('button', { name: /^Code/ }));
    await waitFor(() =>
      expect(masterApi.list).toHaveBeenCalledWith(
        region,
        expect.objectContaining({ search: 'nas', isActive: false, page: 1, sortBy: 'code', sortOrder: 'ASC' }),
        expect.anything(),
      ),
    );
  });

  it('creates a document type with the mandatory flag and shows a duplicate-code error on the field', async () => {
    permissions.add('document-types.create');
    vi.mocked(masterApi.list).mockResolvedValue(page([]));
    vi.mocked(masterApi.create).mockRejectedValue(
      new ApiError('A document type with this code already exists (reserved by a deleted record)', 409, 'CONFLICT'),
    );
    renderWithProviders(<MasterTab master={docTypes} />);
    await userEvent.click(await screen.findByRole('button', { name: /Add document type/ }));
    await userEvent.type(screen.getByLabelText('Code'), 'lc');
    await userEvent.type(screen.getByLabelText('Name'), 'Leaving Certificate');
    await userEvent.click(screen.getByLabelText('Mandatory document'));
    await userEvent.click(screen.getByRole('button', { name: 'Create document type' }));
    await waitFor(() =>
      expect(masterApi.create).toHaveBeenCalledWith(
        docTypes,
        { code: 'LC', name: 'Leaving Certificate', description: null, isMandatory: true },
        expect.any(String),
      ),
    );
    expect(await screen.findByText(/reserved by a deleted record/)).toBeInTheDocument();
  });

  it('lists castes in their display order, with the English name, and saves both fields', async () => {
    ['castes.create', 'castes.update'].forEach((p) => permissions.add(p));
    vi.mocked(masterApi.list).mockResolvedValue(
      page([record({ id: 'c1', code: 'C12', name: 'ब्राह्मण', nameEn: 'Brahmin', displayOrder: 1 })]),
    );
    vi.mocked(masterApi.create).mockResolvedValue(record({ id: 'c2' }));
    vi.mocked(masterApi.update).mockResolvedValue(record({ id: 'c1' }));
    renderWithProviders(<MasterTab master={castes} />);

    expect(await screen.findByText('ब्राह्मण')).toBeInTheDocument();
    expect(screen.getByText('Brahmin')).toBeInTheDocument();
    expect(masterApi.list).toHaveBeenCalledWith(
      castes,
      expect.objectContaining({ sortBy: 'displayOrder', sortOrder: 'ASC' }),
      expect.anything(),
    );

    /* A new caste without a display order is left to the backend, which adds it at the end. */
    await userEvent.click(screen.getByRole('button', { name: /Add caste/ }));
    await userEvent.type(screen.getByLabelText('Code'), 'c27');
    await userEvent.type(screen.getByLabelText('Name (Marathi)'), 'मारवाडी');
    await userEvent.type(screen.getByLabelText('English name (optional)'), 'Marwari');
    await userEvent.click(screen.getByRole('button', { name: 'Create caste' }));
    await waitFor(() =>
      expect(masterApi.create).toHaveBeenCalledWith(
        castes,
        { code: 'C27', name: 'मारवाडी', description: null, nameEn: 'Marwari' },
        expect.any(String),
      ),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const order = screen.getByLabelText('Display order');
    expect(order).toHaveValue(1);
    await userEvent.clear(order);
    await userEvent.type(order, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(masterApi.update).toHaveBeenCalledWith(castes, 'c1', expect.objectContaining({ nameEn: 'Brahmin', displayOrder: 3 })),
    );
  });

  it('shows no English name or display order for the other masters', async () => {
    permissions.add('regions.create');
    vi.mocked(masterApi.list).mockResolvedValue(page([]));
    renderWithProviders(<MasterTab master={region} />);
    await userEvent.click(await screen.findByRole('button', { name: /Add region/ }));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.queryByLabelText('English name (optional)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Display order')).not.toBeInTheDocument();
  });
});

describe('masterFormSchema', () => {
  it('sends a corrected create with a new Idempotency-Key after a refusal (e2e 24 Nov 2026)', async () => {
    permissions.add('regions.create');
    vi.mocked(masterApi.list).mockResolvedValue(page([]));
    vi.mocked(masterApi.create)
      .mockRejectedValueOnce(new ApiError('A region with this code already exists', 409, 'CONFLICT'))
      .mockResolvedValueOnce(record({ id: 'r9', code: 'PUN2' }));
    renderWithProviders(<MasterTab master={region} />);
    await userEvent.click(await screen.findByRole('button', { name: /Add region/ }));
    await userEvent.type(screen.getByLabelText('Code'), 'PUN');
    await userEvent.type(screen.getByLabelText('Name'), 'Pune');
    await userEvent.click(screen.getByRole('button', { name: 'Create region' }));
    await waitFor(() => expect(masterApi.create).toHaveBeenCalledTimes(1));
    await userEvent.type(screen.getByLabelText('Code'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Create region' }));
    await waitFor(() => expect(masterApi.create).toHaveBeenCalledTimes(2));
    const [[, , key1], [, input2, key2]] = vi.mocked(masterApi.create).mock.calls;
    expect(input2).toMatchObject({ code: 'PUN2' });
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('upper-cases the code and enforces the per-master limits', () => {
    const schema = masterFormSchema(region);
    expect(schema.parse({ code: ' pun ', name: 'Pune', description: '', isMandatory: false }).code).toBe('PUN');
    expect(schema.safeParse({ code: 'TOO-LONG-CODE', name: 'x', description: '', isMandatory: false }).success).toBe(false);
    expect(schema.safeParse({ code: 'a b', name: 'x', description: '', isMandatory: false }).success).toBe(false);
    expect(schema.safeParse({ code: 'A', name: ' ', description: '', isMandatory: false }).success).toBe(false);
  });
});
