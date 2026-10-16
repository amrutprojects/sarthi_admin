import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AS from '../../legacy';
import { PageHead, Card, Kpi, KvList, FilterBar, LinkButton, DemoNote, ModeTag, AttendanceCell, districtOptions, modeOptions, dateFmt } from '../../components/ui';
import { LineChart, Calendar, VBar, HBar, Donut } from '../../components/charts';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { useLegacyTick } from '../../utils/legacyBus';
import usePersistentState from '../../hooks/usePersistentState';
import * as S from '../../services/trainingService';
import { BulkMessageDrawer, MessageDrawer } from '../candidates/CandidateDialogs';
import type { Candidate } from '../../types/domain';
import { Can } from '../../auth/Can';

const QUERY_KEYS: string[] = ['district', 'centre', 'batch', 'mode'];

export default function AttendancePage() {
  useLegacyTick();
  const { search } = useLocation();
  const [f, setF] = usePersistentState('att', S.DEFAULT_ATT());
  const [bulk, setBulk] = useState(false);
  const [contact, setContact] = useState<Candidate | null>(null);
  useEffect(() => { document.title = 'Attendance — AMRUT × SUMAGO Admin'; }, []);
  useEffect(() => {
    const q = new URLSearchParams(search);
    const next: Record<string, string> = {};
    QUERY_KEYS.forEach((k) => { const v = q.get(k); if (v) next[k] = v; });
    if (Object.keys(next).length) setF((x) => ({ ...x, ...next }));
  }, [search, setF]);

  const rows = S.attendanceRows(f);
  const avg = rows.length ? Math.round(rows.reduce((a, c) => a + c.attendance, 0) / rows.length) : 0;
  const low = rows.filter((c) => c.attendance < 75);
  const veryLow = rows.filter((c) => c.attendance < 60);
  const trend = S.attendanceTrend();
  const days = trend.slice(-28).map((a) => ({ d: new Date(a.d + 'T00:00:00').getDate(), v: a.v, full: dateFmt(a.d) }));
  const live = S.liveSessions();
  const today = Math.round(live.reduce((a, s) => a + s.present, 0) / Math.max(1, live.reduce((a, s) => a + s.expected, 0)) * 100);
  const cfg = S.config();

  const columns: Column<Candidate>[] = [
    { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
    { k: 'name', l: 'Name' },
    { k: 'districtId', l: 'District', exportVal: (x) => S.districtName(x.districtId), render: (x) => S.districtName(x.districtId) },
    { k: 'centreId', l: 'Centre', exportVal: (x) => (x.centreId ? S.centre(x.centreId).name : '—'), render: (x) => (x.centreId ? S.centre(x.centreId).name : '—') },
    { k: 'batchId', l: 'Batch', render: (x) => <span className="mono">{x.batchId || '—'}</span> },
    { k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> },
    { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (x) => x.attendance + '%', render: (x) => <AttendanceCell value={x.attendance} /> },
    { k: 'act', l: '', sortable: false, exportVal: () => '', render: (x) => <Can action="messageCandidate"><button type="button" className="btn xs" onClick={(e) => { e.stopPropagation(); setContact(x); }}>Contact</button></Can> },
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Attendance' }]}
        title="Attendance Dashboard"
        sub="Digital attendance is the primary record. Paper / manual registers are recorded separately at offline centres for audit."
        actions={<>
          <LinkButton to="#/live">Mark today</LinkButton>
          <LinkButton to="#/reports/attendance" className="btn primary">Attendance report</LinkButton>
        </>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Today's attendance" value={today + '%'} tone="g" />
        <Kpi label="Average attendance" value={avg + '%'} tone={avg >= 75 ? 'g' : 'a'} pct={avg} progTone={avg >= 75 ? 'g' : 'a'} />
        <Kpi label="Students tracked" value={rows.length} tone="b" />
        <Kpi label="Below 75% minimum" value={low.length} tone="a" link="#/candidates?bucket=lowatt" />
        <Kpi label="Below 60% (critical)" value={veryLow.length} tone="r" link="#/at-risk" />
        <Kpi label="Sessions today" value={live.length} tone="" link="#/live" />
      </div>
      <FilterBar
        fields={[
          { k: 'date', l: 'Date', type: 'date' },
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'centre', l: 'Centre', options: AS.ui.centreOptions() },
          { k: 'batch', l: 'Batch', options: AS.ui.batchOptions() },
          { k: 'mode', l: 'Mode', options: modeOptions() },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(S.DEFAULT_ATT())}
      />
      <div className="grid g-2-1 mb14">
        <Card title="Attendance trend (28 days)" sub="Zero = no scheduled sessions">
          <LineChart series={[{ l: 'Attendance %', v: trend.map((a) => a.v), c: '#1E7A46' }]} labels={trend.map((a) => a.d.slice(8))} opts={{ height: 240, max: 100 }} />
        </Card>
        <Card title="Calendar view" sub="Daily attendance percentage"><Calendar days={days} /></Card>
      </div>
      <div className="grid g3 mb14">
        <Card title="Attendance distribution">
          <VBar items={[
            { l: '<60%', v: rows.filter((c) => c.attendance < 60).length, c: '#B3271E' },
            { l: '60-75%', v: rows.filter((c) => c.attendance >= 60 && c.attendance < 75).length, c: '#C98A1E' },
            { l: '75-85%', v: rows.filter((c) => c.attendance >= 75 && c.attendance < 85).length, c: '#C8651C' },
            { l: '85-100%', v: rows.filter((c) => c.attendance >= 85).length, c: '#1E7A46' },
          ]} opts={{ height: 210 }} />
        </Card>
        <Card title="By centre">
          <HBar items={S.centres().map((c) => ({ l: c.name.split(' ')[0] + ' — ' + S.districtName(c.districtId), v: c.attendance, display: c.attendance + '%', link: '#/centres/' + c.id, c: c.attendance >= 75 ? '#1E7A46' : '#B3271E' }))} opts={{ max: 100 }} />
        </Card>
        <Card title="By mode & status">
          <div className="mb14">
            <Donut items={[{ l: 'Present', v: 78, c: '#1E7A46' }, { l: 'Absent', v: 14, c: '#B3271E' }, { l: 'Late', v: 5, c: '#C98A1E' }, { l: 'Excused', v: 3, c: '#B3A08D' }]} opts={{ centerValue: '78%', centerLabel: 'Today', size: 156 }} />
          </div>
          <KvList pairs={[
            ['Offline average', S.kpis(S.byMode('OFFLINE'), 800).attendance + '%'],
            ['Online average', S.kpis(S.byMode('ONLINE'), 200).attendance + '%'],
            ['Programme minimum', cfg.minAttendancePct + '%'],
          ]} />
        </Card>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Low attendance students</h3><span className="sub">below the {cfg.minAttendancePct}% minimum</span>
          <Can action="sendCommunication"><button type="button" className="btn sm primary" onClick={() => setBulk(true)}>Send advisory</button></Can>
        </div>
        <DataTable
          rows={S.candidates().filter((c) => c.attendance > 0 && c.attendance < 75)} columns={columns} pageSize={12} exportName="Low_Attendance"
          search={['id', 'name']} defaultSort="attendance" defaultDir="asc" rowLink={(x) => '#/candidates/' + x.id}
        />
      </div>
      <DemoNote />
      {bulk && <BulkMessageDrawer onClose={() => setBulk(false)} />}
      {contact && <MessageDrawer candidate={contact} onClose={() => setContact(null)} />}
    </div>
  );
}
