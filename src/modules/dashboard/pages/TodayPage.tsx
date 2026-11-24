import { useEffect } from 'react';
import { LinkButton, NotAvailablePage } from '../../../components/ui';

/* No live source for today's sessions, attendance or open items yet: an honest empty screen, nothing invented. */
export default function TodayPage() {
  useEffect(() => {
    document.title = "Today's Operations — AMRUT × SUMAGO Admin";
  }, []);

  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: "Today's Operations" }]}
      title="Today's Control Room"
      sub={
        <>
          Sessions, attendance and open items for the day · <span lang="mr">दिवसभरातील सत्रे, उपस्थिती आणि प्रलंबित कामे</span>
        </>
      }
      actions={
        <>
          <LinkButton to="#/live">Live training monitor</LinkButton>
          <LinkButton to="#/attendance" className="btn primary">
            Attendance
          </LinkButton>
        </>
      }
    />
  );
}
