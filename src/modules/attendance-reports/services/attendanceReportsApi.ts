import { request } from '../../../services/api-client';
import type { AttendanceReport, AttendanceReportQuery, AttendanceReportsStatus } from '../types/attendanceReports.types';

/*
 * M3 calls (sarthi-api docs/m3-attendance-reports.md). The API reads the LMS with Sarthi's tenant key; the key
 * never reaches the browser. Errors keep the API's code (LMS_READS_DISABLED, LMS_LIVE_DATA_OFF, LMS_NOT_CONFIGURED,
 * LMS_TIMEOUT …) so the screen can say exactly why there are no figures.
 */
const BASE = '/attendance-reports';

export const attendanceReportsApi = {
  status: async () => (await request<AttendanceReportsStatus>(`${BASE}/status`)).data,
  report: async (q: AttendanceReportQuery, signal?: AbortSignal) =>
    (await request<AttendanceReport>(BASE, { query: { ...q }, signal })).data,
};
