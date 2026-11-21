import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import ApiKeysPage from '../pages/ApiKeysPage';
import { apiKeyApi } from '../services/lmsSyncApi';
import type { ApiKey } from '../types/lmsSync.types';

let granted = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (a: string) => granted.has(a) }));

/* Synthetic values only; no real key material. */
const SECRET = 'amk_test_0000000000000000000000000000';
const key = (over: Partial<ApiKey> = {}): ApiKey => ({
  id: 'k1',
  prefix: 'amk_live_ab12',
  label: 'LMS production',
  scopes: ['students.match', 'students.create', 'students.update'],
  status: 'ACTIVE',
  createdAt: '2026-11-01T05:00:00.000Z',
  createdByName: 'Priya Admin',
  lastUsedAt: '2026-11-20T05:00:00.000Z',
  expiresAt: null,
  revokedAt: null,
  replacesId: null,
  ...over,
});

beforeEach(() => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  vi.restoreAllMocks();
  granted = new Set(['viewLmsApiKeys', 'createLmsApiKey', 'rotateLmsApiKey', 'revokeLmsApiKey']);
});

describe('ApiKeysPage', () => {
  it('lists prefix, label, scopes, status and last use, never a secret', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key(), key({ id: 'k0', prefix: 'amk_live_zz99', status: 'REVOKED', lastUsedAt: null })]);
    renderWithProviders(<ApiKeysPage />);
    expect(await screen.findByText('amk_live_ab12…')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Active')).toBeInTheDocument();
    expect(within(rows[1]).getByText('students.create')).toBeInTheDocument();
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
    expect(create).toHaveBeenCalledWith({ label: 'LMS production', scopes: ['students.match', 'students.create'] }, expect.any(String));

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

  it('rotates with the chosen overlap and shows the new secret', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key()]);
    const rotate = vi.spyOn(apiKeyApi, 'rotate').mockResolvedValue({
      key: key({ id: 'k2', prefix: 'amk_live_cd34', replacesId: 'k1' }),
      secret: SECRET,
      previous: key({ status: 'ROTATING', expiresAt: '2026-11-24T05:00:00.000Z' }),
    });
    renderWithProviders(<ApiKeysPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Rotate' }));
    await userEvent.selectOptions(screen.getByLabelText('Old key keeps working for'), '72');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Rotate' }));
    expect(rotate).toHaveBeenCalledWith('k1', 72, expect.any(String));
    expect(await screen.findByDisplayValue(SECRET)).toBeInTheDocument();
  });

  it('revokes only after a confirmation with a reason', async () => {
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key()]);
    const revoke = vi.spyOn(apiKeyApi, 'revoke').mockResolvedValue(key({ status: 'REVOKED' }));
    renderWithProviders(<ApiKeysPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(screen.getByText(/This cannot be undone/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Revoke key' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Reason/), 'Key leaked in a ticket');
    await userEvent.click(confirm);
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('k1', 'Key leaked in a ticket'));
  });

  it('hides generate, rotate and revoke without their permissions', async () => {
    granted = new Set(['viewLmsApiKeys']);
    vi.spyOn(apiKeyApi, 'list').mockResolvedValue([key()]);
    renderWithProviders(<ApiKeysPage />);
    expect(await screen.findByText('amk_live_ab12…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate key' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rotate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});
