import { useEffect } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, KvList, LinkButton, DemoNote, Badge, StatusBadge, ModeTag, fmt, dateFmt, useGo } from '../../../components/ui';
import { Funnel, Donut, HBar } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/outcomeService';
import type { Candidate } from '../../../types/domain';

const columns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name' },
  { k: 'districtId', l: 'District', exportVal: (x) => S.districtName(x.districtId), render: (x) => S.districtName(x.districtId) },
  { k: 'source', l: 'Lead source' },
  { k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> },
  { k: 'appliedOn', l: 'Applied on', exportVal: (x) => dateFmt(x.appliedOn), render: (x) => dateFmt(x.appliedOn) },
  { k: 'status', l: 'Status', exportVal: (x) => AS.db.STATUS_MAP[x.status].l, render: (x) => <StatusBadge status={x.status} /> },
];

export default function MobilizationPage() {
  useLegacyTick();
  const go = useGo();
  useEffect(() => { document.title = 'Mobilization — AMRUT × SUMAGO Admin'; }, []);

  const m = S.mobilization();
  const k = S.stateKpis();
  const sources = S.leadSources();
  const pal = S.palette();
  const recent = S.candidates().slice().sort((a, b) => (a.appliedOn < b.appliedOn ? 1 : -1)).slice(0, 200);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Mobilization' }]}
        title="Mobilization Dashboard"
        badge={<Badge tone="blue">Lead → Enrollment</Badge>}
        sub={<>Candidate mobilization from lead capture to enrollment. Awareness and demand generation are tracked separately in <a onClick={() => go('#/marketing')}>Marketing</a>.</>}
        actions={<>
          <LinkButton to="#/marketing">Marketing dashboard</LinkButton>
          <LinkButton to="#/candidates" className="btn primary">Candidate master</LinkButton>
        </>}
      />
      <div className="grid g8 mb14">
        <Kpi label="Leads" value={m.leads} tone="b" />
        <Kpi label="Enquiries" value={m.enquiries} tone="b" />
        <Kpi label="Registrations" value={k.applications} tone="b" link="#/candidates" />
        <Kpi label="Documents submitted" value={m.documents} tone="b" link="#/candidates?bucket=docs" />
        <Kpi label="Verification pending" value={k.underVerification + k.docsPending} tone="a" link="#/candidates?bucket=verification" />
        <Kpi label="Eligible" value={k.eligible} tone="g" link="#/candidates?bucket=eligible" />
        <Kpi label="Enrolled" value={k.enrolled} tone="g" link="#/candidates?bucket=enrolled" />
        <Kpi label="Lead → enrollment" value={Math.round(k.enrolled / m.leads * 1000) / 10 + '%'} tone="s" />
      </div>
      <div className="grid g-2-1 mb14">
        <Card title="Mobilization funnel" sub="Starts at lead — marketing hands over here">
          <Funnel stages={[
            { l: 'Leads', v: m.leads, c: '#DCC9B4' },
            { l: 'Registrations', v: k.applications, c: '#EDBE8E', link: '#/candidates' },
            { l: 'Documents submitted', v: m.documents, c: '#E2A166', link: '#/candidates?bucket=docs' },
            { l: 'Verified', v: k.applications - k.docsPending - k.underVerification, c: '#C8651C', link: '#/candidates?bucket=verification' },
            { l: 'Eligible', v: k.eligible, c: '#7A3A16', link: '#/candidates?bucket=eligible' },
            { l: 'Enrolled', v: k.enrolled, c: '#1E7A46', link: '#/candidates?bucket=enrolled' },
          ]} />
        </Card>
        <Card title="Conversion by source" flush>
          <div className="list">
            {sources.map((s) => {
              const conv = Math.round(s.enr / s.leads * 1000) / 10;
              return (
                <div key={s.s} className="list-row norow">
                  <div className="lr-main">
                    <b>{s.s}</b><span>{fmt(s.leads)} leads → {fmt(s.reg)} registered → {fmt(s.enr)} enrolled</span>
                    <div className="prog sm mt4"><i className={conv >= 25 ? 'g' : 'a'} style={{ width: Math.min(100, conv * 3) + '%' }} /></div>
                  </div>
                  <b className="fs13">{conv}%</b>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div className="grid g3 mb14">
        <Card title="Leads by source">
          <Donut
            items={sources.map((s, i) => ({ l: s.s, v: s.leads, c: pal[i % pal.length] }))}
            opts={{ centerValue: fmt(sources.reduce((a, s) => a + s.leads, 0)), centerLabel: 'Total leads', size: 176 }}
          />
        </Card>
        <Card title="Registrations by source"><HBar items={sources.map((s) => ({ l: s.s, v: s.reg, display: fmt(s.reg), c: '#C8651C' }))} /></Card>
        <Card title="Verification pipeline">
          <KvList pairs={[
            ['Registrations received', fmt(k.applications)], ['Documents pending', fmt(k.docsPending)],
            ['Under verification', fmt(k.underVerification)], ['Found eligible', fmt(k.eligible)],
            ['Found not eligible', fmt(k.notEligible)], ['Enrolled', fmt(k.enrolled)], ['Eligible awaiting enrollment', fmt(k.eligible - k.enrolled)],
          ]} />
          <div className="f gp8 wrap mt14">
            <LinkButton to="#/candidates?bucket=docs" className="btn sm block">Documents pending</LinkButton>
            <LinkButton to="#/candidates?bucket=verification" className="btn sm block">Under verification</LinkButton>
          </div>
        </Card>
      </div>
      <div className="card">
        <div className="card-h"><h3>Recent registrations</h3></div>
        <DataTable rows={recent} columns={columns} pageSize={10} exportName="Mobilization_Registrations" search={['id', 'name', 'source']} rowLink={(x) => '#/candidates/' + x.id} />
      </div>
      <DemoNote />
    </div>
  );
}
