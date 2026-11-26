import { useEffect } from 'react';
import { LmsDataSource, LiveSessionsByModePage } from '../../lms-live';
import { NotAvailablePage, NO_DATA_TEXT } from '../../../components/ui';

/*
 * Off: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures), so it now
 * says the screen reads from the LMS. On: the live LMS view, unchanged.
 */
function LocalOfflinePage() {
  useEffect(() => {
    document.title = 'Offline training — SARTHI Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Offline training' }]}
      title="Offline Training Control"
      msg={NO_DATA_TEXT.lmsOff}
    />
  );
}

export default function OfflinePage() {
  return <LmsDataSource local={<LocalOfflinePage />} live={<LiveSessionsByModePage deliveryMode="OFFLINE" />} />;
}
