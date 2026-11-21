import { LmsDataSource, LiveBatchesPage } from '../../lms-live';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AS from '../../../legacy';
import {
  PageHead,
  Kpi,
  FilterBar,
  LinkButton,
  DemoNote,
  GenBadge,
  ModeTag,
  ProgRow,
  AttendanceCell,
  Callout,
  districtOptions,
  modeOptions,
  fmt,
  dateFmt,
} from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/deliveryService';
import type { Batch } from '../../../types/domain';
import { Can } from '../../auth';

const QUERY_KEYS: string[] = ['district', 'centre', 'mode', 'status', 'course'];

const columns: Column<Batch>[] = [
  { k: 'id', l: 'Batch ID', render: (b) => <span className="lnk mono">{b.id}</span> },
  {
    k: 'districtId',
    l: 'District',
    sortVal: (b) => (b.districtId ? S.districtName(b.districtId) : 'Online'),
    exportVal: (b) => (b.districtId ? S.districtName(b.districtId) : 'All (online)'),
    render: (b) => (b.districtId ? S.districtName(b.districtId) : <span className="muted">All (online)</span>),
  },
  { k: 'centreId', l: 'Centre / unit', sortVal: (b) => S.centre(b.centreId).name, render: (b) => S.centre(b.centreId).name },
  { k: 'mode', l: 'Mode', render: (b) => <ModeTag mode={b.mode} /> },
  { k: 'courseId', l: 'Course', sortVal: (b) => S.courseName(b.courseId), render: (b) => S.courseName(b.courseId) },
  { k: 'trainerId', l: 'Trainer', sortVal: (b) => S.trainer(b.trainerId).name, render: (b) => S.trainer(b.trainerId).name },
  {
    k: 'students',
    l: 'Students',
    align: 'right',
    exportVal: (b) => b.students + ' / ' + b.seats,
    render: (b) => (
      <>
        <b>{b.students}</b> / {b.seats}
      </>
    ),
  },
  { k: 'start', l: 'Start', exportVal: (b) => dateFmt(b.start), render: (b) => dateFmt(b.start) },
  { k: 'end', l: 'End', exportVal: (b) => dateFmt(b.end), render: (b) => dateFmt(b.end) },
  {
    k: 'attendance',
    l: 'Attendance',
    align: 'right',
    exportVal: (b) => b.attendance + '%',
    render: (b) => <AttendanceCell value={b.attendance} />,
  },
  {
    k: 'progress',
    l: 'Progress',
    align: 'right',
    exportVal: (b) => b.progress + '%',
    render: (b) => <ProgRow pct={b.progress} tone={b.progress >= 75 ? 'g' : ''} />,
  },
  { k: 'status', l: 'Status', render: (b) => <GenBadge status={b.status} /> },
];

