import { useEffect } from 'react';
import { LinkButton, NotAvailablePage } from '../../../components/ui';

/*
 * Training centre detail. Centres, their batches, trainers, scorecards and inspections have no live source in this
 * panel yet (user decision 24 Nov 2026: no sample figures). With "Show live LMS data" on, the Training centres list
 * reads the LMS.
 */
export default function CentreDetailPage() {
  useEffect(() => {
    document.title = 'Centre — AMRUT × SUMAGO Admin';
  }, []);

  return (
    <NotAvailablePage
      title="Training centre"
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Training centres', link: '#/centres' }, { l: 'Centre' }]}
      actions={
        <LinkButton to="#/centres" icon="chevL">
          All centres
        </LinkButton>
      }
    />
  );
}
