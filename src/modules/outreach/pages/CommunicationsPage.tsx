import { useEffect, useState } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, Callout, DemoNote, Badge, GenBadge, ListRows, fmt } from '../../../components/ui';
import { Drawer } from '../../../components/ui/Overlay';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/outcomeService';
import type { Communication } from '../../../types/domain';
import { Can } from '../../auth';

const columns: Column<Communication>[] = [
  { k: 'id', l: 'ID', render: (c) => <span className="mono">{c.id}</span> },
  { k: 'name', l: 'Campaign', render: (c) => <b>{c.name}</b> },
  { k: 'channel', l: 'Channel', render: (c) => <Badge tone="blue">{c.channel}</Badge> },
  { k: 'audience', l: 'Audience' },
  { k: 'recipients', l: 'Recipients', align: 'right', exportVal: (c) => fmt(c.recipients), render: (c) => fmt(c.recipients) },
  { k: 'delivered', l: 'Delivered', align: 'right', exportVal: (c) => fmt(c.delivered), render: (c) => fmt(c.delivered) },
  { k: 'read', l: 'Read', align: 'right', exportVal: (c) => (c.read ? fmt(c.read) : '—'), render: (c) => (c.read ? fmt(c.read) : '—') },
  { k: 'when', l: 'Schedule' },
  { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
];

const active = <Badge tone="green">Active</Badge>;
const TEMPLATES = [
  { title: 'Attendance advisory', sub: 'Triggered when attendance < 75%', right: active, icon: 'alert' },
  { title: 'Document reminder', sub: 'Documents pending beyond 7 days', right: active, icon: 'doc' },
  { title: 'Batch start reminder', sub: '2 days before batch start', right: active, icon: 'calendar' },
  { title: 'Assessment schedule', sub: 'On assessment scheduling', right: active, icon: 'check' },
  { title: 'Certificate issued', sub: 'On certificate issuance', right: active, icon: 'award' },
  { title: 'Weekly centre digest', sub: 'Every Monday 08:00 to centre managers', right: active, icon: 'mail' },
];
const demoToast = () => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok');

export default function CommunicationsPage() {
  useLegacyTick();
  const [creating, setCreating] = useState(false);
  useEffect(() => { document.title = 'Communications — AMRUT × SUMAGO Admin'; }, []);

  const all = S.communications();
  const sent = all.filter((c) => c.status === 'SENT');
  const recips = sent.reduce((a, c) => a + c.recipients, 0);
  const delivered = sent.reduce((a, c) => a + c.delivered, 0);
  const rate = recips ? Math.round(delivered / recips * 100) : 0;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Communications' }]}
        title="Communication Centre"
        sub="SMS, WhatsApp, email and in-app notifications to candidates, centres and trainers. Integration-ready — no messages are dispatched in this prototype."
        actions={<Can action="sendCommunication"><button type="button" className="btn primary" onClick={() => setCreating(true)}><Icon name="plus" />Create campaign</button></Can>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Campaigns" value={all.length} tone="b" />
        <Kpi label="Sent" value={sent.length} tone="g" />
        <Kpi label="Scheduled" value={all.filter((c) => c.status === 'SCHEDULED').length} tone="a" />
        <Kpi label="Drafts" value={all.filter((c) => c.status === 'DRAFT').length} tone="" />
        <Kpi label="Recipients reached" value={recips} tone="b" />
        <Kpi label="Delivery rate" value={recips ? rate + '%' : '—'} tone="g" pct={rate} progTone="g" />
      </div>
      <div className="grid g4 mb14">
        {['SMS', 'WhatsApp', 'Email', 'In-App'].map((ch) => {
          const rows = all.filter((c) => c.channel === ch);
          const r = rows.reduce((a, c) => a + c.recipients, 0);
          const d = rows.reduce((a, c) => a + c.delivered, 0);
          return (
            <div key={ch} className="card pad">
              <div className="f jb ac"><b className="fs13">{ch}</b><Badge tone="blue">Integration-ready</Badge></div>
              <div className="grid g2 mt10" style={{ gap: 8 }}>
                <div><div className="fs11 muted">Recipients</div><b className="fs16">{fmt(r)}</b></div>
                <div><div className="fs11 muted">Delivered</div><b className="fs16">{fmt(d)}</b></div>
              </div>
              <div className="prog sm mt8"><i className="g" style={{ width: (r ? Math.round(d / r * 100) : 0) + '%' }} /></div>
            </div>
          );
        })}
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Campaign log" flush>
          <DataTable rows={all} columns={columns} pageSize={10} exportName="Communication_Log" search={['name', 'channel', 'audience']} />
        </Card>
        <Card title="Message templates" flush footer={<Can action="sendCommunication"><button type="button" className="btn sm" onClick={demoToast}>Manage templates</button></Can>}>
          <ListRows items={TEMPLATES} />
        </Card>
      </div>
      <DemoNote />
      {creating && <CampaignDrawer onClose={() => setCreating(false)} />}
    </div>
  );
}

export function CampaignDrawer({ onClose }: { onClose: () => void }) {
  const done = () => { onClose(); AS.ui.toast('Message queued (demo) — see Communication Centre.', 'ok'); };
  return (
    <Drawer title="Create communication campaign" size="wide" onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn" onClick={done}>Save draft</button>
      <button type="button" className="btn primary" onClick={done}>Schedule campaign</button>
    </>}>
      <div className="grid g2">
        <div className="fld"><label>Campaign name</label><input className="inp" placeholder="e.g. October batch reminder" /></div>
        <div className="fld"><label>Channel</label><select className="inp"><option>SMS</option><option>WhatsApp</option><option>Email</option><option>In-app notification</option></select></div>
        <div className="fld"><label>Audience</label><select className="inp">{['All candidates', 'Enrolled candidates', 'Training active', 'Attendance below 75%', 'Documents pending', 'Certified candidates', 'Centre managers', 'Trainers'].map((o) => <option key={o}>{o}</option>)}</select></div>
        <div className="fld"><label>District</label><select className="inp"><option>All districts</option>{S.districts().map((d) => <option key={d.code}>{d.name}</option>)}</select></div>
        <div className="fld"><label>Centre</label><select className="inp"><option>All centres</option>{S.allCentres().map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
        <div className="fld"><label>Batch</label><select className="inp"><option>All batches</option>{S.batches().map((b) => <option key={b.id}>{b.id}</option>)}</select></div>
        <div className="fld"><label>Training mode</label><select className="inp"><option>All modes</option><option>Offline</option><option>Online</option></select></div>
        <div className="fld"><label>Schedule</label><input className="inp" type="datetime-local" defaultValue="2026-09-10T09:30" /></div>
      </div>
      <div className="fld mt10"><label>Message</label><textarea className="inp" rows={5} placeholder="Message body" /></div>
      <div className="mt14"><Callout tone="warn" title="Demo only">Gateways are represented as integration-ready modules. Nothing is dispatched from this prototype.</Callout></div>
    </Drawer>
  );
}
