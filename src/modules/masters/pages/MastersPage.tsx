import { useEffect, useState } from 'react';
import { Badge, Callout, PageHead } from '../../../components/ui';
import { useAuth } from '../../auth';
import MasterTab from '../components/MasterTab';
import { MASTERS, masterPermission, type MasterKey } from '../config';

/* Reference-data masters (Region, Caste, Document type, Education), backed by the live backend. One tab per master the user may view. */
export default function MastersPage() {
  const { permissions } = useAuth();
  const visible = MASTERS.filter((m) => permissions.has(masterPermission(m, 'view')));
  const [tab, setTab] = useState<MasterKey | undefined>(visible[0]?.key);
  const current = visible.find((m) => m.key === tab) ?? visible[0];
  useEffect(() => {
    document.title = 'Masters — AMRUT × SUMAGO Admin';
  }, []);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Masters' }]}
        title="Masters"
        badge={<Badge tone="green">Live</Badge>}
        sub="Reference lists used by student registration and import. Only active records appear in dropdowns; deleted values stay reserved."
      />
      {!current ? (
        <Callout tone="warn" title="Not permitted. ">
          You do not have permission to view any master.
        </Callout>
      ) : (
        <>
          <div className="tabs">
            {visible.map((m) => (
              <button type="button" key={m.key} className={current.key === m.key ? 'on' : ''} onClick={() => setTab(m.key)}>
                {m.plural}
              </button>
            ))}
          </div>
          <MasterTab key={current.key} master={current} />
        </>
      )}
    </div>
  );
}
