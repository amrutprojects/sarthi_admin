import { useEffect, type ReactNode } from 'react';
import {
  PageHead,
  Card,
  Kpi,
  FilterBar,
  KvList,
  AlertCard,
  LinkButton,
  EmptyState,
  DemoNote,
  DemoChip,
  Callout,
  LivePill,
  districtOptions,
  modeOptions,
  fmt,
  useGo,
} from '../../../components/ui';
import { LineChart, Donut, Funnel, HBar, Ring, DistrictMap } from '../../../components/charts';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/dashboardService';
import type { DashFilter } from '../../../services/mock/dashboardService';
import usePersistentState from '../../../hooks/usePersistentState';
import type { Kpis, HealthScore, LiveSession } from '../../../types/domain';
import {
  asOfLabel,
  centreIndex,
  monthLabel,
  pctOf,
  sourceItems,
  studentListLink,
  topCentres,
  trackItems,
  useStudentSummary,
  type StudentSummary,
} from '../../students';

const METRICS = [
  { v: 'enrolled', l: 'Enrolled' },
  { v: 'applications', l: 'Applications' },
  { v: 'eligible', l: 'Eligible' },
  { v: 'active', l: 'Training active' },
  { v: 'completed', l: 'Completed' },
  { v: 'certified', l: 'Certified' },
  { v: 'attendance', l: 'Attendance %' },
  { v: 'achievement', l: 'Achievement %' },
];

/* Filters persist across navigation, as in the original (AS.state.dash). */
function useDashFilter() {
  return usePersistentState<DashFilter>('dash', S.DEFAULT_DASH_FILTER);
}

