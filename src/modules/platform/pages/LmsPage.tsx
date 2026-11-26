import { useEffect } from 'react';
import { LinkButton, NotAvailablePage } from '../../../components/ui';
import { Can } from '../../auth';

/*
 * LMS integration overview. Sync figures, sync logs and per-batch LMS activity have no live source yet, so the screen
 * shows an empty state. The Amrut-issued API keys (M1, GET /api-keys) are live and stay reachable from here.
 */
export default function LmsPage() {
  useEffect(() => {
    document.title = 'LMS integration — SARTHI Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'LMS integration' }]}
      title="LMS Integration"
      actions={
        <Can action="viewLmsApiKeys">
          <LinkButton to="#/lms/api-keys" icon="shield">
            API keys
          </LinkButton>
        </Can>
      }
    />
  );
}
