import { useEffect } from 'react';
import AS from '../../../legacy';
import {
  PageHead,
  Card,
  Kpi,
  KvList,
  LinkButton,
  Callout,
  DemoNote,
  Badge,
  GenBadge,
  ProgRow,
  fmt,
  money,
  useGo,
} from '../../../components/ui';
import { Funnel, HBar, Ring } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/outcomeService';
import type { Campaign } from '../../../types/domain';
import type { Mobilization } from '../../../types/domain';
import { Can } from '../../auth';

const columns: Column<Campaign>[] = [
  { k: 'id', l: 'Campaign ID', render: (c) => <span className="lnk mono">{c.id}</span> },
  { k: 'name', l: 'Campaign', render: (c) => <b>{c.name}</b> },
  { k: 'platform', l: 'Platform' },
  { k: 'reach', l: 'Reach', align: 'right', exportVal: (c) => fmt(c.reach), render: (c) => fmt(c.reach) },
  { k: 'clicks', l: 'Clicks', align: 'right', exportVal: (c) => fmt(c.clicks), render: (c) => fmt(c.clicks) },
  { k: 'leads', l: 'Leads', align: 'right', exportVal: (c) => fmt(c.leads), render: (c) => fmt(c.leads) },
  { k: 'reg', l: 'Registrations', align: 'right', exportVal: (c) => fmt(c.reg), render: (c) => fmt(c.reg) },
  {
    k: 'conversion',
    l: 'Conversion',
    align: 'right',
    exportVal: (c) => c.conversion + '%',
    render: (c) => <ProgRow pct={Math.min(100, c.conversion * 2)} tone={c.conversion >= 30 ? 'g' : 'a'} label={c.conversion + '%'} />,
  },
  { k: 'cpl', l: 'Cost / lead', align: 'right', exportVal: (c) => '₹' + fmt(c.cpl), render: (c) => '₹' + fmt(c.cpl) },
  { k: 'spend', l: 'Spend', align: 'right', exportVal: (c) => money(c.spend), render: (c) => money(c.spend) },
  { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
];

const CHANNELS = (m: Mobilization): [label: string, value: number, sub: string, link: string][] => [
  ['Website', m.websiteVisits, 'visits', '#/marketing'],
  ['Facebook', 412000, 'reach', '#/marketing/CMP-001'],
  ['Instagram', 410000, 'reach', '#/marketing/CMP-002'],
  ['Paid ads', 168000, 'reach', '#/marketing/CMP-004'],
  ['SEO', 78000, 'organic reach', '#/marketing/CMP-008'],
  ['Reels', 124000, 'views', '#/marketing/CMP-007'],
  ['Success stories', 74, 'registrations', '#/marketing/CMP-007'],
  ['Expert content & FAQs', 18, 'assets published', '#/faq'],
];

export default function MarketingPage() {
  useLegacyTick();
  const go = useGo();
  useEffect(() => {
    document.title = 'Marketing — AMRUT × SUMAGO Admin';
  }, []);

  const m = S.mobilization();
  const cs = S.campaigns();
  const sum = (k: 'spend' | 'leads' | 'reach' | 'reg') => cs.reduce((a, c) => a + c[k], 0);
  const totalSpend = sum('spend'),
    totalLeads = sum('leads'),
    totalReach = sum('reach'),
    totalReg = sum('reg');
  const best = cs.slice().sort((a, b) => b.conversion - a.conversion)[0];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Marketing' }]}
        title="Marketing Dashboard"
        badge={<Badge tone="saffron">Marketing ≠ Mobilization</Badge>}
        sub={
          <>
            Awareness and demand generation. Candidate conversion after a lead is captured is tracked separately in{' '}
            <a onClick={() => go('#/mobilization')}>Mobilization</a>.
          </>
        }
        actions={
          <>
            <LinkButton to="#/mobilization">Mobilization dashboard</LinkButton>
            <Can action="manageCampaigns">
              <button
                type="button"
                className="btn primary"
                onClick={() => AS.ui.toast('This feature will be available soon.', 'ok')}
              >
                <Icon name="plus" />
                New campaign
              </button>
            </Can>
          </>
        }
      />
      <div className="grid g6 mb14">
        <Kpi label="Website visitors" value={m.websiteVisits} tone="b" />
        <Kpi label="Campaign reach" value={totalReach} tone="b" />
        <Kpi label="Social engagement" value={m.engagement} tone="v" />
        <Kpi label="Leads generated" value={totalLeads} tone="g" link="#/mobilization" />
        <Kpi label="Campaign conversion" value={Math.round((totalReg / totalLeads) * 1000) / 10 + '%'} tone="g" sub="lead → registration" />
        <Kpi label="Cost per lead" value={'₹' + Math.round(totalSpend / totalLeads)} tone="s" sub="Indicative" />
      </div>
      <div className="mb14">
        <Callout tone="info" title="Marketing funnel vs mobilization funnel">
          <b>Marketing:</b> Awareness → Reach → Engagement → Website visit → Enquiry → Lead. &nbsp; <b>Mobilization:</b> Lead → Registration
          → Documents → Verification → Eligibility → Enrollment. The handover point is the lead.
        </Callout>
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Marketing funnel" sub="Ends at lead — mobilization takes over from there">
          <Funnel
            stages={[
              { l: 'Awareness (impressions)', v: m.awareness, c: '#DCC9B4' },
              { l: 'Reach', v: m.reach, c: '#F2D3B0' },
              { l: 'Engagement', v: m.engagement, c: '#EDBE8E' },
              { l: 'Website visits', v: m.websiteVisits, c: '#E2A166' },
              { l: 'Enquiries', v: m.enquiries, c: '#C8651C' },
              { l: 'Leads', v: m.leads, c: '#E88C2C', link: '#/mobilization' },
            ]}
          />
        </Card>
        <Card
          title="Channel performance"
          footer={
            <LinkButton to="#/mobilization" className="btn sm">
              Source conversion
            </LinkButton>
          }
        >
          <HBar items={S.leadSources().map((s) => ({ l: s.s, v: s.leads, display: fmt(s.leads) + ' leads', c: '#C8651C' }))} />
        </Card>
      </div>
      <div className="grid g4 mb14">
        {CHANNELS(m).map(([l, v, sub, link]) => (
          <div key={l} className="card pad pointer" onClick={() => go(link)}>
            <div className="kpi-t">{l}</div>
            <div className="kpi-v" style={{ fontSize: 21 }}>
              {fmt(v)}
            </div>
            <div className="kpi-d">{sub}</div>
          </div>
        ))}
      </div>
      <div className="grid g3 mb14">
        {cs.slice(0, 6).map((c) => (
          <div key={c.id} className="card pad pointer" onClick={() => go('#/marketing/' + c.id)}>
            <div className="f jb ac">
              <span className="tag">{c.platform}</span>
              <GenBadge status={c.status} />
            </div>
            <b className="fs13 mt8" style={{ display: 'block' }}>
              {c.name}
            </b>
            <div className="grid g3 mt10" style={{ gap: 6 }}>
              {[
                ['Reach', fmt(c.reach)],
                ['Leads', fmt(c.leads)],
                ['Reg.', fmt(c.reg)],
              ].map(([l, v]) => (
                <div key={l} className="tc" style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '6px 3px' }}>
                  <div className="fs11 muted">{l}</div>
                  <b className="fs13">{v}</b>
                </div>
              ))}
            </div>
            <div className="f jb ac mt10 fs11">
              <span className="muted">Conversion</span>
              <b>{c.conversion}%</b>
            </div>
            <div className="prog sm mt4">
              <i className={c.conversion >= 30 ? 'g' : 'a'} style={{ width: Math.min(100, c.conversion * 2) + '%' }} />
            </div>
          </div>
        ))}
      </div>
      <Card
        title="Top performing campaign"
        action={
          <LinkButton to={'#/marketing/' + best.id} className="btn sm">
            Open campaign
          </LinkButton>
        }
      >
        <div className="f gp14 ac wrap">
          <Ring value={Math.min(100, best.conversion * 2)} opts={{ size: 110, label: best.conversion + '%', sub: 'conversion' }} />
          <div className="flex1">
            <KvList
              pairs={[
                ['Campaign', best.name],
                ['Platform', best.platform],
                ['Reach', fmt(best.reach)],
                ['Leads', fmt(best.leads)],
                ['Registrations', fmt(best.reg)],
                ['Cost per lead', '₹' + best.cpl],
              ]}
            />
          </div>
        </div>
      </Card>
      <div className="card mt14">
        <div className="card-h">
          <h3>All campaigns</h3>
        </div>
        <DataTable
          rows={cs}
          columns={columns}
          pageSize={10}
          exportName="Marketing_Campaigns"
          search={['name', 'platform']}
          rowLink={(c) => '#/marketing/' + c.id}
        />
      </div>
      <DemoNote />
    </div>
  );
}
