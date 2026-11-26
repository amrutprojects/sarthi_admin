import { useEffect } from 'react';
import { LmsDataSource, LiveBatchesPage } from '../../lms-live';
import { NotAvailablePage, NO_DATA_TEXT } from '../../../components/ui';

/*
 * Off: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures), so it now
 * says the screen reads from the LMS. On: the live LMS view, unchanged.
 */
function LocalBatchesPage() {
  useEffect(() => {
    document.title = 'Batches — SARTHI Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Batches' }]}
      title="Batch Management"
      msg={NO_DATA_TEXT.lmsOff}
    />
  );
}

export default function BatchesPage() {
  return <LmsDataSource local={<LocalBatchesPage />} live={<LiveBatchesPage />} />;
}
