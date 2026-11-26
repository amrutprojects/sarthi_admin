import { useEffect } from 'react';
import { LinkButton, NotAvailablePage } from '../../../components/ui';

/* Programme masters, course catalogue and district target allocation have no live source yet: an honest empty state. */
export default function AdministrationPage() {
  useEffect(() => {
    document.title = 'Administration — SARTHI Admin';
  }, []);
  return (
    <NotAvailablePage
      crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Administration' }]}
      title="Administration — Master Configuration"
      actions={
        <LinkButton to="#/settings" icon="settings" className="btn primary">
          System settings
        </LinkButton>
      }
    />
  );
}
