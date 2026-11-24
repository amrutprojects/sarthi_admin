import { useEffect } from 'react';
import { LmsDataSource, LiveSessionsByModePage } from '../../lms-live';
import { NotAvailablePage, NO_DATA_TEXT } from '../../../components/ui';

/*
 * Off: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures), so it now
 * says the screen reads from the LMS. On: the live LMS view, unchanged.
 */
function LocalOnlinePage() {
  useEffect(() => {
    document.title = 'Online training — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Online training' }]}
      title="Online Training Control"
      msg={NO_DATA_TEXT.lmsOff}
    />
  );
}

export default function OnlinePage() {
  return <LmsDataSource local={<LocalOnlinePage />} live={<LiveSessionsByModePage deliveryMode="ONLINE" />} />;
}
