import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/*
 * At-risk engine. Risk flags need attendance, progress and assessment data, which have no live source yet
 * (user decision 24 Nov 2026: no sample students or counts).
 */
export default function AtRiskPage() {
  useEffect(() => {
    document.title = 'At-risk engine — AMRUT × SUMAGO Admin';
  }, []);

  return <NotAvailablePage title="At-Risk Engine" crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'At-risk engine' }]} />;
}
