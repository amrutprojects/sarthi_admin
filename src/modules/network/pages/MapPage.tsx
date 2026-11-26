import { useEffect } from 'react';
import { PageHead, Card, FilterBar, LinkButton, KvList, EmptyState, NoData } from '../../../components/ui';
import { DistrictMap, HBar } from '../../../components/charts';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/geography';
import { asOfLabel, centreIndex, topCentres, useStudentSummary } from '../../students';

/*
 * District tiles show the live student register (Applications / Eligible / Enrolled per district). Centre markers,
 * live-training markers, targets and achievement have no live source yet (user decision 24 Nov 2026): those views
 * show "No data yet" instead of sample values.
 */
const DEFAULT_MAP = { metric: 'enrolled', view: 'districts' };
const VIEWS = [
  ['districts', 'District performance'],
  ['centres', 'Training centres'],
  ['live', 'Live training'],
];

export default function MapPage() {
  const [s, setS] = usePersistentState('map-live', DEFAULT_MAP);
  useEffect(() => {
    document.title = 'District map — SARTHI Admin';
  }, []);

  const districtCount = S.districts().length;
  /* Live per-district counts for the tiles and the Top 5 (district code = students.centreCode). */
  const summary = useStudentSummary();
  const live = centreIndex(summary.data);
  const asOf = asOfLabel(summary.data?.asOf);
  const top = summary.data ? topCentres(summary.data, 5) : null;
  const viewTitle = VIEWS.find(([k]) => k === s.view)?.[1] ?? VIEWS[0][1];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'District map' }]}
        title="Maharashtra District Map"
        badge={<span className="tag">{districtCount} districts</span>}
        sub={
          <>
            Interactive schematic vector map — no map API key required. Provider: <b>{S.mapProvider()}</b>. Mapbox / Google Maps can be
            enabled from System Settings when credentials are supplied.
          </>
        }
        actions={
          <>
            <LinkButton to="#/districts">District table</LinkButton>
            <LinkButton to="#/live" className="btn primary">
              Live training
            </LinkButton>
          </>
        }
      />
      <div className="pills mb14">
        {VIEWS.map(([k, l]) => (
          <button type="button" key={k} className={'chip' + (s.view === k ? ' on' : '')} onClick={() => setS((x) => ({ ...x, view: k }))}>
            {l}
          </button>
        ))}
      </div>
      {s.view === 'districts' ? (
        <FilterBar
          fields={[
            {
              k: 'metric',
              l: 'Metric',
              options: [
                { v: 'enrolled', l: 'Enrolled' },
                { v: 'applications', l: 'Applications' },
                { v: 'eligible', l: 'Eligible' },
              ],
            },
          ]}
          value={s}
          onChange={(k, v) => setS((x) => ({ ...x, [k]: v }))}
          onReset={() => setS((x) => ({ ...DEFAULT_MAP, view: x.view }))}
        />
      ) : null}
      <div className="card">
        <div className="card-h">
          <h3>
            {s.view === 'districts' ? 'Live student counts per district' : viewTitle}{' '}
            {s.view === 'districts' ? (
              <span className="sub">{summary.isError ? 'live figures could not be loaded' : asOf || 'loading live figures…'}</span>
            ) : null}
          </h3>
        </div>
        <div className="card-b">{s.view === 'districts' ? <DistrictMap metric={s.metric} height={560} live={live} /> : <NoData />}</div>
      </div>
      <div className="grid g3 mt14">
        <Card
          title="Top 5 districts"
          sub={
            (top?.metric === 'eligible' ? 'No students enrolled yet: by eligible students' : 'By enrolled students') +
            (asOf ? ' · ' + asOf : '')
          }
        >
          {summary.isPending ? (
            <div className="skel" style={{ height: 150 }} aria-label="Loading live figures" />
          ) : summary.isError ? (
            <div className="muted fs12">
              Could not load the live student figures.{' '}
              <button type="button" className="btn xs" onClick={() => void summary.refetch()}>
                Retry
              </button>
            </div>
          ) : top?.items.length ? (
            <HBar items={top.items.map((x) => ({ ...x, c: '#1E7A46' }))} />
          ) : (
            <EmptyState title="No eligible students yet" msg="Districts are ranked here once students are in the register." />
          )}
        </Card>
        <Card title="Lowest 5 districts" sub="By achievement against target">
          <NoData />
        </Card>
        <Card title="Map capability">
          <KvList
            pairs={[
              ['Provider', S.mapProvider()],
              ['Districts rendered', String(districtCount)],
              ['Interactions', 'Hover tooltip, click drill-down'],
              ['Geographic accuracy', 'Schematic — relative positions, not to scale'],
              ['Upgrade path', 'Mapbox / Google Maps via API key in environment variables'],
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
