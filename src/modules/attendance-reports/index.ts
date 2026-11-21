/* Public API of the attendance-reports module (M3). The page is loaded by the router; other modules import only from here. */
export { attendanceReportsApi } from './services/attendanceReportsApi';
export type { AttendanceReport, AttendanceReportsStatus, ReportLevel } from './types/attendanceReports.types';
