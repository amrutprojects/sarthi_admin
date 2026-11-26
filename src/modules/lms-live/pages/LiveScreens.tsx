import { useState } from 'react';
import { Badge, GenBadge, ModeTag, fmt } from '../../../components/ui';
import type { Column } from '../../../components/tables/DataTable';
import { lmsLiveKeys } from '../hooks/useLiveData';
import { lmsLiveApi } from '../services/lmsLiveApi';
import type {
  AttendanceGroupBy,
  LmsAttendanceRow,
  LmsBatch,
  LmsCentre,
  LmsDistrict,
  LmsLiveSession,
  LmsSession,
  LmsTrainer,
  LmsTrack,
} from '../types/lmsLive.types';
import { fetchedAtLabel } from '../utils/format';
import { LiveListPage } from '../components/LiveListPage';

/*
 * The live versions of the Panel's LMS screens (G-2): each shows one live answer of /api/v1/lms-reads in the screen's
 * place while "Show live LMS data" is on. Same title and breadcrumb as the local screen; the columns are the LMS's
 * fields (docs/lms-reads/README.md "Response shapes"). No mock value is mixed in.
 */
const home = { l: 'Dashboard', link: '#/dashboard' };
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—');
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeStyle: 'short' }) : '—');
const mode = (m: string | null) => (m ? <ModeTag mode={m} /> : '—');
const dash = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : v);

const batchColumns: Column<LmsBatch>[] = [
  { k: 'code', l: 'Batch', render: (b) => <span className="mono">{b.code}</span> },
  { k: 'centreName', l: 'Centre', render: (b) => dash(b.centreName || b.centreCode) },
  { k: 'courseCode', l: 'Course' },
  { k: 'trackCode', l: 'Track', render: (b) => dash(b.trackCode) },
  { k: 'deliveryMode', l: 'Mode', render: (b) => mode(b.deliveryMode) },
  {
    k: 'learnersEnrolled',
    l: 'Learners',
    align: 'right',
    exportVal: (b) => `${b.learnersEnrolled} / ${b.capacity ?? '—'}`,
    render: (b) => (
      <>
        <b>{fmt(b.learnersEnrolled)}</b> / {b.capacity ?? '—'}
      </>
    ),
  },
  { k: 'learnersActive', l: 'Active', align: 'right' },
  { k: 'learnersCompleted', l: 'Completed', align: 'right' },
  { k: 'startDate', l: 'Start', exportVal: (b) => b.startDate ?? '', render: (b) => date(b.startDate) },
  { k: 'endDate', l: 'End', exportVal: (b) => b.endDate ?? '', render: (b) => date(b.endDate) },
  { k: 'status', l: 'Status', render: (b) => <GenBadge status={b.status} /> },
];

export function LiveBatchesPage() {
  return (
    <LiveListPage
      title="Batch Management"
      crumbs={[home, { l: 'Batches' }]}
      sub="Batches as the LMS has them, with learner counts."
      queryKey={lmsLiveKeys.read('batches')}
      queryFn={lmsLiveApi.batches}
      rows={(d) => d}
      columns={batchColumns}
      search={['code', 'centreName', 'courseCode']}
      exportName="lms-batches"
    />
  );
}

