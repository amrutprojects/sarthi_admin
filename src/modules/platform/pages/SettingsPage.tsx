import { useEffect, useState } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, KvList, LinkButton, Callout, DemoNote, Badge, ListRows, fmt, money } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import { useLegacyTick, bump } from '../../../utils/legacyBus';
import * as G from '../../../services/mock/governanceService';
import type { ProgrammeConfig } from '../../../types/domain';
import { Can } from '../../auth';

type FieldDef = [key: keyof ProgrammeConfig, label: string, type: 'text' | 'number' | 'date'];
const PROJECT_FIELDS: FieldDef[] = [
  ['projectName', 'Project name', 'text'], ['target', 'Total target (students)', 'number'],
  ['batchSize', 'Batch size', 'number'], ['trainingWeeks', 'Training duration (weeks)', 'number'],
  ['sessionsPerBatch', 'Sessions per batch', 'number'], ['minAttendancePct', 'Minimum attendance %', 'number'],
  ['passMarkPct', 'Assessment pass mark %', 'number'], ['plannedCentres', 'Planned offline centres', 'number'],
  ['projectStart', 'Project start date', 'date'], ['projectEnd', 'Project end date', 'date'], ['asOf', 'Project date (demo mode)', 'date'],
];
const COMMERCIAL_FIELDS: FieldDef[] = [['perStudentValue', 'Value per student (₹)', 'number'], ['coepChargePercent', 'COEP charge (%)', 'number']];
const ALL_FIELDS = PROJECT_FIELDS.concat(COMMERCIAL_FIELDS);

/* Toggle switch with the original .switch styling. */
function Switch({ on: initial = true }) {
  const [on, setOn] = useState(initial);
  return <button type="button" className={'switch' + (on ? ' on' : '')} aria-pressed={on} onClick={(e) => { e.stopPropagation(); setOn(!on); }} />;
}

