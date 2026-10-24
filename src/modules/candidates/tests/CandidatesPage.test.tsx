import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import { studentApi, type StudentListItem } from '../../students';
import CandidatesPage from '../pages/CandidatesPage';

const row = (over: Partial<StudentListItem> = {}): StudentListItem => ({
  id: 's1',
  code: 'STU-000001',
  sourceRecordId: 'MA-0001',
  name: 'Asha Patil',
  centreCode: 'PUN',
  centreName: 'Pune',
  trackCode: 'T07',
  trackName: 'Data Analytics',
  trackToBeConfirmed: false,
  status: 'RECEIVED',
  mobile: '******3210',
  email: 'a***@example.com',
  aadhaar: 'XXXX XXXX 1234',
  approvedAt: '2026-10-01T05:00:00.000Z',
  importBatchId: 'b1',
  createdAt: '2026-10-20T05:00:00.000Z',
  source: 'IMPORT',
  registrationNumber: null,
  enrolled: false,
  batch: null,
  caste: 'Maratha',
  educationQualification: 'Graduate',
  ...over,
});
const page = (items: StudentListItem[], p = 1, total = items.length, totalPages = 1) => ({
  items,
  meta: { page: p, limit: 25, total, totalPages },
});

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/candidates"
        element={
          <>
            <CandidatesPage />
            <Where />
          </>
        }
      />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route },
  );
}
const lastList = () => vi.mocked(studentApi.list).mock.lastCall?.[0];

describe('CandidatesPage — real student list', () => {
  it('shows bucket chips counted by the summary and the server page of students', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockResolvedValue(
      page([
        row(),
        row({ id: 's2', code: 'STU-000002', name: 'Ravi Kale', batch: { id: 'bt', code: 'BAT-01', name: 'Pune 1' }, enrolled: true }),
      ]),
    );
    renderAt('/candidates');
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    const chips = screen.getByRole('group', { name: 'Student buckets' });
    await waitFor(() => expect(within(chips).getByRole('button', { name: 'Applications 15,000' })).toBeInTheDocument());
    expect(within(chips).getByRole('button', { name: 'Pending verification 12' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'Eligible 14,950' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'Enrolled 0' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: 'Awaiting batch 14,950' })).toBeInTheDocument();
    for (const h of ['Code', 'Name', 'District', 'Track', 'Education', 'Caste', 'Source', 'Status', 'Approved', 'Batch']) {
      expect(screen.getByRole('columnheader', { name: h })).toBeInTheDocument();
    }
    expect(screen.queryByRole('columnheader', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Risk' })).not.toBeInTheDocument();
    const r2 = screen.getByText('Ravi Kale').closest('tr') as HTMLElement;
    expect(within(r2).getByText('BAT-01')).toBeInTheDocument();
    const r1 = screen.getByText('Asha Patil').closest('tr') as HTMLElement;
    expect(within(r1).getByText('Awaiting')).toBeInTheDocument();
    expect(within(r1).getByText('Graduate')).toBeInTheDocument();
    expect(within(r1).getByText('Maratha')).toBeInTheDocument();
    expect(lastList()).toEqual(expect.objectContaining({ page: 1, limit: 25, bucket: 'applications' }));
  });

  it('reads the bucket and filters from the URL and sends them to the API', async () => {
    const summary = vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockResolvedValue(page([row()]));
    renderAt(
      '/candidates?bucket=eligible&centre=PUN&track=T07&source=IMPORT&caste=11111111-1111-4111-8111-111111111111&education=22222222-2222-4222-8222-222222222222&q=asha&page=2',
    );
    await screen.findByText('Asha Patil');
    expect(lastList()).toEqual({
      page: 2,
      limit: 25,
      bucket: 'eligible',
      search: 'asha',
      centre: 'PUN',
      track: 'T07',
      source: 'IMPORT',
      casteId: '11111111-1111-4111-8111-111111111111',
      educationId: '22222222-2222-4222-8222-222222222222',
    });
    /* Options from the all-district summary, chip counts from the district's own. */
    expect(summary).toHaveBeenCalledWith(undefined);
    expect(summary).toHaveBeenCalledWith('PUN');
    expect(screen.getByRole('button', { name: /^Eligible/ })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(screen.getByLabelText('Caste')).toHaveValue('11111111-1111-4111-8111-111111111111'));
  });

  it('accepts the older district= link and ignores buckets and values the API would reject', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockResolvedValue(page([row()]));
    renderAt('/candidates?district=PUN&bucket=active&source=X&caste=abc&track=none');
    await screen.findByText('Asha Patil');
    expect(lastList()).toEqual(
      expect.objectContaining({ bucket: 'applications', centre: 'PUN', track: 'none', source: undefined, casteId: undefined }),
    );
  });

  it('keeps chip and filter changes in the URL and goes back to page 1', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockResolvedValue(page([row()]));
    renderAt('/candidates?page=3');
    await screen.findByText('Asha Patil');
    await userEvent.click(screen.getByRole('button', { name: /^Enrolled/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=enrolled');
    await waitFor(() => expect(lastList()).toEqual(expect.objectContaining({ bucket: 'enrolled', page: 1 })));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Pune' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText('District'), 'PUN');
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=enrolled&centre=PUN');
    await userEvent.selectOptions(screen.getByLabelText('Track'), 'T12');
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=enrolled&centre=PUN&track=T12');
    await waitFor(() => expect(lastList()).toEqual(expect.objectContaining({ bucket: 'enrolled', centre: 'PUN', track: 'T12' })));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/candidates\?bucket=enrolled$/);
  });

  it('searches after a pause and pages through the server results', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockImplementation(async (q) => page([row({ name: `Page ${q.page}` })], q.page, 60, 3));
    renderAt('/candidates');
    expect(await screen.findByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '›' }));
    expect(await screen.findByText('Page 2')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?page=2');
    await userEvent.type(screen.getByLabelText('Search students'), 'asha');
    await waitFor(() => expect(lastList()).toEqual(expect.objectContaining({ search: 'asha', page: 1 })));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?q=asha');
  });

  it('opens the student detail on row click', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockResolvedValue(page([row()]));
    renderAt('/candidates');
    await userEvent.click(await screen.findByText('Asha Patil'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates/s1');
  });

  it('explains an empty register and links to Student Import', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture(true));
    vi.spyOn(studentApi, 'list').mockResolvedValue(page([], 1, 0, 0));
    renderAt('/candidates');
    expect(await screen.findByText(/No students in the register yet\./, { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText(/finalised in Student Import/)).toBeInTheDocument();
    expect(screen.getByText('No students in the register yet.', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Applications 0' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open Student Import' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/student-import');
  });
});