const centreColumns: Column<LmsCentre>[] = [
  { k: 'code', l: 'Code', render: (c) => <span className="mono">{c.code}</span> },
  { k: 'name', l: 'Centre', render: (c) => <b>{c.name}</b> },
  { k: 'entityCode', l: 'Entity', exportVal: (c) => c.entityCode ?? '', render: (c) => dash(c.entityCode) },
  {
    k: 'divisionName',
    l: 'Division',
    exportVal: (c) => c.divisionName ?? c.divisionCode ?? '',
    render: (c) => dash(c.divisionName ?? c.divisionCode),
  },
  { k: 'districtName', l: 'District', render: (c) => dash(c.districtName ?? c.districtCode) },
  { k: 'centreTypeName', l: 'Type', render: (c) => dash(c.centreTypeName) },
  { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
  {
    k: 'isActive',
    l: 'Active',
    exportVal: (c) => (c.isActive ? 'Yes' : 'No'),
    render: (c) => <Badge tone={c.isActive ? 'green' : 'grey'}>{c.isActive ? 'Yes' : 'No'}</Badge>,
  },
];

export function LiveCentresPage() {
  return (
    <LiveListPage
      title="Training Centre Master"
      crumbs={[home, { l: 'Training centres' }]}
      sub="Centres Sarthi’s LMS entities use."
      queryKey={lmsLiveKeys.read('centres')}
      queryFn={lmsLiveApi.centres}
      rows={(d) => d}
      columns={centreColumns}
      search={['code', 'name', 'districtName', 'entityCode', 'divisionName']}
      exportName="lms-centres"
    />
  );
}

const activeColumn = <T extends { isActive: boolean }>(): Column<T> => ({
  k: 'isActive',
  l: 'Active',
  exportVal: (r) => (r.isActive ? 'Yes' : 'No'),
  render: (r) => <Badge tone={r.isActive ? 'green' : 'grey'}>{r.isActive ? 'Yes' : 'No'}</Badge>,
});

const trackColumns: Column<LmsTrack>[] = [
  { k: 'code', l: 'Code', render: (t) => <span className="mono">{t.code}</span> },
  { k: 'name', l: 'Track', render: (t) => <b>{t.name}</b> },
  { k: 'nameMr', l: 'Name (Marathi)', exportVal: (t) => t.nameMr ?? '', render: (t) => dash(t.nameMr) },
  { k: 'entityCode', l: 'Entity' },
  { k: 'sortOrder', l: 'Order', align: 'right', exportVal: (t) => t.sortOrder ?? '', render: (t) => dash(t.sortOrder) },
  { k: 'status', l: 'Status', render: (t) => <GenBadge status={t.status} /> },
  activeColumn<LmsTrack>(),
];

/* Tracks the LMS entities own (lms-api ERD-1). Live only: there is no local version of this screen. */
export function LiveTracksPage() {
  return (
    <LiveListPage
      title="LMS Tracks"
      crumbs={[home, { l: 'Training centres', link: '#/centres' }, { l: 'LMS tracks' }]}
      sub="Tracks Sarthi’s LMS entities own."
      queryKey={lmsLiveKeys.read('tracks')}
      queryFn={lmsLiveApi.tracks}
      rows={(d) => d}
      columns={trackColumns}
      search={['code', 'name', 'entityCode']}
      exportName="lms-tracks"
    />
  );
}

const districtColumns: Column<LmsDistrict>[] = [
  { k: 'code', l: 'Code', render: (d) => <span className="mono">{d.code}</span> },
  { k: 'nameEn', l: 'District', render: (d) => <b>{d.nameEn}</b> },
  { k: 'nameMr', l: 'Name (Marathi)', exportVal: (d) => d.nameMr ?? '', render: (d) => dash(d.nameMr) },
  {
    k: 'divisionName',
    l: 'Division',
    exportVal: (d) => d.divisionName ?? d.divisionCode ?? '',
    render: (d) => dash(d.divisionName ?? d.divisionCode),
  },
  { k: 'entityCode', l: 'Entity' },
  { k: 'status', l: 'Status', render: (d) => <GenBadge status={d.status} /> },
  activeColumn<LmsDistrict>(),
];

/* Districts (with their division) the LMS entities own (lms-api ERD-1). Live only, like the tracks. */
export function LiveDistrictsPage() {
  return (
    <LiveListPage
      title="LMS Districts"
      crumbs={[home, { l: 'Training centres', link: '#/centres' }, { l: 'LMS districts' }]}
      sub="Districts Sarthi’s LMS entities own, with their division."
      queryKey={lmsLiveKeys.read('districts')}
      queryFn={lmsLiveApi.districts}
      rows={(d) => d}
      columns={districtColumns}
      search={['code', 'nameEn', 'divisionName', 'entityCode']}
      exportName="lms-districts"
    />
  );
}

const trainerColumns: Column<LmsTrainer>[] = [
  { k: 'code', l: 'Code', render: (t) => <span className="mono">{t.code}</span> },
  { k: 'displayName', l: 'Trainer', render: (t) => <b>{t.displayName}</b> },
  { k: 'entityCode', l: 'Entity' },
  { k: 'centreCodes', l: 'Centres', exportVal: (t) => t.centreCodes.join(', '), render: (t) => dash(t.centreCodes.join(', ')) },
  { k: 'batchCodes', l: 'Batches', exportVal: (t) => t.batchCodes.join(', '), render: (t) => dash(t.batchCodes.join(', ')) },
  { k: 'status', l: 'Status', render: (t) => <GenBadge status={t.status} /> },
];

export function LiveTrainersPage() {
  return (
    <LiveListPage
      title="Trainer Management"
      crumbs={[home, { l: 'Trainers' }]}
      sub="Trainers as the LMS has them, with centre and batch assignments."
      queryKey={lmsLiveKeys.read('trainers')}
      queryFn={lmsLiveApi.trainers}
      rows={(d) => d}
      columns={trainerColumns}
      search={['code', 'displayName']}
      exportName="lms-trainers"
    />
  );
}

const liveColumns: Column<LmsLiveSession>[] = [
  { k: 'batchCode', l: 'Batch', render: (s) => <span className="mono">{s.batchCode}</span> },
  { k: 'centreCode', l: 'Centre' },
  { k: 'deliveryMode', l: 'Mode', render: (s) => mode(s.deliveryMode) },
  { k: 'trainerName', l: 'Trainer', render: (s) => dash(s.trainerName ?? s.trainerCode) },
  { k: 'topic', l: 'Topic', render: (s) => dash(s.topic) },
  { k: 'startsAt', l: 'Time', exportVal: (s) => s.startsAt ?? '', render: (s) => `${time(s.startsAt)} – ${time(s.endsAt)}` },
  {
    k: 'inProgress',
    l: 'State',
    exportVal: (s) => (s.inProgress ? 'In progress' : s.status),
    render: (s) => (s.inProgress ? <Badge tone="green">In progress</Badge> : <GenBadge status={s.status} />),
  },
  {
    k: 'present',
    l: 'Present',
    align: 'right',
    exportVal: (s) => `${s.present} / ${s.enrolled}`,
    render: (s) => `${s.present} / ${s.enrolled}`,
  },
  { k: 'late', l: 'Late', align: 'right' },
];

export function LiveSessionsTodayPage() {
  return (
    <LiveListPage
      title="Live Training Monitor"
      crumbs={[home, { l: 'Live training monitor' }]}
      sub="Today’s class sessions as the LMS reports them."
      queryKey={lmsLiveKeys.read('live-sessions')}
      queryFn={() => lmsLiveApi.liveSessions()}
      rows={(d) => d.items}
      columns={liveColumns}
      search={['batchCode', 'centreCode', 'trainerName']}
      exportName="lms-live-sessions"
      emptyMsg="The LMS has no class sessions today."
    />
  );
}

const sessionColumns: Column<LmsSession>[] = [
  { k: 'batchCode', l: 'Batch', render: (s) => <span className="mono">{s.batchCode}</span> },
  { k: 'centreCode', l: 'Centre' },
  { k: 'title', l: 'Session', render: (s) => dash(s.title ?? (s.moduleNo !== null ? `Module ${s.moduleNo}` : null)) },
  { k: 'startsAt', l: 'Starts', exportVal: (s) => s.startsAt ?? '', render: (s) => fetchedAtLabel(s.startsAt) },
  { k: 'trainerCode', l: 'Trainer', render: (s) => dash(s.trainerCode) },
  { k: 'status', l: 'Status', render: (s) => <GenBadge status={s.status} /> },
  {
    k: 'attendance',
    l: 'Present / late / absent',
    align: 'right',
    exportVal: (s) => `${s.attendance.present}/${s.attendance.late}/${s.attendance.absent}`,
    render: (s) => `${s.attendance.present} / ${s.attendance.late} / ${s.attendance.absent}`,
  },
];

/* Offline or Online Training: the LMS class sessions of that delivery mode (filtered in the Panel; see the note). */
export function LiveSessionsByModePage({ deliveryMode }: { deliveryMode: 'OFFLINE' | 'ONLINE' }) {
  const offline = deliveryMode === 'OFFLINE';
  return (
    <LiveListPage
      title={offline ? 'Offline Training Control' : 'Online Training Control'}
      crumbs={[home, { l: offline ? 'Offline training' : 'Online training' }]}
      sub={`Class sessions of ${offline ? 'offline' : 'online'} batches as the LMS reports them.`}
      queryKey={lmsLiveKeys.read('sessions')}
      queryFn={lmsLiveApi.sessions}
      rows={(d) => d.filter((s) => (s.deliveryMode ?? '').toUpperCase() === deliveryMode)}
      columns={sessionColumns}
      search={['batchCode', 'centreCode', 'title']}
      exportName={offline ? 'lms-offline-sessions' : 'lms-online-sessions'}
      emptyMsg={`The LMS has no ${offline ? 'offline' : 'online'} class sessions yet.`}
      note="The LMS has no delivery-mode filter on sessions yet: the latest page of sessions is read and filtered here."
    />
  );
}

const GROUPS: [AttendanceGroupBy, string][] = [
  ['district', 'District'],
  ['division', 'Division'],
  ['centre', 'Centre'],
  ['batch', 'Batch'],
];
const pct = (r: LmsAttendanceRow) => {
  const marked = r.present + r.late + r.absent + r.excused;
  return marked ? Math.round(((r.present + r.late) * 1000) / marked) / 10 : null;
};

export function LiveAttendancePage() {
  const [groupBy, setGroupBy] = useState<AttendanceGroupBy>('district');
  const label = GROUPS.find(([g]) => g === groupBy)?.[1] ?? 'Code';
  const columns: Column<LmsAttendanceRow>[] = [
    { k: 'code', l: label, render: (r) => <span className="mono">{r.code}</span> },
    { k: 'batches', l: 'Batches', align: 'right' },
    { k: 'sessionsHeld', l: 'Sessions held', align: 'right' },
    { k: 'present', l: 'Present', align: 'right' },
    { k: 'late', l: 'Late', align: 'right' },
    { k: 'absent', l: 'Absent', align: 'right' },
    { k: 'excused', l: 'Excused', align: 'right' },
    {
      k: 'pct',
      l: 'Attendance',
      align: 'right',
      sortVal: (r) => pct(r) ?? -1,
      exportVal: (r) => pct(r) ?? '',
      render: (r) => (pct(r) === null ? '—' : `${pct(r)}%`),
    },
    { k: 'geoCheckIns', l: 'Geo check-ins', align: 'right' },
    { k: 'selfies', l: 'Selfies', align: 'right' },
  ];
  return (
    <LiveListPage
      title="Attendance Dashboard"
      crumbs={[home, { l: 'Attendance' }]}
      sub="Attendance counts of the last 30 days as the LMS reports them."
      queryKey={lmsLiveKeys.read('attendance', groupBy)}
      queryFn={() => lmsLiveApi.attendance(groupBy)}
      rows={(d) => d.items}
      columns={columns}
      search={['code']}
      exportName={`lms-attendance-${groupBy}`}
      toolbar={
        <div className="fld mb14" style={{ maxWidth: 240 }}>
          <label htmlFor="live-att-group">Group by</label>
          <select id="live-att-group" className="inp" value={groupBy} onChange={(e) => setGroupBy(e.target.value as AttendanceGroupBy)}>
            {GROUPS.map(([g, l]) => (
              <option key={g} value={g}>
                {l}
              </option>
            ))}
          </select>
        </div>
      }
      note="Present + late over all marked records. A day-by-day trend needs an LMS read that is not built yet."
    />
  );
}
