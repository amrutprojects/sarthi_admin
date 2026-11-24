import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* Tasks and alerts have no live source yet: an honest empty state, never sample records or sample task dialogs. */
export default function TasksPage() {
  useEffect(() => {
    document.title = 'Tasks & alerts — AMRUT × SUMAGO Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Tasks & alerts' }]} title="Tasks & Alerts" />;
}
