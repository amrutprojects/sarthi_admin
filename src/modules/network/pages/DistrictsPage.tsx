import { useEffect, type MouseEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PageHead,
  Kpi,
  FilterBar,
  LinkButton,
  EmptyState,
  DemoNote,
  DemoChip,
  Callout,
  Badge,
  ProgRow,
  AttendanceCell,
  fmt,
  useGo,
} from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/networkService';
import type { DistrictRow } from '../../../services/mock/networkService';
import { asOfLabel, centreCounts, centreIndex, studentListLink, useStudentSummary, type BucketCounts } from '../../students';

const achTone = (p: number) => (p >= 90 ? 'g' : p >= 70 ? '' : 'r');

/* A district row with its live register counts (Applications / Eligible / Enrolled) next to the demo figures. */
type Row = DistrictRow & { live: BucketCounts };

/* Live count cell: links to the real student list for that district and bucket. */
function LiveCount({ n, link, bold }: { n: number; link: string; bold?: boolean }) {
  const go = useGo();
  const open = (e: MouseEvent) => {
    e.stopPropagation();
    go(link);
  };
  return (
    <a className="lnk" onClick={open}>
      {bold ? <b>{fmt(n)}</b> : fmt(n)}
    </a>
  );
}

const liveCol = (k: keyof BucketCounts, l: string, bold = false): Column<Row> => ({
  k,
  l,
  align: 'right',
  sortVal: (x) => x.live[k],
  exportVal: (x) => x.live[k],
  render: (x) => <LiveCount n={x.live[k]} bold={bold} link={studentListLink({ bucket: k, centre: x.d.code })} />,
});

/* Target, training, attendance, achievement and status have no live source yet. */
const columns: Column<Row>[] = [
  { k: 'name', l: 'District', sortVal: (x) => x.d.name, render: (x) => <b className="lnk">{x.d.name}</b> },
  { k: 'region', l: 'Region', sortVal: (x) => x.d.region, render: (x) => x.d.region },
  liveCol('applications', 'Applications'),
  liveCol('eligible', 'Eligible'),
  liveCol('enrolled', 'Enrolled', true),
  { k: 'target', l: 'Target', align: 'right', sortVal: (x) => x.d.target, render: (x) => x.d.target },
  { k: 'active', l: 'Training active', align: 'right', sortVal: (x) => x.k.trainingActive, render: (x) => x.k.trainingActive },
  { k: 'completed', l: 'Completed', align: 'right', sortVal: (x) => x.k.completed, render: (x) => x.k.completed },
  { k: 'certified', l: 'Certified', align: 'right', sortVal: (x) => x.k.certified, render: (x) => x.k.certified },
  {
    k: 'att',
    l: 'Attendance',
    align: 'right',
    sortVal: (x) => x.k.attendance,
    exportVal: (x) => x.k.attendance + '%',
    render: (x) => <AttendanceCell value={x.k.attendance} />,
  },
  {
    k: 'progress',
    l: 'Achievement',
    align: 'right',
    sortVal: (x) => x.k.achievementPct,
    exportVal: (x) => x.k.achievementPct + '%',
    render: (x) => <ProgRow pct={x.k.achievementPct} tone={achTone(x.k.achievementPct)} />,
  },
  { k: 'status', l: 'Status', sortVal: (x) => x.st.l, render: (x) => <Badge tone={x.st.tone}>{x.st.l}</Badge> },
];

