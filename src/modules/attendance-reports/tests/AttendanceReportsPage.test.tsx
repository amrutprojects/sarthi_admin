import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { useUiStore } from '../../../store/ui.store';
import AttendanceReportsPage from '../pages/AttendanceReportsPage';
import { attendanceReportsApi } from '../services/attendanceReportsApi';
import type { AttendanceReportQuery } from '../types/attendanceReports.types';
import { counts, place, report, row } from './fixtures';

let granted = new Set<string>();
let openable = new Set<string>();
vi.mock('../../auth', () => ({ useCan: () => (a: string) => granted.has(a), useCanOpen: () => (k: string) => openable.has(k) }));

const STATUS_OK = { enabled: true, configured: true, liveData: true, live: true, cacheSeconds: 30, timeoutMs: 8000 };

beforeEach(() => {
  vi.restoreAllMocks();
  useUiStore.setState({ pageState: {} });
  granted = new Set(['exportAttendanceReports']);
  openable = new Set();
  vi.spyOn(attendanceReportsApi, 'status').mockResolvedValue(STATUS_OK);
});

const pune = place('PUNE', 'Pune', 'पुणे');
const punDistrict = place('PUN', 'Pune', 'पुणे');

/* Answers by level, as the API would for the drill-down. */
function mockByLevel() {
  return vi.spyOn(attendanceReportsApi, 'report').mockImplementation(async (q: AttendanceReportQuery) => {
    if (q.level === 'district')
      return report({
        level: 'district',
        filters: { division: pune, district: null, centre: null },
        rows: [row(punDistrict, counts(70, 10, 20), { division: pune })],
        totals: counts(70, 10, 20),
        unplaced: 2,
      });
    if (q.level === 'centre')
      return report({
        level: 'centre',
        rows: [
          row(place('PUN01', 'Pune Test Centre'), counts(40, 0, 10), { district: punDistrict }),
          row(place('LMSX', 'LMSX'), counts(1, 0, 0), { mapped: false }),
        ],
        totals: counts(41, 0, 10),
      });
    if (q.level === 'batch')
      return report({ level: 'batch', rows: [row(place('PUN01-B1', 'PUN01-B1'), counts(30, 0, 10))], totals: counts(30, 0, 10) });
    return report();
  });
}

