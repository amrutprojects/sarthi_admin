import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, KvList, FilterBar, LinkButton, Callout, DemoNote, StatusBadge, ModeTag, AttendanceCell, Dash, districtOptions, modeOptions } from '../../../components/ui';
import { Stacked, Donut, HBar, VBar } from '../../../components/charts';
import { Modal } from '../../../components/ui/Overlay';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/outcomeService';
import type { Candidate } from '../../../types/domain';
import { Can } from '../../auth/components/Can';

const QUERY_KEYS: string[] = ['district', 'centre', 'mode', 'batch'];

const columns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name' },
  { k: 'districtId', l: 'District', exportVal: (x) => S.districtName(x.districtId), render: (x) => S.districtName(x.districtId) },
  { k: 'centreId', l: 'Centre / unit', exportVal: (x) => S.centreName(x.centreId), render: (x) => S.centreName(x.centreId) },
  { k: 'batchId', l: 'Batch', render: (x) => <span className="mono">{x.batchId || '—'}</span> },
  { k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> },
  { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (x) => x.attendance + '%', render: (x) => <AttendanceCell value={x.attendance} /> },
  { k: 'theory', l: 'Theory /60', align: 'right', sortVal: (x) => x.score || 0, exportVal: (x) => (x.score == null ? '—' : Math.round(x.score * 0.6)), render: (x) => (x.score == null ? '—' : Math.round(x.score * 0.6)) },
  { k: 'practical', l: 'Practical /40', align: 'right', sortVal: (x) => x.score || 0, exportVal: (x) => (x.score == null ? '—' : Math.round(x.score * 0.4)), render: (x) => (x.score == null ? '—' : Math.round(x.score * 0.4)) },
  { k: 'score', l: 'Total', align: 'right', render: (x) => (x.score == null ? <Dash /> : <b style={{ color: x.score >= 50 ? 'var(--green)' : 'var(--red)' }}>{x.score}</b>) },
  { k: 'status', l: 'Result', exportVal: (x) => AS.db.STATUS_MAP[x.status].l, render: (x) => <StatusBadge status={x.status} /> },
];

