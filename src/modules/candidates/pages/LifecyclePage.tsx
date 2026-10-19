import { useEffect } from 'react';
import { PageHead, Card, LinkButton, DemoNote, Badge, Callout, fmt, useGo } from '../../../components/ui';
import { Funnel } from '../../../components/charts';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/candidateService';
import type { CandidateStatus } from '../../../types/domain';

export default function LifecyclePage() {
  useLegacyTick();
  const go = useGo();
  useEffect(() => { document.title = 'Candidate lifecycle — AMRUT × SUMAGO Admin'; }, []);

  const m = S.mobilization();
  const k = S.stateKpis();
  const stages = [
    { l: 'Awareness (reach)', v: m.awareness, c: '#DCC9B4' },
    { l: 'Engagement', v: m.engagement, c: '#F2D3B0' },
    { l: 'Website visits', v: m.websiteVisits, c: '#EDBE8E' },
    { l: 'Enquiry', v: m.enquiries, c: '#E2A166' },
    { l: 'Lead', v: m.leads, c: '#D9843A', link: '#/mobilization' },
    { l: 'Registration', v: k.applications, c: '#C8651C', link: '#/candidates?bucket=applications' },
    { l: 'Documents submitted', v: m.documents, c: '#B5551C', link: '#/candidates?bucket=docs' },
    { l: 'Verification', v: k.applications - k.docsPending, c: '#A34D18', link: '#/candidates?bucket=verification' },
    { l: 'Eligible', v: k.eligible, c: '#7A3A16', link: '#/candidates?bucket=eligible' },
    { l: 'Enrollment', v: k.enrolled, c: '#5C2A0D', link: '#/candidates?bucket=enrolled' },
    { l: 'Batch allocation', v: k.enrolled, c: '#1E7A46', link: '#/batches' },
    { l: 'Training', v: k.trainingActive, c: '#16A34A', link: '#/candidates?bucket=active' },
    { l: 'Assessment', v: k.assessed, c: '#6B3FA0', link: '#/assessments' },
    { l: 'Completion', v: k.completed, c: '#A85B08', link: '#/candidates?bucket=completed' },
    { l: 'Certification', v: k.certified, c: '#E88C2C', link: '#/certification' },
  ];
  const counts: Partial<Record<CandidateStatus, number>> = {};
  S.candidates().forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Candidates', link: '#/candidates' }, { l: 'Lifecycle & funnel' }]}
        title="Candidate Lifecycle & Funnel"
        sub="End-to-end conversion from awareness through certification. Click any stage to open the underlying records."
        actions={<>
          <LinkButton to="#/marketing">Marketing funnel</LinkButton>
          <LinkButton to="#/mobilization">Mobilization funnel</LinkButton>
        </>}
      />
      <div className="grid g-2-1 mb14">
        <Card title="Full lifecycle funnel" sub="Marketing → mobilization → training → certification"><Funnel stages={stages} /></Card>
        <Card title="Conversion between stages" flush>
          <div className="list">
            {stages.slice(1).map((s, i) => {
              const prev = stages[i].v;
              const pct = Math.round(s.v / prev * 1000) / 10;
              return (
                <div key={s.l} className="list-row" onClick={s.link ? () => go(s.link) : undefined}>
                  <div className="lr-main"><b>{stages[i].l} → {s.l}</b><span>{fmt(prev)} → {fmt(s.v)}</span></div>
                  <b className="fs13" style={{ color: pct >= 70 ? 'var(--green)' : pct >= 30 ? 'var(--amber)' : 'var(--red)' }}>{pct}%</b>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card title="Candidate status engine — current distribution" sub="Click any status to open the filtered list">
        <div className="grid g4">
          {S.statuses().filter((s) => counts[s.k]).map((s) => (
            <div key={s.k} className="kpi" onClick={() => go('#/candidates?status=' + s.k)}>
              <div className="kpi-t">{s.l}</div>
              <div className="kpi-v" style={{ fontSize: 21 }}>{fmt(counts[s.k])}</div>
              <div className="kpi-d"><Badge tone={s.tone}>{s.l}</Badge></div>
            </div>
          ))}
        </div>
        <div className="mt14">
          <Callout tone="info" title="Configurable state machine">
            {'The programme uses ' + S.statuses().length + ' defined statuses. Transitions are recorded in each candidate timeline and in the system audit log. Statuses and permitted transitions are configurable under Administration.'}
          </Callout>
        </div>
      </Card>
      <DemoNote />
    </div>
  );
}
