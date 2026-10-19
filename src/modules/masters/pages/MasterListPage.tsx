import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Badge, Callout, PageHead } from '../../../components/ui';
import { useAuth } from '../../auth';
import MasterTab from '../components/MasterTab';
import { MASTERS, masterPermission } from '../config';

/* One reference-data master (Region, Caste, Document type or Education), opened from its own sidebar item: /masters/<path>. */
export default function MasterListPage() {
  const { pathname } = useLocation();
  const { permissions } = useAuth();
  const master = MASTERS.find((m) => pathname.replace(/\/$/, '').endsWith(`/masters/${m.path}`));
  useEffect(() => {
    document.title = `${master?.plural ?? 'Masters'} — AMRUT × SUMAGO Admin`;
  }, [master]);

  if (!master || !permissions.has(masterPermission(master, 'view')))
    return (
      <div className="page">
        <Callout tone="warn" title="Not permitted. ">
          You do not have permission to view this master.
        </Callout>
      </div>
    );

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Masters' }, { l: master.plural }]}
        title={master.plural}
        badge={<Badge tone="green">Live</Badge>}
        sub="Reference list used by student registration and import. Only active records appear in dropdowns; deleted values stay reserved."
      />
      <MasterTab key={master.key} master={master} />
    </div>
  );
}