export default function DistrictsPage() {
  useLegacyTick();
  const go = useGo();
  const { search } = useLocation();
  const [s, setS] = usePersistentState('geo', S.DEFAULT_GEO);
  useEffect(() => {
    document.title = 'Districts — AMRUT × SUMAGO Admin';
  }, []);
  useEffect(() => {
    const f = new URLSearchParams(search).get('filter');
    if (f) setS((x) => ({ ...x, filter: f }));
  }, [search, setS]);

  /* Live Applications / Eligible / Enrolled per district (centreCode = district code). */
  const summary = useStudentSummary();
  const idx = centreIndex(summary.data);
  const asOf = asOfLabel(summary.data?.asOf);
  const withLive = (r: DistrictRow): Row => ({ ...r, live: centreCounts(idx, r.d.code) });

  const all = S.districts();
  let rows = S.filterDistricts(s).map(withLive);
  /* "Most enrolled" ranks by the live register (enrolled, then eligible), not the demo figures. */
  if (s.sort === 'enrolled') {
    rows = rows.slice().sort((a, b) => b.live.enrolled - a.live.enrolled || b.live.eligible - a.live.eligible);
  }
  const totals = S.stateTotals();
  const ragCount = (rag: string) => all.filter((d) => S.districtStatus(d).rag === rag).length;
  const liveText = (n: number) => (summary.isPending ? '…' : summary.isError ? '—' : fmt(n));

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Districts' }]}
        title="District Dashboard"
        badge={
          <span className="tag">
            {rows.length} of {all.length} districts
          </span>
        }
        sub={
          'State-level monitoring across all ' +
          all.length +
          ' districts of Maharashtra. Applications, Eligible and Enrolled are live student figures' +
          (asOf ? ' ' + asOf : '') +
          '.'
        }
        actions={
          <>
            <LinkButton to="#/map" icon="pin">
              Open map view
            </LinkButton>
            <LinkButton to="#/reports/district" icon="download" className="btn primary">
              District report
            </LinkButton>
          </>
        }
      />
      {summary.isError ? (
        <div className="mb14">
          <Callout tone="err" title="Could not load the live student figures. ">
            District counts show “—” until the server answers.{' '}
            <button type="button" className="btn xs" onClick={() => void summary.refetch()}>
              Retry
            </button>
          </Callout>
        </div>
      ) : null}
      <div className="grid g6 mb14">
        <Kpi label="Districts covered" value={all.length} tone="b" />
        <Kpi
          label="Districts with centres"
          value={all.filter((d) => d.hasCentre).length}
          tone="b"
          link="#/districts?filter=centres"
          badge={<DemoChip />}
        />
        <Kpi label="On track (GREEN)" value={ragCount('GREEN')} tone="g" link="#/districts?filter=green" badge={<DemoChip />} />
        <Kpi label="Needs attention" value={ragCount('AMBER')} tone="a" link="#/districts?filter=amber" badge={<DemoChip />} />
        <Kpi label="Critical" value={ragCount('RED')} tone="r" link="#/districts?filter=critical" badge={<DemoChip />} />
        <Kpi
          label="State achievement"
          value={totals.achievementPct + '%'}
          tone="g"
          pct={totals.achievementPct}
          progTone="g"
          badge={<DemoChip />}
        />
      </div>

      <FilterBar
        fields={[
          { k: 'region', l: 'Region', options: [{ v: 'ALL', l: 'All regions' }].concat(S.regions().map((x) => ({ v: x, l: x }))) },
          {
            k: 'filter',
            l: 'Status',
            options: [
              { v: 'ALL', l: 'All districts' },
              { v: 'green', l: 'On track (GREEN)' },
              { v: 'amber', l: 'Needs attention (AMBER)' },
              { v: 'critical', l: 'Critical (RED)' },
              { v: 'grey', l: 'Not started / on hold' },
              { v: 'centres', l: 'Has offline centre' },
            ],
          },
          {
            k: 'sort',
            l: 'Sort by',
            options: [
              { v: 'performance', l: 'Highest performance' },
              { v: 'lowest', l: 'Lowest performance' },
              { v: 'enrolled', l: 'Most enrolled' },
              { v: 'name', l: 'District name' },
            ],
          },
        ]}
        value={s}
        onChange={(k, v) => setS((x) => ({ ...x, [k]: v }))}
        onReset={() => setS(S.DEFAULT_GEO)}
      />

      {rows.length ? (
        <div className="grid g4 mb14">
          {rows.map(({ d, k, st, live }) => (
            <div
              key={d.code}
              className="card pad pointer"
              data-testid={'district-' + d.code}
              onClick={() => go('#/districts/' + d.code)}
              style={{ borderLeft: '3px solid ' + st.color }}
            >
              <div className="f jb ac">
                <b className="fs13 ell">{d.name}</b>
                <span className="f ac gp4">
                  <Badge tone={st.tone}>{st.l}</Badge>
                  <DemoChip />
                </span>
              </div>
              <div className="fs11 muted">
                {d.region}
                {d.hasCentre ? ' · has centre' : ''}
              </div>
              <div className="grid g3 mt10" style={{ gap: 6 }}>
                {(
                  [
                    ['applications', 'Applied'],
                    ['eligible', 'Eligible'],
                    ['enrolled', 'Enrolled'],
                  ] as const
                ).map(([b, l]) => (
                  <div key={b} className="tc" style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '5px 3px' }}>
                    <div className="fs11 muted">{l}</div>
                    {summary.data ? (
                      <LiveCount n={live[b]} bold link={studentListLink({ bucket: b, centre: d.code })} />
                    ) : (
                      <b className="fs13">{liveText(0)}</b>
                    )}
                  </div>
                ))}
              </div>
              <div className="f jb ac mt10 fs11 muted">
                <span>
                  Target {d.target} · achievement {k.achievementPct}%
                </span>
                <DemoChip />
              </div>
              <div className="prog mt4">
                <i className={achTone(k.achievementPct)} style={{ width: Math.min(100, k.achievementPct) + '%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No districts match" msg="Adjust the filters to see districts." />
      )}

      <div className="card">
        <div className="card-h">
          <h3>
            District performance table <span className="sub">Applications, Eligible, Enrolled live{asOf ? ' ' + asOf : ''}</span>
          </h3>
        </div>
        <DataTable
          rows={all.map(S.districtRow).map(withLive)}
          columns={columns}
          pageSize={12}
          exportName="District_Performance"
          search={[(x) => x.d.name]}
          searchLabel="district"
          rowLink={(x) => '#/districts/' + x.d.code}
        />
      </div>
      <DemoNote>
        Indicative values, subject to AMRUT / COEP approval. Applications, Eligible and Enrolled come from the live student register.
      </DemoNote>
    </div>
  );
}
