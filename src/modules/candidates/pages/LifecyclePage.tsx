import { useEffect } from 'react';
import { PageHead, Card, LinkButton, Badge, Callout, NO_VALUE, NoData, NoDataLabel, fmt, useGo } from '../../../components/ui';
import { Funnel } from '../../../components/charts';
import { asOfLabel, studentListLink, useStudentSummary, type StudentSummary } from '../../students';

/*
 * Only the register stages (Registration to Batch allocation) have a live source. Mobilization stages before
 * registration and training stages after enrollment have none yet (user decision 24 Nov 2026): they are named
 * with "No data yet", never given sample counts.
 */
interface Stage {
  l: string;
  v: number;
  c: string;
  link: string;
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

/* Lifecycle stages with no live source yet. */
const NO_SOURCE_STAGES = [
  'Awareness (reach)',
  'Engagement',
  'Website visits',
  'Enquiry',
  'Lead',
  'Documents submitted',
  'Training',
  'Assessment',
  'Completion',
  'Certification',
];

export default function LifecyclePage() {
  const go = useGo();
  useEffect(() => {
    document.title = 'Candidate lifecycle — AMRUT × SUMAGO Admin';
  }, []);

  const summary = useStudentSummary();
  const t = summary.data?.totals;
  const asOf = asOfLabel(summary.data?.asOf);
  const live = (v: number | undefined) => v ?? 0;
  const stages: Stage[] = [
    { l: 'Registration', v: live(t?.applications), c: '#C8651C', link: studentListLink({ bucket: 'applications' }) },
    { l: 'Verification (pending)', v: live(t?.pending), c: '#A34D18', link: studentListLink({ bucket: 'pending' }) },
    { l: 'Eligible', v: live(t?.eligible), c: '#7A3A16', link: studentListLink({ bucket: 'eligible' }) },
    { l: 'Enrollment', v: live(t?.enrolled), c: '#5C2A0D', link: studentListLink({ bucket: 'enrolled' }) },
    { l: 'Batch allocation', v: live(t?.enrolled), c: '#1E7A46', link: studentListLink({ bucket: 'enrolled' }) },
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Candidates', link: '#/candidates' }, { l: 'Lifecycle & funnel' }]}
        title="Candidate Lifecycle & Funnel"
        sub={
          <>
            Conversion through the student register. Click any stage to open the underlying records. Registration, Verification, Eligible,
            Enrollment and Batch allocation are live{asOf ? ' ' + asOf : ''}.
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
        <Card title="Register funnel" sub={'Live' + (asOf ? ' ' + asOf : '')}>
          <Funnel stages={stages} />
        </Card>
        <Card title="Conversion between stages" flush>
          <div className="list">
            {stages.slice(1).map((s, i) => {
              const prev = stages[i].v;
              const pct = prev > 0 ? Math.round((s.v / prev) * 1000) / 10 : null;
              return (
                <div key={s.l} className="list-row" onClick={() => go(s.link)}>
                  <div className="lr-main">
                    <b>
                      {stages[i].l} → {s.l}
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

      <div className="grid g2">
        <Card title="Other lifecycle stages" sub="Mobilization before registration; training after enrollment" flush>
          <div className="list" data-testid="no-source-stages">
            {NO_SOURCE_STAGES.map((l) => (
              <div key={l} className="list-row">
                <div className="lr-main">
                  <b>{l}</b>
                  <NoDataLabel />
                </div>
                <b className="fs13 muted">{NO_VALUE}</b>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Candidate status engine — current distribution">
          <NoData />
        </Card>
      </div>
    </div>
  );
}
