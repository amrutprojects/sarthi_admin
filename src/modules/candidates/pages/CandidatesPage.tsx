import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Callout, FilterBar, LinkButton, PageHead, fmt } from '../../../components/ui';
import { SOURCES, studentColumns as columns } from '../components/studentColumns';
import Icon from '../../../components/ui/Icon';
import {
  NO_TRACK,
  ServerTable,
  useStudentList,
  useStudentSummary,
  type StudentBucket,
  type StudentSource,
  type StudentSummary,
} from '../../students';
import { LmsSyncRegister, useLmsSyncFeature } from '../../lms-sync';

const PAGE_SIZE = 25;

const BUCKETS: { k: StudentBucket; l: string; count: (t: StudentSummary['totals']) => number }[] = [
  { k: 'applications', l: 'Applications', count: (t) => t.applications },
  { k: 'pending', l: 'Pending verification', count: (t) => t.pending },
  { k: 'eligible', l: 'Eligible', count: (t) => t.eligible },
  { k: 'enrolled', l: 'Enrolled', count: (t) => t.enrolled },
  { k: 'awaiting', l: 'Awaiting batch', count: (t) => t.awaitingBatch },
];

/* Filters live in the URL (shareable, and the dashboard links straight to them): bucket, centre, track, source, caste, education, q, page. */
type Filter = { centre: string; track: string; source: string; caste: string; education: string };
const FILTER_KEYS: (keyof Filter)[] = ['centre', 'track', 'source', 'caste', 'education'];
const EMPTY: Filter = { centre: '', track: '', source: '', caste: '', education: '' };
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function useListParams() {
  const [params, setParams] = useSearchParams();
  const raw = (k: string) => params.get(k) ?? '';
  const bucket = BUCKETS.find((b) => b.k === params.get('bucket'))?.k ?? 'applications';
  /* `district` is the older name of the district filter; values the API would reject are ignored. */
  const centre = (raw('centre') || raw('district')).toUpperCase();
  const track = raw('track');
  const f: Filter = {
    centre: /^[A-Z0-9]{2,10}$/.test(centre) ? centre : '',
    track: /^T\d{2}$/.test(track) || track === NO_TRACK ? track : '',
    source: raw('source') in SOURCES ? raw('source') : '',
    caste: isUuid(raw('caste')) ? raw('caste') : '',
    education: isUuid(raw('education')) ? raw('education') : '',
  };
  const page = Math.max(1, Number(params.get('page')) || 1);
  /* Any change except paging goes back to page 1. */
  const update = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        next.delete('district');
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  return { bucket, f, search: raw('q'), page, update };
}

/*
 * Candidate master. `?view=lms` (M1) shows the register's LMS sync view (GET /lms-sync/students: flag column, flag
 * filter, Push to LMS / Retry); it is offered only when the server reports the LMS sync and the user may read it.
 * Otherwise, and by default, the student register below is shown unchanged.
 */
export default function CandidatesPage() {
  const sync = useLmsSyncFeature();
  const [params, setParams] = useSearchParams();
  const lms = sync.visible && params.get('view') === 'lms';
  /* Switching view starts from clean filters: the two lists take different ones. */
  const viewSwitch = sync.visible ? (
    <div className="pills mb14" role="group" aria-label="Register view">
      {[
        { k: false, l: 'Register' },
        { k: true, l: 'LMS sync' },
      ].map((v) => (
        <button
          type="button"
          key={v.l}
          className={'chip' + (lms === v.k ? ' on' : '')}
          aria-pressed={lms === v.k}
          onClick={() => setParams(v.k ? { view: 'lms' } : {}, { replace: true })}
        >
          {v.l}
        </button>
      ))}
    </div>
  ) : null;
  return lms ? <LmsSyncRegister feature={sync} viewSwitch={viewSwitch} /> : <StudentRegister viewSwitch={viewSwitch} />;
}

/*
 * The real student register (GET /students), server-paged, with bucket chips counted by GET /students/summary.
 * Contact details stay masked; a row opens the student's masked detail.
 */
