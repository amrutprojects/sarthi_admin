import { Link, useSearchParams } from 'react-router-dom';
import { Card, PageHead, fmt } from '../../../components/ui';
import type { Tone } from '../../../types/domain';
import { useCan } from '../../auth';
import { DecideAs, ReadOnlyNote } from '../components/DecideAs';
import { CoepDashboard, DivisionDashboard, HeadOfficeDashboard } from '../components/RoleDashboards';
import { ApprovalNav, LoadProblem, Loading } from '../components/common';
import { useIppCrumbs } from '../hooks/useIppCrumbs';
import { useApprovalSummary, useBatches, useDashboardFigures } from '../hooks/useIppApprovals';
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

/*
 * A small figure that opens its list: its name and count, what it holds in the tooltip (and read out), and a short note
 * under the count when there is one. undefined = not known (an API that does not count that list).
 */
function Figure({
  to,
  label,
  value,
  hint,
  note,
  tone,
}: {
  to: string;
  label: string;
  value: number | undefined;
  hint: string;
  note?: string;
  tone: string;
}) {
  return (
    <Link to={to} title={hint} className={'kpi mini tw-block tw-text-inherit tw-no-underline ' + tone}>
      <div className="kpi-t">{label}</div>
      <div className="kpi-v">{value === undefined ? '—' : fmt(value)}</div>
      {note ? <div className="kpi-d">{note}</div> : null}
      <span className="tw-sr-only">{hint}</span>
    </Link>
  );
}

/*
 * The work of the lists, side by side under the charts so that the whole dashboard fits one screen: how many each list
 * holds, and where the applications are; each figure a link to its list.
 */
function WorkLists({ summary, batches }: { summary: ApprovalSummary; batches: number | undefined }) {
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
  /* The four lists and the batches; all and the batches for a user who decides nothing. */
  const shown = decides ? LISTS : LISTS.filter((l) => l.view === 'ALL');
  return (
    <div className="dash-lists">
      <Card title="Your lists" sub="Click a figure to open its list">
        <div className="dash-mini" style={{ gridTemplateColumns: `repeat(${shown.length + 1}, minmax(0, 1fr))` }}>
          {shown.map((l) => (
            <Figure
              key={l.view}
              to={listPath(l.view)}
              label={decides ? l.label : 'All applications'}
              value={lists[l.view]}
              tone={l.tone}
              hint={decides ? l.sub : 'Every application you may see'}
              note={l.view === 'TO_DECIDE' && summary.sentBack ? `${fmt(summary.sentBack)} sent back to you` : undefined}
            />
          ))}
          <Figure to={BATCHES_PATH} label="Batches" value={batches} tone="v" hint="Sent by IPP, with applications you see" />
        </div>
      </Card>
      <Card title="Where the applications are" sub="Of those you see · click to open">
        <div className="dash-mini" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
          {stages.map((s) => (
            <Figure
              key={s}
              to={listPath('ALL', s)}
              label={STAGE_LABEL[s]}
              value={summary.counts[s]}
              tone={KPI_TONE[STAGE_TONE[s]] ?? ''}
              hint={STAGE_SUB[s]}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

/*
 * Whose dashboard: the Head Office's (statewide), the COEP's (training, assessment, certification) or the Divisional
 * Officer's (their districts). A user sees the one of each level they hold, the Head Office's when they decide at none
 * (a Super Admin holds every level and can switch between the three).
 */
const PERSONAS = {
  HO: { label: 'Head Office', title: 'Head Office Dashboard', sub: 'How SARTHI tracks the programme: statewide, live.' },
  COEP: { label: 'COEP', title: 'COEP Dashboard', sub: 'How COEP tracks training, assessment and certification.' },
  DO: { label: 'Divisional Officer', title: 'Divisional Officer Dashboard', sub: 'How your districts are doing, live.' },
} as const;
type Persona = keyof typeof PERSONAS;

function usePersonas(): { personas: Persona[]; persona: Persona; choose: (p: Persona) => void } {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const held: Persona[] = [
    ...(can('decideIppHeadOffice') ? (['HO'] as const) : []),
    ...(can('decideIppCoep') ? (['COEP'] as const) : []),
    ...(can('decideIppDivision') ? (['DO'] as const) : []),
  ];
  const personas = held.length ? held : (['HO'] as Persona[]);
  const asked = params.get('as') as Persona | null;
  const persona = asked && personas.includes(asked) ? asked : personas[0];
  const choose = (p: Persona) => setParams(p === personas[0] ? {} : { as: p }, { replace: true });
  return { personas, persona, choose };
}

/*
 * The start screen of IPP Approvals: the dashboard of the user's level (figures from GET /dashboard), then the lists
 * with their counts and where the applications are, each figure a link to its list. Divisional Officers, COEP and Head
 * Officers land here.
 */
export default function DashboardPage() {
  const { personas, persona, choose } = usePersonas();
  const meta = PERSONAS[persona];
  useTitle(meta.title);
  const summary = useApprovalSummary();
  const figures = useDashboardFigures();
  const batches = useBatches({ page: 1, limit: 1 });
  const crumbs = useIppCrumbs({ l: 'Dashboard' });
  const Body = persona === 'COEP' ? CoepDashboard : persona === 'DO' ? DivisionDashboard : HeadOfficeDashboard;
  return (
    <div className="page dash-page">
      <PageHead
        crumbs={crumbs}
        title={meta.title}
        sub={
          <>
            {meta.sub} {summary.data ? <DecideAs summary={summary.data} /> : null}
          </>
        }
      />
      <ApprovalNav current="dashboard" />
      {summary.data ? <ReadOnlyNote summary={summary.data} /> : null}
      {personas.length > 1 ? (
        <div className="pills mb14" role="group" aria-label="Dashboard of">
          {personas.map((p) => (
            <button
              key={p}
              type="button"
              className={'chip' + (p === persona ? ' on' : '')}
              aria-pressed={p === persona}
              onClick={() => choose(p)}
            >
              {PERSONAS[p].label}
            </button>
          ))}
        </div>
      ) : null}
      {figures.data ? (
        <>
          <Body figures={figures.data} />
          <p className="dash-note">
            Attendance, assessments and their scores, certification and placement are not recorded in SARTHI yet: they show 0.
          </p>
        </>
      ) : figures.isError ? (
        <div className="mb14">
          <LoadProblem error={figures.error} what="the dashboard figures" onRetry={() => void figures.refetch()} />
        </div>
      ) : (
        <Loading what="dashboard figures" />
      )}
      {/* Then the work: the lists and where the applications are. */}
      {summary.data ? (
        <WorkLists summary={summary.data} batches={batches.data?.meta.total} />
      ) : summary.isError ? (
        <LoadProblem error={summary.error} what="the IPP applications" onRetry={() => void summary.refetch()} />
      ) : (
        <Loading what="IPP applications" />
      )}
    </div>
  );
}
