import { useEffect } from 'react';
import { PageHead, Kpi, LinkButton, DemoNote, Badge, dateFmt, titleCase } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as G from '../../../services/mock/governanceService';
import type { AuditEntry } from '../../../types/domain';

const columns: Column<AuditEntry>[] = [
  { k: 'id', l: 'Log ID', render: (l) => <span className="mono">{l.id}</span> },
  { k: 'date', l: 'Date', exportVal: (l) => dateFmt(l.date), render: (l) => dateFmt(l.date) },
  { k: 'time', l: 'Time' },
  { k: 'user', l: 'User', render: (l) => <b>{l.user}</b> },
  { k: 'role', l: 'Role', exportVal: (l) => titleCase(l.role), render: (l) => <Badge tone="blue">{titleCase(l.role)}</Badge> },
  { k: 'action', l: 'Action' },
  { k: 'module', l: 'Module', render: (l) => <span className="tag">{l.module}</span> },
  { k: 'oldValue', l: 'Old value', render: (l) => <span className="muted">{l.oldValue}</span> },
  { k: 'newValue', l: 'New value', render: (l) => <b>{l.newValue}</b> },
  { k: 'ip', l: 'IP / device', exportVal: (l) => l.ip + ' ' + l.device, render: (l) => <><span className="mono">{l.ip}</span><div className="fs11 muted">{l.device}</div></> },
];

export default function AuditPage() {
  useLegacyTick();
  useEffect(() => { document.title = 'Audit log — AMRUT × SUMAGO Admin'; }, []);
  const log = G.db().auditLog;
  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Audit log' }]}
        title="System Activity / Audit Log"
        sub="Immutable record of every change: who, what, which module, when, and the old and new values."
        actions={<LinkButton to="#/reports" className="btn primary">Export</LinkButton>}
      />
      <div className="grid g4 mb14">
        <Kpi label="Log entries" value={log.length} tone="b" sub="Last 20 days (demo)" />
        <Kpi label="Modules tracked" value={12} tone="v" />
        <Kpi label="Users tracked" value={7} tone="b" />
        <Kpi label="Retention" value="7 years" tone="" sub="Configurable" />
      </div>
      <div className="card">
        <div className="card-h"><h3>Activity log</h3></div>
        <DataTable rows={log} columns={columns} pageSize={15} exportName="Audit_Log" search={['user', 'action', 'module']} />
      </div>
      <DemoNote />
    </div>
  );
}
