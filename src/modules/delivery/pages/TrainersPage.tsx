import { useEffect } from 'react';
import { LmsDataSource, LiveTrainersPage } from '../../lms-live';
import { NotAvailablePage, NO_DATA_TEXT } from '../../../components/ui';

/*
 * Off: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures), so it now
 * says the screen reads from the LMS. On: the live LMS view, unchanged.
 */
function LocalTrainersPage() {
  useEffect(() => {
    document.title = 'Trainers — SARTHI Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Trainers' }]}
      title="Trainer Management"
      msg={NO_DATA_TEXT.lmsOff}
    />
  );
}

export default function TrainersPage() {
  return <LmsDataSource local={<LocalTrainersPage />} live={<LiveTrainersPage />} />;
}
