import { useEffect } from 'react';
import { PageHead, Card, Kpi, KvList, LinkButton, Callout, DemoNote, Badge, GenBadge, AttendanceCell } from '../../../components/ui';
import { HBar } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/trainingService';
import SessionList from './SessionList';
import type { Centre } from '../../../types/domain';

const columns: Column<Centre>[] = [
  { k: 'name', l: 'Centre', render: (c) => <b className="lnk">{c.name}</b> },
  { k: 'districtId', l: 'District', exportVal: (c) => S.districtName(c.districtId), render: (c) => S.districtName(c.districtId) },
  { k: 'manager', l: 'Centre manager' },
  { k: 'activeBatches', l: 'Active batches', align: 'right' },
  { k: 'students', l: 'Students', align: 'right' },
  { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (c) => c.attendance + '%', render: (c) => <AttendanceCell value={c.attendance} /> },
  { k: 'score', l: 'Score', align: 'right', exportVal: (c) => c.score + '/100', render: (c) => <Badge tone={c.score >= 80 ? 'green' : c.score >= 70 ? 'amber' : 'red'}>{c.score}/100</Badge> },
  { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
];

export default function OfflinePage() {
  useLegacyTick();
  useEffect(() => { document.title = 'Offline training — AMRUT × SUMAGO Admin'; }, []);

  const k = S.kpis(S.byMode('OFFLINE'), 800);
  const sessions = S.liveSessions().filter((s) => s.mode === 'OFFLINE');
  const present = sessions.reduce((a, s) => a + s.present, 0);
  const cs = S.centres();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Offline training' }]}
        title="Offline Training Control"
        badge={<span className="mode-tag mode-off" style={{ padding: '5px 11px' }}>OFFLINE TRAINING MODE</span>}
        sub={<>Delivered at approved institutional centres. Execution is owned by each <b>Centre Manager / Coordinator</b> with a SUMAGO-certified trainer team.</>}
        actions={<>
          <LinkButton to="#/centres">Centres</LinkButton>
          <LinkButton to="#/attendance?mode=OFFLINE">Attendance</LinkButton>
          <LinkButton to="#/live" className="btn primary">Live monitor</LinkButton>
        </>}
      />
      <div className="grid g8 mb14">
        <Kpi label="Active centres" value={cs.filter((c) => c.status === 'ACTIVE').length} tone="b" link="#/centres" />
        <Kpi label="Active batches" value={S.batches().filter((b) => b.mode === 'OFFLINE' && b.status === 'ACTIVE').length} tone="b" link="#/batches?mode=OFFLINE&status=ACTIVE" />
        <Kpi label="Enrolled (offline)" value={k.enrolled} tone="g" link="#/candidates?mode=OFFLINE&bucket=enrolled" />
        <Kpi label="Training active" value={k.trainingActive} tone="s" link="#/candidates?mode=OFFLINE&bucket=active" />
        <Kpi label="Present today" value={present} tone="g" />
        <Kpi label="Attendance" value={k.attendance + '%'} tone={k.attendance >= 75 ? 'g' : 'a'} pct={k.attendance} progTone="g" />
        <Kpi label="Trainers active" value={S.trainers().filter((t) => t.mode === 'OFFLINE' && t.availability === 'ACTIVE').length} tone="b" link="#/trainers?mode=OFFLINE" />
        <Kpi label="Completed" value={k.completed} tone="g" link="#/candidates?mode=OFFLINE&bucket=completed" />
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Centre-wise performance" flush>
          <DataTable rows={cs} columns={columns} pageSize={10} exportName="Offline_Centre_Performance" search={['name']} rowLink={(c) => '#/centres/' + c.id} />
        </Card>
        <Card title="Sessions today (offline)" flush footer={<LinkButton to="#/live" className="btn sm">Live monitor</LinkButton>}><SessionList sessions={sessions} /></Card>
      </div>
      <div className="grid g3">
        <Card title="Offline enrollment by district">
          <HBar items={cs.map((c) => {
            const kk = S.kpis(S.byCentre(c.id), c.capacity);
            return { l: S.districtName(c.districtId), v: kk.enrolled, display: kk.enrolled + '/' + c.capacity, link: '#/centres/' + c.id, c: '#8A4116' };
          })} />
        </Card>
        <Card title="Attendance by centre">
          <HBar items={cs.map((c) => ({ l: c.name.split(' ')[0] + ' — ' + S.districtName(c.districtId), v: c.attendance, display: c.attendance + '%', link: '#/centres/' + c.id, c: c.attendance >= 75 ? '#1E7A46' : '#B3271E' }))} opts={{ max: 100 }} />
        </Card>
        <Card title="Offline mode notes">
          <KvList pairs={[
            ['Managed by', 'Centre Manager / Coordinator'], ['Trainer team', 'SUMAGO-certified, ToT completed'],
            ['Attendance capture', 'Digital attendance at centre (primary)'], ['Manual register', 'Recorded separately for audit'],
            ['Practical training', 'At centre lab'], ['Documentation', 'Centre-held, verified by QA'],
          ]} />
          <div className="mt10"><Callout tone="info" title="Independent mode">Offline and online are two independent tracks. A candidate belongs to exactly one mode — the programme does not run a mixed track.</Callout></div>
        </Card>
      </div>
      <DemoNote />
    </div>
  );
}