export default function SettingsPage() {
  useLegacyTick();
  const DB = G.db();
  const c = DB.config;
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(ALL_FIELDS.map(([k]) => [k, String(c[k])])));
  const [resetting, setResetting] = useState(false);
  useEffect(() => { document.title = 'System settings — AMRUT × SUMAGO Admin'; }, []);

  function save() {
    const values = Object.fromEntries(ALL_FIELDS.map(([k, , type]) => [k, type === 'number' ? Number(form[k]) : form[k]]));
    const changed = G.saveConfig(values);
    AS.ui.toast(changed ? changed + ' setting(s) updated — dashboards will recalculate.' : 'No changes to save.', changed ? 'ok' : '');
    if (changed) bump();
  }
  const field = ([k, l, type]: FieldDef) => (
    <div className="fld" key={k}>
      <label htmlFor={'cfg-' + k}>{l}</label>
      <input className="inp" id={'cfg-' + k} type={type} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
    </div>
  );
  const enabled = <Badge tone="green">Enabled</Badge>;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'System settings' }]}
        title="System Settings"
        sub="Project configuration. Changing a value here updates every dashboard that derives from it."
        actions={<>
          <LinkButton to="#/administration">Master configuration</LinkButton>
          <Can action="editSettings"><button type="button" className="btn primary" onClick={save}>Save settings</button></Can>
        </>}
      />
      <div className="grid g2 mb14">
        <Card title="Project parameters"><div className="grid g2">{PROJECT_FIELDS.map(field)}</div></Card>
        <Card title="Commercial parameters" footer={<LinkButton to="#/finance" className="btn sm">Finance dashboard</LinkButton>}>
          <div className="grid g2">{COMMERCIAL_FIELDS.map(field)}</div>
          <div className="mt14">
            <KvList pairs={[
              ['Gross project value', money(c.target * c.perStudentValue)],
              ['COEP per student', money(Math.round(c.perStudentValue * c.coepChargePercent / 100))],
              ['COEP total at target', money(Math.round(c.perStudentValue * c.coepChargePercent / 100) * c.target)],
            ]} />
          </div>
          <Callout tone="warn" title="Indicative — subject to AMRUT / COEP approval">These are configuration values only and are never presented as agreed contractual terms.</Callout>
        </Card>
      </div>
      <div className="grid g3 mb14">
        <Card title="Training modes">
          <ListRows items={[
            { title: 'Offline training', sub: 'Centre-managed, physical delivery', right: <Switch />, icon: 'building' },
            { title: 'Online training', sub: 'Centrally managed via SUMAGO LMS', right: <Switch />, icon: 'globe' },
          ]} />
          <div className="mt10"><Callout tone="info" title="Two independent modes">The system deliberately has no combined or blended mode. A candidate belongs to exactly one mode.</Callout></div>
        </Card>
        <Card title="Notifications" flush>
          <ListRows items={[
            { title: 'SMS', sub: 'Transactional messages', right: <Switch /> },
            { title: 'WhatsApp', sub: 'Template messaging', right: <Switch /> },
            { title: 'Email', sub: 'Digests and certificates', right: <Switch /> },
            { title: 'In-app / push', sub: 'Student app notifications', right: <Switch /> },
            { title: 'Daily attendance alert', sub: 'Below 75% threshold', right: <Switch /> },
          ]} />
        </Card>
        <Card title="Integrations & providers">
          <KvList pairs={[
            ['Map provider', AS.map.provider], ['Alternate providers', 'Mapbox / Google Maps (API key required)'],
            ['LMS', c.lmsName + ' (mock)'], ['Student app', c.appName + ' (mock)'],
            ['Object storage', 'Configurable cloud storage'], ['Certificate template', 'AMRUT × SUMAGO 2026-27 v1'],
            ['Certificate numbering', 'AMRUT/SUM/YYYY/NNNNN'],
          ]} />
          <div className="f gp8 mt10">
            <LinkButton to="#/lms" className="btn sm block">LMS settings</LinkButton>
            <LinkButton to="#/student-app" className="btn sm block">App settings</LinkButton>
          </div>
        </Card>
      </div>
      <div className="grid g3">
        <Card title="Security" flush>
          <ListRows items={[
            { title: 'Role-based access control', sub: DB.ROLES.length + ' roles with explicit data scope', right: enabled, icon: 'shield' },
            { title: 'Protected routes', sub: 'Unauthenticated users are redirected to sign-in', right: enabled, icon: 'shield' },
            { title: 'Session management', sub: 'Session-scoped token, cleared on sign-out', right: enabled, icon: 'shield' },
            { title: 'Audit logging', sub: 'All changes recorded with old/new values', right: enabled, icon: 'doc', link: '#/audit' },
            { title: 'Secrets in environment variables', sub: 'No API keys in frontend source', right: <Badge tone="green">Enforced</Badge>, icon: 'shield' },
          ]} />
        </Card>
        <Card title="Data export" flush>
          <ListRows items={[
            { title: 'Excel export', sub: 'All tables', right: enabled, icon: 'download' },
            { title: 'CSV export', sub: 'All tables', right: enabled, icon: 'download' },
            { title: 'PDF export', sub: 'Print-ready preview', right: enabled, icon: 'download' },
            { title: 'Scheduled MIS pack', sub: 'Weekly to PMO', right: <Switch />, icon: 'mail' },
          ]} />
        </Card>
        <Card title="Demo environment">
          <KvList pairs={[
            ['Environment', 'DEMO / SAMPLE DATA'], ['Data persistence', 'None — changes last for the session only'],
            ['Records', fmt(DB.candidates.length) + ' candidates, ' + DB.batches.length + ' batches, ' + DB.allCentres.length + ' centres'],
            ['Districts', String(DB.districts.length)], ['Data disclaimer', 'Illustrative only'],
          ]} />
          <div className="mt10"><Callout tone="warn" title="Demo mode">This environment contains sample data only and must not be presented as actual government programme performance.</Callout></div>
          <Can action="editSettings"><button type="button" className="btn block mt10" onClick={() => setResetting(true)}>Reset demo data</button></Can>
        </Card>
      </div>
      <DemoNote />
      {resetting && (
        <Modal title="Reset demo data" onClose={() => setResetting(false)} footer={<>
          <button type="button" className="btn" onClick={() => setResetting(false)}>Cancel</button>
          <button type="button" className="btn danger" onClick={() => window.location.reload()}>Reload</button>
        </>}>
          <p style={{ margin: 0 }}>Reload the page to restore the original demo dataset. Any session changes will be lost.</p>
        </Modal>
      )}
    </div>
  );
}
