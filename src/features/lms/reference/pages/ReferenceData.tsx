import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Callout, FilterBar, PageHead, useGo } from '../../../../components/ui';
import { useCan, useCanOpen } from '../../../../modules/auth';
import BackButton from '../../../cms/components/BackButton';
import MasterKpis from '../../../cms/components/MasterKpis';
import { STATUS_OPTIONS } from '../../../cms/components/MasterFilters';
import MasterStatusBadge from '../../../cms/components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn, type MasterQuery } from '../../../cms/components/MasterTable';
import { LoadState, fmtDateTime, useApiData } from '../../../cms/shared';
import { usePageTitle, useMasterQuery } from '../../../cms/useMasterQuery';
import { referenceService, type ReferencePage } from '../services/referenceService';
import type {
  ApiReferenceCentre, ApiReferenceDistrict, ApiReferenceTrack, ReferenceDataset, ReferenceSummary,
} from '../types/reference.types';

const PATH = '/lms/reference-data';

const TABS: { k: ReferenceDataset; l: string }[] = [
  { k: 'districts', l: 'Districts' },
  { k: 'centres', l: 'Training Centres' },
  { k: 'tracks', l: 'Technology Tracks' },
];

const isDataset = (v: string | null): v is ReferenceDataset => TABS.some((t) => t.k === v);

const Dash = ({ title }: { title?: string }) => <span className="muted" title={title}>—</span>;

const srNoColumn = <T,>(): MasterColumn<T> => ({
  k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span>,
});
const statusColumn = <T extends { isActive: boolean }>(): MasterColumn<T> => ({
  k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} />,
});
/* "Source updated" sorts on the server's updatedAt sort field (the record's source update time). */
const sourceColumn = <T extends { sourceUpdatedAt: string }>(): MasterColumn<T> => ({
  k: 'updatedAt', l: 'Source Updated', render: (r) => <span className="fs12">{fmtDateTime(r.sourceUpdatedAt)}</span>,
});

/* Opens the record in the Admin Panel master that owns it — shown only to users who may open that screen. */
function OwnerLink({ to, label }: { to: string; label: string }) {
  const go = useGo();
  return (
    <button type="button" className="btn xs" title={label} aria-label={label} onClick={() => go(to)}>
      <Icon name="eye" />
    </button>
  );
}

interface DatasetTableProps<T extends { id: string }> {
  load: (q: MasterQuery) => Promise<ReferencePage<T>>;
  columns: MasterColumn<T>[];
  defaultSort: string;
  title: string;
  searchLabel: string;
  noun: string;
}

/* One read-only listing: server-side search, status filter, sort and paging; no Add / Edit / Delete / toggle. */
function DatasetTable<T extends { id: string }>({ load, columns, defaultSort, title, searchLabel, noun }: DatasetTableProps<T>) {
  const initial = useMemo(() => masterQuery(defaultSort), [defaultSort]);
  const { query: q, patch, reset } = useMasterQuery<MasterQuery>(initial);
  const page = useApiData(() => load(q), [q]);
  const filtered = q.search !== '' || q.status !== '';

  return (
    <>
      <FilterBar
        id={`lms-reference-${noun}`}
        fields={[{ k: 'status', l: 'Status', options: STATUS_OPTIONS }]}
        value={{ status: q.status }}
        onChange={(_key, value) => patch({ status: value as MasterQuery['status'] })}
        onReset={reset}
      />
      <div className="card">
        <div className="card-h">
          <h3>{title} <span className="sub">read-only · live from the Admin Panel</span></h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={columns}
          rows={page.data?.items ?? []}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={q}
          onQuery={patch}
          onRetry={page.reload}
          searchLabel={searchLabel}
          emptyMsg={
            filtered
              ? `No ${noun} match the current search and filters.`
              : `The Admin Panel has no ${noun} yet. They are added in the Admin Panel and appear here immediately.`
          }
        />
      </div>
    </>
  );
}

