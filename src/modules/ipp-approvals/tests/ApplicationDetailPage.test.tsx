import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import ApplicationDetailPage from '../pages/ApplicationDetailPage';
import ApplicationsPage from '../pages/ApplicationsPage';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import { detail, event, movedOn, pageOf, resetToasts, row, summary, toasts } from './fixtures';
import Where from './Where';

vi.mock('../../auth', () => ({ useCan: () => () => true }));
vi.mock('../services/ippApprovalsApi', () => ({
  ippApprovalsApi: {
    summary: vi.fn(),
    districts: vi.fn(),
    applications: vi.fn(),
    batchOptions: vi.fn(),
    batch: vi.fn(),
    application: vi.fn(),
    documentBlob: vi.fn(),
    downloadDocument: vi.fn(),
    approveOne: vi.fn(),
    reject: vi.fn(),
  },
}));
const api = vi.mocked(ippApprovalsApi);

const renderAt = (id = 'app-1') =>
  renderWithProviders(
    <Routes>
      <Route path="/ipp-approvals/applications/:id" element={<ApplicationDetailPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/ipp-approvals/applications/' + id },
  );
const card = (title: string) => screen.getByRole('heading', { name: title, level: 3 }).closest('.card') as HTMLElement;

beforeEach(() => {
  resetToasts();
  api.application.mockResolvedValue(detail());
  api.documentBlob.mockResolvedValue(new Blob(['file']));
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
});

describe('IPP application — record', () => {
  it('shows the application and the form by step, with English labels', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { name: /Asha Patil/, level: 1 })).toHaveTextContent('With Divisional Officer');
    expect(document.title).toBe('Asha Patil (IPP-000001) — AMRUT × SUMAGO Admin');
    const about = card('Application');
    for (const text of ['IPP-000001', '202611200001', '9876543210', 'asha@example.invalid', 'XXXX-XXXX-1234', 'OBC', 'Data Analytics']) {
      expect(within(about).getByText(text)).toBeInTheDocument();
    }
    expect(within(about).getByRole('link', { name: 'IPP-B-0001 · Pune 1' })).toHaveAttribute(
      'href',
      '/ipp-approvals/batches/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    const value = (c: string, label: string) => within(card(c)).getByText(label).nextSibling?.textContent;
    expect(value('Basic Details', 'Father name')).toBe('Suresh');
    /* No English label: the Marathi one; not answered: a dash; dates as in India. */
    expect(value('Basic Details', 'आईचे नाव')).toBe('—');
    expect(value('Basic Details', 'Date of birth')).toMatch(/12.*Apr.*2003/);
    expect(value('Main Form', 'Qualification')).toBe('B.Sc');
    expect(value('Main Form', 'Passed in')).toBe('June 2024');
    expect(within(card('Basic Details')).queryByText('Qualification')).not.toBeInTheDocument();
  });

  it('lists the documents with the verified mark', async () => {
    renderAt();
    await screen.findByText('2 of 3 uploaded verified');
    const tr = (name: string) => screen.getByText(name, { ignore: '.tw-sr-only' }).closest('tr') as HTMLElement;
    expect(within(tr('Photo')).getByText('Verified')).toBeInTheDocument();
    expect(within(tr('Photo')).getByText(/by Auditor One/)).toBeInTheDocument();
    expect(within(tr('Photo')).getByText('2 KB')).toBeInTheDocument();
    expect(within(tr('Caste certificate')).getByText('Not verified')).toBeInTheDocument();
    expect(within(tr('Caste certificate')).getByText('3.0 MB')).toBeInTheDocument();
    expect(within(tr('PAN card')).getByText('Not uploaded')).toBeInTheDocument();
    expect(within(tr('PAN card')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the corrections of the Auditor and the history', async () => {
    api.application.mockResolvedValue(
      detail({
        history: [
          event({ event: 'REJECTED', from: 'COEP', to: 'DIVISION', reason: 'Photo is not clear', by: 'Meera Shah', role: 'COEP' }),
          event({ event: 'APPROVED', from: 'DIVISION', to: 'COEP', by: 'Anil Rao', role: 'Divisional Officer' }),
          event({ event: 'CORRECTED', from: 'DIVISION', to: 'DIVISION', by: 'Auditor One', role: 'IPP Auditor' }),
          event(),
        ],
      }),
    );
    renderAt();
    const edits = await screen.findByRole('heading', { name: 'Corrections by the IPP Auditor' });
    const correction = within(edits.closest('.card') as HTMLElement)
      .getByText('PIN code')
      .closest('tr') as HTMLElement;
    expect(correction).toHaveTextContent('411001');
    expect(correction).toHaveTextContent('411005');
    expect(correction).toHaveTextContent('by Auditor One');

    const history = within(card('History'));
    const titles = [
      'Rejected · COEP → Divisional Officer',
      'Approved · Divisional Officer → COEP',
      'Corrected by the IPP Auditor · Divisional Officer',
      'Received from IPP · Divisional Officer',
    ];
    titles.forEach((t) => expect(history.getByText(t)).toBeInTheDocument());
    expect(history.getByText('“Photo is not clear”')).toBeInTheDocument();
    expect(history.getByText(/Meera Shah \(COEP\)/)).toBeInTheDocument();
    expect(history.getByText(/Anil Rao \(Divisional Officer\)/)).toBeInTheDocument();
    /* What the officer has to look at is on top. */
    expect(screen.getByText('Sent back by Meera Shah (COEP).').closest('.callout')).toHaveTextContent('Photo is not clear');
  });

  it('says when nothing was corrected, and when the form has no documents', async () => {
    api.application.mockResolvedValue(detail({ edits: [], documentList: [], fields: [], history: [] }));
    renderAt();
    expect(await screen.findByText('The Auditor has corrected nothing in this form.')).toBeInTheDocument();
    expect(screen.getByText('No documents in this form.')).toBeInTheDocument();
    expect(screen.getAllByText('No fields in this step.')).toHaveLength(2);
    expect(screen.getByText('Nothing is recorded yet.')).toBeInTheDocument();
  });
});

describe('IPP application — documents', () => {
  it('previews an image, a PDF and a video, with Previous / Next', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Preview Photo' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Photo — 1 of 3')).toBeInTheDocument();
    expect(await within(dialog).findByAltText('photo.png')).toHaveAttribute('src', 'blob:test');
    expect(api.documentBlob).toHaveBeenCalledWith('app-1', 'PHOTO', expect.any(AbortSignal));
    expect(within(dialog).getByRole('button', { name: 'Previous document' })).toBeDisabled();
    expect(within(dialog).getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'photo.png');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Next document' }));
    expect(await within(dialog).findByTitle('caste.pdf')).toHaveProperty('tagName', 'IFRAME');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    await userEvent.keyboard('{ArrowRight}');
    expect(await within(dialog).findByLabelText('me.mp4')).toHaveProperty('tagName', 'VIDEO');
    expect(within(dialog).getByRole('button', { name: 'Next document' })).toBeDisabled();
    await userEvent.keyboard('{ArrowLeft}');
    expect(await within(dialog).findByText('Caste certificate — 2 of 3')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('gives the object URL the type of the document, not what the download says', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Preview Caste certificate' }));
    await screen.findByTitle('caste.pdf');
    expect(vi.mocked(URL.createObjectURL).mock.lastCall?.[0]).toHaveProperty('type', 'application/pdf');
  });

  it('does not open a kind of file it cannot show', async () => {
    const [photo] = detail().documentList;
    api.application.mockResolvedValue(
      detail({
        documentList: [{ ...photo, file: { name: 'page.html', mime: 'text/html', size: 10, uploadedAt: '2026-11-18T05:00:00.000Z' } }],
      }),
    );
    const { baseElement } = renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Preview Photo' }));
    expect(await screen.findByText('No preview for this kind of file.')).toBeInTheDocument();
    expect(baseElement.querySelector('iframe')).toBeNull();
  });

  it('shows why a document cannot be opened, and tries again', async () => {
    api.documentBlob.mockRejectedValueOnce(new ApiError('IPP cannot be reached right now', 502, 'IPP_UNAVAILABLE'));
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Preview Photo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The document could not be opened. IPP cannot be reached right now');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByAltText('photo.png')).toBeInTheDocument();
  });

  it('downloads a document under its name, and shows a refusal', async () => {
    api.downloadDocument.mockResolvedValue(undefined);
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Download Caste certificate' }));
    expect(api.downloadDocument).toHaveBeenCalledWith('app-1', 'CASTE CERT', 'caste.pdf');
    api.downloadDocument.mockRejectedValue(new ApiError('The connection to IPP is not configured', 503, 'LINK_NOT_CONFIGURED'));
    await userEvent.click(await screen.findByRole('button', { name: 'Download Photo' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The connection to IPP is not configured'));
  });
});

describe('IPP application — decision', () => {
  it('approves after a confirmation that says where it goes', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Approve the application of Asha Patil (IPP-000001)? After your approval: With COEP.');
    api.approveOne.mockResolvedValue(movedOn());
    api.application.mockResolvedValue(movedOn());
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));
    expect(api.approveOne).toHaveBeenCalledWith('app-1');
    await waitFor(() => expect(toasts()).toHaveTextContent('Asha Patil (IPP-000001) approved. Now: With COEP.'));
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByText('This application is not waiting for your decision. Now: With COEP.')).toBeInTheDocument();
  });

  it('rejects with a reason and says where it returns', async () => {
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('After the rejection: With IPP Auditor.');
    const back = movedOn({ stage: 'AUDITOR', stageLabel: 'With IPP Auditor' });
    api.reject.mockResolvedValue(back);
    api.application.mockResolvedValue(back);
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Caste certificate is missing');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reject application' }));
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith('app-1', 'Caste certificate is missing'));
    await waitFor(() => expect(toasts()).toHaveTextContent('Asha Patil (IPP-000001) rejected. Now: With IPP Auditor.'));
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it.each(['Approve', 'Reject'])('%s: shows the message and loads the current state when it has moved on (409)', async (action) => {
    const refusal = new ApiError('This application is not yours to decide now.', 409, 'NOT_YOURS_TO_DECIDE');
    api.approveOne.mockRejectedValue(refusal);
    api.reject.mockRejectedValue(refusal);
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: action }));
    api.application.mockResolvedValue(movedOn());
    const dialog = screen.getByRole('dialog');
    if (action === 'Reject') await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Not clear');
    await userEvent.click(within(dialog).getByRole('button', { name: action === 'Reject' ? 'Reject application' : 'Approve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This application is not yours to decide now. The current state was loaded again.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Asha Patil.*With COEP/, level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: action })).not.toBeInTheDocument();
  });

  it('is read-only when the API names no target, whatever the permissions', async () => {
    api.application.mockResolvedValue(movedOn());
    renderAt();
    await screen.findByRole('heading', { name: /Asha Patil/, level: 1 });
    expect(screen.queryByRole('button', { name: /Approve|Reject/ })).not.toBeInTheDocument();
  });
});

