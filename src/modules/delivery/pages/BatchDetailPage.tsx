import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AS from '../../../legacy';
import {
  PageHead, Card, Kpi, KvList, LinkButton, EmptyState, DemoNote, Badge, GenBadge, StatusBadge, ModeTag, ProgRow, AttendanceCell,
  LivePill, ListRows, Callout, Dash, dateFmt, titleCase, useGo,
} from '../../../components/ui';
import { Donut, Calendar, HBar, VBar, Ring } from '../../../components/charts';
import { Drawer } from '../../../components/ui/Overlay';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import Avatar from '../../../components/ui/Avatar';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/deliveryService';
import type { Candidate } from '../../../types/domain';
import type { Crumb } from '../../../components/ui';
import type { Batch } from '../../../types/domain';
import { Can } from '../../auth';

/* Candidates whose assessment score falls in [lo, hi); unassessed candidates are excluded. */
const scoreBand = (rows: Candidate[], lo: number, hi: number) => rows.filter((x) => x.score != null && x.score >= lo && x.score < hi).length;

const TABS: [key: string, label: string][] = [['students', 'Students'], ['schedule', 'Schedule'], ['attendance', 'Attendance'], ['curriculum', 'Curriculum'],
  ['assignments', 'Assignments'], ['assessments', 'Assessments'], ['feedback', 'Feedback'], ['documents', 'Documents']];
const WEEKS = ['Computer fundamentals', 'Operating systems', 'Word processing', 'Spreadsheets I', 'Spreadsheets II', 'Internet & email',
  'Digital payments & e-services', 'Practical lab I', 'Practical lab II', 'Entrepreneurship module', 'Revision', 'Assessment preparation'];
const demoToast = () => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok');

const stuColumns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name', render: (x) => <b>{x.name}</b> },
  { k: 'districtId', l: 'District', exportVal: (x) => S.districtName(x.districtId), render: (x) => S.districtName(x.districtId) },
  { k: 'status', l: 'Status', render: (x) => <StatusBadge status={x.status} /> },
  { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (x) => x.attendance + '%', render: (x) => <AttendanceCell value={x.attendance} /> },
  { k: 'progress', l: 'Progress', align: 'right', exportVal: (x) => x.progress + '%', render: (x) => <ProgRow pct={x.progress} /> },
  { k: 'score', l: 'Assessment', align: 'right', render: (x) => (x.score == null ? '—' : x.score) },
  { k: 'risks', l: 'Risk', sortVal: (x) => x.risks.length, exportVal: (x) => x.risks.map((r) => r.l).join('; '), render: (x) => (x.risks.length ? <Badge tone={x.risks[0].tone}>{x.risks.length} risk</Badge> : <Dash />) },
];