export default function DashboardPage() {
  useLegacyTick(); // re-render when a legacy drawer (e.g. task status) changes data
  const [f, setF] = useDashFilter();
  useEffect(() => {
    document.title = 'Dashboard — AMRUT × SUMAGO Admin';
  }, []);

  const k = S.dashboardKpis(f);
  const health = S.healthScore();
  const live = S.runningSessions();

  /* Live student figures from the register; the district filter limits them to one district (?centre=). */
  const centre = f.district && f.district !== 'ALL' ? f.district : undefined;
  const summary = useStudentSummary(centre);
  /* The map always shows every district, so it reads the all-district summary (the same query when no district is picked). */
  const mapLive = centreIndex(useStudentSummary().data);
  const liveMetric = ['applications', 'eligible', 'enrolled'].includes(f.metric);
  const sm = summary.data;
  const t = sm?.totals;
  const asOf = asOfLabel(sm?.asOf);
  const liveValue = (n: number | undefined): number | string => (summary.isPending ? '…' : summary.isError ? '—' : (n ?? 0));
  const awaitingLink = studentListLink({ bucket: 'awaiting', centre });
  /* Card body for a live figure: skeleton while loading, a short message on failure. */
  const liveBody = (render: (s: StudentSummary) => ReactNode, height = 200) =>
    summary.isPending ? (
      <div className="skel" style={{ height }} aria-label="Loading live figures" />
    ) : summary.isError ? (
      <div className="muted fs12">Could not load the live student figures.</div>
    ) : (
      render(summary.data)
    );

  const kpis = [
    {
      label: 'Total Target',
      value: k.target,
      tone: '',
      sub: 'Configurable programme target',
      link: '#/settings',
      badge: <DemoChip />,
    },
    {
      label: 'Applications',
      value: liveValue(t?.applications),
      tone: 'b',
      sub: t ? fmt(t.pending) + ' pending verification' : 'Students in the register',
      link: studentListLink({ bucket: 'applications', centre }),
      title: asOf,
    },
    {
      label: 'Eligible',
      value: liveValue(t?.eligible),
      tone: 'b',
      sub: t ? pctOf(t.eligible, t.applications) + '% of applications' : 'Approved and active',
      link: studentListLink({ bucket: 'eligible', centre }),
      title: asOf,
    },
    {
      label: 'Enrolled',
      value: liveValue(t?.enrolled),
      tone: 'g',
      sub: t ? <AwaitingLink count={t.awaitingBatch} link={awaitingLink} /> : 'Assigned to a batch',
      link: studentListLink({ bucket: 'enrolled', centre }),
      title: asOf,
    },
    {
      label: 'Training Active',
      value: k.trainingActive,
      tone: 's',
      sub: k.offlineActive + ' offline · ' + k.onlineActive + ' online',
      link: '#/lifecycle',
      badge: <DemoChip />,
    },
    {
      label: 'Completed',
      value: k.completed,
      tone: 'g',
      sub: k.completionPct + '% completion rate',
      link: '#/lifecycle',
      badge: <DemoChip />,
    },
    { label: 'Assessed', value: k.assessed, tone: 'v', sub: k.passRate + '% pass rate', link: '#/assessments', badge: <DemoChip /> },
    {
      label: 'Certified',
      value: k.certified,
      tone: 'g',
      sub: k.certificationPct + '% of enrolled',
      link: '#/certification',
      badge: <DemoChip />,
    },
  ];

  const top = sm ? topCentres(sm) : null;
  const tracks = sm ? trackItems(sm, centre) : [];
  const sources = sm ? sourceItems(sm, centre) : [];
  const sourceTotal = sources.reduce((a, x) => a + x.v, 0);

  return (
    <div className="page">
      <PageHead
        title="Project Command Centre"
        sub={
          <>
            Scope: <b>{S.scopeLabel(f)}</b> · Student figures are live{asOf ? ' ' + asOf : ''} · Figures marked <b>Demo data</b> are
            illustrative.
          </>
        }
        actions={
          <>
            <LinkButton to="#/executive" icon="shield">
              Executive view
            </LinkButton>
            <LinkButton to="#/today" icon="clock">
              Today&apos;s operations
            </LinkButton>
            <LinkButton to="#/reports" icon="download" className="btn primary">
              Reports &amp; MIS
            </LinkButton>
          </>
        }
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

      {summary.isError ? (
        <div className="mb14">
          <Callout tone="err" title="Could not load the live student figures. ">
            Applications, Eligible and Enrolled show “—” until the server answers.{' '}
            <button type="button" className="btn xs" onClick={() => void summary.refetch()}>
              Retry
            </button>
          </Callout>
        </div>
      ) : t && t.applications === 0 ? (
        <div className="mb14">
          <Callout tone="info" title={centre ? 'No students in the register for this district yet. ' : 'No students in the register yet. '}>
            Imported students are added to the register only when their import batch is finalised in Student Import (a second user with
            approval rights confirms the batch code). Until then the live tiles show 0.{' '}
            <LinkButton to="#/student-import" className="btn xs">
              Open Student Import
            </LinkButton>
          </Callout>
        </div>
      ) : null}

      <div className="grid g8 mb14">
        {kpis.map((x) => (
          <Kpi key={x.label} {...x} />
        ))}
      </div>
      {asOf ? <div className="fs11 muted mb14">Applications, Eligible and Enrolled are live student figures {asOf}.</div> : null}

      <div className="grid g-3-2 mb14">
        <Card
          title={
            <>
              Programme progress against target <DemoChip />
            </>
          }
          sub="System-generated indicator"
        >
          <ProgressBlock k={k} health={health} />
        </Card>
        <Card
          title={
            <>
              Critical attention <DemoChip />
            </>
          }
          flush
          footer={
            <>
              <LinkButton to="#/tasks" className="btn sm">
                Open tasks &amp; alerts
              </LinkButton>
              <LinkButton to="#/at-risk" className="btn sm ghost">
                At-risk engine
              </LinkButton>
            </>
          }
        >
          <CriticalList />
        </Card>
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            District performance map {liveMetric ? null : <DemoChip />}{' '}
            <span className="sub">
              {S.districts().length} districts · click any district to drill down ·{' '}
              {liveMetric ? 'tile counts are live' + (asOf ? ' ' + asOf : '') + '; status colours are demo' : 'this metric is demo data'}
            </span>
          </h3>
          <div className="f gp6">
            <LinkButton to="#/districts" className="btn sm">
              View all districts
            </LinkButton>
            <LinkButton to="#/districts?filter=critical" className="btn sm">
              View critical districts
            </LinkButton>
            <LinkButton to="#/live" className="btn sm">
              View live training
            </LinkButton>
          </div>
        </div>
        <div className="card-b">
          <DistrictMap metric={f.metric} colorMode="status" height={440} live={mapLive} />
        </div>
      </div>

      <div className="grid g-2-1 mb14">
        <Card title="Applications & enrolments by month" sub={'Last 12 months' + (asOf ? ' · ' + asOf : '')}>
          {liveBody((s) =>
            s.byMonth.some((x) => x.applications || x.enrolled) ? (
              <LineChart
                series={[
                  { l: 'Applications', v: s.byMonth.map((x) => x.applications), c: '#B3A08D' },
                  { l: 'Enrolled', v: s.byMonth.map((x) => x.enrolled), c: '#C8651C' },
                ]}
                labels={s.byMonth.map((x) => monthLabel(x.month))}
                opts={{ height: 250 }}
              />
            ) : (
              <EmptyState title="No applications in the last 12 months" msg="The trend appears once students are in the register." />
            ),
          )}
        </Card>
        <Card
          title={
            <>
              Training mode split <DemoChip />
            </>
          }
          sub="Two independent modes"
        >
          <ModeSplit k={k} />
        </Card>
      </div>

      <div className="grid g-2-1 mb14">
        <Card
          title="Students by track"
          sub={'Applications per track' + (asOf ? ' · ' + asOf : '')}
          action={
            <LinkButton to={studentListLink({ centre })} className="btn sm ghost">
              Student list
            </LinkButton>
          }
        >
          {liveBody(() =>
            tracks.length ? (
              <HBar items={tracks} opts={{ color: '#C8651C' }} />
            ) : (
              <EmptyState title="No students yet" msg="Tracks appear here once students are in the register." />
            ),
          )}
        </Card>
        <Card title="Source split" sub="Imported vs registered">
          {liveBody(() =>
            sourceTotal ? (
              <Donut items={sources} opts={{ centerValue: fmt(sourceTotal), centerLabel: 'Students', click: true, size: 176 }} />
            ) : (
              <EmptyState title="No students yet" msg="Imported and registered students are counted here." />
            ),
          )}
        </Card>
      </div>

      <div className="grid g-2-1 mb14">
        <Card
          title="Candidate funnel"
          sub={
            <>
              Applications, Eligible, Enrolled are live{asOf ? ' ' + asOf : ''} · later stages <DemoChip />
            </>
          }
          action={
            <LinkButton to="#/lifecycle" className="btn sm ghost">
              Full lifecycle
            </LinkButton>
          }
        >
          <Funnel
            stages={[
              { l: 'Applications', v: t?.applications ?? 0, c: '#B3A08D', link: studentListLink({ bucket: 'applications', centre }) },
              { l: 'Eligible', v: t?.eligible ?? 0, c: '#E2A166', link: studentListLink({ bucket: 'eligible', centre }) },
              { l: 'Enrolled', v: t?.enrolled ?? 0, c: '#C8651C', link: studentListLink({ bucket: 'enrolled', centre }) },
              { l: 'Training active', v: k.trainingActive, c: '#7A3A16', link: '#/lifecycle' },
              { l: 'Completed', v: k.completed, c: '#1E7A46', link: '#/lifecycle' },
              { l: 'Assessed', v: k.assessed, c: '#6B3FA0', link: '#/assessments' },
              { l: 'Certified', v: k.certified, c: '#E88C2C', link: '#/certification' },
            ]}
          />
        </Card>
        <Card
          title={
            <>
              Attendance trend (28 days) <DemoChip />
            </>
          }
          sub="Zero = no scheduled sessions (Sunday)"
          action={
            <LinkButton to="#/attendance" className="btn sm ghost">
              Attendance module
            </LinkButton>
          }
        >
          <LineChart
            series={[{ l: 'Attendance %', v: S.attendanceTrend().map((a) => a.v), c: '#1E7A46' }]}
            labels={S.attendanceTrend().map((a) => a.d.slice(8))}
            opts={{ height: 250, max: 100 }}
          />
        </Card>
      </div>

      <div className="grid g2">
        <Card
          title={
            <>
              Live training right now <DemoChip />
            </>
          }
          sub={live.length + ' sessions in progress'}
          flush
          footer={
            <LinkButton to="#/live" className="btn sm">
              Open live training monitor
            </LinkButton>
          }
        >
          <LiveList live={live} />
        </Card>
        <Card
          title="Top districts by enrollment"
          sub={
            (top?.metric === 'eligible' ? 'No students enrolled yet: eligible students per district' : 'Enrolled students per district') +
            (asOf ? ' · ' + asOf : '')
          }
          action={
            <LinkButton to="#/districts" className="btn sm ghost">
              All districts
            </LinkButton>
          }
        >
          {liveBody(() =>
            top?.items.length ? (
              <HBar items={top.items} opts={{ color: '#C8651C' }} />
            ) : (
              <EmptyState title="No eligible students yet" msg="Districts are ranked here once students are in the register." />
            ),
          )}
        </Card>
      </div>
      <DemoNote>
        Figures marked “Demo data” are illustrative (indicative values, subject to AMRUT / COEP approval). Student counts come from the live
        register.
      </DemoNote>
    </div>
  );
}