function LocalBatchesPage() {
  useLegacyTick();
  const { search } = useLocation();
  const [f, setF] = usePersistentState('batch', S.DEFAULT_BATCH);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    document.title = 'Batches — AMRUT × SUMAGO Admin';
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(search);
    const next: Record<string, string> = {};
    QUERY_KEYS.forEach((k) => {
      const v = q.get(k);
      if (v) next[k] = v;
    });
    if (Object.keys(next).length) setF((x) => ({ ...x, ...next }));
  }, [search, setF]);

  const all = S.batches();
  const rows = S.filterBatches(f);
  const seats = all.reduce((a, b) => a + b.seats, 0);
  const filled = all.reduce((a, b) => a + b.students, 0);
  const util = Math.round((filled / seats) * 100);
  const count = (st: string) => all.filter((b) => b.status === st).length;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Batches' }]}
        title="Batch Management"
        badge={
          <span className="tag">
            {rows.length} of {all.length}
          </span>
        }
        sub={
          <>
            Batch ID format <span className="mono">AMRUT-&lt;DISTRICT&gt;-&lt;CENTRE&gt;-B&lt;NNN&gt;</span> · {S.config().batchSize} seats
            per batch (configurable).
          </>
        }
        actions={
          <>
            <LinkButton to="#/live">Live sessions</LinkButton>
            <Can action="createBatch">
              <button type="button" className="btn primary" onClick={() => setCreating(true)}>
                <Icon name="plus" />
                Create batch
              </button>
            </Can>
          </>
        }
      />
      <div className="grid g6 mb14">
        <Kpi label="Total batches" value={all.length} tone="b" />
        <Kpi label="Active" value={count('ACTIVE')} tone="g" link="#/batches?status=ACTIVE" />
        <Kpi label="Completed" value={count('COMPLETED')} tone="g" link="#/batches?status=COMPLETED" />
        <Kpi label="Upcoming" value={count('UPCOMING')} tone="" link="#/batches?status=UPCOMING" />
        <Kpi label="Delayed" value={count('DELAYED')} tone="r" link="#/batches?status=DELAYED" />
        <Kpi
          label="Seat utilisation"
          value={util + '%'}
          tone="g"
          sub={fmt(filled) + ' of ' + fmt(seats) + ' seats'}
          pct={util}
          progTone="g"
        />
      </div>
      <FilterBar
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'centre', l: 'Centre', options: AS.ui.centreOptions() },
          { k: 'mode', l: 'Mode', options: modeOptions() },
          { k: 'course', l: 'Course', options: [{ v: 'ALL', l: 'All courses' }].concat(S.courses().map((c) => ({ v: c.id, l: c.name }))) },
          {
            k: 'status',
            l: 'Status',
            options: [
              { v: 'ALL', l: 'All statuses' },
              { v: 'UPCOMING', l: 'Upcoming' },
              { v: 'ACTIVE', l: 'Active' },
              { v: 'COMPLETED', l: 'Completed' },
              { v: 'DELAYED', l: 'Delayed' },
              { v: 'CANCELLED', l: 'Cancelled' },
            ],
          },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(S.DEFAULT_BATCH)}
      />
      <div className="card">
        <div className="card-h">
          <h3>Batch register</h3>
        </div>
        <DataTable
          key={JSON.stringify(f)}
          rows={rows}
          columns={columns}
          pageSize={12}
          exportName="Batch_Register"
          search={['id']}
          searchLabel="batch ID"
          rowLink={(b) => '#/batches/' + b.id}
        />
      </div>
      <DemoNote />
      {creating && <CreateBatchModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateBatchModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Create batch"
      size="wide"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onClose();
              AS.ui.toast('This feature will be available soon.', 'ok');
            }}
          >
            Create batch
          </button>
        </>
      }
    >
      <div className="grid g2">
        <div className="fld">
          <label>Training mode</label>
          <select className="inp">
            <option>Offline — centre managed</option>
            <option>Online — centrally managed</option>
          </select>
        </div>
        <div className="fld">
          <label>Centre / unit</label>
          <select className="inp">
            {S.allCentres().map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Course</label>
          <select className="inp">
            {S.courses().map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Trainer</label>
          <select className="inp">
            {S.trainers().map((t) => (
              <option key={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="fld">
          <label>Seats</label>
          <input className="inp" defaultValue={S.config().batchSize} />
        </div>
        <div className="fld">
          <label>Start date</label>
          <input className="inp" type="date" defaultValue="2026-10-05" />
        </div>
      </div>
      <div className="mt14">
        <Callout tone="info">Batch ID will be auto-generated in the AMRUT-&lt;DISTRICT&gt;-&lt;CENTRE&gt;-B&lt;NNN&gt; format.</Callout>
      </div>
    </Modal>
  );
}

/* G-2: local data (above, unchanged) while "Show live LMS data" is off; the LMS's live data while it is on. */
export default function BatchesPage() {
  return <LmsDataSource local={<LocalBatchesPage />} live={<LiveBatchesPage />} />;
}
