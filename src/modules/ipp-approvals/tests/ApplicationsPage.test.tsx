import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import ApplicationsPage from '../pages/ApplicationsPage';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import { BATCH_ID, PUNE, batch, event, movedOn, pageOf, readOnlySummary, resetToasts, row, summary, toasts } from './fixtures';
import Where from './Where';

let granted = new Set<string>();
let portal = 'admin';
vi.mock('../../auth', () => ({
  useAuth: () => ({ portal }),
  useCanOpen: () => () => true,
  useCan: () => (action: string) => granted.has(action),
}));
vi.mock('../services/ippApprovalsApi', () => ({
  ippApprovalsApi: {
    summary: vi.fn(),
    districts: vi.fn(),
    applications: vi.fn(),
    batch: vi.fn(),
    batchOptions: vi.fn(),
    approve: vi.fn(),
    approveBatch: vi.fn(),
    approveOne: vi.fn(),
    reject: vi.fn(),
  },
}));
const api = vi.mocked(ippApprovalsApi);

const ASHA = row();
const RAVI = row({ id: 'app-2', registrationId: 'IPP-000002', name: 'Ravi Kale' });
const SUNIL = row({
  id: 'app-3',
  registrationId: 'IPP-000003',
  name: 'Sunil More',
  stage: 'COEP',
  stageLabel: 'With COEP',
  canDecide: false,
  category: null,
});

function renderAt(route = '/ipp-approvals') {
  return renderWithProviders(
    <Routes>
      <Route
        path="/ipp-approvals"
        element={
          <>
            <ApplicationsPage />
            <Where />
          </>
        }
      />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route },
  );
}
const lastQuery = () => api.applications.mock.lastCall?.[0];
const box = (name: RegExp | string) => screen.getByRole('checkbox', { name });
const bar = () => screen.getByRole('group', { name: 'Approve several applications' });

beforeEach(() => {
  portal = 'admin';
  granted = new Set(['decideIppDivision']);
  resetToasts();
  api.summary.mockResolvedValue(summary());
  api.districts.mockResolvedValue([{ ...PUNE, code: 'PUN' }]);
  api.applications.mockResolvedValue(pageOf([ASHA, RAVI]));
  api.batch.mockResolvedValue(batch());
  api.batchOptions.mockResolvedValue([batch()]);
});

