import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyState, LinkButton, NotAvailablePage } from '../../../components/ui';
import { useCanOpen } from '../../auth';
import { REPORT_CATALOGUE } from '../reportCatalogue';

/* Attendance is the one report with a live counterpart: the LMS attendance reports (M3, /attendance-reports). */
const LIVE_ATTENDANCE = { en: 'Open the live attendance reports', mr: 'थेट उपस्थिती अहवाल उघडा' };

/* One report: no live data source yet, so an honest empty state with the report's own title, never sample rows. */
export default function ReportDetailPage() {
  const { id = '' } = useParams();
  const canOpen = useCanOpen();
  useEffect(() => {
    document.title = 'Report — SARTHI Admin';
  }, []);

  const def = REPORT_CATALOGUE.find((x) => x[0] === id);
  if (!def)
    return (
      <div className="page">
        <EmptyState title="Report not found" msg="">
          <LinkButton to="#/reports" className="btn primary">
            All reports
          </LinkButton>
        </EmptyState>
      </div>
    );

  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Reports & MIS', link: '#/reports' }, { l: def[1] }]}
      title={def[1]}
      sub={def[2]}
      actions={
        <LinkButton to="#/reports" icon="chevL">
          All reports
        </LinkButton>
      }
    >
      {def[0] === 'attendance' && canOpen('attendance-reports') ? (
        <LinkButton to="#/attendance-reports" className="btn primary mt10">
          {/* Two lines: the bilingual label is too long for one line on a phone (buttons do not wrap). */}
          <span style={{ display: 'block' }}>
            {LIVE_ATTENDANCE.en}
            <br />
            <span lang="mr">{LIVE_ATTENDANCE.mr}</span>
          </span>
        </LinkButton>
      ) : null}
    </NotAvailablePage>
  );
}