export default function BatchDetailPage() {
  useLegacyTick();
  const go = useGo();
  const { id = '' } = useParams();
  const { search } = useLocation();
  const [marking, setMarking] = useState(false);
  useEffect(() => { document.title = 'Batch — AMRUT × SUMAGO Admin'; }, []);

  const b = S.batch(id);
  if (!b) return <div className="page"><EmptyState title="Batch not found" msg={'No batch with ID ' + id}><LinkButton to="#/batches" className="btn primary">All batches</LinkButton></EmptyState></div>;

  const tab = new URLSearchParams(search).get('tab') || 'students';
  const centre = S.centre(b.centreId);
  const trainer = S.trainer(b.trainerId);
  const d = S.district(b.districtId);
  const rows = S.byBatch(b.id);
  const k = b._k;
  const session = S.liveSessionFor(b.id);
  const present = Math.round(b.students * b.attendance / 100);

  return (
    <div className="page">
      <PageHead
        crumbs={([{ l: 'Dashboard', link: '#/dashboard' }] as Crumb[])
          .concat(d ? [{ l: 'Districts', link: '#/districts' }, { l: d.name, link: '#/districts/' + d.code }] : [{ l: 'Online training', link: '#/online' }])
          .concat([{ l: centre.name, link: '#/centres/' + centre.id }, { l: b.id }])}
        title={b.id}
        badge={<><ModeTag mode={b.mode} /><GenBadge status={b.status} />{session && session.status === 'LIVE' ? <LivePill>LIVE NOW</LivePill> : null}</>}
        sub={<>{S.courseName(b.courseId)} · {centre.name} · Trainer <a onClick={() => go('#/trainers/' + trainer.id)}>{trainer.name}</a></>}
        actions={<>
          <Can action="markAttendance"><button type="button" className="btn" onClick={() => setMarking(true)}><Icon name="check" />Mark attendance</button></Can>
          <LinkButton to={'#/attendance?batch=' + b.id}>Attendance history</LinkButton>
          <Can action="closeSession"><button type="button" className="btn primary" onClick={demoToast}>Close session</button></Can>
        </>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Capacity" value={b.seats} sub="Configurable batch size" />
        <Kpi label="Enrolled" value={b.students} tone="g" pct={Math.round(b.students / b.seats * 100)} progTone="g" />
        <Kpi label="Present today" value={present} tone="b" sub={(b.students - present) + ' absent'} />
        <Kpi label="Attendance" value={b.attendance + '%'} tone={b.attendance >= 75 ? 'g' : 'a'} />
        <Kpi label="Curriculum" value={b.progress + '%'} tone="s" pct={b.progress} progTone="s" sub={b.sessionsDone + '/' + b.sessionsPlanned + ' sessions'} />
        <Kpi label="Certified" value={k.certified} tone="v" link={'#/certification?batch=' + b.id} />
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Batch information">
          <div className="grid g2" style={{ gap: '0 26px' }}>
            <div><KvList pairs={[['Batch ID', b.id], ['Training mode', b.mode === 'ONLINE' ? 'Online — centrally managed' : 'Offline — centre managed'],
              ['Centre / unit', centre.name], ['District', d ? d.name : 'All districts (online)'], ['Course', S.courseName(b.courseId)]]} /></div>
            <div><KvList pairs={[['Trainer', trainer.name], ['Start date', dateFmt(b.start)], ['Expected completion', dateFmt(b.end)],
              ['Sessions', b.sessionsDone + ' of ' + b.sessionsPlanned], ['Status', titleCase(b.status)]]} /></div>
          </div>
          <div className="mt14"><b className="fs12">Course progress</b><ProgRow pct={b.progress} tone={b.progress >= 75 ? 'g' : 's'} /></div>
        </Card>
        <Card title="Outcome snapshot">
          <Donut
            items={[
              { l: 'In training', v: k.trainingActive, c: '#C8651C' },
              { l: 'Awaiting assessment', v: rows.filter((x) => x.status === 'ASSESSMENT_PENDING').length, c: '#C98A1E' },
              { l: 'Certified', v: k.certified, c: '#1E7A46' },
              { l: 'Failed', v: k.failed, c: '#B3271E' },
            ].filter((x) => x.v)}
            opts={{ centerValue: b.students, centerLabel: 'Students', size: 168 }}
          />
        </Card>
      </div>
      <div className="tabs">
        {TABS.map(([key, l]) => <button type="button" key={key} className={tab === key ? 'on' : ''} onClick={() => go('#/batches/' + b.id + '?tab=' + key)}>{l}</button>)}
      </div>
      <BatchTab tab={tab} b={b} rows={rows} onMark={() => setMarking(true)} />
      <DemoNote />
      {marking && <AttendanceDrawer batch={b} onClose={() => setMarking(false)} />}
    </div>
  );
}

function BatchTab({ tab, b, rows, onMark }: { tab: string; b: Batch; rows: Candidate[]; onMark: () => void }) {
  const cfg = S.config();
  if (tab === 'schedule') {
    const elapsed = S.daysBetween(b.start, cfg.asOf);
    const items = WEEKS.map((w, i) => ({
      title: 'Week ' + (i + 1) + ' — ' + w,
      sub: dateFmt(S.addDays(b.start, i * 7)) + ' · 5 sessions',
      right: i * 7 < elapsed ? <Badge tone="green">Delivered</Badge> : <Badge tone="grey">Planned</Badge>,
    }));
    return <Card title="Training schedule" flush sub={cfg.trainingWeeks + '-week programme'}><ListRows items={items} /></Card>;
  }
  if (tab === 'attendance') {
    const days = [];
    for (let j = 0; j < 28; j++) {
      const dd = S.addDays('2026-08-11', j);
      const dt = new Date(dd + 'T00:00:00');
      days.push({ d: dt.getDate(), v: dt.getDay() === 0 ? 0 : Math.max(40, Math.min(100, b.attendance + ((j * 13) % 18) - 9)), full: dateFmt(dd) });
    }
    return (
      <div className="grid g-1-2">
        <Card title="Attendance summary" footer={<Can action="markAttendance"><button type="button" className="btn sm primary" onClick={onMark}>Mark today&apos;s attendance</button></Can>}>
          <div className="grid g2 mb14">
            <Kpi label="Batch average" value={b.attendance + '%'} tone={b.attendance >= 75 ? 'g' : 'a'} />
            <Kpi label="Below minimum" value={rows.filter((x) => x.attendance > 0 && x.attendance < 75).length} tone="r" link={'#/candidates?batch=' + b.id + '&bucket=lowatt'} />
          </div>
          <KvList pairs={[['Capture', b.mode === 'ONLINE' ? 'Session join + LMS activity' : 'Digital attendance at centre'],
            ['Minimum required', cfg.minAttendancePct + '%'], ['Sessions delivered', String(b.sessionsDone)]]} />
        </Card>
        <Card title="Batch attendance calendar" sub="Batch-level daily attendance percentage"><Calendar days={days} /></Card>
      </div>
    );
  }
  if (tab === 'curriculum') {
    const items = [
      { l: 'Module 1 — Computer fundamentals', v: 100 }, { l: 'Module 2 — Operating systems', v: Math.min(100, b.progress + 25) },
      { l: 'Module 3 — Office applications', v: b.progress }, { l: 'Module 4 — Internet & e-services', v: Math.max(0, b.progress - 20) },
      { l: 'Module 5 — Practical / project', v: Math.max(0, b.progress - 38) }, { l: 'Module 6 — Entrepreneurship', v: Math.max(0, b.progress - 55) },
    ].map((x) => ({ l: x.l, v: x.v, display: x.v + '%', c: x.v >= 75 ? '#1E7A46' : '#C8651C' }));
    return <Card title="Curriculum coverage" sub={S.courseName(b.courseId) + ' · ' + (S.course(b.courseId)?.hours ?? 0) + ' hours'}><HBar items={items} opts={{ max: 100 }} /></Card>;
  }
  if (tab === 'assignments') {
    const items = [1, 2, 3, 4, 5].map((i) => {
      const sub = Math.round(b.students * Math.max(0.2, (b.progress - (i - 1) * 18) / 100));
      return { title: 'Assignment ' + i, sub: sub + ' of ' + b.students + ' submitted', right: <ProgRow pct={Math.round(sub / b.students * 100)} /> };
    });
    return <Card title="Assignments" flush><ListRows items={items} /></Card>;
  }
  if (tab === 'assessments') {
    const set = S.SETS();
    const assessed = rows.filter((x) => S.inSet(set.ASSESSED, x.status));
    const passed = rows.filter((x) => S.inSet(set.PASSED, x.status));
    return (
      <div className="grid g2">
        <Card title="Assessment outcome" footer={<LinkButton to="#/assessments" className="btn sm">Assessment dashboard</LinkButton>}>
          <div className="grid g2 mb14">
            <Kpi label="Assessed" value={assessed.length} tone="b" />
            <Kpi label="Pass rate" value={assessed.length ? Math.round(passed.length / assessed.length * 100) + '%' : '—'} tone="g" />
          </div>
          <KvList pairs={[
            ['Eligible for assessment', String(rows.filter((x) => x.attendance >= 75 && S.inSet(set.COMPLETED, x.status)).length)],
            ['Passed', String(passed.length)], ['Failed', String(rows.filter((x) => x.status === 'FAILED').length)],
            ['Pending', String(rows.filter((x) => x.status === 'ASSESSMENT_PENDING').length)],
          ]} />
        </Card>
        <Card title="Score distribution">
          <VBar items={[
            { l: '0-25', v: scoreBand(rows, 0, 25), c: '#B3271E' },
            { l: '25-50', v: scoreBand(rows, 25, 50), c: '#C98A1E' },
            { l: '50-75', v: scoreBand(rows, 50, 75), c: '#C8651C' },
            { l: '75-100', v: scoreBand(rows, 75, Infinity), c: '#1E7A46' },
          ]} opts={{ height: 200 }} />
        </Card>
      </div>
    );
  }
  if (tab === 'feedback') {
    const t = S.trainer(b.trainerId);
    const items = [
      { l: 'Trainer effectiveness', v: Math.round(t.feedback / 5 * 100) }, { l: 'Content usefulness', v: 84 },
      { l: 'Infrastructure / platform', v: b.mode === 'ONLINE' ? 88 : S.centre(b.centreId).score }, { l: 'Practical exposure', v: 79 },
      { l: 'Overall satisfaction', v: 86 },
    ].map((x) => ({ l: x.l, v: x.v, display: x.v + '%', c: x.v >= 80 ? '#1E7A46' : '#C98A1E' }));
    return (
      <Card title="Student feedback" sub="Collected at mid-point and completion">
        <div className="f gp14 ac wrap">
          <Ring value={Math.round(t.feedback / 5 * 100)} opts={{ size: 118, label: t.feedback.toFixed(1), sub: 'of 5.0' }} />
          <div className="flex1"><HBar items={items} opts={{ max: 100 }} /></div>
        </div>
      </Card>
    );
  }
  if (tab === 'documents') {
    const done = b.status === 'COMPLETED';
    return (
      <Card title="Batch documents" flush footer={<LinkButton to="#/documents" className="btn sm">Document repository</LinkButton>}>
        <ListRows items={[
          { title: 'Batch commencement report', sub: 'Uploaded ' + dateFmt(b.start), right: <Badge tone="green">Verified</Badge>, icon: 'doc' },
          { title: 'Enrollment list (signed)', sub: b.students + ' students', right: <Badge tone="green">Verified</Badge>, icon: 'doc' },
          { title: 'Attendance registers', sub: b.sessionsDone + ' sessions', right: <Badge tone="green">Verified</Badge>, icon: 'doc' },
          { title: 'Assessment result sheet', sub: done ? 'Uploaded' : 'Pending batch completion', right: done ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>, icon: 'doc' },
          { title: 'Photographs / geo-tagged evidence', sub: '12 files', right: <Badge tone="amber">Pending</Badge>, icon: 'doc' },
        ]} />
      </Card>
    );
  }
  return (
    <div className="card">
      <div className="card-h">
        <h3>Students in this batch</h3>
        <span className="sub">{b.students} of {b.seats} seats</span>
        <LinkButton to={'#/candidates?batch=' + b.id} className="btn sm">Open in candidate master</LinkButton>
      </div>
      <DataTable key={b.id} rows={rows} columns={stuColumns} pageSize={12} exportName="Batch_Students" search={['id', 'name']} rowLink={(x) => '#/candidates/' + x.id} />
    </div>
  );
}

function AttendanceDrawer({ batch: b, onClose }: { batch: Batch; onClose: () => void }) {
  const list = S.byBatch(b.id).slice(0, 14);
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(list.map((c) => [c.id, 'P'])));
  const setAll = (v: string) => setMarks(Object.fromEntries(list.map((c) => [c.id, v])));
  return (
    <Drawer title={'Mark attendance — ' + b.id} size="wide" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <Can action="markAttendance"><button type="button" className="btn primary" onClick={() => { onClose(); AS.ui.toast('Attendance saved for today (demo).', 'ok'); }}>Save attendance</button></Can>
    </>}>
      <KvList pairs={[['Date', dateFmt(S.config().asOf)], ['Session', 'Session ' + (b.sessionsDone + 1) + ' of ' + b.sessionsPlanned],
        ['Mode', b.mode === 'ONLINE' ? 'Online — session join captured automatically' : 'Offline — digital attendance at centre'],
        ['Trainer', S.trainer(b.trainerId).name]]} />
      <div className="f gp6 mt14 mb10">
        <button type="button" className="btn sm" onClick={() => setAll('P')}>Mark all present</button>
        <button type="button" className="btn sm" onClick={() => setAll('A')}>Mark all absent</button>
      </div>
      <div className="list">
        {list.map((c) => (
          <div key={c.id} className="list-row norow">
            <Avatar name={c.name} />
            <div className="lr-main"><b>{c.name}</b><span className="mono">{c.id}</span></div>
            <div className="f gp4">
              {['P', 'A', 'L', 'E'].map((s) => (
                <button type="button" key={s} className={'chip att' + (marks[c.id] === s ? ' on' : '')} onClick={() => setMarks((m) => ({ ...m, [c.id]: s }))}>{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hint mt10">P = Present · A = Absent · L = Late · E = Excused. Showing first 14 of {b.students} students.</div>
      <div className="mt10"><Callout tone="info" title="Digital attendance is primary">Paper/manual registers are recorded separately at offline centres for audit purposes only.</Callout></div>
    </Drawer>
  );
}