describe('IPP applications — list', () => {
  it('says what I decide and how much waits, and shows the rows', async () => {
    api.applications.mockResolvedValue(
      pageOf([
        ASHA,
        row({
          id: 'app-9',
          registrationId: 'IPP-000009',
          name: 'Nita Joshi',
          lastEvent: event({
            event: 'REJECTED',
            from: 'COEP',
            to: 'DIVISION',
            reason: 'Income certificate is too old',
            by: 'Meera',
            role: 'COEP',
          }),
        }),
      ]),
    );
    renderAt();
    expect(await screen.findByText(/You decide as Divisional Officer for: Pune, Satara\./)).toBeInTheDocument();
    expect(screen.getByText(/12 applications to decide, 2 of them sent back to you after a rejection/)).toBeInTheDocument();
    expect(document.title).toBe('IPP applications — SARTHI Admin');

    const asha = (await screen.findByRole('link', { name: 'Asha Patil' })).closest('tr') as HTMLElement;
    for (const text of [
      'IPP-000001',
      'Pune',
      'IPP-B-0001',
      'OBC',
      'Shivajinagar Centre',
      'Data Analytics',
      '3 / 4',
      'With Divisional Officer',
    ]) {
      expect(within(asha).getByText(text)).toBeInTheDocument();
    }
    expect(within(asha).getByRole('link', { name: 'View Asha Patil' })).toHaveAttribute('href', '/ipp-approvals/applications/app-1');
    /* A rejected application says who sent it back and why. */
    const nita = screen.getByRole('link', { name: 'Nita Joshi' }).closest('tr') as HTMLElement;
    expect(within(nita).getByText('by Meera (COEP)')).toBeInTheDocument();
    expect(within(nita).getByText('“Income certificate is too old”')).toBeInTheDocument();

    for (const th of [
      'Student',
      'District',
      'Batch',
      'Category',
      'Centre',
      'Technology',
      'Documents verified',
      'Stage and last step',
      'Actions',
    ]) {
      expect(screen.getByRole('columnheader', { name: th })).toHaveAttribute('scope', 'col');
    }
    expect(lastQuery()).toEqual(expect.objectContaining({ view: 'TO_DECIDE', page: 1, limit: 25 }));
  });

  it('has the four lists as chips, with the counts the API gives', async () => {
    renderAt();
    const chips = await screen.findByRole('group', { name: 'Applications' });
    expect(within(chips).getByRole('button', { name: 'To decide 12' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chips).getByRole('button', { name: 'Sent on' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'Sent back' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'All 35' })).toBeInTheDocument();

    await userEvent.click(within(chips).getByRole('button', { name: 'Sent on' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/ipp-approvals?view=SENT_ON');
    await waitFor(() => expect(lastQuery()).toEqual(expect.objectContaining({ view: 'SENT_ON' })));
    /* Nothing to decide there, so nothing to choose. */
    await waitFor(() => expect(screen.queryByRole('checkbox')).not.toBeInTheDocument());
    await userEvent.click(within(chips).getByRole('button', { name: /^To decide/ }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/ipp-approvals$/);
  });

  it('counts every list when the API counts them', async () => {
    api.summary.mockResolvedValue(summary({ views: { TO_DECIDE: 12, SENT_ON: 23, SENT_BACK: 4, ALL: 35 } }));
    renderAt();
    const chips = await screen.findByRole('group', { name: 'Applications' });
    for (const name of ['To decide 12', 'Sent on 23', 'Sent back 4', 'All 35'])
      expect(within(chips).getByRole('button', { name })).toBeInTheDocument();
  });

  it('names who decided for the full panel, and gives an officer (IPP workspace) the role only', async () => {
    const meera = event({ event: 'APPROVED', from: 'DIVISION', to: 'COEP', by: 'Keshav Mahale', role: 'Divisional Officer' });
    api.applications.mockResolvedValue(pageOf([row({ id: 'app-7', name: 'Kiran Patil', lastEvent: meera })]));
    const { unmount } = renderAt();
    let kiran = (await screen.findByRole('link', { name: 'Kiran Patil' })).closest('tr') as HTMLElement;
    expect(within(kiran).getByText('by Keshav Mahale (Divisional Officer)')).toBeInTheDocument();
    unmount();
    portal = 'ipp';
    renderAt();
    kiran = (await screen.findByRole('link', { name: 'Kiran Patil' })).closest('tr') as HTMLElement;
    expect(within(kiran).getByText('by Divisional Officer')).toBeInTheDocument();
    expect(within(kiran).queryByText(/Keshav/)).toBeNull();
  });

  it('reads the list, filters, sorting and page from the URL and sends them to the API', async () => {
    renderAt(`/ipp-approvals?view=ALL&q=asha&stage=COEP&district=${PUNE.id}&batch=${BATCH_ID}&sort=name&dir=DESC&page=2`);
    await screen.findByRole('link', { name: 'Asha Patil' });
    expect(api.applications.mock.calls[0][0]).toEqual({
      page: 2,
      limit: 25,
      view: 'ALL',
      search: 'asha',
      stage: 'COEP',
      batchId: BATCH_ID,
      districtId: PUNE.id,
      sortBy: 'name',
      sortOrder: 'DESC',
    });
    expect(screen.getByLabelText('Search')).toHaveValue('asha');
    expect(screen.getByLabelText('Stage')).toHaveValue('COEP');
    expect(screen.getByLabelText('District')).toHaveValue(PUNE.id);
    expect(screen.getByRole('columnheader', { name: /Student/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('ignores values the API would refuse', async () => {
    renderAt('/ipp-approvals?view=MINE&stage=X&district=pune&batch=1&sort=email&page=0');
    await screen.findByRole('link', { name: 'Asha Patil' });
    expect(lastQuery()).toEqual({
      page: 1,
      limit: 25,
      view: 'TO_DECIDE',
      search: undefined,
      stage: undefined,
      batchId: undefined,
      districtId: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it('keeps every filter in the URL, goes back to page 1 and resets', async () => {
    api.applications.mockResolvedValue(pageOf([ASHA], 2, 60, 3));
    renderAt('/ipp-approvals?page=2');
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'DIVISION');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/ipp-approvals\?stage=DIVISION$/);
    await userEvent.selectOptions(screen.getByLabelText('District'), PUNE.id);
    await userEvent.click(screen.getByLabelText('Batch'));
    await userEvent.click(await screen.findByRole('option', { name: 'IPP-B-0001 · Pune 1' }));
    expect(screen.getByTestId('where')).toHaveTextContent(`/ipp-approvals?stage=DIVISION&district=${PUNE.id}&batch=${BATCH_ID}`);
    /* The batches offered are those of the district. */
    expect(api.batchOptions).toHaveBeenLastCalledWith(PUNE.id);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/ipp-approvals$/);
  });

  it('searches once, after a pause in typing', async () => {
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    const before = api.applications.mock.calls.length;
    await userEvent.type(screen.getByLabelText('Search'), 'ravi');
    await waitFor(() => expect(lastQuery()).toEqual(expect.objectContaining({ search: 'ravi', page: 1 })));
    expect(api.applications.mock.calls.length).toBe(before + 1);
    expect(screen.getByTestId('where')).toHaveTextContent('/ipp-approvals?q=ravi');
  });

  it('pages and sorts on the server', async () => {
    api.applications.mockResolvedValue(pageOf([ASHA], 1, 60, 3));
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastQuery()).toEqual(expect.objectContaining({ page: 2 })));
    await userEvent.click(screen.getByRole('button', { name: /^Stage and last step/ }));
    await waitFor(() => expect(lastQuery()).toEqual(expect.objectContaining({ page: 1, sortBy: 'stageUpdatedAt', sortOrder: 'ASC' })));
  });

  it('goes to the last page that still exists', async () => {
    api.applications.mockImplementation(async (q) => (q.page > 2 ? pageOf([], q.page, 30, 2) : pageOf([ASHA], q.page, 30, 2)));
    renderAt('/ipp-approvals?page=3');
    await screen.findByRole('link', { name: 'Asha Patil' });
    expect(screen.getByTestId('where')).toHaveTextContent('/ipp-approvals?page=2');
  });

  it('opens an application with the list to come back to', async () => {
    renderAt('/ipp-approvals?q=asha');
    await userEvent.click(await screen.findByRole('link', { name: 'View Ravi Kale' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/ipp-approvals/applications/app-2');
  });
});

describe('IPP applications — selection and bulk approval', () => {
  it('only lets me choose what I can decide; the header checkbox follows', async () => {
    api.applications.mockResolvedValue(pageOf([ASHA, RAVI, SUNIL]));
    renderAt('/ipp-approvals?view=ALL');
    await screen.findByRole('link', { name: 'Sunil More' });
    expect(box(/Select Sunil More/)).toBeDisabled();
    const all = box('Select all applications on this page') as HTMLInputElement;
    expect(all).not.toBeChecked();
    expect(all.indeterminate).toBe(false);

    await userEvent.click(box(/Select Asha Patil/));
    expect(all.indeterminate).toBe(true);
    expect(within(bar()).getByText('1')).toBeInTheDocument();
    await userEvent.click(all);
    expect(all).toBeChecked();
    expect(all.indeterminate).toBe(false);
    expect(box(/Select Ravi Kale/)).toBeChecked();
    expect(box(/Select Sunil More/)).not.toBeChecked();
    expect(within(bar()).getByText('2')).toBeInTheDocument();
    await userEvent.click(all);
    expect(box(/Select Asha Patil/)).not.toBeChecked();
    expect(within(bar()).getByRole('button', { name: 'Approve selected' })).toBeDisabled();
  });

  it('approves the selected applications after one confirmation and says what was skipped', async () => {
    api.approve.mockResolvedValue({ approved: 1, skipped: 1, applications: [{ id: 'app-1', stage: 'COEP', stageLabel: 'With COEP' }] });
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.click(within(bar()).getByRole('button', { name: 'Select page' }));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Approve selected' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(
      'Are you sure you want to approve these 2 selected applications? Once approved, the applications will be forwarded to the COEP for further review and approval.',
    );
    expect(api.approve).not.toHaveBeenCalled();
    const reads = api.applications.mock.calls.length;
    expect(within(dialog).queryByLabelText(/Approval reason/)).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve 2' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith(['app-1', 'app-2'], null));
    const text = '1 application approved; 1 application skipped: not waiting for you any more.';
    await waitFor(() => expect(toasts()).toHaveTextContent(text));
    /* The notice stays on the page; the selection is gone and the list, the counts and the batches are read again. */
    expect(screen.getByText(text, { selector: '.callout div' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(box(/Select Asha Patil/)).not.toBeChecked();
    await waitFor(() => expect(api.applications.mock.calls.length).toBeGreaterThan(reads));
    expect(api.summary.mock.calls.length).toBeGreaterThan(1);
  });

  it('keeps the selection across pages and clears it when the tab or a filter changes', async () => {
    api.applications.mockImplementation(async (q) => pageOf([q.page === 1 ? ASHA : RAVI], q.page, 26, 2));
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.click(box(/Select Asha Patil/));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByRole('link', { name: 'Ravi Kale' });
    await userEvent.click(box(/Select Ravi Kale/));
    expect(within(bar()).getByText('2')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'DIVISION');
    await waitFor(() => expect(within(bar()).getByText('0')).toBeInTheDocument());
  });

  it('clears the selection', async () => {
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.click(box(/Select Asha Patil/));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Clear' }));
    expect(box(/Select Asha Patil/)).not.toBeChecked();
  });

  it('approves a whole batch by its filter, naming the count', async () => {
    api.approveBatch.mockResolvedValue({ approved: 7, skipped: 0, applications: [] });
    renderAt(`/ipp-approvals?batch=${BATCH_ID}&q=a`);
    const select = await screen.findByRole('button', { name: 'Select all in this batch (7)' });
    await userEvent.click(select);
    expect(within(bar()).getByText(/all of batch IPP-B-0001 that wait for you/)).toBeInTheDocument();
    expect(box(/Select Asha Patil/)).toBeChecked();
    expect(box(/Select Asha Patil/)).toBeDisabled();
    await userEvent.click(within(bar()).getByRole('button', { name: 'Approve selected' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(
      'Are you sure you want to approve all 7 applications of batch IPP-B-0001 that wait for you, on every page and whatever the other filters show? ' +
        'Once approved, the applications will be forwarded to the COEP for further review and approval.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve 7' }));
    await waitFor(() => expect(api.approveBatch).toHaveBeenCalledWith(BATCH_ID, null));
    expect(api.approve).not.toHaveBeenCalled();
    await waitFor(() => expect(toasts()).toHaveTextContent('7 applications approved.'));
    expect(box(/Select Asha Patil/)).not.toBeChecked();
  });

  it('offers the whole batch only when a batch is chosen', async () => {
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    expect(screen.queryByRole('button', { name: /Select all in this batch/ })).not.toBeInTheDocument();
  });

  it('closes the confirmation and shows the message when the approval fails', async () => {
    api.approve.mockRejectedValue(new ApiError('Service unavailable', 503, 'ERROR'));
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.click(box(/Select Asha Patil/));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Approve selected' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    /* Still chosen, to try again. */
    expect(box(/Select Asha Patil/)).toBeChecked();
  });
});

describe('IPP applications — one application', () => {
  it('approves one after a confirmation that says where it goes', async () => {
    api.approveOne.mockResolvedValue(movedOn());
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Approve Asha Patil' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Approve — Asha Patil (IPP-000001)');
    expect(dialog).toHaveTextContent(
      'Are you sure you want to approve this application? Once approved, the application will be forwarded to the COEP for further review and approval.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve application' }));
    await waitFor(() => expect(api.approveOne).toHaveBeenCalledWith('app-1', null));
    await waitFor(() => expect(toasts()).toHaveTextContent('Asha Patil (IPP-000001) approved. Now: With COEP.'));
  });

  it('asks for a reason of 3 to 500 characters and sends it trimmed', async () => {
    api.reject.mockResolvedValue(movedOn({ stage: 'AUDITOR', stageLabel: 'With IPP Auditor' }));
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Reject Asha Patil' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('After the rejection: With IPP Auditor');
    const confirm = within(dialog).getByRole('button', { name: 'Reject application' });
    const reason = within(dialog).getByLabelText(/Reason/);
    expect(confirm).toBeDisabled();
    expect(within(dialog).getByText('0 / 500')).toBeInTheDocument();

    await userEvent.type(reason, '  no ');
    expect(await within(dialog).findByText('Enter a reason of at least 3 characters')).toBeInTheDocument();
    expect(within(dialog).getByText('2 / 500')).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    fireEvent.change(reason, { target: { value: 'x'.repeat(501) } });
    expect(await within(dialog).findByText('The reason can have at most 500 characters')).toBeInTheDocument();
    expect(within(dialog).getByText('501 / 500')).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    fireEvent.change(reason, { target: { value: 'x'.repeat(500) } });
    await waitFor(() => expect(confirm).toBeEnabled());
    fireEvent.change(reason, { target: { value: '  Photo is not clear  ' } });
    await waitFor(() => expect(confirm).toBeEnabled());
    await userEvent.click(confirm);
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith('app-1', 'Photo is not clear'));
    await waitFor(() => expect(toasts()).toHaveTextContent('Asha Patil (IPP-000001) rejected. Now: With IPP Auditor.'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the dialog open when the API refuses the reason', async () => {
    api.reject.mockRejectedValue(
      new ApiError('Validation failed', 422, 'VALIDATION', [{ field: 'reason', message: 'Reason is too short' }]),
    );
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Reject Asha Patil' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'abc');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject application' }));
    expect(await within(dialog).findByText('Validation failed: Reason is too short')).toBeInTheDocument();
  });

  it('asks the reason of a second approval, and keeps it for the selected ones', async () => {
    api.applications.mockResolvedValue(
      pageOf([row({ reasonRequired: true }), row({ id: 'app-2', name: 'Ravi Pawar', registrationId: 'IPP-000002' })]),
    );
    api.approveOne.mockResolvedValue(movedOn());
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Approve Asha Patil' }));
    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Approve application' })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Approval reason/), 'Marks corrected');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve application' }));
    await waitFor(() => expect(api.approveOne).toHaveBeenCalledWith('app-1', 'Marks corrected'));

    api.approve.mockResolvedValue({ approved: 2, skipped: 0, applications: [] });
    await userEvent.click(await screen.findByRole('checkbox', { name: /Select Asha Patil/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Select Ravi Pawar/ }));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Approve selected' }));
    dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Approval reason/), 'Checked again');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve 2' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith(['app-1', 'app-2'], 'Checked again'));
  });

  it('says so and reloads when the application has moved on (409)', async () => {
    api.approveOne.mockRejectedValue(new ApiError('This application is not yours to decide now.', 409, 'NOT_YOURS_TO_DECIDE'));
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Approve Asha Patil' }));
    const reads = api.applications.mock.calls.length;
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve application' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This application is not yours to decide now. The current state was loaded again.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(api.applications.mock.calls.length).toBeGreaterThan(reads));
  });

  it('offers no decision on a row that is not mine to decide', async () => {
    api.applications.mockResolvedValue(pageOf([SUNIL]));
    renderAt('/ipp-approvals?view=ALL');
    const tr = (await screen.findByRole('link', { name: 'Sunil More' })).closest('tr') as HTMLElement;
    expect(within(tr).getByRole('link', { name: 'View Sunil More' })).toBeInTheDocument();
    expect(within(tr).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('IPP applications — who decides', () => {
  it('names every stage a user decides, and where COEP sends it while Head Office is off', async () => {
    api.summary.mockResolvedValue(summary({ stages: ['COEP'], districts: null, headOfficeEnabled: false, sentBack: 0, toDecide: 1 }));
    api.applications.mockResolvedValue(pageOf([row({ stage: 'COEP', stageLabel: 'With COEP' })]));
    renderAt();
    expect(await screen.findByText(/You decide as COEP for all districts\. 1 application to decide\./)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Approve Asha Patil' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Are you sure you want to approve this application? Once approved, the application will be forwarded to the Super Admin for final review and approval.',
    );
    /* Not limited to districts: the filter offers all of them. */
    expect(api.districts).toHaveBeenCalled();
  });

  it('joins two stages', async () => {
    api.summary.mockResolvedValue(summary({ stages: ['DIVISION', 'COEP'] }));
    renderAt();
    expect(
      await screen.findByText(/You decide as Divisional Officer for: Pune, Satara and as COEP for all districts\./),
    ).toBeInTheDocument();
  });

  it.each([
    ['the Super Admin while Head Office is on', true, true, 'Head Office approval is on: the Head Officer gives the final approval.'],
    ['the Head Officer while Head Office is off', true, false, 'Head Office approval is off: the Super Admin gives the final approval.'],
    ['a user who may only look', false, true, 'Your role sees the applications but does not decide on them.'],
  ])('is read-only for %s: no tabs, checkboxes or decisions', async (_who, finalLevel, headOfficeEnabled, note) => {
    granted = new Set(finalLevel ? ['decideIppDivision', 'decideIppCoep', 'decideIppHeadOffice'] : []);
    api.summary.mockResolvedValue(readOnlySummary({ headOfficeEnabled }));
    api.applications.mockResolvedValue(pageOf([SUNIL]));
    renderAt('/ipp-approvals?view=TO_DECIDE');
    expect(await screen.findByText('Read only.')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(note.replace(/\./g, '\\.')))).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Sunil More' });
    expect(lastQuery()).toEqual(expect.objectContaining({ view: 'ALL' }));
    expect(screen.queryByRole('group', { name: 'Applications' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve|Reject/ })).not.toBeInTheDocument();
  });

  it('tells a Divisional Officer without districts what is missing', async () => {
    api.summary.mockResolvedValue(summary({ districts: [], toDecide: 0, sentBack: 0 }));
    api.applications.mockResolvedValue(pageOf([]));
    renderAt();
    expect(await screen.findByText(/No district is assigned to you yet/)).toBeInTheDocument();
  });
});

describe('IPP applications — the approval confirmation names who approves next', () => {
  const ASK_ONE = 'Are you sure you want to approve this application?';
  const ASK_TWO = 'Are you sure you want to approve these 2 selected applications?';
  const TO_COEP = 'will be forwarded to the COEP for further review and approval.';
  const TO_HO = 'will be forwarded to the Head Officer (HO) for final review and approval.';
  const TO_SUPER = 'will be forwarded to the Super Admin for final review and approval.';
  const at = (stage: 'DIVISION' | 'COEP' | 'HEAD_OFFICE' | 'SUPER_ADMIN', over = {}) => [
    row({ stage, ...over }),
    row({ id: 'app-2', registrationId: 'IPP-000002', name: 'Ravi Kale', stage, ...over }),
  ];
  const confirmOne = async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Approve Asha Patil' }));
    return screen.getByRole('dialog');
  };
  const confirmPage = async () => {
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.click(within(bar()).getByRole('button', { name: 'Select page' }));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Approve selected' }));
    return screen.getByRole('dialog');
  };

  it.each([
    [
      'Divisional Officer',
      'DIVISION',
      true,
      `${ASK_ONE} Once approved, the application ${TO_COEP}`,
      `${ASK_TWO} Once approved, the applications ${TO_COEP}`,
    ],
    ['COEP', 'COEP', true, `${ASK_ONE} Once approved, the application ${TO_HO}`, `${ASK_TWO} Once approved, the applications ${TO_HO}`],
    [
      'COEP while Head Office approval is off',
      'COEP',
      false,
      `${ASK_ONE} Once approved, the application ${TO_SUPER}`,
      `${ASK_TWO} Once approved, the applications ${TO_SUPER}`,
    ],
    [
      'Head Officer',
      'HEAD_OFFICE',
      true,
      `${ASK_ONE} Once approved, this will be its final approval.`,
      `${ASK_TWO} Once approved, this will be their final approval.`,
    ],
    [
      'Super Admin (Head Office approval off)',
      'SUPER_ADMIN',
      false,
      `${ASK_ONE} Once approved, this will be its final approval.`,
      `${ASK_TWO} Once approved, this will be their final approval.`,
    ],
  ] as const)('as %s: one and several', async (_who, stage, headOfficeEnabled, one, several) => {
    api.summary.mockResolvedValue(summary({ stages: [stage], districts: stage === 'DIVISION' ? [PUNE] : null, headOfficeEnabled }));
    api.applications.mockResolvedValue(pageOf(at(stage)));
    const { unmount } = renderAt();
    expect(await confirmOne()).toHaveTextContent(one);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(await confirmPage()).toHaveTextContent(several);
    unmount();
  });

  it('one selected application is "this application"', async () => {
    api.summary.mockResolvedValue(summary({ stages: ['COEP'], districts: null }));
    api.applications.mockResolvedValue(pageOf(at('COEP')));
    renderAt();
    await screen.findByRole('link', { name: 'Asha Patil' });
    await userEvent.click(box(/Select Asha Patil/));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Approve selected' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(`${ASK_ONE} Once approved, the application ${TO_HO}`);
  });

  it('selected at different stages: each goes to its own next authority, across pages too', async () => {
    api.summary.mockResolvedValue(summary({ stages: ['DIVISION', 'COEP'] }));
    api.applications.mockImplementation(async (q) =>
      pageOf([q.page === 1 ? row() : row({ id: 'app-2', registrationId: 'IPP-000002', name: 'Ravi Kale', stage: 'COEP' })], q.page, 26, 2),
    );
    renderAt();
    await userEvent.click(await screen.findByRole('checkbox', { name: /Select Asha Patil/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: /Select Ravi Kale/ }));
    await userEvent.click(within(bar()).getByRole('button', { name: 'Approve selected' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      `${ASK_TWO} Once approved, each application will be forwarded to its own next approval authority: ` +
        'those with the Divisional Officer to the COEP for further review and approval and those with the COEP to the Head Officer (HO) for final review and approval.',
    );
  });

  it('selected at one stage by a user who decides at two: that stage’s sentence', async () => {
    api.summary.mockResolvedValue(summary({ stages: ['DIVISION', 'COEP'] }));
    api.applications.mockResolvedValue(pageOf(at('COEP')));
    renderAt();
    expect(await confirmPage()).toHaveTextContent(`${ASK_TWO} Once approved, the applications ${TO_HO}`);
  });

  it('still asks the reason of a second approval with the new wording', async () => {
    api.summary.mockResolvedValue(summary({ stages: ['COEP'], districts: null }));
    api.applications.mockResolvedValue(pageOf(at('COEP', { reasonRequired: true })));
    api.approveOne.mockResolvedValue(movedOn({ stage: 'HEAD_OFFICE', stageLabel: 'With Head Office' }));
    renderAt();
    const dialog = await confirmOne();
    expect(dialog).toHaveTextContent(`${ASK_ONE} Once approved, the application ${TO_HO}`);
    expect(within(dialog).getByRole('button', { name: 'Approve application' })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Approval reason/), 'Documents checked again');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve application' }));
    await waitFor(() => expect(api.approveOne).toHaveBeenCalledWith('app-1', 'Documents checked again'));
  });
});

describe('IPP applications — states', () => {
  it('shows a loading state first', () => {
    api.summary.mockReturnValue(new Promise(() => undefined));
    renderAt();
    expect(screen.getByLabelText('Loading IPP applications')).toBeInTheDocument();
  });

  it('says when nothing waits, and when nothing matches the filters', async () => {
    api.applications.mockResolvedValue(pageOf([]));
    renderAt();
    expect(await screen.findByText('No application waits for your decision.')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'COEP');
    expect(await screen.findByText('No applications match these filters.')).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    api.applications.mockRejectedValueOnce(new ApiError('Database unavailable', 503, 'ERROR'));
    renderAt();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the applications. Database unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Asha Patil' })).toBeInTheDocument();
  });

  it('says "not permitted" when the API answers 403', async () => {
    api.summary.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderAt();
    expect(await screen.findByText(/You do not have permission to see the IPP applications/)).toBeInTheDocument();
    expect(api.applications).not.toHaveBeenCalled();
  });
});