describe('IPP application — states and moving through the list', () => {
  it('shows a loading state, then "not found" for what the user may not see', async () => {
    api.application.mockRejectedValue(new ApiError('Not found', 404, 'NOT_FOUND'));
    renderAt();
    expect(screen.getByLabelText('Loading application')).toBeInTheDocument();
    expect(await screen.findByText('Application not found.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/ipp-approvals');
  });

  it('says "not permitted" for 403 and retries other errors', async () => {
    api.application.mockRejectedValueOnce(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    const first = renderAt();
    expect(await screen.findByText(/You do not have permission to see the application/)).toBeInTheDocument();
    first.unmount();
    api.application.mockRejectedValueOnce(new ApiError('Database unavailable', 503, 'ERROR'));
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: /Asha Patil/, level: 1 })).toBeInTheDocument();
  });

  it('steps through the applications of the list it was opened from, and goes back to that list', async () => {
    api.summary.mockResolvedValue(summary());
    api.batchOptions.mockResolvedValue([]);
    api.applications.mockResolvedValue(pageOf([row(), row({ id: 'app-2', registrationId: 'IPP-000002', name: 'Ravi Kale' })]));
    api.application.mockImplementation(async (id) =>
      id === 'app-2' ? detail({ id, name: 'Ravi Kale', registrationId: 'IPP-000002' }) : detail(),
    );
    renderWithProviders(
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
        <Route path="/ipp-approvals/applications/:id" element={<ApplicationDetailPage />} />
      </Routes>,
      { route: '/ipp-approvals?stage=DIVISION' },
    );
    await userEvent.click(await screen.findByRole('link', { name: 'View Asha Patil' }));
    expect(await screen.findByRole('heading', { name: /Asha Patil/, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous application' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next application' }));
    expect(await screen.findByRole('heading', { name: /Ravi Kale/, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next application' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/ipp-approvals?stage=DIVISION');
  });

  it('has no Previous / Next when opened by its address', async () => {
    renderAt();
    await screen.findByRole('heading', { name: /Asha Patil/, level: 1 });
    expect(screen.queryByRole('button', { name: 'Next application' })).not.toBeInTheDocument();
  });
});
