import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* Budget, payments and commercial figures have no live source yet: an honest empty state, never sample records. */
export default function FinancePage() {
  useEffect(() => {
    document.title = 'Finance — AMRUT × SUMAGO Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Finance' }]} title="Finance Dashboard" />;
}
