import { useEffect } from 'react';
import AS from '../../legacy';
import { PageHead, Card, Kpi, LinkButton, DemoNote, Badge, GenBadge, ListRows, dateFmt } from '../../components/ui';
import { HBar } from '../../components/charts';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Icon from '../../components/Icon';
import { useLegacyTick } from '../../utils/legacyBus';
import * as G from '../../services/governanceService';
import type { Inspection } from '../../types/domain';
import { Can } from '../../auth/Can';

const LEVELS: [level: string, title: string, desc: string, freq: string, tone: string][] = [
  ['LEVEL 1', 'Centre — Daily', 'Centre manager self-check: attendance, session delivery, infrastructure readiness', 'Daily', 'green'],
  ['LEVEL 2', 'Field — Weekly', 'District coordinator visit: classroom observation, student interaction, records', 'Weekly', 'blue'],
  ['LEVEL 3', 'Central QA — Monthly', 'Central QA team: full scorecard, documentation audit, corrective actions', 'Monthly', 'violet'],
];
const levelTone = (l: string) => (l === 'LEVEL_3' ? 'violet' : l === 'LEVEL_2' ? 'blue' : 'green');
const columns: Column<Inspection>[] = [
  { k: 'id', l: 'ID', render: (i) => <span className="mono">{i.id}</span> },
  { k: 'centreName', l: 'Centre', render: (i) => <b className="lnk">{i.centreName}</b> },
  { k: 'districtId', l: 'District', exportVal: (i) => G.districtName(i.districtId), render: (i) => G.districtName(i.districtId) },
  { k: 'level', l: 'Level', exportVal: (i) => i.level.replace('_', ' '), render: (i) => <Badge tone={levelTone(i.level)}>{i.level.replace('_', ' ')}</Badge> },
  { k: 'type', l: 'Type' },
  { k: 'scheduled', l: 'Scheduled', exportVal: (i) => dateFmt(i.scheduled), render: (i) => dateFmt(i.scheduled) },
  { k: 'inspector', l: 'Inspector' },
  { k: 'score', l: 'Score', align: 'right', exportVal: (i) => (i.score == null ? '—' : i.score + '/100'), render: (i) => (i.score == null ? '—' : i.score + '/100') },
  { k: 'status', l: 'Status', render: (i) => <GenBadge status={i.status} /> },
];

export default function QaPage() {
  useLegacyTick();
  useEffect(() => { document.title = 'Quality assurance — AMRUT × SUMAGO Admin'; }, []);
  const DB = G.db();
  const insp = DB.inspections;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Quality assurance' }]}
        title="Quality Assurance"
        sub="Three-level QA framework with scheduled and surprise inspections, and a 100-point centre scorecard."
        actions={<Can action="inspect"><button type="button" className="btn primary" onClick={() => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok')}><Icon name="plus" />Schedule inspection</button></Can>}
      />
      <div className="grid g4 mb14">
        <Kpi label="Inspections" value={insp.length} tone="b" />
        <Kpi label="Completed" value={insp.filter((i) => i.status === 'COMPLETED').length} tone="g" />
        <Kpi label="Scheduled" value={insp.filter((i) => i.status === 'SCHEDULED').length} tone="a" />
        <Kpi label="Centres below benchmark" value={DB.centres.filter((c) => c.score < 70).length} tone="r" link="#/centres?filter=low" />
      </div>
      <div className="grid g3 mb14">
        {LEVELS.map(([lvl, title, desc, freq, tone]) => (
          <div key={lvl} className="card pad">
            <div className="f jb ac"><Badge tone={tone}>{lvl}</Badge><span className="tag">{freq}</span></div>
            <b className="fs13 mt8" style={{ display: 'block' }}>{title}</b>
            <p className="t2 fs12 mt4" style={{ marginBottom: 0 }}>{desc}</p>
          </div>
        ))}
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Inspection schedule" flush>
          <DataTable rows={insp} columns={columns} pageSize={10} exportName="QA_Inspections" search={['centreName', 'inspector']} rowLink={(i) => '#/centres/' + i.centreId} />
        </Card>
        <Card title="Inspection types" flush>
          <ListRows items={[
            { title: 'Pre-batch', sub: 'Before the first batch starts at a centre', right: <Badge tone="blue">Mandatory</Badge>, icon: 'check' },
            { title: 'During first batch', sub: 'Within the first 3 weeks of delivery', right: <Badge tone="blue">Mandatory</Badge>, icon: 'check' },
            { title: 'Random / surprise', sub: 'Unannounced, risk-weighted selection', right: <Badge tone="amber">Risk-based</Badge>, icon: 'alert' },
            { title: 'Pre-closure', sub: 'Before batch closure and certification', right: <Badge tone="blue">Mandatory</Badge>, icon: 'check' },
          ]} />
        </Card>
      </div>
      <Card title="Centre scorecard comparison" sub="Benchmark 70/100 (configurable)" action={<LinkButton to="#/centre-onboarding" className="btn sm">Evaluation model</LinkButton>}>
        <HBar
          items={DB.centres.map((c) => ({ l: c.name + ' — ' + G.districtName(c.districtId), v: c.score, display: c.score + '/100', link: '#/centres/' + c.id, c: c.score >= 80 ? '#1E7A46' : c.score >= 70 ? '#C98A1E' : '#B3271E' })).sort((a, b) => b.v - a.v)}
          opts={{ max: 100 }}
        />
      </Card>
      <DemoNote />
    </div>
  );
}
