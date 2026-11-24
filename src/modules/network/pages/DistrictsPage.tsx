import { useEffect, type MouseEvent } from 'react';
import { PageHead, Kpi, FilterBar, LinkButton, EmptyState, Callout, NO_VALUE, NoDataLabel, fmt, useGo } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/geography';
import type { District } from '../../../types/domain';
import { asOfLabel, centreCounts, centreIndex, studentListLink, useStudentSummary, type BucketCounts } from '../../students';

/*
 * District names, codes and regions are Maharashtra's real geography. Applications / Eligible / Enrolled are live
 * from the student register. Targets, training figures, attendance, achievement and district status have no live
 * source yet (user decision 24 Nov 2026): they are shown as "No data yet", never as sample values.
 */
type Row = { d: District; live: BucketCounts };

interface DistrictFilter extends Record<string, string> {
  region: string;
  sort: string;
}
const DEFAULT_FILTER: DistrictFilter = { region: 'ALL', sort: 'enrolled' };

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

const columns: Column<Row>[] = [
  { k: 'name', l: 'District', sortVal: (x) => x.d.name, render: (x) => <b className="lnk">{x.d.name}</b> },
  { k: 'region', l: 'Region', sortVal: (x) => x.d.region, render: (x) => x.d.region },
  liveCol('applications', 'Applications'),
  liveCol('eligible', 'Eligible'),
  liveCol('enrolled', 'Enrolled', true),
];

const byLive = (a: Row, b: Row) =>
  b.live.enrolled - a.live.enrolled || b.live.eligible - a.live.eligible || a.d.name.localeCompare(b.d.name);

export default function DistrictsPage() {
  const go = useGo();
  const [s, setS] = usePersistentState('geo-live', DEFAULT_FILTER);
  useEffect(() => {
    document.title = 'Districts — AMRUT × SUMAGO Admin';
  }, []);

  /* Live Applications / Eligible / Enrolled per district (centreCode = district code). */
  const summary = useStudentSummary();
  const idx = centreIndex(summary.data);
  const asOf = asOfLabel(summary.data?.asOf);
  const withLive = (d: District): Row => ({ d, live: centreCounts(idx, d.code) });

  const all = S.districts();
  const rows = all
    .filter((d) => s.region === 'ALL' || d.region === s.region)
    .map(withLive)
    .sort(s.sort === 'name' ? (a, b) => a.d.name.localeCompare(b.d.name) : byLive);
  const liveText = (n: number) => (summary.isPending ? '…' : summary.isError ? '—' : fmt(n));
  const noData = <NoDataLabel />;

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
        <Kpi label="Districts with centres" value={NO_VALUE} sub={noData} />
        <Kpi label="On track (GREEN)" value={NO_VALUE} sub={noData} />
        <Kpi label="Needs attention" value={NO_VALUE} sub={noData} />
        <Kpi label="Critical" value={NO_VALUE} sub={noData} />
        <Kpi label="State achievement" value={NO_VALUE} sub={noData} />
      </div>

      <FilterBar
        fields={[
          { k: 'region', l: 'Region', options: [{ v: 'ALL', l: 'All regions' }].concat(S.regions().map((x) => ({ v: x, l: x }))) },
          {
            k: 'sort',
            l: 'Sort by',
            options: [
              { v: 'enrolled', l: 'Most enrolled' },
              { v: 'name', l: 'District name' },
            ],
          },
        ]}
        value={s}
        onChange={(k, v) => setS((x) => ({ ...x, [k]: v }))}
        onReset={() => setS(DEFAULT_FILTER)}
      />

      {rows.length ? (
        <div className="grid g4 mb14">
          {rows.map(({ d, live }) => (
            <div
              key={d.code}
              className="card pad pointer"
              style={{ minWidth: 0 }}
              data-testid={'district-' + d.code}
              onClick={() => go('#/districts/' + d.code)}
            >
              <b className="fs13 ell" style={{ display: 'block' }} title={d.name}>
                {d.name}
              </b>
              <div className="fs11 muted">{d.region}</div>
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
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No districts match" msg="Adjust the filters to see districts." />
      )}

      <div className="card">
        <div className="card-h">
          <h3>
            District table <span className="sub">Applications, Eligible, Enrolled live{asOf ? ' ' + asOf : ''}</span>
          </h3>
        </div>
        <DataTable
          rows={all.map(withLive)}
          columns={columns}
          pageSize={12}
          exportName="District_Register"
          search={[(x) => x.d.name]}
          searchLabel="district"
          rowLink={(x) => '#/districts/' + x.d.code}
        />
      </div>
    </div>
  );
}