/* "N awaiting batch" under the Enrolled tile; opens the awaiting-batch list without triggering the tile's own link. */
function AwaitingLink({ count, link }: { count: number; link: string }) {
  const go = useGo();
  return (
    <a
      className="lnk"
      onClick={(e) => {
        e.stopPropagation();
        go(link);
      }}
    >
      {fmt(count)} awaiting batch
    </a>
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
          <div className="f jb ac">
            <b className="fs13">Enrollment vs target</b>
            <b className="fs16">
              {fmt(k.enrolled)} / {fmt(k.target)}
            </b>
          </div>
          <div className="prog lg mt8">
            <i className={pct >= 90 ? 'g' : pct >= 70 ? '' : 'a'} style={{ width: Math.min(100, pct) + '%' }} />
          </div>
          <div className="f jb fs11 muted mt4">
            <span>{pct}% achieved</span>
            <span>{fmt(Math.max(0, k.target - k.enrolled))} remaining</span>
          </div>
          <div className="grid g3 mt14" style={{ gap: 8 }}>
            {tiles.map(([l, v, s]) => (
              <div
                key={l}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 10px' }}
              >
                <div className="fs11 muted">{l}</div>
                <b className="fs16">{v}</b>
                <div className="fs11 muted">{s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt14 fs11 muted">
        Programme Health Indicator is system-generated from enrollment, progress, attendance, completion, certification, centre, trainer and
        district factors. Status: <b>{health.status}</b>.
      </div>
    </>
  );
}

function CriticalList() {
  const go = useGo();
  return S.criticalItems().map((i) => <AlertCard key={i.link} color={i.color} title={i.t} sub={i.s} chevron onClick={() => go(i.link)} />);
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
        <KvList
          pairs={[
            ['Offline — training active', String(k.offlineActive)],
            ['Online — training active', String(k.onlineActive)],
            ['Offline centres', String(S.centres().length)],
            ['Online batches', String(S.batches().filter((b) => b.mode === 'ONLINE').length)],
          ]}
        />
      </div>
      <div className="f gp8 mt10">
        <LinkButton to="#/offline" className="btn sm block">
          Offline control
        </LinkButton>
        <LinkButton to="#/online" className="btn sm block">
          Online control
        </LinkButton>
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
          <div className="icon-sq" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>
            <Icon name="play" />
          </div>
          <div className="lr-main">
            <b>
              {s.mode === 'ONLINE' ? 'Online (central)' : S.districtName(s.districtId)} · {s.batchId}
            </b>
            <span>
              {s.topic} · {S.trainerName(s.trainerId)}
            </span>
          </div>
          <div className="tr">
            <b className="fs13">
              {s.present}/{s.expected}
            </b>
            <div className="fs11 muted">present</div>
          </div>
          <LivePill />
        </div>
      ))}
    </div>
  );
}
