import { useEffect } from 'react';
import { NotAvailablePage } from '../../../components/ui';

/* Centre onboarding pipeline and evaluations have no live source yet (user decision 24 Nov 2026: no sample entries). */
export default function CentreOnboardingPage() {
  useEffect(() => {
    document.title = 'Centre onboarding — AMRUT × SUMAGO Admin';
  }, []);

  return (
    <NotAvailablePage
      title="Centre Onboarding Workflow"
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Training centres', link: '#/centres' }, { l: 'Centre onboarding' }]}
    />
  );
}
