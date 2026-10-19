import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AS from '../../legacy';
import { Modal, Drawer } from '../ui/Overlay';
import { KvList, Callout, GenBadge, Badge, dateFmt, titleCase } from '../ui';
import { goTo } from '../../hooks/useLegacyEvents';
import { bump } from '../../utils/legacyBus';
import * as G from '../../services/mock/governanceService';
import { Can } from '../../modules/auth/components/Can';
import type { Task } from '../../types/domain';

/*
 * Dialogs that several pages open: task detail, create task, LMS sync.
 * Pages call AS.actions.openTask(id) / newTask(districtCode) / syncLms(),
 * which this host registers, so callers don't import each other.
 */
type Dialog =
  | { type: 'task'; id: string }
  | { type: 'newTask'; districtCode?: string }
  | { type: 'sync' };

let setGlobal: (d: Dialog | null) => void = () => {};
export const openGlobalDialog = (d: Dialog) => setGlobal(d);

export default function GlobalDialogs() {
  const [dlg, setDlg] = useState<Dialog | null>(null);
  useEffect(() => {
    setGlobal = setDlg;
    AS.actions.openTask = (id) => { if (id) setDlg({ type: 'task', id }); };
    AS.actions.newTask = (districtCode) => setDlg({ type: 'newTask', districtCode: districtCode ?? undefined });
    AS.actions.syncLms = () => setDlg({ type: 'sync' });
    return () => { setGlobal = () => {}; };
  }, []);
  const close = () => setDlg(null);
  if (!dlg) return null;
  if (dlg.type === 'task') return <TaskDrawer id={dlg.id} onClose={close} />;
  if (dlg.type === 'newTask') return <NewTaskModal districtCode={dlg.districtCode} onClose={close} />;
  if (dlg.type === 'sync') return <SyncModal onClose={close} />;
  return null;
}

const prioTone = (p: string) => (p === 'HIGH' ? 'red' : p === 'MEDIUM' ? 'amber' : 'grey');
export const Prio = ({ p }: { p: string }) => <Badge tone={prioTone(p)}>{titleCase(p)}</Badge>;

function TaskDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const navigate = useNavigate();
  const t = G.task(id);
  const [status, setStatus] = useState<Task['status']>(t ? t.status : 'OPEN');
  if (!t) return null;
  const task = t;
  function save() {
    G.updateTaskStatus(task.id, status);
    onClose();
    AS.ui.toast('Task updated (session only).', 'ok');
    bump();
  }
  return (
    <Drawer title={t.title} headExtra={<Prio p={t.priority} />} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Close</button>
      {t.ref ? <button type="button" className="btn" onClick={() => { onClose(); goTo(navigate, task.ref); }}>Open related record</button> : null}
      <Can action="updateTask"><button type="button" className="btn primary" onClick={save}>Save</button></Can>
    </>}>
      <KvList pairs={[['Task ID', t.id], ['Category', titleCase(t.type)], ['Owner', t.ownerName],
        ['Due date', dateFmt(t.due)], ['Status', titleCase(t.status)], ['District', t.district ? G.districtName(t.district) : 'Programme-wide']]} />
      <div className="sep" />
      <b className="fs12">Description</b>
      <p className="t2 fs13 mt4">{t.desc}</p>
      <div className="fld mt14"><label htmlFor="tkst">Update status</label>
        <select className="inp" id="tkst" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
      </div>
      <div className="fld mt10"><label>Reassign owner</label>
        <select className="inp" defaultValue={t.ownerName}>
          {G.taskOwners().map((p) => <option key={p.name}>{p.name}</option>)}
        </select>
      </div>
      <div className="fld mt10"><label>Comment</label><textarea className="inp" rows={3} placeholder="Action taken" /></div>
    </Drawer>
  );
}

function NewTaskModal({ districtCode, onClose }: { districtCode?: string; onClose: () => void }) {
  const DB = G.db();
  const selected = districtCode ? DB.districtBy[districtCode]?.name : 'Programme-wide';
  return (
    <Modal title="Create task" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <Can action="createTask"><button type="button" className="btn primary" onClick={() => { onClose(); AS.ui.toast('Demo action recorded — no data was persisted.', 'ok'); }}>Create &amp; assign</button></Can>
    </>}>
      <div className="fld mb10"><label>Title</label><input className="inp" placeholder="Describe the action required" /></div>
      <div className="grid g2">
        <div className="fld"><label>Category</label><select className="inp">{['Attendance', 'Centre', 'Trainer', 'District', 'Documents', 'Assessment', 'Certification', 'Batch', 'Finance', 'QA'].map((o) => <option key={o}>{o}</option>)}</select></div>
        <div className="fld"><label>Priority</label><select className="inp" defaultValue="Medium"><option>High</option><option>Medium</option><option>Low</option></select></div>
        <div className="fld"><label>Owner</label><select className="inp">{G.taskOwners().map((p) => <option key={p.name}>{p.name}</option>)}</select></div>
        <div className="fld"><label>Due date</label><input className="inp" type="date" defaultValue="2026-09-20" /></div>
        <div className="fld"><label>District</label>
          <select className="inp" defaultValue={selected}><option>Programme-wide</option>{DB.districts.map((d) => <option key={d.code}>{d.name}</option>)}</select>
        </div>
      </div>
      <div className="fld mt10"><label>Description</label><textarea className="inp" rows={3} /></div>
    </Modal>
  );
}

const SYNC_STEPS = ['Authenticating with mock endpoint…', 'Fetching learner roster…', 'Reconciling course progress…', 'Importing MCQ and assignment results…', 'Writing audit entries…'];

function SyncModal({ onClose }: { onClose: () => void }) {
  const DB = G.db();
  const [step, setStep] = useState(-1);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, SYNC_STEPS.length)), 620);
    return () => clearInterval(t);
  }, []);
  /* Side effects run once the last step is reached, outside the state updater. */
  useEffect(() => {
    if (step !== SYNC_STEPS.length) return;
    DB.lms.lastSync = new Date().toISOString().slice(0, 16).replace('T', ' ');
    AS.ui.toast('LMS sync completed (demo).', 'ok');
    bump();
  }, [step, DB]);
  const skel = (rows: number) => Array.from({ length: rows }, (_, i) => <div key={i} className="skel" style={{ height: 14, marginBottom: 10, width: (100 - i * 8) + '%' }} />);
  return (
    <Modal title={'Syncing with ' + DB.config.lmsName} onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Close</button>}>
      {step < SYNC_STEPS.length ? (
        <div>
          <div style={{ padding: '6px 0' }}>{skel(step < 0 ? 3 : 2)}</div>
          <div className="fs12 muted mt10">{step < 0 ? 'Connecting to mock LMS endpoint…' : SYNC_STEPS[step]}</div>
        </div>
      ) : (
        <div>
          <Callout tone="ok" title="Sync complete (demo)">{DB.lms.studentsSynced + ' learners, ' + DB.lms.coursesSynced + ' courses and ' + DB.lms.modules + ' modules reconciled. No live system was contacted.'}</Callout>
          <div className="mt14"><KvList pairs={[['Records processed', String(DB.lms.studentsSynced)], ['Errors', '0'], ['Duration', '3.2 s'], ['Completed at', DB.lms.lastSync]]} /></div>
        </div>
      )}
    </Modal>
  );
}

export { GenBadge };
