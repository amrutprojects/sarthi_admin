import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* No live source yet: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures). */
export default function AssessmentsPage() {
  useEffect(() => {
    document.title = 'Assessments — AMRUT × SUMAGO Admin';
  }, []);
  return <NotAvailablePage crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Assessments' }]} title="Assessment Dashboard" />;
}
