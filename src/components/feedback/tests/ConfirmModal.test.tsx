import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type * as ApiClient from '../../../services/api-client';

vi.mock('../../../services/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiClient>()),
  request: vi.fn(),
}));

import { ApiError, request } from '../../../services/api-client';
import { ConfirmModal } from '../apiFeedback';

/*
 * The delete dialog's dependency check (GET /dependencies/:kind/:id): it waits for the answer, refuses to confirm a record
 * that is still used and says why, lets an unused one be deleted, and never blocks when the question itself fails.
 */
const COEP_MESSAGE =
  'Unable to delete this user because they are associated with existing candidate application approvals (3). ' +
  'This user cannot be deleted while these dependencies exist. Deactivate the account instead.';

function renderDelete(dependencies?: { kind: string; id: string }) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ConfirmModal
      title="Delete user"
      danger
      confirmLabel="Delete"
      message="Delete Officer COEP? This cannot be undone here."
      dependencies={dependencies}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { onConfirm, onClose, dialog: screen.getByRole('dialog') };
}

describe('<ConfirmModal> delete dependency check', () => {
  /* restoreMocks (vitest.config.ts) clears the mocked request between tests. */

  it('shows why a used record cannot be deleted and does not let it be confirmed', async () => {
    vi.mocked(request).mockResolvedValue({
      data: { deletable: false, message: COEP_MESSAGE, dependencies: [{ label: 'candidate application approvals', count: 3 }] },
      message: 'Data retrieved successfully',
    });
    const { onConfirm, dialog } = renderDelete({ kind: 'user', id: 'u-1' });

    expect(within(dialog).getByRole('button', { name: 'Checking…' })).toBeDisabled();
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent(`This record cannot be deleted. ${COEP_MESSAGE}`);
    expect(alert).toHaveTextContent('candidate application approvals: 3');
    expect(within(dialog).queryByText(/Delete Officer COEP\?/)).not.toBeInTheDocument();
    const confirm = within(dialog).getByRole('button', { name: 'Delete' });
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeEnabled();
    expect(request).toHaveBeenCalledWith('/dependencies/user/u-1', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('lets an unused record be deleted once the check has answered', async () => {
    vi.mocked(request).mockResolvedValue({ data: { deletable: true, message: null, dependencies: [] }, message: 'Data retrieved successfully' });
    const { onConfirm, dialog } = renderDelete({ kind: 'district', id: 'd-1' });
    const confirm = await within(dialog).findByRole('button', { name: 'Delete' });
    expect(confirm).toBeEnabled();
    expect(dialog).toHaveTextContent('Delete Officer COEP? This cannot be undone here.');
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('/dependencies/district/d-1', expect.anything());
  });

  it('does not block when the check fails: the API still refuses a used record when it deletes', async () => {
    vi.mocked(request).mockRejectedValue(new ApiError('Not permitted', 403, 'FORBIDDEN'));
    const { onConfirm, dialog } = renderDelete({ kind: 'role', id: 'r-1' });
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('asks nothing for a confirmation that is not a delete', async () => {
    const { onConfirm, dialog } = renderDelete();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });
});
