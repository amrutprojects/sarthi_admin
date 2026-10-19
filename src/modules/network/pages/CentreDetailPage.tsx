import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AS from '../../../legacy';
import {
  PageHead, Card, Kpi, KvList, LinkButton, EmptyState, DemoNote, GenBadge, StatusBadge, ModeTag, ProgRow, AttendanceCell, Callout,
  dateFmt, titleCase, useGo,
} from '../../../components/ui';
import { Ring, MarkerMap } from '../../../components/charts';
import { Drawer } from '../../../components/ui/Overlay';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import Avatar from '../../../components/ui/Avatar';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/networkService';
import type { Candidate } from '../../../types/domain';
import type { Centre, District, Trainer } from '../../../types/domain';
import { Can } from '../../auth/components/Can';

const SCORE_MAX: Record<string, number> = { 'Computer Infrastructure': 25, Classroom: 15, 'Working PCs': 15, 'Trainer Availability': 15, 'Internet / Power': 10, Accessibility: 5, Experience: 5, Documentation: 5, 'Institutional Capability': 5 };
const demoToast = () => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok');

const stuColumns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name' },
  { k: 'batchId', l: 'Batch', render: (x) => <span className="mono">{x.batchId || '—'}</span> },
  { k: 'status', l: 'Status', render: (x) => <StatusBadge status={x.status} /> },
  { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (x) => x.attendance + '%', render: (x) => <AttendanceCell value={x.attendance} /> },
  { k: 'progress', l: 'Progress', align: 'right', exportVal: (x) => x.progress + '%', render: (x) => <ProgRow pct={x.progress} /> },
];

