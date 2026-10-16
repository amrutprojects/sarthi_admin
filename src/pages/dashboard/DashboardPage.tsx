import { useEffect } from 'react';
import {
  PageHead, Card, Kpi, FilterBar, KvList, AlertCard, LinkButton, EmptyState, DemoNote, LivePill,
  districtOptions, modeOptions, fmt, dateFmt, useGo,
} from '../../components/ui';
import { LineChart, Donut, Funnel, HBar, Ring, DistrictMap } from '../../components/charts';
import Icon from '../../components/Icon';
import { useLegacyTick } from '../../utils/legacyBus';
import * as S from '../../services/dashboardService';
import type { DashFilter } from '../../services/dashboardService';
import usePersistentState from '../../hooks/usePersistentState';
import type { Kpis, HealthScore, LiveSession } from '../../types/domain';

const METRICS = [
  { v: 'enrolled', l: 'Enrolled' }, { v: 'applications', l: 'Applications' }, { v: 'active', l: 'Training active' },
  { v: 'completed', l: 'Completed' }, { v: 'certified', l: 'Certified' }, { v: 'attendance', l: 'Attendance %' }, { v: 'achievement', l: 'Achievement %' },
];

/* Filters persist across navigation, as in the original (AS.state.dash). */
function useDashFilter() {
  return usePersistentState<DashFilter>('dash', S.DEFAULT_DASH_FILTER);
}

