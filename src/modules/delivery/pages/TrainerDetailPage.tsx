import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { NotAvailablePage } from '../../../components/ui';

/* No live source yet: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures). */
export default function TrainerDetailPage() {
  const { id = '' } = useParams();
  useEffect(() => {
    document.title = 'Trainer — AMRUT × SUMAGO Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Trainers', link: '#/trainers' }, { l: id || 'Trainer' }]}
      title="Trainer"
    />
  );
}