export default function CentreDetailPage() {
  useLegacyTick();
  const go = useGo();
  const { id = '' } = useParams();
  const [inspecting, setInspecting] = useState(false);
  useEffect(() => { document.title = 'Centre — AMRUT × SUMAGO Admin'; }, []);

  const c = S.centre(id);
  if (!c) {
    return <div className="page"><EmptyState title="Centre not found" msg={'No centre with ID ' + id}><LinkButton to="#/centres" className="btn primary">All centres</LinkButton></EmptyState></div>;
  }
  const d = S.district(c.districtId) as District;
  const batches = S.batches().filter((b) => b.centreId === c.id);
  const trainers = S.trainers().filter((t) => t.centreId === c.id);
  const k = c._k;
  const avg = (arr: Trainer[], f: (t: Trainer) => number, dflt: number) => (arr.length ? arr.reduce((a, t) => a + f(t), 0) / arr.length : dflt);
  const perf: [label: string, value: number][] = [
    ['Attendance', c.attendance], ['Training delivery', Math.min(100, k.avgProgress + 8)],
    ['Infrastructure', Math.round((c.scorecard['Computer Infrastructure'] || 20) / 25 * 100)],
    ['Trainer performance', Math.round(avg(trainers, (t) => t.score, 0))],
    ['Student feedback', Math.round(avg(trainers, (t) => t.feedback, 4) / 5 * 100)],
    ['Documentation', Math.round((c.scorecard.Documentation || 3) / 5 * 100)],
    ['Assessment outcome', k.assessed ? k.passRate : 0],
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Training centres', link: '#/centres' }, { l: d.name, link: '#/districts/' + d.code }, { l: c.name }]}
        title={c.name}
        badge={<><ModeTag mode={c.mode} /><GenBadge status={c.status} /></>}
        sub={<><span className="mono">{c.id}</span> · {c.address} · Approved {dateFmt(c.approvedOn)}</>}
        actions={<>
          <LinkButton to={'#/attendance?centre=' + c.id} icon="calendar">Attendance</LinkButton>
          <Can action="inspect"><button type="button" className="btn" onClick={() => setInspecting(true)}><Icon name="check" />Inspection</button></Can>
          <LinkButton to={'#/candidates?centre=' + c.id} icon="users" className="btn primary">Students</LinkButton>
        </>}
      />
      {c.mode === 'ONLINE' ? <div className="mb14"><Callout tone="info" title="Online training unit">This is the central SUMAGO Online Training Management Unit, not a physical training centre. Physical infrastructure controls do not apply; delivery is through SUMAGO LMS and the Student App.</Callout></div> : null}
      {c.score < 70 ? <div className="mb14"><Callout tone="err" title="Centre below performance benchmark">{'Centre score is ' + c.score + '/100 against a configurable benchmark of 70. Infrastructure and trainer availability require corrective action.'}</Callout></div> : null}

      <div className="grid g6 mb14">
        <Kpi label="Approved capacity" value={c.capacity} />
        <Kpi label="Students" value={c.students} tone="g" link={'#/candidates?centre=' + c.id} />
        <Kpi label="Active batches" value={c.activeBatches} tone="b" link={'#/batches?centre=' + c.id} />
        <Kpi label="Attendance" value={c.attendance + '%'} tone={c.attendance >= 75 ? 'g' : 'a'} pct={c.attendance} progTone={c.attendance >= 75 ? 'g' : 'a'} />
        <Kpi label="Completed" value={k.completed} tone="g" />
        <Kpi label="Certified" value={k.certified} tone="v" link={'#/certification?centre=' + c.id} />
      </div>

      <div className="grid g-2-1 mb14">
        <Card title="Centre performance scorecard" sub={'Overall ' + c.score + '/100'} action={<LinkButton to="#/qa" className="btn sm">QA framework</LinkButton>}>
          <div className="f gp14 ac wrap">
            <Ring value={c.score} opts={{ size: 128, label: String(c.score), sub: 'of 100' }} />
            <div className="flex1" style={{ minWidth: 250 }}>
              {perf.map(([l, v]) => (
                <div className="mb6" key={l}>
                  <div className="f jb fs12"><span>{l}</span><b>{Math.round(v)}%</b></div>
                  <div className="prog sm"><i className={v >= 80 ? 'g' : v >= 65 ? 'a' : 'r'} style={{ width: Math.min(100, v) + '%' }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="disclaim mt10">Composite score against the configurable 100-point centre evaluation framework.</div>
        </Card>
        <Card title="Centre profile & contact" footer={<>
          <Can action="manageCentre"><button type="button" className="btn sm" onClick={demoToast}>Edit centre</button></Can>
          <LinkButton to="#/documents" className="btn sm ghost">Centre documents</LinkButton>
        </>}>
          <KvList pairs={[
            ['Centre ID', c.id], ['Centre manager', c.manager], ['Mobile', c.managerPhone], ['Email', c.email],
            ['District', d.name], ['Taluka', c.taluka], ['Mode', c.mode === 'ONLINE' ? 'Online (central)' : 'Offline'],
            ['Approved on', dateFmt(c.approvedOn)], ['Status', titleCase(c.status)],
          ]} />
        </Card>
      </div>

      <div className="grid g-1-2 mb14">
        <Card title="Infrastructure status" sub="Verified during onboarding">
          <KvList pairs={[
            ['Computer systems', String(c.infra.computers)], ['Classrooms', String(c.infra.classrooms)],
            ['Internet', c.infra.internet], ['Power backup', c.infra.power],
            ['Biometric / digital attendance', c.infra.biometric ? 'Installed' : 'Not installed'],
            ['Trainers available', String(trainers.length)],
          ]} />
          {c.infra.power === 'None' ? <div className="mt10"><Callout tone="warn">No power backup recorded — flagged for infrastructure verification.</Callout></div> : null}
        </Card>
        <Card title="Location" sub={'Schematic position — ' + d.name}>
          <MarkerMap
            markers={[{ districtId: c.districtId, title: c.name, sub: c.taluka, badge: String(c.activeBatches), link: '#/centres/' + c.id, color: '#C8651C' }]}
            opts={{ height: 300, legend: [{ c: '#C8651C', l: c.name }] }}
          />
        </Card>
      </div>

      <div className="grid g2 mb14">
        <Card title="Batches at this centre" flush footer={<LinkButton to={'#/batches?centre=' + c.id} className="btn sm">All batches</LinkButton>}>
          {batches.length ? (
            <div className="list">
              {batches.map((b) => (
                <div key={b.id} className="list-row" onClick={() => go('#/batches/' + b.id)}>
                  <div className="lr-main"><b className="mono">{b.id}</b><span>{S.course(b.courseId).name} · {dateFmt(b.start)}</span></div>
                  <div className="tr"><b className="fs13">{b.students}/{b.seats}</b><div className="fs11 muted">students</div></div>
                  <GenBadge status={b.status} />
                </div>
              ))}
            </div>
          ) : <EmptyState title="No batches" msg="No batches allocated yet." />}
        </Card>
        <Card title="Trainers" flush footer={<LinkButton to="#/trainers" className="btn sm">Trainer management</LinkButton>}>
          {trainers.length ? (
            <div className="list">
              {trainers.map((t) => (
                <div key={t.id} className="list-row" onClick={() => go('#/trainers/' + t.id)}>
                  <Avatar name={t.name} />
                  <div className="lr-main"><b>{t.name}</b><span>{t.specialization} · {t.experience} yrs</span></div>
                  <GenBadge status={t.availability} />
                </div>
              ))}
            </div>
          ) : <EmptyState title="No trainers" msg="No trainers mapped to this centre." />}
        </Card>
      </div>

      <div className="card">
        <div className="card-h"><h3>Students at this centre</h3></div>
        <DataTable key={c.id} rows={S.byCentre(c.id)} columns={stuColumns} pageSize={10} exportName="Centre_Students" search={['id', 'name']} rowLink={(x) => '#/candidates/' + x.id} />
      </div>
      <DemoNote />
      {inspecting && <InspectionDrawer centre={c} onClose={() => setInspecting(false)} />}
    </div>
  );
}

function InspectionDrawer({ centre: c, onClose }: { centre: Centre; onClose: () => void }) {
  return (
    <Drawer title={'Inspection — ' + c.name} size="wide" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn primary" onClick={() => { onClose(); AS.ui.toast('Inspection recorded (demo) — see Quality Assurance.', 'ok'); }}>Submit inspection</button>
    </>}>
      <div className="fld mb10"><label>Inspection level</label><select className="inp"><option>Level 1 — Centre daily self-check</option><option>Level 2 — Field weekly (coordinator)</option><option>Level 3 — Central QA monthly</option></select></div>
      <div className="fld mb14"><label>Inspection type</label><select className="inp"><option>Pre-batch</option><option>During first batch</option><option>Random / surprise</option><option>Pre-closure</option></select></div>
      <b className="fs13">Scorecard</b>
      <div className="mt8">
        {Object.keys(c.scorecard).map((kk) => {
          const maxv = SCORE_MAX[kk] || 10;
          return (
            <div className="f jb ac gp10 mb6" key={kk}>
              <span className="fs12 flex1">{kk}</span>
              <input className="inp sm" style={{ width: 70 }} type="number" defaultValue={c.scorecard[kk]} max={maxv} />
              <span className="fs11 muted">/ {maxv}</span>
            </div>
          );
        })}
      </div>
      <div className="fld mt10"><label>Observations</label><textarea className="inp" rows={3} placeholder="Inspector remarks" /></div>
    </Drawer>
  );
}
