import { useEffect } from 'react';
import { PageHead, Card, FilterBar, LinkButton, KvList, Callout, DemoNote, DemoChip, EmptyState } from '../../../components/ui';
import { DistrictMap, MarkerMap, HBar } from '../../../components/charts';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/networkService';
import { asOfLabel, centreIndex, topCentres, useStudentSummary } from '../../students';

/* Metrics whose tile counts come from the live student register; the rest are demo data. */
const LIVE_METRICS = ['applications', 'eligible', 'enrolled'];

const DEFAULT_MAP = { metric: 'enrolled', colorMode: 'status', statusFilter: 'ALL', mode: 'ALL', view: 'districts' };
const VIEWS = [
  ['districts', 'District performance'],
  ['centres', 'Training centres'],
  ['live', 'Live training'],
];

export default function MapPage() {
  useLegacyTick();
  const [s, setS] = usePersistentState('map', DEFAULT_MAP);
  useEffect(() => {
    document.title = 'District map — AMRUT × SUMAGO Admin';
  }, []);

  const rows = S.districts().map(S.districtRow);
  const unit = S.onlineUnit();
  /* Live per-district counts for the tiles and the Top 5 (district code = students.centreCode). */
  const summary = useStudentSummary();
  const live = centreIndex(summary.data);
  const asOf = asOfLabel(summary.data?.asOf);
  const top = summary.data ? topCentres(summary.data, 5) : null;
  const liveMetric = LIVE_METRICS.includes(s.metric);
  let map;
  if (s.view === 'centres') {
    const markers = S.centres()
      .map((c) => ({
        districtId: c.districtId,
        title: c.name,
        sub: c.students + ' students · attendance ' + c.attendance + '%',
        badge: String(c.activeBatches),
        link: '#/centres/' + c.id,
        color: c.score >= 80 ? '#1E7A46' : c.score >= 70 ? '#C8651C' : '#B3271E',
      }))
      .concat([
        {
          districtId: unit.districtId,
          title: unit.name,
          sub: 'Central online training unit',
          badge: 'ON',
          link: '#/centres/' + unit.id,
          color: '#1E7A46',
        },
      ]);
    map = (
      <MarkerMap
        markers={markers}
        opts={{
          legend: [
            { c: '#1E7A46', l: 'Centre score 80+' },
            { c: '#C8651C', l: 'Score 70–79' },
            { c: '#B3271E', l: 'Below 70' },
            { c: '#1E7A46', l: 'Online training unit' },
          ],
        }}
      />
    );
  } else if (s.view === 'live') {
    const markers = S.liveSessions()
      .filter((x) => x.status === 'LIVE')
      .map((x) => ({
        districtId: x.mode === 'ONLINE' ? unit.districtId : (x.districtId ?? unit.districtId),
        title: x.batchId + ' — ' + x.topic,
        sub: x.present + '/' + x.expected + ' present',
        badge: String(x.present),
        link: '#/batches/' + x.batchId,
        color: x.mode === 'ONLINE' ? '#1E7A46' : '#B3271E',
        live: true,
      }));
    map = (
      <MarkerMap
        markers={markers}
        opts={{
          legend: [
            { c: '#B3271E', l: 'Offline session live' },
            { c: '#1E7A46', l: 'Online session live' },
          ],
        }}
      />
    );
  } else {
    map = (
      <DistrictMap metric={s.metric} colorMode={s.colorMode} statusFilter={s.statusFilter} filterMode={s.mode} height={560} live={live} />
    );
  }

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'District map' }]}
        title="Maharashtra District Map"
        badge={<span className="tag">{rows.length} districts</span>}
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
              k: 'colorMode',
              l: 'Shading',
              options: [
                { v: 'status', l: 'By district status (RAG)' },
                { v: 'metric', l: 'By metric intensity' },
              ],
            },
            {
              k: 'metric',
              l: 'Metric',
              options: [
                { v: 'enrolled', l: 'Enrolled' },
                { v: 'applications', l: 'Applications' },
                { v: 'eligible', l: 'Eligible' },
                { v: 'active', l: 'Training active' },
                { v: 'completed', l: 'Completed' },
                { v: 'certified', l: 'Certified' },
                { v: 'attendance', l: 'Attendance %' },
                { v: 'achievement', l: 'Achievement %' },
              ],
            },
            {
              k: 'statusFilter',
              l: 'Status filter',
              options: [
                { v: 'ALL', l: 'All statuses' },
                { v: 'GREEN', l: 'On track' },
                { v: 'AMBER', l: 'Needs attention' },
                { v: 'RED', l: 'Critical' },
                { v: 'GREY', l: 'Not started / on hold' },
              ],
            },
            {
              k: 'mode',
              l: 'Training mode',
              options: [
                { v: 'ALL', l: 'All modes' },
                { v: 'OFFLINE', l: 'Offline centre districts' },
              ],
            },
          ]}
          value={s}
          onChange={(k, v) => setS((x) => ({ ...x, [k]: v }))}
          onReset={() => setS((x) => ({ ...DEFAULT_MAP, view: x.view }))}
        />
      ) : null}
      <div className="card">
        {s.view === 'districts' ? (
          <div className="card-h">
            <h3>
              {liveMetric ? 'Live student counts per district' : 'District metric'} {liveMetric ? null : <DemoChip />}{' '}
              <span className="sub">
                {liveMetric
                  ? summary.isError ? 'live figures could not be loaded' : asOf || 'loading live figures…'
                  : 'indicative values'}
              </span>
            </h3>
          </div>
        ) : (
          <div className="card-h">
            <h3>
              {s.view === 'centres' ? 'Training centres' : 'Live training'} <DemoChip />
            </h3>
          </div>
        )}
        <div className="card-b">{map}</div>
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
        <Card
          title={
            <>
              Lowest 5 districts <DemoChip />
            </>
          }
          sub="By achievement against target"
        >
          <HBar
            items={rows
              .filter((x) => x.d.target > 0)
              .sort((a, b) => a.k.achievementPct - b.k.achievementPct)
              .slice(0, 5)
              .map((x) => ({
                l: x.d.name,
                v: x.k.achievementPct,
                display: x.k.achievementPct + '%',
                link: '#/districts/' + x.d.code,
                c: '#B3271E',
              }))}
            opts={{ max: 100 }}
          />
        </Card>
        <Card title="Map capability">
          <KvList
            pairs={[
              ['Provider', S.mapProvider()],
              ['Districts rendered', String(rows.length)],
              ['Interactions', 'Hover tooltip, click drill-down, status & mode filters'],
              ['Marker layers', 'Training centres, live sessions, online unit'],
              ['Geographic accuracy', 'Schematic — relative positions, not to scale'],
              ['Upgrade path', 'Mapbox / Google Maps via API key in environment variables'],
            ]}
          />
          <div className="mt10">
            <Callout tone="info">
              No static image is used — every district tile is a live, clickable SVG element bound to the same dataset as the tables.
            </Callout>
          </div>
        </Card>
      </div>
      <DemoNote>
        Indicative values, subject to AMRUT / COEP approval. Applications, Eligible and Enrolled tile counts and the Top 5 come from the
        live student register.
      </DemoNote>
    </div>
  );
}
