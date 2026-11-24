import { useEffect } from 'react';
import { LmsDataSource, LiveCentresPage } from '../../lms-live';
import { NO_DATA_TEXT, NotAvailablePage } from '../../../components/ui';

/* With "Show live LMS data" off there is no centre source in this panel: say so instead of showing sample centres. */
function LocalCentresPage() {
  useEffect(() => {
    document.title = 'Training centres — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <NotAvailablePage
      title="Training Centre Master"
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Training centres' }]}
      msg={NO_DATA_TEXT.lmsOff}
    />
  );
}

/* G-2: no local data while "Show live LMS data" is off; the LMS's live data while it is on. */
export default function CentresPage() {
  return <LmsDataSource local={<LocalCentresPage />} live={<LiveCentresPage />} />;
}