function DistrictsTab() {
  const can = useCan();
  const canOpen = useCanOpen();
  const canOpenOwner = can('viewDistricts') && canOpen('cms-districts');
  const columns: MasterColumn<ApiReferenceDistrict>[] = [
    srNoColumn(),
    { k: 'name', l: 'District Name', render: (r) => <b>{r.name}</b> },
    { k: 'code', l: 'District Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    {
      k: 'stateName',
      l: 'State',
      render: (r) => (
        <span className="fs12">
          {r.stateName}
          {r.stateIsActive ? null : <span className="muted"> (inactive)</span>}
        </span>
      ),
    },
    statusColumn(),
    sourceColumn(),
  ];
  if (canOpenOwner) {
    columns.push({
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => <OwnerLink to={`/cms/districts/${encodeURIComponent(r.id)}`} label={`Open ${r.name} in the District Master`} />,
    });
  }
  return (
    <DatasetTable
      load={referenceService.districts}
      columns={columns}
      defaultSort="name"
      title="Districts"
      searchLabel="district, code or state"
      noun="districts"
    />
  );
}

function CentresTab() {
  const can = useCan();
  const canOpen = useCanOpen();
  const canOpenOwner = can('viewTrainingCentres') && canOpen('cms-training-centres');
  const noInfrastructure = 'No capacity & infrastructure record for this centre in the Admin Panel';
  const columns: MasterColumn<ApiReferenceCentre>[] = [
    srNoColumn(),
    { k: 'name', l: 'Centre Name', render: (r) => <b>{r.name}</b> },
    { k: 'code', l: 'Centre Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    {
      k: 'districtName',
      l: 'District',
      render: (r) => (
        <span className="fs12">
          {r.districtName}
          {r.districtIsActive ? null : <span className="muted"> (inactive)</span>}
        </span>
      ),
    },
    { k: 'centreTypeName', l: 'Centre Type', render: (r) => (r.centreTypeName ? <span className="fs12">{r.centreTypeName}</span> : <Dash />) },
    { k: 'talukaName', l: 'Taluka', render: (r) => (r.talukaName ? <span className="fs12">{r.talukaName}</span> : <Dash />) },
    {
      k: 'maxSeatingCapacity',
      l: 'Seating Capacity',
      align: 'right',
      sortable: false,
      render: (r) => (r.maxSeatingCapacity === null ? <Dash title={noInfrastructure} /> : r.maxSeatingCapacity),
    },
    {
      k: 'computerSystems',
      l: 'Computer Systems',
      align: 'right',
      sortable: false,
      render: (r) => (r.computerSystems === null ? <Dash title={noInfrastructure} /> : r.computerSystems),
    },
    statusColumn(),
    sourceColumn(),
  ];
  if (canOpenOwner) {
    columns.push({
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => <OwnerLink to={`/cms/training-centres/${encodeURIComponent(r.id)}`} label={`Open ${r.name} in the Training Centre Master`} />,
    });
  }
  return (
    <>
      <div className="mb14">
        <Callout tone="warn" title="To Be Confirmed: ">
          readiness status and tracks offered (UI-314) are not recorded in the Admin Panel&apos;s Training Centre Profile yet,
          so they cannot be shown here.
        </Callout>
      </div>
      <DatasetTable
        load={referenceService.centres}
        columns={columns}
        defaultSort="name"
        title="Training Centres"
        searchLabel="centre, code, district, taluka or type"
        noun="training centres"
      />
    </>
  );
}