export default function DashboardPage() {
  useLegacyTick(); // re-render when a legacy drawer (e.g. task status) changes data
  const [f, setF] = useDashFilter();
  useEffect(() => { document.title = 'Dashboard — AMRUT × SUMAGO Admin'; }, []);

  const k = S.dashboardKpis(f);
  const health = S.healthScore();
  const live = S.runningSessions();

  const kpis = [
    { label: 'Total Target', value: k.target, tone: '', sub: 'Configurable programme target', link: '#/settings' },
    { label: 'Applications', value: k.applications, tone: 'b', sub: 'Registrations received', link: '#/candidates' },
    { label: 'Eligible', value: k.eligible, tone: 'b', sub: Math.round(k.eligible / k.applications * 100) + '% of applications', link: '#/candidates?bucket=eligible' },
    { label: 'Enrolled', value: k.enrolled, tone: 'g', sub: k.achievementPct + '% of target', pct: k.achievementPct, progTone: 'g', link: '#/candidates?bucket=enrolled' },
    { label: 'Training Active', value: k.trainingActive, tone: 's', sub: k.offlineActive + ' offline · ' + k.onlineActive + ' online', link: '#/candidates?bucket=active' },
    { label: 'Completed', value: k.completed, tone: 'g', sub: k.completionPct + '% completion rate', link: '#/candidates?bucket=completed' },
    { label: 'Assessed', value: k.assessed, tone: 'v', sub: k.passRate + '% pass rate', link: '#/assessments' },
    { label: 'Certified', value: k.certified, tone: 'g', sub: k.certificationPct + '% of enrolled', link: '#/certification' },
  ];

  const m = S.monthly();

  return (
    <div className="page">
      <PageHead
        title="Project Command Centre"
        badge={<span className="demo-pill">DEMO DATA</span>}
        sub={<>Scope: <b>{S.scopeLabel(f)}</b> · As on {dateFmt(S.asOf())} · All KPIs are calculated from the underlying candidate records.</>}
        actions={<>
          <LinkButton to="#/executive" icon="shield">Executive view</LinkButton>
          <LinkButton to="#/today" icon="clock">Today&apos;s operations</LinkButton>
          <LinkButton to="#/reports" icon="download" className="btn primary">Reports &amp; MIS</LinkButton>
        </>}
      />

      <FilterBar
        id="dashFilters"
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'mode', l: 'Training mode', options: modeOptions() },
          { k: 'metric', l: 'Map metric', options: METRICS },
        ]}
        value={f}
        onChange={(key, v) => setF((s) => ({ ...s, [key]: v }))}
        onReset={() => setF(S.DEFAULT_DASH_FILTER)}
      />

      <div className="grid g8 mb14">{kpis.map((x) => <Kpi key={x.label} {...x} />)}</div>

      <div className="grid g-3-2 mb14">
        <Card title="Programme progress against target" sub="System-generated indicator">
          <ProgressBlock k={k} health={health} />
        </Card>
        <Card title="Critical attention" flush footer={<>
          <LinkButton to="#/tasks" className="btn sm">Open tasks &amp; alerts</LinkButton>
          <LinkButton to="#/at-risk" className="btn sm ghost">At-risk engine</LinkButton>
        </>}>
          <CriticalList />
        </Card>
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>District performance map <span className="sub">{S.districts().length} districts · click any district to drill down</span></h3>
          <div className="f gp6">
            <LinkButton to="#/districts" className="btn sm">View all districts</LinkButton>
            <LinkButton to="#/districts?filter=critical" className="btn sm">View critical districts</LinkButton>
            <LinkButton to="#/live" className="btn sm">View live training</LinkButton>
          </div>
        </div>
        <div className="card-b"><DistrictMap metric={f.metric} colorMode="status" height={440} /></div>
      </div>

      <div className="grid g-2-1 mb14">
        <Card title="Enrollment & completion trend" sub="Monthly, current financial year">
          <LineChart
            series={[
              { l: 'Applications', v: m.map((x) => x.applications), c: '#B3A08D' },
              { l: 'Enrolled', v: m.map((x) => x.enrolled), c: '#C8651C' },
              { l: 'Completed', v: m.map((x) => x.completed), c: '#1E7A46' },
              { l: 'Certified', v: m.map((x) => x.certified), c: '#E88C2C' },
            ]}
            labels={S.months()}
            opts={{ height: 250 }}
          />
        </Card>
        <Card title="Training mode split" sub="Two independent modes"><ModeSplit k={k} /></Card>
      </div>

      <div className="grid g-2-1 mb14">
        <Card title="Candidate funnel" sub="Click a stage to open the filtered list" action={<LinkButton to="#/lifecycle" className="btn sm ghost">Full lifecycle</LinkButton>}>
          <Funnel stages={[
            { l: 'Applications', v: k.applications, c: '#B3A08D', link: '#/candidates' },
            { l: 'Eligible', v: k.eligible, c: '#E2A166', link: '#/candidates?bucket=eligible' },
            { l: 'Enrolled', v: k.enrolled, c: '#C8651C', link: '#/candidates?bucket=enrolled' },
            { l: 'Training active', v: k.trainingActive, c: '#7A3A16', link: '#/candidates?bucket=active' },
            { l: 'Completed', v: k.completed, c: '#1E7A46', link: '#/candidates?bucket=completed' },
            { l: 'Assessed', v: k.assessed, c: '#6B3FA0', link: '#/assessments' },
            { l: 'Certified', v: k.certified, c: '#E88C2C', link: '#/certification' },
          ]} />
        </Card>
        <Card title="Attendance trend (28 days)" sub="Zero = no scheduled sessions (Sunday)" action={<LinkButton to="#/attendance" className="btn sm ghost">Attendance module</LinkButton>}>
          <LineChart
            series={[{ l: 'Attendance %', v: S.attendanceTrend().map((a) => a.v), c: '#1E7A46' }]}
            labels={S.attendanceTrend().map((a) => a.d.slice(8))}
            opts={{ height: 250, max: 100 }}
          />
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Live training right now" sub={live.length + ' sessions in progress'} flush footer={<LinkButton to="#/live" className="btn sm">Open live training monitor</LinkButton>}>
          <LiveList live={live} />
        </Card>
        <Card title="Top districts by enrollment" sub="Enrolled vs district target" action={<LinkButton to="#/districts" className="btn sm ghost">All districts</LinkButton>}>
          <HBar items={S.topDistricts()} opts={{ color: '#C8651C' }} />
        </Card>
      </div>
      <DemoNote />
    </div>
  );
}

