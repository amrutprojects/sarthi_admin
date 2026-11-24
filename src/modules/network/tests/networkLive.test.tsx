import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import { ApiError } from '../../../services/api-client';
import { useUiStore } from '../../../store/ui.store';
import { studentApi, type StudentListItem } from '../../students';
import DistrictsPage from '../pages/DistrictsPage';
import DistrictDetailPage from '../pages/DistrictDetailPage';
import MapPage from '../pages/MapPage';

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
const renderAt = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/districts" element={<DistrictsPage />} />
      <Route path="/districts/:id" element={<DistrictDetailPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route },
  );
const kpi = (label: string) => screen.getByText(label, { selector: '.kpi-t' }).closest('.kpi') as HTMLElement;
const panel = (title: string) => screen.getByText(title, { selector: 'h3' }).closest('.card') as HTMLElement;
const goLinks = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-go]')).map((e) => e.getAttribute('data-go'));

const student: StudentListItem = {
  id: 's1',
  code: 'STU-000001',
  sourceRecordId: 'MA-0001',
  name: 'Asha Patil',
  centreCode: 'NAG',
  centreName: 'Nagpur',
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
};

beforeEach(() => {
  useUiStore.setState({ pageState: {} });
});

describe('DistrictsPage — live counts per district', () => {
  it('shows Applications / Eligible / Enrolled from summary.byCentre and links them to the student list', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderAt('/districts');
    const card = await screen.findByTestId('district-NAG');
    await waitFor(() => expect(within(card).getByText('448')).toBeInTheDocument());
    expect(within(card).getByText('440')).toBeInTheDocument();
    /* A district missing from the summary reads 0, not the dataset figure. */
    expect(within(screen.getByTestId('district-JAL')).getAllByText('0')).toHaveLength(3);
    expect(screen.getByText(/Applications, Eligible and Enrolled are live student figures as of/)).toBeInTheDocument();
    expect(within(kpi('Districts covered')).getByText('36')).toBeInTheDocument();
    /* Status, centre and achievement KPIs have no live source: "—" and "No data yet", no sample counts. */
    for (const l of ['Districts with centres', 'On track (GREEN)', 'Needs attention', 'Critical', 'State achievement']) {
      expect(within(kpi(l)).getByText('—')).toBeInTheDocument();
      expect(within(kpi(l)).getByTestId('no-data')).toBeInTheDocument();
    }
    /* No invented status badge, target or achievement on the cards. */
    expect(within(card).queryByText(/Target|achievement|On track|Critical|has centre/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/demo data|\(demo\)|demo environment|Indicative values/i);
    await userEvent.click(within(card).getByText('448'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=applications&centre=NAG');
  });

  it('shows only live columns in the table and ranks the cards by enrolled, then eligible', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderAt('/districts');
    await waitFor(() => expect(within(screen.getByTestId('district-NAG')).getByText('448')).toBeInTheDocument());
    for (const l of ['Target', 'Training active', 'Certified', 'Attendance', 'Achievement', 'Status']) {
      expect(screen.queryByRole('columnheader', { name: new RegExp('^' + l) })).not.toBeInTheDocument();
    }
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    /* NAG has the most eligible students in the fixture (nobody enrolled yet): it is the first card. */
    expect(screen.getAllByTestId(/^district-/)[0]).toHaveAttribute('data-testid', 'district-NAG');
  });

  it('shows an error with Retry when the summary fails', async () => {
    const spy = vi.spyOn(studentApi, 'summary').mockRejectedValue(new ApiError('boom', 500, 'ERROR'));
    renderAt('/districts');
    expect(await screen.findByText('Could not load the live student figures.', { selector: 'b' })).toBeInTheDocument();
    spy.mockResolvedValue(summaryFixture());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(within(screen.getByTestId('district-NAG')).getByText('448')).toBeInTheDocument());
  });
});

