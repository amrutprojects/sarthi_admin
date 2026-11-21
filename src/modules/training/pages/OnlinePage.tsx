import { LmsDataSource, LiveSessionsByModePage } from '../../lms-live';
import { useEffect } from 'react';
import {
  PageHead,
  Card,
  Kpi,
  KvList,
  LinkButton,
  Callout,
  DemoNote,
  GenBadge,
  StatusBadge,
  ProgRow,
  AttendanceCell,
  dateFmt,
  useGo,
} from '../../../components/ui';
import { Donut, HBar } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/trainingService';
import type { Candidate } from '../../../types/domain';
import { Can } from '../../auth';

const columns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name' },
  { k: 'districtId', l: 'District', exportVal: (x) => S.districtName(x.districtId), render: (x) => S.districtName(x.districtId) },
  { k: 'batchId', l: 'Online batch', render: (x) => <span className="mono">{x.batchId || '—'}</span> },
  { k: 'status', l: 'Status', render: (x) => <StatusBadge status={x.status} /> },
  {
    k: 'attendance',
    l: 'Session attendance',
    align: 'right',
    exportVal: (x) => x.attendance + '%',
    render: (x) => <AttendanceCell value={x.attendance} />,
  },
  { k: 'progress', l: 'LMS progress', align: 'right', exportVal: (x) => x.progress + '%', render: (x) => <ProgRow pct={x.progress} /> },
  { k: 'lastActivity', l: 'Last LMS activity', exportVal: (x) => dateFmt(x.lastActivity), render: (x) => dateFmt(x.lastActivity) },
];

