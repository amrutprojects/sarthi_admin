import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { NotAvailablePage } from '../../../components/ui';

/* No live source yet: the old screen showed an invented sample dataset (user decision 24 Nov 2026: no invented figures). */
export default function CampaignDetailPage() {
  const { id = '' } = useParams();
  useEffect(() => {
    document.title = 'Campaign — SARTHI Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Marketing', link: '#/marketing' }, { l: id || 'Campaign' }]}
      title="Campaign"
    />
  );
}
