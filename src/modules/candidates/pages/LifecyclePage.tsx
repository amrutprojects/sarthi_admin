import { useEffect } from 'react';
import { PageHead, Card, LinkButton, DemoNote, DemoChip, Badge, Callout, fmt, useGo } from '../../../components/ui';
import { Funnel } from '../../../components/charts';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/candidateService';
import type { CandidateStatus } from '../../../types/domain';
import { asOfLabel, studentListLink, useStudentSummary, type StudentSummary } from '../../students';

/* A funnel stage; `live` stages come from the student register, the others are demo data. */
interface Stage {
  l: string;
  v: number;
  c: string;
  link?: string;
  live?: boolean;
}

/* Register tiles (live): each opens the real student list for its bucket. */
const LIVE_TILES: { l: string; v: (t: StudentSummary['totals']) => number; bucket?: string; tone: string }[] = [
  { l: 'Applications', v: (t) => t.applications, bucket: 'applications', tone: 'blue' },
  { l: 'Pending verification', v: (t) => t.pending, bucket: 'pending', tone: 'amber' },
  { l: 'Eligible', v: (t) => t.eligible, bucket: 'eligible', tone: 'green' },
  { l: 'Enrolled', v: (t) => t.enrolled, bucket: 'enrolled', tone: 'green' },
  { l: 'Awaiting batch', v: (t) => t.awaitingBatch, bucket: 'awaiting', tone: 'amber' },
  { l: 'Inactive', v: (t) => t.inactive, tone: 'grey' },
];

