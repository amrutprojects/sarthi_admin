import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
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

/* The district page shows "Create task" only with the createTask permission; the tests do not need it. */
vi.mock('../../auth', () => ({ Can: (_: { children: ReactNode }) => null }));

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
    /* Two demo figures on a card: its target / achievement and its RAG status. */
    expect(within(card).getAllByText('Demo data')).toHaveLength(2);
    /* A district missing from the summary reads 0, not the demo figure. */
    expect(within(screen.getByTestId('district-JAL')).getAllByText('0')).toHaveLength(3);
    expect(screen.getByText(/Applications, Eligible and Enrolled are live student figures as of/)).toBeInTheDocument();
    for (const l of ['On track (GREEN)', 'Critical', 'State achievement']) {
      expect(within(kpi(l)).getByText('Demo data')).toBeInTheDocument();
    }
    await userEvent.click(within(card).getByText('448'));
    expect(screen.getByTestId('where')).toHaveTextContent('/candidates?bucket=applications&centre=NAG');
  });

  it('marks the demo columns of the table', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    renderAt('/districts');
    expect(await screen.findByText('Target (demo)')).toBeInTheDocument();
    expect(screen.getByText('Achievement (demo)')).toBeInTheDocument();
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
    expect(within(kpi('Target')).getByText('Demo data')).toBeInTheDocument();
    expect(within(kpi('Applications')).queryByText('Demo data')).not.toBeInTheDocument();
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    expect(screen.getByText('Taluka rollup').closest('h3')).toHaveTextContent('Demo data');
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
    expect(screen.getByText('Lowest 5 districts').closest('h3')).toHaveTextContent('Demo data');
  });

  it('switches the tiles to live applications', async () => {
    vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
    const { container } = renderAt('/map');
    await screen.findByText(/No students enrolled yet/);
    await userEvent.selectOptions(screen.getByLabelText('Metric'), 'applications');
    expect(container.querySelector('[data-district="NAG"] .mh-val')?.textContent).toBe('448');
    expect(container.querySelector('[data-district="PUN"] .mh-val')?.textContent).toBe('411');
  });
});
