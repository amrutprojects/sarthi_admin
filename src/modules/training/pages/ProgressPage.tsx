import { useEffect } from 'react';
import { PageHead, Card, Kpi, KvList, LinkButton, DemoNote, Badge, ModeTag, ProgRow, AttendanceCell, Dash } from '../../../components/ui';
import { HBar, Donut } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/trainingService';
import type { Candidate } from '../../../types/domain';

const isReady = (x: Candidate) => x.progress >= 90 && x.attendance >= 75;
const columns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name' },
  { k: 'batchId', l: 'Batch', render: (x) => <span className="mono">{x.batchId || '—'}</span> },
  { k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> },
  { k: 'progress', l: 'Curriculum', align: 'right', exportVal: (x) => x.progress + '%', render: (x) => <ProgRow pct={x.progress} tone={x.progress >= 75 ? 'g' : x.progress >= 40 ? '' : 'a'} /> },
  { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (x) => x.attendance + '%', render: (x) => <AttendanceCell value={x.attendance} /> },
  {
    k: 'ready', l: 'Assessment readiness', sortVal: (x) => (isReady(x) ? 1 : 0),
    exportVal: (x) => (isReady(x) ? 'Ready' : x.progress >= 60 ? 'On track' : 'Behind'),
    render: (x) => (isReady(x) ? <Badge tone="green">Ready</Badge> : x.progress >= 60 ? <Badge tone="blue">On track</Badge> : <Badge tone="amber">Behind</Badge>),
  },
  { k: 'risks', l: 'Risk', sortVal: (x) => x.risks.length, exportVal: (x) => (x.risks.length ? x.risks[0].l : ''), render: (x) => (x.risks.length ? <Badge tone={x.risks[0].tone}>{x.risks[0].l}</Badge> : <Dash />) },
];

export default function ProgressPage() {
  useLegacyTick();
  useEffect(() => { document.title = 'Student progress — AMRUT × SUMAGO Admin'; }, []);

  const active = S.candidates().filter(S.isActive);
  const band = (lo: number, hi: number) => active.filter((c) => c.progress >= lo && c.progress < hi).length;
  const ready = active.filter(isReady);
  const k = S.kpis(active, 0);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Student progress' }]}
        title="Student Progress"
        sub="Individual and batch-level curriculum progress, with assessment readiness and risk identification."
        actions={<>
          <LinkButton to="#/at-risk">At-risk students</LinkButton>
          <LinkButton to="#/assessments" className="btn primary">Assessment dashboard</LinkButton>
        </>}
      />
      <div className="grid g6 mb14">
        <Kpi label="In training" value={active.length} tone="b" link="#/candidates?bucket=active" />
        <Kpi label="0–25%" value={band(0, 25)} tone="r" />
        <Kpi label="25–50%" value={band(25, 50)} tone="a" />
        <Kpi label="50–75%" value={band(50, 75)} tone="b" />
        <Kpi label="75–100%" value={band(75, 101)} tone="g" />
        <Kpi label="Assessment ready" value={ready.length} tone="v" link="#/assessments" />
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Batch-wise progress" sub="Active batches only">
          <HBar
            items={S.batches().filter((b) => b.status === 'ACTIVE').map((b) => ({
              l: b.id + ' · ' + (b.mode === 'ONLINE' ? 'Online' : S.districtName(b.districtId)), v: b.progress, display: b.progress + '%',
              link: '#/batches/' + b.id, c: b.progress >= 75 ? '#1E7A46' : b.progress >= 40 ? '#C8651C' : '#C98A1E',
            }))}
            opts={{ max: 100 }}
          />
        </Card>
        <Card title="Progress distribution">
          <Donut
            items={[
              { l: '0–25%', v: band(0, 25), c: '#B3271E' }, { l: '25–50%', v: band(25, 50), c: '#C98A1E' },
              { l: '50–75%', v: band(50, 75), c: '#C8651C' }, { l: '75–100%', v: band(75, 101), c: '#1E7A46' },
            ]}
            opts={{ centerValue: active.length, centerLabel: 'In training', size: 176 }}
          />
          <div className="mt14">
            <KvList pairs={[
              ['Average curriculum progress', k.avgProgress + '%'],
              ['Average attendance', k.attendance + '%'],
              ['Behind schedule', String(active.filter((c) => c.progress < 30).length)],
            ]} />
          </div>
        </Card>
      </div>
      <div className="card">
        <div className="card-h"><h3>Student progress tracker</h3></div>
        <DataTable rows={active} columns={columns} pageSize={12} exportName="Student_Progress" search={['id', 'name']} rowLink={(x) => '#/candidates/' + x.id} />
      </div>
      <DemoNote />
    </div>
  );
}