function StudentRegister({ viewSwitch }: { viewSwitch: ReactNode }) {
  const navigate = useNavigate();
  const { bucket, f, search, page, update } = useListParams();
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    document.title = 'Candidates — SARTHI Admin';
  }, []);
  /* Keep the box in step with the URL (back/forward), and commit typing after a pause. */
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== search) update({ q: searchInput.trim() });
    }, 300);
    return () => clearTimeout(t);
    // update is recreated each render; only the typed text matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, search]);

  /* Options come from the all-district summary; chip counts follow the district filter. */
  const all = useStudentSummary();
  const scoped = useStudentSummary(f.centre || undefined);
  const totals = scoped.data?.totals;
  const list = useStudentList({
    page,
    limit: PAGE_SIZE,
    bucket,
    search: search || undefined,
    centre: f.centre || undefined,
    track: f.track || undefined,
    source: (f.source || undefined) as StudentSource | undefined,
    casteId: f.caste || undefined,
    educationId: f.education || undefined,
  });

  const opt = (v: string, l: string) => ({ v, l });
  const s = all.data;
  const keepSelected = (options: { v: string; l: string }[], v: string) =>
    v && !options.some((o) => o.v === v) ? [...options, opt(v, 'Selected value')] : options;
  const fields = [
    {
      k: 'centre' as const,
      l: 'District',
      options: keepSelected([opt('', 'All districts'), ...(s?.byCentre ?? []).map((c) => opt(c.code, c.name))], f.centre),
    },
    {
      k: 'track' as const,
      l: 'Track',
      options: keepSelected(
        [
          opt('', 'All tracks'),
          ...(s?.byTrack ?? []).map((t) => (t.code ? opt(t.code, `${t.code} · ${t.name}`) : opt(NO_TRACK, 'To be confirmed'))),
        ],
        f.track,
      ),
    },
    {
      k: 'source' as const,
      l: 'Source',
      options: [opt('', 'All sources'), opt('IMPORT', 'Imported'), opt('PUBLIC_REGISTRATION', 'Registration')],
    },
    {
      k: 'caste' as const,
      l: 'Caste',
      options: keepSelected([opt('', 'All'), ...(s?.byCaste ?? []).flatMap((c) => (c.id ? [opt(c.id, c.name)] : []))], f.caste),
    },
    {
      k: 'education' as const,
      l: 'Education',
      options: keepSelected([opt('', 'All'), ...(s?.byEducation ?? []).flatMap((e) => (e.id ? [opt(e.id, e.name)] : []))], f.education),
    },
  ];

  const filtered = !!search || FILTER_KEYS.some((k) => f[k]);
  const registerEmpty = all.data?.totals.applications === 0;
  const total = list.data?.meta?.total;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Candidates' }]}
        title="Candidate Master"
        badge={
          <>
            <Badge tone="green">Live</Badge>
            {total != null ? <span className="tag">{fmt(total)} records</span> : null}
          </>
        }
        sub={
          <>
            Students in the register, imported and registered. Contact details are masked.
            {scoped.data
              ? ' Counts as of ' + new Date(scoped.data.asOf).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) + '.'
              : ''}
          </>
        }
        actions={
          <>
            <LinkButton to="#/lifecycle">Lifecycle funnel</LinkButton>
            <LinkButton to="#/student-import" icon="folder">
              Student import
            </LinkButton>
          </>
        }
      />

      {registerEmpty ? (
        <div className="mb14">
          <Callout tone="info" title="No students in the register yet. ">
            Imported students are added only when their import batch is finalised in Student Import (a second user with approval rights
            confirms the batch code).{' '}
            <LinkButton to="#/student-import" className="btn xs">
              Open Student Import
            </LinkButton>
          </Callout>
        </div>
      ) : null}

      {viewSwitch}

      <div className="pills mb14" role="group" aria-label="Student buckets">
        {BUCKETS.map((b) => (
          <button
            type="button"
            key={b.k}
            className={'chip' + (bucket === b.k ? ' on' : '')}
            aria-pressed={bucket === b.k}
            onClick={() => update({ bucket: b.k === 'applications' ? '' : b.k })}
          >
            {b.l} <b>{totals ? fmt(b.count(totals)) : scoped.isError ? '—' : '…'}</b>
          </button>
        ))}
      </div>

      <FilterBar
        id="candFilters"
        fields={fields}
        value={f}
        onChange={(key, v) => update({ [key]: v })}
        onReset={() => {
          setSearchInput('');
          update({ ...EMPTY, q: '' });
        }}
        extra={
          <input
            className="inp"
            placeholder="Name, code, source ID, email, mobile last 4"
            aria-label="Search students"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 260 }}
          />
        }
      />

      {list.isError ? (
        <div className="mb14">
          <Callout tone="err" title="Could not load the student list. ">
            <button type="button" className="btn xs" onClick={() => void list.refetch()}>
              <Icon name="refresh" />
              Retry
            </button>
          </Callout>
        </div>
      ) : null}

      <div className="card">
        <ServerTable
          rows={list.data?.items ?? []}
          columns={columns}
          meta={list.data?.meta}
          page={page}
          onPage={(p) => update({ page: String(p) })}
          onRowClick={(r) => navigate('/candidates/' + r.id)}
          loading={list.isFetching}
          empty={
            registerEmpty && !filtered
              ? 'No students in the register yet.'
              : list.isError
                ? 'The list could not be loaded.'
                : 'No students match the selected bucket and filters.'
          }
        />
      </div>
    </div>
  );
}
