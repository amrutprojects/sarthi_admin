import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import BatchDetailPage from '../pages/BatchDetailPage';
import BatchesPage from '../pages/BatchesPage';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import { BATCH_ID, PUNE, SATARA, batch, counts, pageOf, readOnlySummary, resetToasts, row, summary, toasts } from './fixtures';
import Where from './Where';

vi.mock('../../auth', () => ({ useCanOpen: () => () => true, useCan: () => () => false }));
vi.mock('../services/ippApprovalsApi', () => ({
  ippApprovalsApi: {
    summary: vi.fn(),
    districts: vi.fn(),
    applications: vi.fn(),
    batches: vi.fn(),
    batch: vi.fn(),
    batchOptions: vi.fn(),
    approveBatch: vi.fn(),
  },
}));
const api = vi.mocked(ippApprovalsApi);

const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/ipp-approvals/batches"
        element={
          <>
            <BatchesPage />
            <Where />
          </>
        }
      />
      <Route
        path="/ipp-approvals/batches/:id"
        element={
          <>
            <BatchDetailPage />
            <Where />
          </>
        }
      />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route },
  );
const LIST = '/ipp-approvals/batches';
const ONE = `${LIST}/${BATCH_ID}`;

beforeEach(() => {
  resetToasts();
  api.summary.mockResolvedValue(summary());
  api.batches.mockResolvedValue(
    pageOf([batch(), batch({ id: 'b-2', code: 'IPP-B-0002', name: 'Satara 1', district: SATARA, toDecide: 0, stages: counts() })]),
  );
  api.batch.mockResolvedValue(batch());
  api.applications.mockResolvedValue(pageOf([row()]));
});

