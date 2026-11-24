import { useEffect } from 'react';
import { LmsDataSource, LiveSessionsTodayPage } from '../../lms-live';
import { NotAvailablePage, NO_DATA_TEXT } from '../../../components/ui';

/*
 * Off: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures), so it now
 * says the screen reads from the LMS. On: the live LMS view, unchanged.
 */
function LocalLivePage() {
  useEffect(() => {
    document.title = 'Live training monitor — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Live training monitor' }]}
      title="Live Training Monitor"
      msg={NO_DATA_TEXT.lmsOff}
    />
  );
}

export default function LivePage() {
  return <LmsDataSource local={<LocalLivePage />} live={<LiveSessionsTodayPage />} />;
}
