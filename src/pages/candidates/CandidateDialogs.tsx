import { useState } from 'react';
import AS from '../../legacy';
import { Modal, Drawer } from '../../components/ui/Overlay';
import { Callout, KvList } from '../../components/ui';
import * as S from '../../services/candidateService';
import type { Candidate, CandidateStatus } from '../../types/domain';

const toast = (m: string) => AS.ui.toast(m, 'ok');

interface CloseProps { onClose: () => void }

export function NewCandidateModal({ onClose }: CloseProps) {
  return (
    <Modal title="Add candidate (demo)" size="wide" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn primary" onClick={() => { onClose(); toast('Demo action recorded — no data was persisted.'); }}>Submit application</button>
    </>}>
      <Callout tone="info">This prototype does not persist new records. The form shows the fields captured during registration.</Callout>
      <div className="grid g2 mt14">
        {['Full name', 'Mobile number', 'Email', 'Date of birth', 'Gender', 'Qualification'].map((l) => (
          <div className="fld" key={l}><label>{l}</label><input className="inp" placeholder={l} /></div>
        ))}
        <div className="fld"><label>District</label><select className="inp">{S.districts().map((d) => <option key={d.code}>{d.name}</option>)}</select></div>
        <div className="fld"><label>Training mode</label><select className="inp"><option>Offline — centre based</option><option>Online — centrally managed</option></select></div>
      </div>
    </Modal>
  );
}

export function MessageDrawer({ candidate: c, onClose }: CloseProps & { candidate: Candidate }) {
  const cfg = S.config();
  return (
    <Drawer title={'Send message to ' + c.name} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn primary" onClick={() => { onClose(); toast('Message queued (demo) — see Communication Centre.'); }}>Send message</button>
    </>}>
      <div className="fld mb10"><label>Channel</label><select className="inp"><option>SMS</option><option>WhatsApp</option><option>Email</option><option>In-app notification</option></select></div>
      <div className="fld mb10"><label>Template</label><select className="inp"><option>Attendance advisory</option><option>Document reminder</option><option>Assessment schedule</option><option>Custom message</option></select></div>
      <div className="fld"><label>Message</label>
        <textarea className="inp" rows={5} defaultValue={'Dear ' + c.name + ', your attendance is currently ' + c.attendance + '%. Minimum required is ' + cfg.minAttendancePct + '%. Please contact your centre coordinator.'} />
      </div>
      <div className="mt14"><Callout tone="warn" title="Demo only">No SMS, WhatsApp or email is actually sent from this prototype.</Callout></div>
    </Drawer>
  );
}

export function BulkMessageDrawer({ onClose }: CloseProps) {
  return (
    <Drawer title="Bulk communication — at-risk students" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn primary" onClick={() => { onClose(); toast('Message queued (demo) — see Communication Centre.'); }}>Queue campaign</button>
    </>}>
      <KvList pairs={[['Audience', 'Students flagged at risk'], ['Recipients', String(S.atRiskCandidates().length)]]} />
      <div className="fld mt14"><label>Channel</label><select className="inp"><option>WhatsApp</option><option>SMS</option><option>Email</option></select></div>
      <div className="fld mt10"><label>Message</label>
        <textarea className="inp" rows={5} defaultValue="Your attendance/progress is below the programme minimum. Please contact your coordinator to avoid losing assessment eligibility." />
      </div>
      <div className="mt14"><Callout tone="warn" title="Demo only">Nothing is actually dispatched from this prototype.</Callout></div>
    </Drawer>
  );
}

export function StatusModal({ candidate: c, onClose, onSaved }: CloseProps & { candidate: Candidate; onSaved: () => void }) {
  const [status, setStatus] = useState<CandidateStatus>(c.status);
  const [remarks, setRemarks] = useState('');
  function save() {
    S.updateStatus(c.id, status);
    onClose();
    toast('Status updated to ' + S.statusDef(status).l + ' (session only).');
    onSaved();
  }
  return (
    <Modal title="Update candidate status" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn primary" onClick={save}>Update status</button>
    </>}>
      <KvList pairs={[['Candidate', c.name], ['Current status', S.statusDef(c.status).l]]} />
      <div className="fld mt14"><label htmlFor="ns">New status</label>
        <select className="inp" id="ns" value={status} onChange={(e) => setStatus(e.target.value as CandidateStatus)}>
          {S.statuses().map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
        </select>
      </div>
      <div className="fld mt10"><label>Remarks</label><textarea className="inp" rows={3} placeholder="Reason for the transition" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
      <div className="mt14"><Callout tone="info">Every transition is written to the candidate timeline and the system audit log.</Callout></div>
    </Modal>
  );
}

export function DocumentDrawer({ name, onClose }: CloseProps & { name: string }) {
  return (
    <Drawer title={name} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Close</button>
      <button type="button" className="btn primary" onClick={() => { onClose(); toast('Demo action recorded — no data was persisted.'); }}>Mark verified</button>
    </>}>
      <Callout tone="info">Document preview placeholder. In production the file is streamed from configurable object storage with signed, time-limited URLs.</Callout>
      <div className="skel mt14" style={{ height: 320 }} />
    </Drawer>
  );
}