describe('AttendanceReportsPage', () => {
  it('shows divisions with totals, percentages and evidence counts', async () => {
    mockByLevel();
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByRole('button', { name: 'Pune' })).toBeInTheDocument();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    /* header, Nagpur, Pune, Total */
    expect(rows).toHaveLength(4);
    expect(within(rows[2]).getByText('70%')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Total')).toBeInTheDocument();
    expect(within(rows[3]).getByText('71.8%')).toBeInTheDocument();
    /* KPI tiles: present %, selfies, group photos. */
    expect(screen.getAllByText('Present %').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Selfies').length).toBeGreaterThan(1);
    expect(screen.getByText(/2026-10-23 to 2026-11-21/)).toBeInTheDocument();
  });

  it('drills division → district → centre → batch, with the filters sent to the API', async () => {
    const spy = mockByLevel();
    renderWithProviders(<AttendanceReportsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Pune' }));
    expect(await screen.findByText(/2 LMS rows could not be placed/)).toBeInTheDocument();
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ level: 'district', division: 'PUNE' }), expect.anything());

    await userEvent.click(await screen.findByRole('button', { name: 'Pune' }));
    expect(await screen.findByRole('button', { name: 'Pune Test Centre' })).toBeInTheDocument();
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ level: 'centre', division: 'PUNE', district: 'PUN' }),
      expect.anything(),
    );
    expect(screen.getByText('Not in Amrut masters')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pune Test Centre' }));
    expect(await screen.findByText('PUN01-B1')).toBeInTheDocument();
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ level: 'batch', centre: 'PUN01' }), expect.anything());

    /* Breadcrumb back to the top. */
    await userEvent.click(screen.getByRole('link', { name: 'All divisions' }));
    expect(await screen.findByRole('button', { name: 'Nagpur' })).toBeInTheDocument();
  });

  it('switches labels and place names to Marathi', async () => {
    mockByLevel();
    renderWithProviders(<AttendanceReportsPage />);
    await screen.findByRole('button', { name: 'Pune' });
    await userEvent.click(screen.getByRole('button', { name: 'मराठी' }));
    expect(screen.getByRole('heading', { name: 'उपस्थिती अहवाल' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'पुणे' })).toBeInTheDocument();
    expect(screen.getByText('एकूण')).toBeInTheDocument();
  });

  it('exports the table on screen as CSV, only with reports.export', async () => {
    mockByLevel();
    const create = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    renderWithProviders(<AttendanceReportsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Export CSV' }));
    expect(click).toHaveBeenCalledTimes(1);
    const blob = (create.mock.calls[0] as unknown as [Blob])[0];
    /* jsdom's Blob has no text(); FileReader reads it. */
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toContain('Pune,PUNE');
    expect(text).toContain('Total,');
  });

  it('hides CSV export without reports.export', async () => {
    granted = new Set();
    mockByLevel();
    renderWithProviders(<AttendanceReportsPage />);
    await screen.findByRole('button', { name: 'Pune' });
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('empty answer: says there is no attendance', async () => {
    vi.spyOn(attendanceReportsApi, 'report').mockResolvedValue(report({ rows: [], totals: counts(0, 0, 0) }));
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByText('No attendance in this range')).toBeInTheDocument();
  });

  it('"Show live LMS data" off: the off state, no report call, no figures, a System Settings link for those who may open it', async () => {
    vi.spyOn(attendanceReportsApi, 'status').mockResolvedValue({ ...STATUS_OK, liveData: false, live: false });
    const spy = vi.spyOn(attendanceReportsApi, 'report');
    openable = new Set(['settings']);
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByText('Live LMS data is switched off')).toBeInTheDocument();
    expect(screen.getByText(/switch on "Show live LMS data" in System Settings/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open System Settings' })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Present %')).not.toBeInTheDocument();
  });

  it('"Show live LMS data" off: no settings link without access to System Settings; Marathi text', async () => {
    vi.spyOn(attendanceReportsApi, 'status').mockResolvedValue({ ...STATUS_OK, liveData: false, live: false });
    useUiStore.setState({ pageState: { 'attendance-reports': { lang: 'mr', dateFrom: '', dateTo: '' } } });
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByText('थेट एलएमएस डेटा बंद आहे')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'सिस्टम सेटिंग्ज उघडा' })).not.toBeInTheDocument();
  });

  it('server master switch off: says so (whatever the setting) and never asks for the report', async () => {
    vi.spyOn(attendanceReportsApi, 'status').mockResolvedValue({ ...STATUS_OK, enabled: false, live: false });
    const spy = vi.spyOn(attendanceReportsApi, 'report');
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByText('Live LMS data is switched off')).toBeInTheDocument();
    expect(screen.getByText((text) => text.includes('switched off on the server (LMS_READS_ENABLED)'))).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('LMS link not configured: says so, no figures', async () => {
    vi.spyOn(attendanceReportsApi, 'status').mockResolvedValue({ ...STATUS_OK, configured: false });
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByText('The LMS link is not configured')).toBeInTheDocument();
  });

  it('live data setting off (G-2 code from the report): the off state', async () => {
    vi.spyOn(attendanceReportsApi, 'report').mockRejectedValue(new ApiError('off', 404, 'LMS_LIVE_DATA_OFF'));
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByText('Live LMS data is switched off')).toBeInTheDocument();
  });

  it('LMS down: error state with the code and a working retry, no figures', async () => {
    const spy = vi
      .spyOn(attendanceReportsApi, 'report')
      .mockRejectedValueOnce(new ApiError('The LMS did not answer', 503, 'LMS_TIMEOUT'))
      .mockResolvedValue(report());
    renderWithProviders(<AttendanceReportsPage />);
    expect(await screen.findByText('The LMS cannot be reached right now')).toBeInTheDocument();
    expect(screen.getByText(/LMS_TIMEOUT/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Pune' })).toBeInTheDocument();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('a reversed date range is refused on screen without calling the API', async () => {
    const spy = mockByLevel();
    renderWithProviders(<AttendanceReportsPage />);
    await screen.findByRole('button', { name: 'Pune' });
    spy.mockClear();
    useUiStore.setState({ pageState: { 'attendance-reports': { lang: 'en', dateFrom: '2026-11-21', dateTo: '2026-11-01' } } });
    expect(await screen.findByText(/Choose a start date on or before the end date/)).toBeInTheDocument();
    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('sends the chosen dates to the API', async () => {
    const spy = mockByLevel();
    useUiStore.setState({ pageState: { 'attendance-reports': { lang: 'en', dateFrom: '2026-11-01', dateTo: '2026-11-15' } } });
    renderWithProviders(<AttendanceReportsPage />);
    await screen.findByRole('button', { name: 'Pune' });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'division', dateFrom: '2026-11-01', dateTo: '2026-11-15' }),
      expect.anything(),
    );
  });
});