function TracksTab() {
  const columns: MasterColumn<ApiReferenceTrack>[] = [
    srNoColumn(),
    { k: 'sortOrder', l: 'Order', w: '80px', render: (r) => <span className="fs12">{r.sortOrder}</span> },
    { k: 'code', l: 'Track Code', render: (r) => <span className="mono fs12">{r.code}</span> },
    { k: 'name', l: 'Track Name', render: (r) => <b>{r.name}</b> },
    {
      k: 'aliases',
      l: 'Registration Form Names',
      sortable: false,
      render: (r) => (r.aliases.length ? <span className="fs12">{r.aliases.join(', ')}</span> : <Dash />),
    },
    statusColumn(),
    sourceColumn(),
  ];
  return (
    <DatasetTable
      load={referenceService.tracks}
      columns={columns}
      defaultSort="sortOrder"
      title="Technology Tracks"
      searchLabel="track, code or registration name"
      noun="technology tracks"
    />
  );
}

const kpi = (label: string, s: ReferenceSummary['districts'] | undefined, tab: ReferenceDataset, tone: string) => ({
  label,
  value: s?.total,
  tone,
  sub: s ? `${s.active} active · ${s.inactive} inactive` : undefined,
  link: `${PATH}?tab=${tab}`,
  title: s?.sourceUpdatedAt ? `Last changed in the Admin Panel ${fmtDateTime(s.sourceUpdatedAt)}` : undefined,
});

/*
 * Reference Data (UI-314; AMRUT_KALASH_03 L-03, L-07, BRL-309) — the Admin Panel's districts, training centres and
 * technology tracks, read-only in the LMS Admin. The two applications share one database, so the values are read
 * live: there is no reference copy, no synchronisation job and therefore no "synchronise now".
 */
export default function ReferenceData() {
  usePageTitle('Reference Data');
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: ReferenceDataset = isDataset(requested) ? requested : 'districts';
  const summary = useApiData(() => referenceService.summary(), []);
  const s = summary.data;

  const selectTab = (k: ReferenceDataset) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', k);
      return next;
    }, { replace: true });

  const lastChanged = (label: string, at: string | null | undefined) => (
    <span>
      {label}: <b>{at ? fmtDateTime(at) : 'no records'}</b>
    </span>
  );

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'LMS Admin' }, { l: 'Reference Data' }]}
        title="Reference Data"
        sub="Districts, training centres and technology tracks owned by the Admin Panel. Read-only in the LMS Admin: change them in the Admin Panel."
        back={<BackButton to="/dashboard" />}
      />

      <MasterKpis
        items={[
          kpi('Districts', s?.districts, 'districts', 'b'),
          kpi('Training centres', s?.centres, 'centres', 'g'),
          kpi('Technology tracks', s?.tracks, 'tracks', 'v'),
        ]}
      />

      {summary.error ? (
        <LoadState loading={false} error={summary.error} onRetry={summary.reload} />
      ) : (
        <div className="mb14">
          <Callout tone="info" title={s ? `Source: ${s.sync.source}${s.sync.mode === 'LIVE' ? ' · live' : ''}. ` : 'Source: loading… '}>
            The LMS Admin reads these records directly from the Admin Panel, so changes appear here immediately. There is no
            copy and no synchronisation job, so there is nothing to synchronise.
            {s ? (
              <div className="mt8 fs12">
                Last changed in the Admin Panel — {lastChanged('Districts', s.districts.sourceUpdatedAt)} ·{' '}
                {lastChanged('Training centres', s.centres.sourceUpdatedAt)} · {lastChanged('Technology tracks', s.tracks.sourceUpdatedAt)}
              </div>
            ) : null}
          </Callout>
        </div>
      )}

      <div className="tabs" role="tablist" aria-label="Reference datasets">
        {TABS.map((t) => (
          <button type="button" role="tab" aria-selected={tab === t.k} key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => selectTab(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Keyed by tab: each dataset keeps its own search, filter, sort and page, reset when the tab changes. */}
      <div role="tabpanel" aria-label={TABS.find((t) => t.k === tab)?.l}>
        {tab === 'districts' ? <DistrictsTab key="districts" /> : null}
        {tab === 'centres' ? <CentresTab key="centres" /> : null}
        {tab === 'tracks' ? <TracksTab key="tracks" /> : null}
      </div>
    </div>
  );
}
