import { useEffect, useReducer } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, LinkButton, DemoNote, GenBadge, ModeTag, AttendanceCell, LivePill, dateFmt } from '../../../components/ui';
import { MarkerMap } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/trainingService';
import SessionList from './SessionList';
import type { LiveSession } from '../../../types/domain';

const pct = (s: LiveSession) => Math.round((s.present / s.expected) * 100);
const columns: Column<LiveSession>[] = [
  { k: 'start', l: 'Start', w: '70px' },
  { k: 'status', l: 'Status', render: (s) => (s.status === 'LIVE' ? <LivePill /> : <GenBadge status={s.status} />) },
  { k: 'mode', l: 'Mode', render: (s) => <ModeTag mode={s.mode} /> },
  {
    k: 'districtId',
    l: 'District',
    sortVal: (s) => (s.districtId ? S.districtName(s.districtId) : 'Online'),
    exportVal: (s) => (s.districtId ? S.districtName(s.districtId) : 'All (online)'),
    render: (s) => (s.districtId ? S.districtName(s.districtId) : <span className="muted">All (online)</span>),
  },
  { k: 'centreId', l: 'Centre / unit', sortVal: (s) => S.centre(s.centreId).name, render: (s) => S.centre(s.centreId).name },
  { k: 'batchId', l: 'Batch', render: (s) => <span className="lnk mono">{s.batchId}</span> },
  { k: 'trainerId', l: 'Trainer', sortVal: (s) => S.trainerName(s.trainerId), render: (s) => S.trainerName(s.trainerId) },
  { k: 'topic', l: 'Current topic' },
  {
    k: 'present',
    l: 'Present',
    align: 'right',
    exportVal: (s) => s.present + ' / ' + s.expected,
    render: (s) => (
      <>
        <b>{s.present}</b> / {s.expected}
      </>
    ),
  },
  {
    k: 'pct',
    l: 'Attendance',
    align: 'right',
    sortVal: pct,
    exportVal: (s) => pct(s) + '%',
    render: (s) => <AttendanceCell value={pct(s)} />,
  },
];

export default function LivePage() {
  useLegacyTick();
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  const [f, setF] = usePersistentState('live', { mode: 'ALL' });
  useEffect(() => {
    document.title = 'Live training monitor — AMRUT × SUMAGO Admin';
  }, []);

  const all = S.liveSessions().filter((s) => f.mode === 'ALL' || s.mode === f.mode);
  const liveNow = all.filter((s) => s.status === 'LIVE');
  const off = liveNow.filter((s) => s.mode === 'OFFLINE');
  const on = liveNow.filter((s) => s.mode === 'ONLINE');
  const present = liveNow.reduce((a, s) => a + s.present, 0);
  const expected = liveNow.reduce((a, s) => a + s.expected, 0);
  const unit = S.onlineUnit();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Live training monitor' }]}
        title="Live Training Monitor"
        badge={<LivePill>{liveNow.length} SESSIONS LIVE</LivePill>}
        sub={'What is happening right now, across both training modes. As on ' + dateFmt(S.config().asOf) + '.'}
        actions={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                AS.ui.toast('Dashboard refreshed.', 'ok');
                refresh();
              }}
            >
              <Icon name="refresh" />
              Refresh
            </button>
            <LinkButton to="#/offline">Offline control</LinkButton>
            <LinkButton to="#/online" className="btn primary">
              Online control
            </LinkButton>
          </>
        }
      />
      <div className="grid g6 mb14">
        <Kpi label="Sessions live now" value={liveNow.length} tone="r" />
        <Kpi label="Offline sessions" value={off.length} tone="b" link="#/offline" />
        <Kpi label="Online sessions" value={on.length} tone="v" link="#/online" />
        <Kpi label="Students expected" value={expected} tone="" />
        <Kpi label="Students present" value={present} tone="g" />
        <Kpi
          label="Live attendance"
          value={expected ? Math.round((present / expected) * 100) + '%' : '—'}
          tone="g"
          pct={expected ? Math.round((present / expected) * 100) : 0}
          progTone="g"
        />
      </div>
      <div className="pills mb14">
        {[
          ['ALL', 'All modes'],
          ['OFFLINE', 'Offline only'],
          ['ONLINE', 'Online only'],
        ].map(([k, l]) => (
          <button type="button" key={k} className={'chip' + (f.mode === k ? ' on' : '')} onClick={() => setF({ mode: k })}>
            {l}
          </button>
        ))}
      </div>
      <div className="card mb14">
        <div className="card-h">
          <h3>Live training locations</h3>
          <span className="sub">pulsing markers indicate an active session</span>
        </div>
        <div className="card-b">
          <MarkerMap
            markers={liveNow.map((s) => ({
              districtId: s.mode === 'ONLINE' ? unit.districtId : (s.districtId ?? unit.districtId),
              title: s.batchId + ' — ' + s.topic,
              sub: s.present + '/' + s.expected + ' present',
              badge: String(s.present),
              link: '#/batches/' + s.batchId,
              color: s.mode === 'ONLINE' ? '#1E7A46' : '#B3271E',
              live: true,
            }))}
            opts={{
              height: 380,
              legend: [
                { c: '#B3271E', l: 'Offline session live' },
                { c: '#1E7A46', l: 'Online session live (central unit)' },
              ],
            }}
          />
        </div>
      </div>
      <div className="grid g2 mb14">
        <Card
          title={
            <>
              <span className="mode-tag mode-off">OFFLINE</span> Live sessions at centres
            </>
          }
          sub={off.length + ' live'}
          flush
        >
          <SessionList sessions={off} />
        </Card>
        <Card
          title={
            <>
              <span className="mode-tag mode-on">ONLINE</span> Live sessions — central unit
            </>
          }
          sub={on.length + ' live'}
          flush
        >
          <SessionList sessions={on} />
        </Card>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>All sessions today</h3>
        </div>
        <DataTable
          rows={S.liveSessions()}
          columns={columns}
          pageSize={12}
          exportName="Live_Sessions"
          search={['batchId', 'topic']}
          rowLink={(s) => '#/batches/' + s.batchId}
        />
      </div>
      <DemoNote />
    </div>
  );
}
