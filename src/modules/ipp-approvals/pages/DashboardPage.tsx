import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHead, fmt } from '../../../components/ui';
import type { Tone } from '../../../types/domain';
import { DecideAs, ReadOnlyNote } from '../components/DecideAs';
import { ApprovalNav, LoadProblem, Loading } from '../components/common';
import { useIppCrumbs } from '../hooks/useIppCrumbs';
import { useApprovalSummary, useBatches } from '../hooks/useIppApprovals';
import { STAGE_LABEL, STAGE_TONE } from '../labels';
import { STAGES, type ApplicationView, type ApprovalSummary, type Stage } from '../types/ippApprovals.types';
import { APPLICATIONS_PATH, BATCHES_PATH, useTitle } from '../utils';

/* The accent of a figure (styles: .kpi.b, .kpi.g, …) in the tone of its stage badge. */
const KPI_TONE: Partial<Record<Tone, string>> = { red: 'r', amber: 'a', blue: 'b', violet: 'v', green: 'g' };

const LISTS: { view: ApplicationView; label: string; tone: string; sub: string }[] = [
  { view: 'TO_DECIDE', label: 'To decide', tone: 's', sub: 'Wait for your decision now' },
  { view: 'SENT_ON', label: 'Sent on', tone: 'b', sub: 'Gone on above your level, final approvals included' },
  { view: 'SENT_BACK', label: 'Sent back', tone: 'r', sub: 'Sent back below your level by a rejection' },
  { view: 'ALL', label: 'All', tone: '', sub: 'Every application you may see' },
];

const STAGE_SUB: Record<Stage, string> = {
  AUDITOR: 'Sent back to IPP to correct',
  DIVISION: 'Wait for the Divisional Officer',
  COEP: 'Wait for the COEP',
  HEAD_OFFICE: 'Wait for the Head Officer (HO)',
  SUPER_ADMIN: 'Wait for the Super Admin',
  APPROVED: 'Final approval given',
};

const listPath = (view: ApplicationView, stage?: Stage) => `${APPLICATIONS_PATH}?view=${view}${stage ? `&stage=${stage}` : ''}`;
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

/* A figure that opens its list. undefined = not known (an API that does not count that list). */
function Figure({ to, label, value, sub, tone }: { to: string; label: string; value: number | undefined; sub: ReactNode; tone: string }) {
  return (
    <Link to={to} className={'kpi tw-block tw-text-inherit tw-no-underline ' + tone}>
      <div className="kpi-t">{label}</div>
      <div className="kpi-v">{value === undefined ? '—' : fmt(value)}</div>
      <div className="kpi-d">{sub}</div>
    </Link>
  );
}

function Overview({ summary, batches }: { summary: ApprovalSummary; batches: number | undefined }) {
  const decides = summary.stages.length > 0;
  const lists: Partial<Record<ApplicationView, number>> = summary.views ?? { TO_DECIDE: summary.toDecide, ALL: sum(summary.counts) };
  /* Head Office or Super Admin: the one that gives the final approval now, and the other only while it still holds some. */
  const stages = STAGES.filter((s) =>
    s === 'HEAD_OFFICE'
      ? summary.headOfficeEnabled || summary.counts[s] > 0
      : s === 'SUPER_ADMIN'
        ? !summary.headOfficeEnabled || summary.counts[s] > 0
        : true,
  );
  return (
    <>
      <Card title="Your lists" sub="Click a figure to open its list" cls="mb14">
        {/* The four lists and the batches on one row; all and the batches for a user who decides nothing. */}
        <div className={'grid ' + (decides ? 'g5' : 'g4')}>
          {(decides ? LISTS : LISTS.filter((l) => l.view === 'ALL')).map((l) => (
            <Figure
              key={l.view}
              to={listPath(l.view)}
              label={decides ? l.label : 'All applications'}
              value={lists[l.view]}
              tone={l.tone}
              sub={
                l.view === 'TO_DECIDE' && summary.sentBack
                  ? `${fmt(summary.sentBack)} sent back to you after a rejection`
                  : decides
                    ? l.sub
                    : 'Every application you may see'
              }
            />
          ))}
          <Figure to={BATCHES_PATH} label="Batches" value={batches} tone="v" sub="Sent by IPP, with applications you see" />
        </div>
      </Card>
      <Card title="Where the applications are" sub="Of the applications you see · click a figure to open them" cls="mb14">
        <div className={'grid ' + (stages.length > 5 ? 'g6' : 'g5')}>
          {stages.map((s) => (
            <Figure
              key={s}
              to={listPath('ALL', s)}
              label={STAGE_LABEL[s]}
              value={summary.counts[s]}
              tone={KPI_TONE[STAGE_TONE[s]] ?? ''}
              sub={STAGE_SUB[s]}
            />
          ))}
        </div>
      </Card>
    </>
  );
}

/*
 * The start screen of IPP Approvals: how many applications each list holds and where they are, each figure a link to
 * that list. Divisional Officers, COEP and Head Officers land here; what each one sees comes from the API (GET /summary).
 */
export default function DashboardPage() {
  useTitle('IPP dashboard');
  const summary = useApprovalSummary();
  const batches = useBatches({ page: 1, limit: 1 });
  const crumbs = useIppCrumbs({ l: 'Dashboard' });
  return (
    <div className="page">
      <PageHead
        crumbs={crumbs}
        title="IPP Dashboard"
        sub={summary.data ? <DecideAs summary={summary.data} /> : 'Student forms of the 3 Month Internship Placement Program (IPP).'}
      />
      <ApprovalNav current="dashboard" />
      {summary.data ? (
        <>
          <ReadOnlyNote summary={summary.data} />
          <Overview summary={summary.data} batches={batches.data?.meta.total} />
        </>
      ) : summary.isError ? (
        <LoadProblem error={summary.error} what="the IPP dashboard" onRetry={() => void summary.refetch()} />
      ) : (
        <Loading what="IPP dashboard" />
      )}
    </div>
  );
}