function LocalOnlinePage() {
  useLegacyTick();
  const go = useGo();
  useEffect(() => {
    document.title = 'Online training — AMRUT × SUMAGO Admin';
  }, []);

  const rows = S.byMode('ONLINE');
  const k = S.kpis(rows, 200);
  const batches = S.batches().filter((b) => b.mode === 'ONLINE');
  const lms = S.lms();
  const cfg = S.config();

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Online training' }]}
        title="Online Training Control"
        badge={
          <span className="mode-tag mode-on" style={{ padding: '5px 11px' }}>
            ONLINE TRAINING MODE
          </span>
        }
        sub={
          <>
            Managed centrally by the <b>SUMAGO Online Training Management Team</b> through {cfg.lmsName} and the {cfg.appName}.
          </>
        }
        actions={
          <>
            <LinkButton to="#/lms">LMS integration</LinkButton>
            <LinkButton to="#/student-app">Student app</LinkButton>
            <Can action="syncLms">
              <button type="button" className="btn primary" onClick={S.syncLms}>
                <Icon name="refresh" />
                Sync now
              </button>
            </Can>
          </>
        }
      />
      <div className="grid g8 mb14">
        <Kpi label="Online students" value={k.enrolled} tone="g" link="#/candidates?mode=ONLINE&bucket=enrolled" />
        <Kpi
          label="Active online batches"
          value={batches.filter((b) => b.status === 'ACTIVE').length}
          tone="b"
          link="#/batches?mode=ONLINE&status=ACTIVE"
        />
        <Kpi
          label="Live sessions"
          value={S.liveSessions().filter((s) => s.mode === 'ONLINE' && s.status === 'LIVE').length}
          tone="r"
          link="#/live"
        />
        <Kpi label="LMS active users (7d)" value={lms.activeUsers7d} tone="v" link="#/lms" />
        <Kpi label="MCQs completed" value={lms.mcqsCompleted} tone="b" />
        <Kpi label="Assignments" value={lms.assignmentsSubmitted} tone="b" />
        <Kpi label="Assessments synced" value={lms.assessmentsSynced} tone="s" link="#/assessments" />
        <Kpi label="Completed" value={k.completed} tone="g" link="#/candidates?mode=ONLINE&bucket=completed" />
      </div>
      <div className="grid g-2-1 mb14">
        <Card
          title="Online batches"
          flush
          footer={
            <LinkButton to="#/batches?mode=ONLINE" className="btn sm">
              All online batches
            </LinkButton>
          }
        >
          <div className="list">
            {batches.map((b) => (
              <div key={b.id} className="list-row" onClick={() => go('#/batches/' + b.id)}>
                <div className="icon-sq" style={{ background: '#ECFDF5', color: '#1E7A46' }}>
                  <Icon name="globe" />
                </div>
                <div className="lr-main">
                  <b className="mono">{b.id}</b>
                  <span>
                    {S.courseName(b.courseId)} · {S.trainerName(b.trainerId)}
                  </span>
                  <div className="prog sm mt4">
                    <i style={{ width: b.progress + '%' }} />
                  </div>
                </div>
                <div className="tr">
                  <b className="fs13">
                    {b.students}/{b.seats}
                  </b>
                  <div className="fs11 muted">{b.attendance}% att.</div>
                </div>
                <GenBadge status={b.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card
          title="LMS connection"
          footer={
            <LinkButton to="#/lms" className="btn sm">
              Integration dashboard
            </LinkButton>
          }
        >
          <KvList
            pairs={[
              ['Platform', cfg.lmsName],
              ['Connection', 'Integration ready'],
              ['Last sync', lms.lastSync],
              ['Learners synced', String(lms.studentsSynced)],
              ['Courses', String(lms.coursesSynced)],
              ['Modules', String(lms.modules)],
              ['Avg. session', lms.avgSessionMin + ' min'],
            ]}
          />
          <div className="mt10">
            <Callout tone="warn" title="Integration pending">
              Not connected to a live LMS. The integration is API-ready; credentials would be supplied through environment variables.
            </Callout>
          </div>
        </Card>
      </div>
      <div className="grid g3 mb14">
        <Card title="Online learner distribution" sub={'Online mode is open to all ' + S.districts().length + ' districts'}>
          <Donut
            items={S.topOnlineDistricts()}
            opts={{ centerValue: k.enrolled, centerLabel: 'Online learners', size: 172, click: true }}
          />
        </Card>
        <Card title="LMS activity">
          <HBar
            items={[
              { l: 'Study material views', v: S.studentApp().materialViews, c: '#C8651C' },
              { l: 'MCQs completed', v: lms.mcqsCompleted, c: '#1E7A46' },
              { l: 'Assignments submitted', v: lms.assignmentsSubmitted, c: '#E88C2C' },
              { l: 'Assessments completed', v: lms.assessmentsSynced, c: '#6B3FA0' },
            ]}
          />
        </Card>
        <Card title="Central team scope">
          <KvList
            pairs={[
              ['Online admissions', 'Central'],
              ['Student onboarding', 'Central'],
              ['LMS access provisioning', 'Central'],
              ['Live online sessions', 'Central'],
              ['Study material & MCQs', 'Central'],
              ['Expert talks', 'Central'],
              ['Entrepreneurship sessions', 'Central'],
              ['Completion & certification', 'Central'],
            ]}
          />
          <div className="mt10">
            <Callout tone="info" title="No centre controls here">
              Physical centre management controls are intentionally excluded from this screen — they belong to the offline mode.
            </Callout>
          </div>
        </Card>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Online learners</h3>
          <LinkButton to="#/candidates?mode=ONLINE" className="btn sm">
            Open in candidate master
          </LinkButton>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={12}
          exportName="Online_Learners"
          search={['id', 'name']}
          rowLink={(x) => '#/candidates/' + x.id}
        />
      </div>
      <DemoNote />
    </div>
  );
}

/* G-2: local data (above, unchanged) while "Show live LMS data" is off; the LMS's live data while it is on. */
export default function OnlinePage() {
  return <LmsDataSource local={<LocalOnlinePage />} live={<LiveSessionsByModePage deliveryMode="ONLINE" />} />;
}