export default function LifecyclePage() {
  useLegacyTick();
  const go = useGo();
  useEffect(() => {
    document.title = 'Candidate lifecycle — AMRUT × SUMAGO Admin';
  }, []);

  const m = S.mobilization();
  const k = S.stateKpis();
  /* Registration, Verification, Eligible, Enrollment and Batch allocation are live; the rest stay demo. */
  const summary = useStudentSummary();
  const t = summary.data?.totals;
  const asOf = asOfLabel(summary.data?.asOf);
  const live = (v: number | undefined) => v ?? 0;
  const stages: Stage[] = [
    { l: 'Awareness (reach)', v: m.awareness, c: '#DCC9B4' },
    { l: 'Engagement', v: m.engagement, c: '#F2D3B0' },
    { l: 'Website visits', v: m.websiteVisits, c: '#EDBE8E' },
    { l: 'Enquiry', v: m.enquiries, c: '#E2A166' },
    { l: 'Lead', v: m.leads, c: '#D9843A', link: '#/mobilization' },
    { l: 'Registration', v: live(t?.applications), c: '#C8651C', link: studentListLink({ bucket: 'applications' }), live: true },
    { l: 'Documents submitted', v: m.documents, c: '#B5551C' },
    { l: 'Verification (pending)', v: live(t?.pending), c: '#A34D18', link: studentListLink({ bucket: 'pending' }), live: true },
    { l: 'Eligible', v: live(t?.eligible), c: '#7A3A16', link: studentListLink({ bucket: 'eligible' }), live: true },
    { l: 'Enrollment', v: live(t?.enrolled), c: '#5C2A0D', link: studentListLink({ bucket: 'enrolled' }), live: true },
    { l: 'Batch allocation', v: live(t?.enrolled), c: '#1E7A46', link: studentListLink({ bucket: 'enrolled' }), live: true },
    { l: 'Training', v: k.trainingActive, c: '#16A34A' },
    { l: 'Assessment', v: k.assessed, c: '#6B3FA0', link: '#/assessments' },
    { l: 'Completion', v: k.completed, c: '#A85B08' },
    { l: 'Certification', v: k.certified, c: '#E88C2C', link: '#/certification' },
  ];
  const counts: Partial<Record<CandidateStatus, number>> = {};
  S.candidates().forEach((c) => {
    counts[c.status] = (counts[c.status] || 0) + 1;
  });

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Candidates', link: '#/candidates' }, { l: 'Lifecycle & funnel' }]}
        title="Candidate Lifecycle & Funnel"
        sub={
          <>
            End-to-end conversion from awareness through certification. Click any stage to open the underlying records. Registration,
            Verification, Eligible, Enrollment and Batch allocation are live{asOf ? ' ' + asOf : ''}.
          </>
        }
        actions={
          <>
            <LinkButton to="#/marketing">Marketing funnel</LinkButton>
            <LinkButton to="#/mobilization">Mobilization funnel</LinkButton>
          </>
        }
      />
      {summary.isError ? (
        <div className="mb14">
          <Callout tone="err" title="Could not load the live student figures. ">
            The live stages show 0 until the server answers.{' '}
            <button type="button" className="btn xs" onClick={() => void summary.refetch()}>
              Retry
            </button>
          </Callout>
        </div>
      ) : null}

      <Card title="Student register — current distribution" sub={'Live' + (asOf ? ' ' + asOf : '') + ' · click a figure to open the list'}>
        <div className="grid g6">
          {LIVE_TILES.map((x) => (
            <div key={x.l} className="kpi" onClick={x.bucket ? () => go(studentListLink({ bucket: x.bucket })) : undefined}>
              <div className="kpi-t">{x.l}</div>
              <div className="kpi-v" style={{ fontSize: 21 }}>
                {summary.isPending ? '…' : t ? fmt(x.v(t)) : '—'}
              </div>
              <div className="kpi-d">
                <Badge tone={x.tone}>{x.bucket ? 'Live' : 'Live · not listed'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid g-2-1 mb14 mt14">
        <Card
          title={
            <>
              Full lifecycle funnel <DemoChip />
            </>
          }
          sub="Registration to enrollment are live"
        >
          <Funnel stages={stages} />
        </Card>
        <Card title="Conversion between stages" flush>
          <div className="list">
            {stages.slice(1).map((s, i) => {
              const prev = stages[i].v;
              const pct = prev > 0 ? Math.round((s.v / prev) * 1000) / 10 : null;
              const bothLive = s.live && stages[i].live;
              return (
                <div key={s.l} className="list-row" onClick={s.link ? () => go(s.link as string) : undefined}>
                  <div className="lr-main">
                    <b>
                      {stages[i].l} → {s.l} {bothLive ? null : <DemoChip />}
                    </b>
                    <span>
                      {fmt(prev)} → {fmt(s.v)}
                    </span>
                  </div>
                  <b
                    className="fs13"
                    style={{
                      color: pct == null ? 'var(--muted)' : pct >= 70 ? 'var(--green)' : pct >= 30 ? 'var(--amber)' : 'var(--red)',
                    }}
                  >
                    {pct == null ? '—' : pct + '%'}
                  </b>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card
        title={
          <>
            Candidate status engine — current distribution <DemoChip />
          </>
        }
        sub="Statuses of the full programme; the live student list (Candidates) filters by the stages above"
      >
        <div className="grid g4">
          {S.statuses()
            .filter((s) => counts[s.k])
            .map((s) => (
              /* Demo statuses: not links, since the live student list has no such status to filter by. */
              <div key={s.k} className="kpi">
                <div className="kpi-t">{s.l}</div>
                <div className="kpi-v" style={{ fontSize: 21 }}>
                  {fmt(counts[s.k])}
                </div>
                <div className="kpi-d">
                  <Badge tone={s.tone}>{s.l}</Badge>
                </div>
              </div>
            ))}
        </div>
        <div className="mt14">
          <Callout tone="info" title="Configurable state machine">
            {'The programme uses ' +
              S.statuses().length +
              ' defined statuses. Transitions are recorded in each candidate timeline and in the system audit log. Statuses and permitted transitions are configurable under Administration.'}
          </Callout>
        </div>
      </Card>
      <DemoNote>
        Indicative values, subject to AMRUT / COEP approval. Registration, Verification, Eligible, Enrollment and Batch allocation
        come from the live student register.
      </DemoNote>
    </div>
  );
}
