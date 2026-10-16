import { useEffect } from 'react';
import { PageHead, Card, Kpi, KvList, LinkButton, Callout, DemoNote, Badge, GenBadge, Timeline, money } from '../../components/ui';
import { Stacked } from '../../components/charts';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { useLegacyTick } from '../../utils/legacyBus';
import * as G from '../../services/governanceService';
import type { Payment } from '../../types/domain';

type MoneyKey = 'm1' | 'm2' | 'm3' | 'committed' | 'paid';
const m = (k: MoneyKey, l: string): Column<Payment> => ({ k, l, align: 'right', exportVal: (p) => money(p[k]), render: (p) => money(p[k]) });
const columns: Column<Payment>[] = [
  { k: 'centreName', l: 'Centre', render: (p) => <b className="lnk">{p.centreName}</b> },
  { k: 'districtId', l: 'District', exportVal: (p) => G.districtName(p.districtId), render: (p) => G.districtName(p.districtId) },
  { k: 'enrolled', l: 'Enrolled', align: 'right' },
  { k: 'certified', l: 'Certified', align: 'right' },
  m('m1', 'M1 (30%)'), m('m2', 'M2 (40%)'), m('m3', 'M3 (30%)'), m('committed', 'Committed'), m('paid', 'Released'),
  { k: 'status', l: 'Status', render: (p) => <GenBadge status={p.status} /> },
];

export default function FinancePage() {
  useLegacyTick();
  useEffect(() => { document.title = 'Finance — AMRUT × SUMAGO Admin'; }, []);

  const DB = G.db();
  const cfg = DB.config;
  const gross = cfg.target * cfg.perStudentValue;
  const coepPer = Math.round(cfg.perStudentValue * cfg.coepChargePercent / 100);
  const coepTotal = coepPer * cfg.target;
  const committed = DB.payments.reduce((a, p) => a + p.committed, 0);
  const paid = DB.payments.reduce((a, p) => a + p.paid, 0);
  const earned = DB.stateKpis.enrolled * cfg.perStudentValue;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Finance' }]}
        title="Finance Dashboard"
        badge={<Badge tone="amber">Indicative / Configurable</Badge>}
        sub="Project-level financial tracking based on configurable commercial parameters."
        actions={<>
          <LinkButton to="#/settings">Edit parameters</LinkButton>
          <LinkButton to="#/reports" className="btn primary">Export</LinkButton>
        </>}
      />
      <div className="mb14">
        <Callout tone="warn" title="Indicative — subject to AMRUT / COEP approval">All commercial values on this screen are configuration parameters in the prototype. They do not represent contractual terms, approved rates or actual disbursement.</Callout>
      </div>
      <div className="grid g6 mb14">
        <Kpi label="Rate per student" value={money(cfg.perStudentValue)} tone="" sub="Configurable" />
        <Kpi label="Target students" value={cfg.target} tone="b" sub="Configurable" />
        <Kpi label="Gross project value" value={money(gross)} tone="v" sub="Target × rate" />
        <Kpi label="Earned (enrolled basis)" value={money(earned)} tone="g" pct={Math.round(earned / gross * 100)} progTone="g" />
        <Kpi label="Committed to centres" value={money(committed)} tone="s" />
        <Kpi label="Released to date" value={money(paid)} tone="g" sub={money(committed - paid) + ' balance'} />
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Budget position">
          <Stacked
            labels={['Gross value', 'Position']}
            series={[
              { l: 'Released', v: [0, paid], c: '#1E7A46' },
              { l: 'Committed (unpaid)', v: [0, committed - paid], c: '#C8651C' },
              { l: 'Payable on progress', v: [0, Math.max(0, earned - committed)], c: '#E88C2C' },
              { l: 'Balance / not yet earned', v: [gross, Math.max(0, gross - earned)], c: '#EFE2D2' },
            ]}
            opts={{ height: 230 }}
          />
          <div className="mt14">
            <KvList pairs={[
              ['Budget (gross project value)', money(gross)], ['Committed', money(committed)], ['Spent / released', money(paid)],
              ['Payable', money(Math.max(0, committed - paid))], ['Balance against budget', money(gross - committed)],
            ]} />
          </div>
        </Card>
        <Card title="Configurable charges" footer={<LinkButton to="#/settings" className="btn sm">Open settings</LinkButton>}>
          <KvList pairs={[
            ['Rate per student', money(cfg.perStudentValue)], ['COEP charge', cfg.coepChargePercent + '%'], ['COEP per student', money(coepPer)],
            ['COEP total at target', money(coepTotal)], ['Net per student after COEP', money(cfg.perStudentValue - coepPer)], ['Net project value', money(gross - coepTotal)],
          ]} />
          <div className="mt10"><Callout tone="info" title="Not hard-coded">The rate, target and COEP percentage are stored as project configuration and can be changed in System Settings without code changes.</Callout></div>
        </Card>
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Centre payment milestones" sub="30% on enrollment · 40% on training progress · 30% on certification (configurable)" flush>
          <DataTable rows={DB.payments} columns={columns} pageSize={10} exportName="Centre_Payment_Milestones" search={['centreName']} rowLink={(p) => '#/centres/' + p.centreId} />
        </Card>
        <Card title="Milestone model">
          <Timeline items={[
            { title: 'Milestone 1 — Enrollment', sub: '30% on verified enrollment', state: 'done' },
            { title: 'Milestone 2 — Training progress', sub: '40% on attendance-linked delivery', state: 'cur' },
            { title: 'Milestone 3 — Certification', sub: '30% on certified outcomes', state: '' },
          ]} />
          <div className="sep" />
          <KvList pairs={[['Verification', 'Attendance and outcome data from the portal'], ['Approval', 'Finance user + Project Director'], ['Audit', 'All changes written to the audit log']]} />
        </Card>
      </div>
      <DemoNote />
    </div>
  );
}
