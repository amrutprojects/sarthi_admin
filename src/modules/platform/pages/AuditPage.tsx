import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* No server-side audit log is read by the admin panel yet: an honest empty state, never sample entries. */
export default function AuditPage() {
  useEffect(() => {
    document.title = 'Audit log — SARTHI Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Audit log' }]} title="System Activity / Audit Log" />;
}
