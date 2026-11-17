import { useEffect } from 'react';
import { PageHead, Card, Kpi, AlertCard, LinkButton, DemoNote, GenBadge, ModeTag, LivePill, dateFmt } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/dashboardService';
import type { LiveSession } from '../../../types/domain';

const PRIO_COLOR: Record<string, string> = { HIGH: 'var(--red)', MEDIUM: 'var(--amber)' };

export default function TodayPage() {
  useLegacyTick(); // re-render when a legacy drawer (e.g. task status) changes data
  useEffect(() => {
    document.title = "Today's Operations — AMRUT × SUMAGO Admin";
  }, []);

  const live = S.liveSessions();
  const expected = live.reduce((a, s) => a + s.expected, 0);
  const present = live.reduce((a, s) => a + s.present, 0);
  const centresActive = new Set(live.map((s) => s.centreId));
  centresActive.delete(S.onlineUnitId());
  const trainersActive = new Set(live.map((s) => s.trainerId));
  const loc = (r: LiveSession) => (r.mode === 'ONLINE' ? 'Online (central)' : S.districtName(r.districtId));

  const kpis = [
    { label: 'Sessions today', value: live.length, tone: 'b', link: '#/live' },
    { label: 'Students expected', value: expected, tone: '' },
    { label: 'Students present', value: present, tone: 'g', sub: Math.round((present / expected) * 100) + '% attendance' },
    { label: 'Trainers active', value: trainersActive.size, tone: 'b', link: '#/trainers' },
    { label: 'Centres active', value: centresActive.size, tone: 'b', link: '#/centres' },
    { label: 'Online sessions', value: live.filter((s) => s.mode === 'ONLINE').length, tone: 'v', link: '#/online' },
    { label: 'Assessments today', value: 12, tone: 's', link: '#/assessments' },
    { label: 'Certificates generated', value: 6, tone: 'g', link: '#/certification' },
  ];

  const columns: Column<LiveSession>[] = [
    { k: 'start', l: 'Time', w: '70px' },
    { k: 'mode', l: 'Mode', render: (r) => <ModeTag mode={r.mode} /> },
    { k: 'batchId', l: 'Batch', render: (r) => <span className="lnk mono">{r.batchId}</span> },
    {
      k: 'loc',
      l: 'Location',
      sortVal: (r) => (r.mode === 'ONLINE' ? 'Online' : S.districtName(r.districtId ?? '')),
      exportVal: loc,
      render: loc,
    },
    { k: 'trainerId', l: 'Trainer', exportVal: (r) => S.trainerName(r.trainerId), render: (r) => S.trainerName(r.trainerId) },
    { k: 'topic', l: 'Topic' },
    {
      k: 'present',
      l: 'Present',
      align: 'right',
      exportVal: (r) => r.present + ' / ' + r.expected,
      render: (r) => r.present + ' / ' + r.expected,
    },
    { k: 'status', l: 'Status', render: (r) => (r.status === 'LIVE' ? <LivePill /> : <GenBadge status={r.status} />) },
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: "Today's Operations" }]}
        title="Today's Control Room"
        badge={<LivePill>{live.filter((s) => s.status === 'LIVE').length} LIVE</LivePill>}
        sub={
          <>
            Operational snapshot for <b>{dateFmt(S.asOf())}</b>.
          </>
        }
        actions={
          <>
            <LinkButton to="#/live">Live training monitor</LinkButton>
            <LinkButton to="#/attendance" className="btn primary">
              Attendance
            </LinkButton>
          </>
        }
      />
      <div className="grid g8 mb14">
        {kpis.map((x) => (
          <Kpi key={x.label} {...x} />
        ))}
      </div>
      <div className="grid g-2-1">
        <Card title="Session schedule — today" flush>
          <DataTable
            rows={live}
            columns={columns}
            pageSize={10}
            exportName="Today_Sessions"
            search={['batchId', 'topic']}
            searchLabel="sessions"
            rowLink={(r) => '#/batches/' + r.batchId}
          />
        </Card>
        <Card
          title="Open items for today"
          flush
          footer={
            <LinkButton to="#/tasks" className="btn sm">
              All tasks
            </LinkButton>
          }
        >
          {S.tasks()
            .filter((t) => t.status !== 'CLOSED' && t.status !== 'RESOLVED')
            .slice(0, 7)
            .map((t) => (
              <AlertCard
                key={t.id}
                color={PRIO_COLOR[t.priority] || 'var(--grey)'}
                title={t.title}
                sub={t.ownerName + ' · due ' + dateFmt(t.due)}
                onClick={() => S.openTask(t.id)}
              />
            ))}
        </Card>
      </div>
      <DemoNote />
    </div>
  );
}
