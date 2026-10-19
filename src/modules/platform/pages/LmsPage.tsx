import { useEffect, useState } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, Callout, DemoNote, Badge, GenBadge, ListRows } from '../../../components/ui';
import { HBar } from '../../../components/charts';
import { Modal, Drawer } from '../../../components/ui/Overlay';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as G from '../../../services/mock/governanceService';
import { Can } from '../../auth';

const logIcon = (s: string) => (s === 'SUCCESS' ? ['var(--green-bg)', 'var(--green)'] : s === 'PARTIAL' ? ['var(--amber-bg)', 'var(--amber)'] : ['var(--brand-100)', 'var(--brand-600)']);

export default function LmsPage() {
  useLegacyTick();
  const [dialog, setDialog] = useState<'logs' | 'settings' | null>(null);
  useEffect(() => { document.title = 'LMS integration — AMRUT × SUMAGO Admin'; }, []);
  const DB = G.db();
  const l = DB.lms;
  const cfg = DB.config;
  const close = () => setDialog(null);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'LMS integration' }]}
        title={cfg.lmsName + ' Integration'}
        badge={<Badge tone="amber">DEMO / MOCK INTEGRATION</Badge>}
        sub="Integration-ready module. Not connected to a live LMS in this prototype — credentials would be supplied through environment variables."
        actions={<>
          <button type="button" className="btn" onClick={() => setDialog('logs')}><Icon name="doc" />View logs</button>
          <Can action="syncLms"><button type="button" className="btn" onClick={() => setDialog('settings')}><Icon name="settings" />Integration settings</button></Can>
          <Can action="syncLms"><button type="button" className="btn primary" onClick={() => AS.actions.syncLms()}><Icon name="refresh" />Sync now</button></Can>
        </>}
      />
      <div className="grid g4 mb14">
        <Kpi label="Connection status" value="Mock connected" tone="a" sub={l.endpoint} />
        <Kpi label="Last sync" value={l.lastSync.slice(5)} tone="b" sub={'Next: ' + l.nextSync.slice(5)} />
        <Kpi label="Students synced" value={l.studentsSynced} tone="g" link="#/candidates?mode=ONLINE" />
        <Kpi label="Courses synced" value={l.coursesSynced} tone="b" sub={l.modules + ' modules'} />
      </div>
      <div className="grid g4 mb14">
        <Kpi label="Assignments" value={l.assignmentsSubmitted} tone="b" />
        <Kpi label="MCQs completed" value={l.mcqsCompleted} tone="b" />
        <Kpi label="Assessments synced" value={l.assessmentsSynced} tone="v" link="#/assessments" />
        <Kpi label="Active users (7d)" value={l.activeUsers7d} tone="g" sub={'Avg session ' + l.avgSessionMin + ' min'} />
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Sync log" flush>
          <div className="list">
            {l.logs.map((g, i) => {
              const [bg, fg] = logIcon(g.s);
              return (
                <div key={i} className="list-row norow">
                  <div className="icon-sq" style={{ background: bg, color: fg }}><Icon name="refresh" /></div>
                  <div className="lr-main"><b>{g.m}</b><span className="mono">{g.t}</span></div>
                  <GenBadge status={g.s} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Integration-ready modules" sub="API-ready architecture" flush>
          <ListRows items={[
            { title: cfg.lmsName, sub: 'Courses, modules, MCQs, assignments, progress', right: <Badge tone="amber">Mock</Badge>, icon: 'plug' },
            { title: cfg.appName, sub: 'Study material, MCQs, notifications', right: <Badge tone="amber">Mock</Badge>, icon: 'phone', link: '#/student-app' },
            { title: 'SMS gateway', sub: 'Transactional SMS', right: <Badge tone="blue">Ready</Badge>, icon: 'mail' },
            { title: 'WhatsApp Business API', sub: 'Template messaging', right: <Badge tone="blue">Ready</Badge>, icon: 'mail' },
            { title: 'Email service', sub: 'Transactional email', right: <Badge tone="blue">Ready</Badge>, icon: 'mail' },
            { title: 'Google Maps / Mapbox', sub: 'Geographic map provider', right: <Badge tone="blue">Ready</Badge>, icon: 'pin' },
            { title: 'QR certificate verification', sub: 'Public verification endpoint', right: <Badge tone="green">Demo</Badge>, icon: 'qr', link: '#/verify' },
            { title: 'Analytics', sub: 'Portal and campaign analytics', right: <Badge tone="blue">Ready</Badge>, icon: 'chart' },
            { title: 'Future government systems', sub: 'Reserved integration slot', right: <Badge tone="grey">Planned</Badge>, icon: 'shield' },
          ]} />
        </Card>
      </div>
      <Card title="LMS activity by online batch">
        <HBar items={DB.batches.filter((b) => b.mode === 'ONLINE').map((b) => ({ l: b.id, v: b.progress, display: b.progress + '% · ' + b.students + ' learners', link: '#/batches/' + b.id, c: '#1E7A46' }))} opts={{ max: 100 }} />
      </Card>
      <DemoNote />

      {dialog === 'logs' && (
        <Drawer title="LMS sync logs" onClose={close} footer={<button type="button" className="btn" onClick={close}>Close</button>}>
          <div className="list">
            {l.logs.concat(l.logs).map((g, i) => (
              <div key={i} className="list-row norow"><div className="lr-main"><b>{g.m}</b><span className="mono">{g.t}</span></div><GenBadge status={g.s} /></div>
            ))}
          </div>
        </Drawer>
      )}
      {dialog === 'settings' && (
        <Modal title="LMS integration settings" onClose={close} footer={<>
          <button type="button" className="btn" onClick={close}>Cancel</button>
          <button type="button" className="btn primary" onClick={() => { close(); AS.ui.toast('Demo action recorded — no data was persisted.', 'ok'); }}>Save settings</button>
        </>}>
          <Callout tone="warn" title="Secrets are never stored in the frontend">API keys and secrets are supplied through server-side environment variables. The fields below are masked placeholders.</Callout>
          <div className="grid g2 mt14">
            <div className="fld"><label>Base URL</label><input className="inp" defaultValue="https://lms.sumago.demo/api/v2" /></div>
            <div className="fld"><label>API key</label><input className="inp" type="password" defaultValue="••••••••••••" autoComplete="off" /></div>
            <div className="fld"><label>Sync frequency</label><select className="inp"><option>Nightly 06:00</option><option>Every 6 hours</option><option>Hourly</option><option>Manual only</option></select></div>
            <div className="fld"><label>Conflict resolution</label><select className="inp"><option>LMS is source of truth for progress</option><option>Portal is source of truth</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
