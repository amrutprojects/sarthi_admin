import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* Student app usage, engagement and notification figures have no live source yet: an honest empty state. */
export default function StudentAppPage() {
  useEffect(() => {
    document.title = 'Student app — AMRUT × SUMAGO Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Student app' }]} title="Student App Management" />;
}