function ProgressBlock({ k, health }: { k: Kpis; health: HealthScore }) {
  const pct = k.achievementPct;
  const tiles: [string, string, string][] = [
    ['Completion', k.completionPct + '%', 'completed / enrolled'],
    ['Certification', k.certificationPct + '%', 'certified / enrolled'],
    ['Attendance', k.attendance + '%', 'present / applicable'],
  ];
  return (
    <>
      <div className="f gp14 ac wrap">
        <Ring value={health.score} opts={{ label: health.score + '', sub: 'of 100', size: 118 }} />
        <div className="flex1" style={{ minWidth: 230 }}>
          <div className="f jb ac"><b className="fs13">Enrollment vs target</b><b className="fs16">{fmt(k.enrolled)} / {fmt(k.target)}</b></div>
          <div className="prog lg mt8"><i className={pct >= 90 ? 'g' : pct >= 70 ? '' : 'a'} style={{ width: Math.min(100, pct) + '%' }} /></div>
          <div className="f jb fs11 muted mt4"><span>{pct}% achieved</span><span>{fmt(Math.max(0, k.target - k.enrolled))} remaining</span></div>
          <div className="grid g3 mt14" style={{ gap: 8 }}>
            {tiles.map(([l, v, s]) => (
              <div key={l} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 10px' }}>
                <div className="fs11 muted">{l}</div><b className="fs16">{v}</b><div className="fs11 muted">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt14 fs11 muted">
        Programme Health Indicator is system-generated from enrollment, progress, attendance, completion, certification, centre, trainer and district factors. Status: <b>{health.status}</b>.
      </div>
    </>
  );
}

function CriticalList() {
  const go = useGo();
  return S.criticalItems().map((i) => (
    <AlertCard key={i.link} color={i.color} title={i.t} sub={i.s} chevron onClick={() => go(i.link)} />
  ));
}

function ModeSplit({ k }: { k: Kpis }) {
  return (
    <>
      <Donut
        items={[
          { l: 'Offline', v: k.offline, c: '#8A4116', link: '#/offline' },
          { l: 'Online', v: k.online, c: '#1E7A46', link: '#/online' },
        ]}
        opts={{ centerValue: fmt(k.enrolled), centerLabel: 'Enrolled', click: true, size: 176 }}
      />
      <div className="mt14">
        <KvList pairs={[
          ['Offline — training active', String(k.offlineActive)],
          ['Online — training active', String(k.onlineActive)],
          ['Offline centres', String(S.centres().length)],
          ['Online batches', String(S.batches().filter((b) => b.mode === 'ONLINE').length)],
        ]} />
      </div>
      <div className="f gp8 mt10">
        <LinkButton to="#/offline" className="btn sm block">Offline control</LinkButton>
        <LinkButton to="#/online" className="btn sm block">Online control</LinkButton>
      </div>
    </>
  );
}

function LiveList({ live }: { live: LiveSession[] }) {
  const go = useGo();
  if (!live.length) return <EmptyState title="No live sessions" msg="No sessions are currently in progress for this scope." />;
  return (
    <div className="list">
      {live.slice(0, 6).map((s) => (
        <div key={s.id || s.batchId + s.start} className="list-row" onClick={() => go('#/batches/' + s.batchId)}>
          <div className="icon-sq" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}><Icon name="play" /></div>
          <div className="lr-main">
            <b>{s.mode === 'ONLINE' ? 'Online (central)' : S.districtName(s.districtId)} · {s.batchId}</b>
            <span>{s.topic} · {S.trainerName(s.trainerId)}</span>
          </div>
          <div className="tr"><b className="fs13">{s.present}/{s.expected}</b><div className="fs11 muted">present</div></div>
          <LivePill />
        </div>
      ))}
    </div>
  );
}
