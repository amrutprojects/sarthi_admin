import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import ApiKeysPage from '../pages/ApiKeysPage';
import { apiKeyApi } from '../services/lmsSyncApi';
import type { ApiKey } from '../types/lmsSync.types';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (a: string) => granted.has(a) }));

/* Synthetic values only; no real key material. */
const SECRET = 'amk_000000000000_0000000000000000000000000000000000000000000';
const key = (over: Partial<ApiKey> = {}): ApiKey => ({
  id: 'k1',
  prefix: 'ab12ab12ab12',
  displayPrefix: 'amk_ab12ab12ab12_…',
  label: 'LMS production',
  scopes: ['lms.students.match', 'lms.students.create', 'lms.students.update'],
  status: 'ACTIVE',
  state: 'ACTIVE',
  createdAt: '2026-11-01T05:00:00.000Z',
  createdById: 'u1',
  rotatedAt: null,
  rotatedById: null,
  replacedById: null,
  rotatedFromId: null,
  revokedById: null,
  revokedReason: null,
  lastUsedAt: '2026-11-20T05:00:00.000Z',
  expiresAt: null,
  revokedAt: null,
  ...over,
});

beforeEach(() => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  vi.restoreAllMocks();
  granted = new Set(['viewLmsApiKeys', 'createLmsApiKey', 'rotateLmsApiKey', 'revokeLmsApiKey']);
});

describe('ApiKeysPage', () => {
  it('lists display prefix, label, scopes, state and last use, never a secret', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([
      key(),
      key({ id: 'k0', displayPrefix: 'amk_zz99zz99zz99_…', status: 'REVOKED', state: 'REVOKED', lastUsedAt: null }),
    ]);
    renderWithProviders(<ApiKeysPage />);
    expect(await screen.findByText('amk_ab12ab12ab12_…')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Active')).toBeInTheDocument();
    expect(within(rows[1]).getByText('lms.students.create')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Revoked')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Never')).toBeInTheDocument();
    /* A revoked key offers no actions. */
    expect(within(rows[2]).queryByRole('button')).not.toBeInTheDocument();
  });

  it('generates a key and shows its secret once with Copy; closing drops it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([]);
    const create = vi.spyOn(apiKeyApi, 'create').mockResolvedValue({ key: key(), secret: SECRET });
    renderWithProviders(<ApiKeysPage />);
    expect(await screen.findByText('No API keys yet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Generate key' }));
    const generate = screen.getByRole('button', { name: 'Generate' });
    expect(generate).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Label'), 'LMS production');
    await userEvent.click(screen.getByRole('checkbox', { name: /students\.update/ }));
    await userEvent.click(generate);
    expect(create).toHaveBeenCalledWith(
      { label: 'LMS production', scopes: ['lms.students.match', 'lms.students.create'] },
      expect.any(String),
    );

    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument();
    expect(screen.getByText(/will not be shown again/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(SECRET);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'I have stored the key' }));
    expect(screen.queryByDisplayValue(SECRET)).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.body.innerHTML).not.toContain(SECRET);
  });

  it('generates with a new Idempotency-Key after a refused request (e2e 24 Nov 2026)', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([]);
    const create = vi
      .spyOn(apiKeyApi, 'create')
      .mockRejectedValueOnce(new ApiError('expiresAt must be in the future', 400, 'VALIDATION_ERROR'))
      .mockResolvedValueOnce({ key: key(), secret: SECRET });
    renderWithProviders(<ApiKeysPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Generate key' }));
    await userEvent.type(screen.getByLabelText('Label'), 'LMS production');
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    const [[, key1], [, key2]] = create.mock.calls;
    expect(key1).toBeTruthy();
    expect(key2).not.toBe(key1);
  });

  it('rotates with the chosen overlap and shows the new secret', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key()]);
    const rotate = vi.spyOn(apiKeyApi, 'rotate').mockResolvedValue({
      key: key({ id: 'k2', displayPrefix: 'amk_cd34cd34cd34_…', rotatedFromId: 'k1' }),
      secret: SECRET,
      previous: key({ state: 'EXPIRING', replacedById: 'k2', expiresAt: '2026-11-24T05:00:00.000Z' }),
    });
    renderWithProviders(<ApiKeysPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Rotate' }));
    await userEvent.selectOptions(screen.getByLabelText('Old key keeps working for'), '4320');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rotate' }));
    expect(rotate).toHaveBeenCalledWith('k1', 4320, expect.any(String));
    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument();
  });

  it('revokes only after a confirmation with a reason', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key()]);
    const revoke = vi.spyOn(apiKeyApi, 'revoke').mockResolvedValue(key({ status: 'REVOKED', state: 'REVOKED' }));
    renderWithProviders(<ApiKeysPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Revoke key' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Reason/), 'Key leaked in a ticket');
    await userEvent.click(confirm);
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('k1', 'Key leaked in a ticket'));
  });

  it('offers Revoke but not Rotate on an EXPIRING (rotated) key', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key({ state: 'EXPIRING', expiresAt: '2026-11-22T05:00:00.000Z', replacedById: 'k2' })]);
    renderWithProviders(<ApiKeysPage />);
    expect(await screen.findByText('Expiring (rotated)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rotate' })).not.toBeInTheDocument();
  });

  it('hides generate, rotate and revoke without their permissions', async () => {
    granted = new Set(['viewLmsApiKeys']);
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key()]);
    renderWithProviders(<ApiKeysPage />);
    expect(await screen.findByText('amk_ab12ab12ab12_…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate key' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rotate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});