describe('IPP batches — list', () => {
  it('shows where the students of each batch are now', async () => {
    renderAt(LIST);
    const first = (await screen.findByRole('link', { name: 'Pune 1' })).closest('tr') as HTMLElement;
    for (const text of ['IPP-B-0001', 'Pune', 'Shivajinagar Centre', '30', 'With Divisional Officer 7', 'With COEP 23', '7']) {
      expect(within(first).getByText(text)).toBeInTheDocument();
    }
    expect(within(first).queryByText(/With Head Office/)).not.toBeInTheDocument();
    expect(within(first).getByRole('link', { name: 'Open batch IPP-B-0001' })).toHaveAttribute('href', ONE);
    expect(document.title).toBe('IPP batches — SARTHI Admin');
    /* The officer's own districts, without asking for all of them. */
    expect(
      within(screen.getByLabelText('District'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['All districts', 'Pune', 'Satara']);
    expect(api.districts).not.toHaveBeenCalled();
  });

  it('keeps search, district, sorting and page in the URL', async () => {
    api.batches.mockResolvedValue(pageOf([batch()], 1, 60, 3));
    renderAt(LIST);
    await screen.findByRole('link', { name: 'Pune 1' });
    await userEvent.selectOptions(screen.getByLabelText('District'), PUNE.id);
    await userEvent.type(screen.getByLabelText('Search'), 'shiv');
    await waitFor(() =>
      expect(api.batches.mock.lastCall?.[0]).toEqual(expect.objectContaining({ search: 'shiv', districtId: PUNE.id, page: 1 })),
    );
    await userEvent.click(screen.getByRole('button', { name: /^Received/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() =>
      expect(api.batches.mock.lastCall?.[0]).toEqual({
        page: 2,
        limit: 25,
        search: 'shiv',
        districtId: PUNE.id,
        sortBy: 'receivedAt',
        sortOrder: 'ASC',
      }),
    );
    expect(screen.getByTestId('where')).toHaveTextContent(`${LIST}?district=${PUNE.id}&q=shiv&sort=receivedAt&dir=ASC&page=2`);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('where')).toHaveTextContent(`${LIST}?sort=receivedAt&dir=ASC`);
  });

  it('links the two lists of the menu', async () => {
    renderAt(LIST);
    const nav = screen.getByRole('navigation', { name: 'IPP approvals' });
    expect(within(nav).getByRole('link', { name: 'Batches' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Applications' })).toHaveAttribute('href', '/ipp-approvals');
    await screen.findByRole('link', { name: 'Pune 1' });
  });

  it('shows empty, error and 403 states', async () => {
    api.batches.mockResolvedValue(pageOf([]));
    const empty = renderAt(LIST);
    expect(await screen.findByText('No batches yet. They appear here when IPP sends one.')).toBeInTheDocument();
    empty.unmount();

    api.batches.mockRejectedValueOnce(new ApiError('Database unavailable', 503, 'ERROR'));
    const failed = renderAt(LIST);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No batches yet/)).toBeInTheDocument();
    failed.unmount();

    api.batches.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderAt(LIST);
    expect(await screen.findByText(/You do not have permission to see the batches/)).toBeInTheDocument();
  });
});

describe('IPP batches — one batch', () => {
  it('shows its data and its applications only', async () => {
    renderAt(ONE);
    expect(await screen.findByRole('heading', { name: 'Pune 1', level: 1 })).toBeInTheDocument();
    expect(document.title).toBe('Batch IPP-B-0001 — SARTHI Admin');
    const value = (label: string) => screen.getByText(label, { selector: '.kv > span' }).nextSibling?.textContent;
    expect(value('Centre')).toBe('Shivajinagar Centre (SHV)');
    expect(value('Students')).toBe('30 (batch size 30)');
    expect(value('Training')).toBe('Offline');
    expect(value('Starts')).toMatch(/1.*Dec.*2026/);
    expect(value('Ends')).toBe('—');
    expect(value('Where they are now')).toBe('With Divisional Officer 7With COEP 23');

    expect(await screen.findByRole('link', { name: 'Asha Patil' })).toBeInTheDocument();
    expect(api.applications.mock.lastCall?.[0]).toEqual(expect.objectContaining({ batchId: BATCH_ID, view: 'ALL' }));
    const chips = screen.getByRole('group', { name: 'Applications' });
    expect(within(chips).getByRole('button', { name: 'All 30' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chips).getByRole('button', { name: 'To decide 7' })).toBeInTheDocument();
    /* The batch is fixed: no batch or district filter or column. */
    expect(screen.queryByLabelText('Batch')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'District' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Select all in this batch/ })).not.toBeInTheDocument();
    expect(api.batchOptions).not.toHaveBeenCalled();
  });

  it('keeps the other filters in the URL of the batch', async () => {
    renderAt(ONE);
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'COEP');
    expect(screen.getByTestId('where')).toHaveTextContent(`${ONE}?stage=COEP`);
    await waitFor(() => expect(api.applications.mock.lastCall?.[0]).toEqual(expect.objectContaining({ batchId: BATCH_ID, stage: 'COEP' })));
  });

  it('asks the reason when the API says some of the batch were rejected before (422), and sends it then', async () => {
    api.approveBatch
      .mockRejectedValueOnce(
        new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
          {
            field: 'body.reason',
            message: 'Approval reason is required: 2 of these applications were rejected before, so this is their second approval.',
          },
        ]),
      )
      .mockResolvedValueOnce({ approved: 7, skipped: 0, applications: [] });
    renderAt(ONE);
    await userEvent.click(await screen.findByRole('button', { name: 'Approve all that wait for me (7)' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText(/Approval reason/)).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve 7' }));
    expect(await within(dialog).findByText(/2 of these applications were rejected before/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Approval reason/), 'Whole batch checked');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve 7' }));
    await waitFor(() => expect(api.approveBatch).toHaveBeenLastCalledWith(BATCH_ID, 'Whole batch checked'));
  });

  it('approves all that wait for me after a confirmation naming the count', async () => {
    api.approveBatch.mockResolvedValue({ approved: 6, skipped: 1, applications: [] });
    renderAt(ONE);
    await userEvent.click(await screen.findByRole('button', { name: 'Approve all that wait for me (7)' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(
      'Are you sure you want to approve all 7 applications of batch IPP-B-0001 that wait for you? ' +
        'Once approved, the applications will be forwarded to the COEP for further review and approval.',
    );
    expect(api.approveBatch).not.toHaveBeenCalled();
    api.batch.mockResolvedValue(batch({ toDecide: 0 }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve 7' }));
    await waitFor(() => expect(api.approveBatch).toHaveBeenCalledWith(BATCH_ID, null));
    await waitFor(() =>
      expect(toasts()).toHaveTextContent('6 applications approved; 1 application skipped: not waiting for you any more.'),
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: /Approve all/ })).not.toBeInTheDocument());
  });

  it.each([
    ['COEP', ['COEP'], true, 'the applications will be forwarded to the Head Officer (HO) for final review and approval.'],
    [
      'COEP while Head Office approval is off',
      ['COEP'],
      false,
      'the applications will be forwarded to the Super Admin for final review and approval.',
    ],
    ['the Head Officer', ['HEAD_OFFICE'], true, 'this will be their final approval.'],
    ['the Super Admin', ['SUPER_ADMIN'], false, 'this will be their final approval.'],
    [
      'a Divisional Officer who is also COEP',
      ['DIVISION', 'COEP'],
      true,
      'each application will be forwarded to its own next approval authority: those with the Divisional Officer to the COEP for further ' +
        'review and approval and those with the COEP to the Head Officer (HO) for final review and approval.',
    ],
  ] as const)('the confirmation for %s names who approves next', async (_who, stages, headOfficeEnabled, sentence) => {
    api.summary.mockResolvedValue(summary({ stages: [...stages], headOfficeEnabled }));
    api.batch.mockResolvedValue(batch({ stages: counts({ DIVISION: 3, COEP: 4, HEAD_OFFICE: 4, SUPER_ADMIN: 4 }) }));
    renderAt(ONE);
    await userEvent.click(await screen.findByRole('button', { name: 'Approve all that wait for me (7)' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      `Are you sure you want to approve all 7 applications of batch IPP-B-0001 that wait for you? Once approved, ${sentence}`,
    );
  });

  it('is read-only for who does not decide', async () => {
    api.summary.mockResolvedValue(readOnlySummary());
    api.batch.mockResolvedValue(batch({ toDecide: 0 }));
    api.applications.mockResolvedValue(pageOf([row({ canDecide: false })]));
    renderAt(ONE);
    await screen.findByRole('link', { name: 'Asha Patil' });
    expect(screen.queryByRole('button', { name: /Approve|Reject/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('says when the batch is not one the user may see, and goes back', async () => {
    api.batch.mockRejectedValue(new ApiError('Not found', 404, 'NOT_FOUND'));
    renderAt(ONE);
    expect(await screen.findByText('Batch not found.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('where')).toHaveTextContent(LIST);
  });
});
