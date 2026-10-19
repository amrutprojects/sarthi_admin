import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AS from '../../../legacy';
import {
  PageHead, Kpi, KvList, FilterBar, LinkButton, DemoNote, GenBadge, ModeTag, ProgRow, AttendanceCell,
  districtOptions, modeOptions, useGo,
} from '../../../components/ui';
import { Ring } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/networkService';
import type { Centre } from '../../../types/domain';
import { Can } from '../../auth/components/Can';

const columns: Column<Centre>[] = [
  { k: 'id', l: 'Centre ID', render: (c) => <span className="lnk mono">{c.id}</span> },
  { k: 'name', l: 'Centre name', render: (c) => <b>{c.name}</b> },
  { k: 'districtId', l: 'District', sortVal: (c) => S.districtName(c.districtId), render: (c) => S.districtName(c.districtId) },
  { k: 'taluka', l: 'Taluka' },
  { k: 'manager', l: 'Centre manager' },
  { k: 'mode', l: 'Mode', render: (c) => <ModeTag mode={c.mode} /> },
  { k: 'capacity', l: 'Capacity', align: 'right' },
  { k: 'activeBatches', l: 'Active batches', align: 'right' },
  { k: 'students', l: 'Students', align: 'right', render: (c) => <b>{c.students}</b> },
  { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (c) => c.attendance + '%', render: (c) => <AttendanceCell value={c.attendance} /> },
  { k: 'score', l: 'Performance', align: 'right', exportVal: (c) => c.score + '/100', render: (c) => <ProgRow pct={c.score} tone={c.score >= 80 ? 'g' : c.score >= 70 ? 'a' : 'r'} label={c.score + '/100'} /> },
  { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
];

export default function CentresPage() {
  useLegacyTick();
  const go = useGo();
  const { search } = useLocation();
  const [f, setF] = usePersistentState('centre', S.DEFAULT_CENTRE);
  useEffect(() => { document.title = 'Training centres — AMRUT × SUMAGO Admin'; }, []);
  useEffect(() => {
    const q = new URLSearchParams(search);
    const next: Record<string, string> = {};
    if (q.get('filter') === 'low') next.perf = 'low';
    const district = q.get('district');
    if (district) next.district = district;
    if (Object.keys(next).length) setF((x) => ({ ...x, ...next }));
  }, [search, setF]);

  const rows = S.filterCentres(f);
  const cs = S.centres();
  const totalStudents = cs.reduce((a, c) => a + c.students, 0);
  const avgScore = Math.round(cs.reduce((a, c) => a + c.score, 0) / cs.length);
  const avgAtt = Math.round(cs.reduce((a, c) => a + c.attendance, 0) / cs.length);
  const demo = () => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok');

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Training centres' }]}
        title="Training Centre Master"
        badge={<span className="tag">{rows.length} records</span>}
        sub="Offline centres are managed by their Centre Manager. The online training unit is managed centrally by the SUMAGO Online Training Management Team."
        actions={<>
          <LinkButton to="#/centre-onboarding" icon="clipboard">Onboarding workflow</LinkButton>
          <LinkButton to="#/map" icon="pin">Map view</LinkButton>
          <Can action="manageCentre"><button type="button" className="btn primary" onClick={demo}><Icon name="plus" />Add centre</button></Can>
        </>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Approved offline centres" value={cs.length} tone="b" />
        <Kpi label="Online training units" value={1} tone="v" link={'#/centres/' + S.onlineUnit().id} />
        <Kpi label="Students at centres" value={totalStudents} tone="g" />
        <Kpi label="Active batches" value={S.batches().filter((b) => b.status === 'ACTIVE').length} tone="s" link="#/batches?status=ACTIVE" />
        <Kpi label="Average centre score" value={avgScore + '/100'} tone={avgScore >= 80 ? 'g' : 'a'} pct={avgScore} progTone={avgScore >= 80 ? 'g' : 'a'} />
        <Kpi label="Average attendance" value={avgAtt + '%'} tone={avgAtt >= 75 ? 'g' : 'a'} link="#/attendance" />
      </div>
      <FilterBar
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'mode', l: 'Mode', options: modeOptions() },
          { k: 'status', l: 'Status', options: [{ v: 'ALL', l: 'All statuses' }, { v: 'ACTIVE', l: 'Active' }, { v: 'NEEDS_IMPROVEMENT', l: 'Needs improvement' }, { v: 'SUSPENDED', l: 'Suspended' }, { v: 'INACTIVE', l: 'Inactive' }] },
          { k: 'perf', l: 'Performance', options: [{ v: 'ALL', l: 'All' }, { v: 'high', l: 'Score 80+' }, { v: 'mid', l: 'Score 70–79' }, { v: 'low', l: 'Below 70' }] },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(S.DEFAULT_CENTRE)}
      />
      <div className="grid g3 mb14">
        {rows.slice(0, 6).map((c) => (
          <div key={c.id} className="card pad pointer" onClick={() => go('#/centres/' + c.id)}>
            <div className="f jb ac"><span className="mono fs11 muted">{c.id}</span><ModeTag mode={c.mode} /></div>
            <b className="fs13 mt4" style={{ display: 'block' }}>{c.name}</b>
            <div className="fs11 muted">{S.districtName(c.districtId)} · {c.taluka}</div>
            <div className="f gp10 mt10">
              <Ring value={c.score} opts={{ size: 62, thick: 7, label: String(c.score), sub: 'score' }} />
              <div className="flex1"><KvList pairs={[['Students', String(c.students)], ['Active batches', String(c.activeBatches)], ['Attendance', c.attendance + '%']]} /></div>
            </div>
            <div className="mt8"><GenBadge status={c.status} /></div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-h"><h3>All centres</h3></div>
        <DataTable key={JSON.stringify(f)} rows={rows} columns={columns} pageSize={12} exportName="Training_Centres"
          search={['id', 'name', 'manager']} searchLabel="centre or manager" rowLink={(c) => '#/centres/' + c.id} />
      </div>
      <DemoNote />
    </div>
  );
}
