import { useEffect } from 'react';
import AS from '../../../legacy';
import { PageHead, Kpi, FilterBar, LinkButton, DemoNote, Badge, GenBadge, ModeTag, ProgRow, districtOptions, modeOptions, titleCase } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/deliveryService';
import type { Trainer } from '../../../types/domain';
import { Can } from '../../auth/components/Can';

const columns: Column<Trainer>[] = [
  { k: 'id', l: 'Trainer ID', render: (t) => <span className="lnk mono">{t.id}</span> },
  { k: 'name', l: 'Name', render: (t) => <b>{t.name}</b> },
  { k: 'qualification', l: 'Qualification' },
  { k: 'experience', l: 'Experience', align: 'right', exportVal: (t) => t.experience + ' yrs', render: (t) => t.experience + ' yrs' },
  { k: 'specialization', l: 'Specialization' },
  { k: 'centreId', l: 'Centre / unit', sortVal: (t) => S.centre(t.centreId).name, render: (t) => S.centre(t.centreId).name },
  { k: 'districtId', l: 'District', exportVal: (t) => S.districtName(t.districtId), render: (t) => S.districtName(t.districtId) },
  { k: 'mode', l: 'Mode', render: (t) => <ModeTag mode={t.mode} /> },
  { k: 'totStatus', l: 'ToT', exportVal: (t) => titleCase(t.totStatus), render: (t) => <Badge tone={S.totTone(t.totStatus)}>{titleCase(t.totStatus)}</Badge> },
  { k: 'availability', l: 'Availability', render: (t) => <GenBadge status={t.availability} /> },
  { k: 'score', l: 'Performance', align: 'right', exportVal: (t) => t.score + '/100', render: (t) => <ProgRow pct={t.score} tone={t.score >= 80 ? 'g' : t.score >= 65 ? 'a' : 'r'} label={t.score + '/100'} /> },
];

export default function TrainersPage() {
  useLegacyTick();
  const [f, setF] = usePersistentState('trainer', S.DEFAULT_TRAINER);
  useEffect(() => { document.title = 'Trainers — AMRUT × SUMAGO Admin'; }, []);

  const all = S.trainers();
  const rows = S.filterTrainers(f);
  const count = (a: string) => all.filter((t) => t.availability === a).length;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Trainers' }]}
        title="Trainer Management"
        badge={<span className="tag">{rows.length} of {all.length}</span>}
        sub="Trainer pool across offline centres and the central online training unit."
        actions={<>
          <LinkButton to="#/tot" icon="award">ToT management</LinkButton>
          <Can action="manageTrainers"><button type="button" className="btn primary" onClick={() => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok')}><Icon name="plus" />Add trainer</button></Can>
        </>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Trainer pool" value={all.length} tone="b" />
        <Kpi label="Active" value={count('ACTIVE')} tone="g" />
        <Kpi label="Backup" value={count('BACKUP')} tone="" />
        <Kpi label="Inactive" value={count('INACTIVE')} tone="r" />
        <Kpi label="ToT certified" value={all.filter((t) => t.totStatus === 'CERTIFIED').length} tone="v" link="#/tot" />
        <Kpi label="Avg. feedback" value={(all.reduce((a, t) => a + t.feedback, 0) / all.length).toFixed(1) + '/5'} tone="g" />
      </div>
      <FilterBar
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'mode', l: 'Mode', options: modeOptions() },
          { k: 'availability', l: 'Availability', options: [{ v: 'ALL', l: 'All' }, { v: 'ACTIVE', l: 'Active' }, { v: 'BACKUP', l: 'Backup' }, { v: 'INACTIVE', l: 'Inactive' }] },
          { k: 'tot', l: 'ToT status', options: [{ v: 'ALL', l: 'All' }, { v: 'CERTIFIED', l: 'Certified / approved' }, { v: 'COMPLETED', l: 'Completed' }, { v: 'REGISTERED', l: 'Registered' }, { v: 'NOT_STARTED', l: 'Not started' }] },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(S.DEFAULT_TRAINER)}
      />
      <div className="card">
        <div className="card-h"><h3>Trainer database</h3></div>
        <DataTable key={JSON.stringify(f)} rows={rows} columns={columns} pageSize={12} exportName="Trainer_Database" search={['id', 'name', 'specialization']} rowLink={(t) => '#/trainers/' + t.id} />
      </div>
      <DemoNote />
    </div>
  );
}