describe('DistrictDetailPage — live KPIs and student table', () => {
  it('reads the summary and the list for the district code', async () => {
    const summary = vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const list = vi
      .spyOn(studentApi, 'list')
      .mockResolvedValue({ items: [student], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    renderAt('/districts/NAG');
    await waitFor(() => expect(within(kpi('Applications')).getByText('15,000')).toBeInTheDocument());
    expect(summary).toHaveBeenCalledWith('NAG');
    expect(list).toHaveBeenCalledWith({ centre: 'NAG', page: 1, limit: 10 });
    expect(within(kpi('Enrolled')).getByText('14,950 awaiting batch')).toBeInTheDocument();
    for (const l of ['Target', 'Training active', 'Completed', 'Attendance', 'Certified']) {
      expect(within(kpi(l)).getByText('—')).toBeInTheDocument();
      expect(within(kpi(l)).getByTestId('no-data')).toBeInTheDocument();
    }
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    /* Panels with no live source keep their title and show "No data yet": no coordinator, centres, batches or tasks. */
    for (const t of ['Taluka rollup', 'Mode split', 'District coordinator', 'Training centres in Nagpur', 'Batches', 'Top issues']) {
      expect(within(panel(t)).getByTestId('no-data')).toBeInTheDocument();
    }
    expect(screen.queryByText(/Vikas Thorat|Create task|target \d+ students/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/demo data|\(demo\)|demo environment|Indicative values/i);
  });

  it('links the KPIs, "View all" and the rows to the real student list', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockResolvedValue({ items: [student], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    const first = renderAt('/districts/NAG');
    await waitFor(() => expect(within(kpi('Eligible')).getByText('14,950')).toBeInTheDocument());
    await userEvent.click(kpi('Eligible'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=eligible&centre=NAG');
    first.unmount();

    renderAt('/districts/NAG');
    await userEvent.click(await screen.findByRole('button', { name: 'View all' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?centre=NAG');
  });

  it('opens a student from the table', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    vi.spyOn(studentApi, 'list').mockResolvedValue({ items: [student], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } });
    renderAt('/districts/NAG');
    await userEvent.click(await screen.findByText('Asha Patil'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates/s1');
  });

  it('explains an empty district', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture(true));
    vi.spyOn(studentApi, 'list').mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    renderAt('/districts/NAG');
    expect(await screen.findByText(/No students from this district in the register yet/)).toBeInTheDocument();
  });
});

describe('MapPage — live tiles and Top 5', () => {
  it('draws live counts on the tiles and ranks the Top 5 from the summary', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderAt('/map');
    await waitFor(() => expect(container.querySelector('[data-district="NAG"]')?.getAttribute('data-live')).toBe('448,440,0'));
    /* Enrolled is 0 everywhere in the fixture: the tile shows the live 0 without "/ target". */
    expect(container.querySelector('[data-district="NAG"] .mh-val')?.textContent).toBe('0');
    expect(screen.getByText(/No students enrolled yet: by eligible students/)).toBeInTheDocument();
    expect(goLinks(container)).toEqual(
      expect.arrayContaining(['#/candidates?bucket=eligible&centre=NAG', '#/candidates?bucket=eligible&centre=PUN']),
    );
    /* Lowest 5 ranks by achievement against target, which has no live source. */
    expect(within(panel('Lowest 5 districts')).getByTestId('no-data')).toBeInTheDocument();
    /* Only the live metrics can be chosen; no status shading or status filter. */
    expect(Array.from((screen.getByLabelText('Metric') as HTMLSelectElement).options).map((o) => o.value)).toEqual([
      'enrolled',
      'applications',
      'eligible',
    ]);
    expect(screen.queryByLabelText('Status filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Shading')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/demo data|\(demo\)|demo environment|Indicative values/i);
  });

  it('switches the tiles to live applications', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderAt('/map');
    await screen.findByText(/No students enrolled yet/);
    await userEvent.selectOptions(screen.getByLabelText('Metric'), 'applications');
    expect(container.querySelector('[data-district="NAG"] .mh-val')?.textContent).toBe('448');
    expect(container.querySelector('[data-district="PUN"] .mh-val')?.textContent).toBe('411');
  });

  it('shows "No data yet" for the centre and live-training views instead of sample markers', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderAt('/map');
    await screen.findByText(/No students enrolled yet/);
    await userEvent.click(screen.getByText('Training centres', { selector: 'button.chip' }));
    expect(within(panel('Training centres')).getByTestId('no-data')).toBeInTheDocument();
    expect(container.querySelector('[data-district]')).toBeNull();
    await userEvent.click(screen.getByText('Live training', { selector: 'button.chip' }));
    expect(within(panel('Live training')).getByTestId('no-data')).toBeInTheDocument();
  });
});
