import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHead, Kpi, FilterBar, LinkButton, EmptyState, DemoNote, Badge, ProgRow, AttendanceCell, useGo } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/networkService';
import type { DistrictRow } from '../../../services/mock/networkService';

const achTone = (p: number) => (p >= 90 ? 'g' : p >= 70 ? '' : 'r');

const columns: Column<DistrictRow>[] = [
  { k: 'name', l: 'District', sortVal: (x) => x.d.name, render: (x) => <b className="lnk">{x.d.name}</b> },
  { k: 'region', l: 'Region', sortVal: (x) => x.d.region, render: (x) => x.d.region },
  { k: 'target', l: 'Target', align: 'right', sortVal: (x) => x.d.target, render: (x) => x.d.target },
  { k: 'applications', l: 'Applications', align: 'right', sortVal: (x) => x.k.applications, render: (x) => x.k.applications },
  { k: 'eligible', l: 'Eligible', align: 'right', sortVal: (x) => x.k.eligible, render: (x) => x.k.eligible },
  { k: 'enrolled', l: 'Enrolled', align: 'right', sortVal: (x) => x.k.enrolled, render: (x) => <b>{x.k.enrolled}</b> },
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

  const all = S.districts();
  const rows = S.filterDistricts(s);
  const totals = S.stateTotals();
  const ragCount = (rag: string) => all.filter((d) => S.districtStatus(d).rag === rag).length;

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
          ' districts of Maharashtra. Drill down: State → District → Taluka → Centre → Batch → Student.'
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
      <div className="grid g6 mb14">
        <Kpi label="Districts covered" value={all.length} tone="b" />
        <Kpi label="Districts with centres" value={all.filter((d) => d.hasCentre).length} tone="b" link="#/districts?filter=centres" />
        <Kpi label="On track (GREEN)" value={ragCount('GREEN')} tone="g" link="#/districts?filter=green" />
        <Kpi label="Needs attention" value={ragCount('AMBER')} tone="a" link="#/districts?filter=amber" />
        <Kpi label="Critical" value={ragCount('RED')} tone="r" link="#/districts?filter=critical" />
        <Kpi label="State achievement" value={totals.achievementPct + '%'} tone="g" pct={totals.achievementPct} progTone="g" />
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
          {rows.map(({ d, k, st }) => (
            <div
              key={d.code}
              className="card pad pointer"
              onClick={() => go('#/districts/' + d.code)}
              style={{ borderLeft: '3px solid ' + st.color }}
            >
              <div className="f jb ac">
                <b className="fs13 ell">{d.name}</b>
                <Badge tone={st.tone}>{st.l}</Badge>
              </div>
              <div className="fs11 muted">
                {d.region}
                {d.hasCentre ? ' · has centre' : ''}
              </div>
              <div className="f jb ac mt10">
                <span className="fs20 b7">{k.enrolled}</span>
                <span className="fs11 muted">of {d.target} target</span>
              </div>
              <div className="prog mt4">
                <i className={achTone(k.achievementPct)} style={{ width: Math.min(100, k.achievementPct) + '%' }} />
              </div>
              <div className="grid g3 mt10" style={{ gap: 6 }}>
                {[
                  ['Active', k.trainingActive],
                  ['Done', k.completed],
                  ['Cert.', k.certified],
                ].map(([l, v]) => (
                  <div key={l} className="tc" style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '5px 3px' }}>
                    <div className="fs11 muted">{l}</div>
                    <b className="fs13">{v}</b>
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
          <h3>District performance table</h3>
        </div>
        <DataTable
          rows={all.map(S.districtRow)}
          columns={columns}
          pageSize={12}
          exportName="District_Performance"
          search={[(x) => x.d.name]}
          searchLabel="district"
          rowLink={(x) => '#/districts/' + x.d.code}
        />
      </div>
      <DemoNote />
    </div>
  );
}
