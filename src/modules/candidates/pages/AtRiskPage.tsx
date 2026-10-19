import { useEffect, useState } from 'react';
import { PageHead, Card, Kpi, LinkButton, DemoNote, Badge, ModeTag, AttendanceCell, useGo } from '../../../components/ui';
import { HBar } from '../../../components/charts';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/candidateService';
import { BulkMessageDrawer, MessageDrawer } from './CandidateDialogs';
import type { Candidate, Risk } from '../../../types/domain';
import { Can } from '../../auth';

export default function AtRiskPage() {
  useLegacyTick();
  const go = useGo();
  const [bulk, setBulk] = useState(false);
  const [contact, setContact] = useState<Candidate | null>(null);
  useEffect(() => {
    document.title = 'At-risk engine — AMRUT × SUMAGO Admin';
  }, []);

  const risky = S.atRiskCandidates();
  const byType: Partial<Record<Risk['k'], number>> = {};
  risky.forEach((c) =>
    c.risks.forEach((r) => {
      byType[r.k] = (byType[r.k] || 0) + 1;
    }),
  );
  const riskyCentres = S.centres().filter((c) => c.score < 75 || c.attendance < 75);
  const riskyDistricts = S.districts().filter((d) => d.target > 0 && S.districtKpis(d).achievementPct < 85);

  const columns: Column<Candidate>[] = [
    { k: 'id', l: 'Candidate ID', render: (r) => <span className="lnk mono">{r.id}</span> },
    { k: 'name', l: 'Name', render: (r) => <b>{r.name}</b> },
    { k: 'districtId', l: 'District', exportVal: (r) => S.districtName(r.districtId), render: (r) => S.districtName(r.districtId) },
    { k: 'mode', l: 'Mode', render: (r) => <ModeTag mode={r.mode} /> },
    { k: 'batchId', l: 'Batch', render: (r) => (r.batchId ? <span className="mono">{r.batchId}</span> : '—') },
    {
      k: 'attendance',
      l: 'Attendance',
      align: 'right',
      exportVal: (r) => r.attendance + '%',
      render: (r) => <AttendanceCell value={r.attendance} />,
    },
    { k: 'progress', l: 'Progress', align: 'right', exportVal: (r) => r.progress + '%', render: (r) => r.progress + '%' },
    {
      k: 'reason',
      l: 'Risk reason',
      sortVal: (r) => r.risks[0].l,
      exportVal: (r) => r.risks.map((x) => x.l).join('; '),
      render: (r) =>
        r.risks.map((x, i) => (
          <span key={x.k}>
            {i ? ' ' : ''}
            <Badge tone={x.tone}>{x.l}</Badge>
          </span>
        )),
    },
    {
      k: 'act',
      l: '',
      sortable: false,
      exportVal: () => '',
      render: (r) => (
        <Can action="messageCandidate">
          <button
            type="button"
            className="btn xs"
            onClick={(e) => {
              e.stopPropagation();
              setContact(r);
            }}
          >
            Contact
          </button>
        </Can>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'At-risk engine' }]}
        title="At-Risk Engine"
        badge={<Badge tone="amber">{risky.length} students flagged</Badge>}
        sub="Automated risk detection across candidates, centres and districts. Every flag states its reason."
        actions={
          <>
            <LinkButton to="#/tasks">Create action</LinkButton>
            <Can action="sendCommunication">
              <button type="button" className="btn primary" onClick={() => setBulk(true)}>
                Bulk communication
              </button>
            </Can>
          </>
        }
      />
      <div className="grid g4 mb14">
        <Kpi label="Students at risk" value={risky.length} tone="a" link="#/candidates?bucket=risk" />
        <Kpi label="Attendance risk" value={byType.ATTENDANCE || 0} tone="r" link="#/candidates?bucket=lowatt" />
        <Kpi label="Centres at risk" value={riskyCentres.length} tone="a" link="#/centres?filter=low" />
        <Kpi label="Districts at risk" value={riskyDistricts.length} tone="a" link="#/districts?filter=critical" />
      </div>
      <div className="grid g3 mb14">
        <Card title="Why candidates are flagged">
          <HBar
            items={[
              { l: 'Attendance below minimum', v: byType.ATTENDANCE || 0, c: '#B3271E' },
              { l: 'No LMS / portal activity', v: byType.INACTIVE || 0, c: '#C98A1E' },
              { l: 'Curriculum progress behind', v: byType.PROGRESS || 0, c: '#A85B08' },
              { l: 'Assessment overdue', v: byType.ASSESSMENT || 0, c: '#6B3FA0' },
              { l: 'Documents pending', v: byType.DOCS || 0, c: '#146A72' },
            ]}
          />
        </Card>
        <Card title="Centres at risk" flush>
          <div className="list">
            {riskyCentres.map((c) => {
              const why = [];
              if (c.attendance < 75) why.push('attendance ' + c.attendance + '%');
              if (c.score < 75) why.push('centre score ' + c.score + '/100');
              if (!c.infra.power || c.infra.power === 'None') why.push('no power backup');
              return (
                <div key={c.id} className="list-row" onClick={() => go('#/centres/' + c.id)}>
                  <div className="lr-main">
                    <b>{c.name}</b>
                    <span>{why.join(' · ')}</span>
                  </div>
                  <Badge tone={c.score >= 70 ? 'amber' : 'red'}>{c.score}/100</Badge>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Districts at risk" flush>
          <div className="list">
            {riskyDistricts.slice(0, 8).map((d) => {
              const k = S.districtKpis(d);
              const st = S.districtStatus(d);
              return (
                <div key={d.code} className="list-row" onClick={() => go('#/districts/' + d.code)}>
                  <div className="lr-main">
                    <b>{d.name}</b>
                    <span>
                      Enrolled {k.enrolled} of {d.target} · {k.achievementPct}% of target
                    </span>
                  </div>
                  <Badge tone={st.tone}>{st.l}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>
            Flagged students <span className="sub">with reason</span>
          </h3>
        </div>
        <DataTable
          rows={risky}
          columns={columns}
          pageSize={12}
          exportName="At_Risk_Students"
          search={['id', 'name']}
          searchLabel="name or ID"
          rowLink={(r) => '#/candidates/' + r.id}
          defaultSort="attendance"
          defaultDir="asc"
        />
      </div>
      <DemoNote />
      {bulk && <BulkMessageDrawer onClose={() => setBulk(false)} />}
      {contact && <MessageDrawer candidate={contact} onClose={() => setContact(null)} />}
    </div>
  );
}
