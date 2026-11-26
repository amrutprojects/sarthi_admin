import { useEffect, type ReactNode } from 'react';
import {
  PageHead,
  Card,
  Kpi,
  FilterBar,
  LinkButton,
  EmptyState,
  Callout,
  NoData,
  NoDataLabel,
  NO_VALUE,
  districtOptions,
  fmt,
  useGo,
} from '../../../components/ui';
import { LineChart, Donut, Funnel, HBar, DistrictMap } from '../../../components/charts';
import usePersistentState from '../../../hooks/usePersistentState';
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

/* Only the metrics the live student register provides. */
const METRICS = [
  { v: 'enrolled', l: 'Enrolled' },
  { v: 'applications', l: 'Applications' },
  { v: 'eligible', l: 'Eligible' },
];

interface DashFilter extends Record<string, string> {
  district: string;
  metric: string;
}
const DEFAULT_DASH_FILTER: DashFilter = { district: 'ALL', metric: 'enrolled' };

/* Filters persist across navigation, as in the original (AS.state.dash). */
function useDashFilter() {
  return usePersistentState<DashFilter>('dash', DEFAULT_DASH_FILTER);
}

/* Figures with no live source yet: the tile keeps its label and shows the empty state. */
const NO_SOURCE_TILES = ['Total Target', 'Training Active', 'Completed', 'Assessed', 'Certified'];

export default function DashboardPage() {
  const [f, setF] = useDashFilter();
  useEffect(() => {
    document.title = 'Dashboard — SARTHI Admin';
  }, []);

  /* Live student figures from the register; the district filter limits them to one district (?centre=). */
  const centre = f.district && f.district !== 'ALL' ? f.district : undefined;
  const summary = useStudentSummary(centre);
  /* The map always shows every district, so it reads the all-district summary (the same query when no district is picked). */
  const mapLive = centreIndex(useStudentSummary().data);
  /* A filter saved by an older version may name a metric that has no live source; fall back to Enrolled. */
  const metric = METRICS.some((m) => m.v === f.metric) ? f.metric : DEFAULT_DASH_FILTER.metric;
  const districts = districtOptions();
  const scope = districts.find((d) => d.v === (centre ?? 'ALL'))?.l ?? 'All districts';
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
            Scope: <b>{scope}</b> · Student figures are live{asOf ? ' ' + asOf : ''}
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
          { k: 'district', l: 'District', options: districts },
          { k: 'metric', l: 'Map metric', options: METRICS },
        ]}
        value={{ ...f, metric }}
        onChange={(key, v) => setF((s) => ({ ...s, [key]: v }))}
        onReset={() => setF(DEFAULT_DASH_FILTER)}
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
        {NO_SOURCE_TILES.map((l) => (
          <Kpi key={l} label={l} value={NO_VALUE} sub={<NoDataLabel />} />
        ))}
      </div>
      {asOf ? <div className="fs11 muted mb14">Applications, Eligible and Enrolled are live student figures {asOf}.</div> : null}

      <div className="grid g-3-2 mb14">
        <Card title="Programme progress against target">
          <NoData />
        </Card>
        <Card title="Critical attention">
          <NoData />
        </Card>
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            District performance map{' '}
            <span className="sub">Click any district to drill down · tile counts are live{asOf ? ' ' + asOf : ''}</span>
          </h3>
          <div className="f gp6">
            <LinkButton to="#/districts" className="btn sm">
              View all districts
            </LinkButton>
          </div>
        </div>
        <div className="card-b">
          <DistrictMap metric={metric} colorMode="metric" height={440} live={mapLive} />
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
        <Card title="Training mode split">
          <NoData />
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
              Applications, Eligible, Enrolled are live{asOf ? ' ' + asOf : ''} · training, assessment and certification stages:{' '}
              <NoDataLabel />
            </>
          }
        >
          <Funnel
            stages={[
              { l: 'Applications', v: t?.applications ?? 0, c: '#B3A08D', link: studentListLink({ bucket: 'applications', centre }) },
              { l: 'Eligible', v: t?.eligible ?? 0, c: '#E2A166', link: studentListLink({ bucket: 'eligible', centre }) },
              { l: 'Enrolled', v: t?.enrolled ?? 0, c: '#C8651C', link: studentListLink({ bucket: 'enrolled', centre }) },
            ]}
          />
        </Card>
        <Card title="Attendance trend (28 days)">
          <NoData />
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Live training right now">
          <NoData />
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
