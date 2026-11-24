import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* Inspections and centre scorecards have no live source yet: an honest empty state, never sample records. */
export default function QaPage() {
  useEffect(() => {
    document.title = 'Quality assurance — AMRUT × SUMAGO Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Quality assurance' }]} title="Quality Assurance" />;
}
