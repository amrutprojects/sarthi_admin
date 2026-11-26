import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* PMO team, coordinators, workload and programme health have no live source yet: an honest empty state, never sample records. */
export default function PmoPage() {
  useEffect(() => {
    document.title = 'PMO dashboard — SARTHI Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'PMO dashboard' }]} title="PMO Dashboard" />;
}