export default function AssessmentsPage() {
  useLegacyTick();
  const { search } = useLocation();
  const [f, setF] = usePersistentState('assess', S.DEFAULT_ASSESS);
  const [scheduling, setScheduling] = useState(false);
  useEffect(() => { document.title = 'Assessments — AMRUT × SUMAGO Admin'; }, []);
  useEffect(() => {
    const q = new URLSearchParams(search);
    const next: Record<string, string> = {};
    QUERY_KEYS.forEach((k) => { const v = q.get(k); if (v) next[k] = v; });
    if (Object.keys(next).length) setF((x) => ({ ...x, ...next }));
  }, [search, setF]);

  const cfg = S.config();
  const rows = S.assessRows(f);
  const eligible = S.candidates().filter((c) => S.isCompleted(c) && c.attendance >= cfg.minAttendancePct);
  const pending = rows.filter((c) => c.status === 'ASSESSMENT_PENDING');
  const attempted = rows.filter(S.isAssessed);
  const passed = rows.filter(S.isPassed);
  const failed = rows.filter((c) => c.status === 'FAILED');
  const rate = attempted.length ? Math.round(passed.length / attempted.length * 100) : 0;
  const avg = S.avgScore(attempted);
  const band = (lo: number, hi: number) => rows.filter((c) => c.score != null && c.score >= lo && c.score < hi).length;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Assessments' }]}
        title="Assessment Dashboard"
        sub={'Theory and practical assessment tracking. Pass mark ' + cfg.passMarkPct + '% · minimum attendance ' + cfg.minAttendancePct + '% for eligibility (both configurable).'}
        actions={<>
          <Can action="scheduleAssessment"><button type="button" className="btn" onClick={() => setScheduling(true)}><Icon name="calendar" />Schedule assessment</button></Can>
          <LinkButton to="#/certification" icon="award" className="btn primary">Certification</LinkButton>
        </>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Eligible for assessment" value={eligible.length} tone="b" />
        <Kpi label="Scheduled / pending" value={pending.length} tone="a" link="#/candidates?status=ASSESSMENT_PENDING" />
        <Kpi label="Attempted" value={attempted.length} tone="b" link="#/candidates?bucket=assessed" />
        <Kpi label="Passed" value={passed.length} tone="g" link="#/candidates?bucket=passed" />
        <Kpi label="Failed" value={failed.length} tone="r" link="#/candidates?bucket=failed" />
        <Kpi label="Pass rate" value={attempted.length ? rate + '%' : '—'} tone="g" pct={rate} progTone="g" />
      </div>
      <FilterBar
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'centre', l: 'Centre', options: AS.ui.centreOptions() },
          { k: 'batch', l: 'Batch', options: AS.ui.batchOptions() },
          { k: 'mode', l: 'Mode', options: modeOptions() },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(S.DEFAULT_ASSESS)}
      />
      <div className="grid g-2-1 mb14">
        <Card title="Theory vs practical performance" sub="Separate theory and practical tracking">
          <Stacked
            labels={['Theory (60)', 'Practical (40)']}
            series={[
              { l: 'Average scored', v: [Math.round(avg * 0.6), Math.round(avg * 0.4)], c: '#1E7A46' },
              { l: 'Remaining', v: [60 - Math.round(avg * 0.6), 40 - Math.round(avg * 0.4)], c: '#EFE2D2' },
            ]}
            opts={{ height: 210 }}
          />
          <div className="mt14">
            <KvList pairs={[
              ['Theory component', '60 marks · MCQ based (LMS / offline)'], ['Practical component', '40 marks · lab or project evaluation'],
              ['Pass mark', cfg.passMarkPct + '% aggregate'], ['Re-attempt', 'One re-attempt permitted (configurable)'],
            ]} />
          </div>
        </Card>
        <Card title="Outcome split">
          <Donut
            items={[
              { l: 'Passed', v: passed.length, c: '#1E7A46', link: '#/candidates?bucket=passed' },
              { l: 'Failed', v: failed.length, c: '#B3271E', link: '#/candidates?bucket=failed' },
              { l: 'Pending', v: pending.length, c: '#C98A1E', link: '#/candidates?status=ASSESSMENT_PENDING' },
            ]}
            opts={{ centerValue: rows.length, centerLabel: 'Completed training', size: 176, click: true }}
          />
        </Card>
      </div>
      <div className="grid g3 mb14">
        <Card title="District-wise pass rate"><HBar items={S.passRateBy('districtId')} opts={{ max: 100 }} /></Card>
        <Card title="Centre-wise pass rate"><HBar items={S.passRateBy('centreId')} opts={{ max: 100 }} /></Card>
        <Card title="Course-wise performance"><HBar items={S.passRateBy('courseId')} opts={{ max: 100 }} /></Card>
      </div>
      <div className="card mb14">
        <div className="card-h"><h3>Score distribution</h3></div>
        <div className="card-b">
          <VBar items={[
            { l: '0–25', v: band(0, 25), c: '#B3271E' }, { l: '25–40', v: band(25, 40), c: '#CB4034' },
            { l: '40–50', v: band(40, 50), c: '#C98A1E' }, { l: '50–65', v: band(50, 65), c: '#E2A166' },
            { l: '65–80', v: band(65, 80), c: '#C8651C' }, { l: '80–100', v: band(80, Infinity), c: '#1E7A46' },
          ]} opts={{ height: 220 }} />
        </div>
      </div>
      <div className="card">
        <div className="card-h"><h3>Assessment register</h3></div>
        <DataTable key={JSON.stringify(f)} rows={rows} columns={columns} pageSize={12} exportName="Assessment_Register" search={['id', 'name']} rowLink={(x) => '#/candidates/' + x.id + '?tab=assessments'} />
      </div>
      <DemoNote />
      {scheduling && (
        <Modal title="Schedule assessment" onClose={() => setScheduling(false)} footer={<>
          <button type="button" className="btn" onClick={() => setScheduling(false)}>Cancel</button>
          <button type="button" className="btn primary" onClick={() => { setScheduling(false); AS.ui.toast('Demo action recorded — no data was persisted.', 'ok'); }}>Schedule &amp; notify</button>
        </>}>
          <div className="grid g2">
            <div className="fld"><label>Batch</label><select className="inp">{S.batches().map((b) => <option key={b.id}>{b.id}</option>)}</select></div>
            <div className="fld"><label>Assessment date</label><input className="inp" type="date" defaultValue="2026-09-20" /></div>
            <div className="fld"><label>Mode</label><select className="inp"><option>Theory (MCQ) + Practical</option><option>Theory only</option><option>Practical only</option></select></div>
            <div className="fld"><label>Assessor</label><select className="inp"><option>External assessor</option><option>Internal (centre)</option></select></div>
          </div>
          <div className="mt14"><Callout tone="info">{'Candidates below the ' + cfg.minAttendancePct + '% attendance minimum are automatically excluded from the eligible list.'}</Callout></div>
        </Modal>
      )}
    </div>
  );
}
