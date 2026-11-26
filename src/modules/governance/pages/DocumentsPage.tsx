import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* Documents and their verification status have no live source yet: an honest empty state, never sample records. */
export default function DocumentsPage() {
  useEffect(() => {
    document.title = 'Documents — SARTHI Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Documents' }]} title="Document Management" />;
}
