import { useEffect } from 'react';
import { LmsDataSource, LiveAttendancePage } from '../../lms-live';
import { NotAvailablePage, NO_DATA_TEXT } from '../../../components/ui';

/*
 * Off: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures), so it now
 * says the screen reads from the LMS. On: the live LMS view, unchanged.
 */
function LocalAttendancePage() {
  useEffect(() => {
    document.title = 'Attendance — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Attendance' }]}
      title="Attendance Dashboard"
      msg={NO_DATA_TEXT.lmsOff}
    />
  );
}

export default function AttendancePage() {
  return <LmsDataSource local={<LocalAttendancePage />} live={<LiveAttendancePage />} />;
}
