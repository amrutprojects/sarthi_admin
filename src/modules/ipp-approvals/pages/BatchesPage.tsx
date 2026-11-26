import { Link } from 'react-router-dom';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import ServerTable, { type ServerColumn, type ServerSort } from '../../../components/tables/ServerTable';
import { PageHead, fmt } from '../../../components/ui';
import { ApprovalNav, ForWhom, LoadProblem, Loading, StageCounts, Wrap } from '../components/common';
import { useApprovalSummary, useBatches, useIppDistricts } from '../hooks/useIppApprovals';
import { useDebouncedSearch, useExistingPage, useListParams } from '../hooks/useListParams';
import type { BatchRow, BatchSort } from '../types/ippApprovals.types';
import { batchPath, useTitle } from '../utils';

const PAGE_SIZE = 25;
const SORTS: readonly BatchSort[] = ['receivedAt', 'name'];

const COLUMNS: ServerColumn<BatchRow>[] = [
  {
    key: 'name',
    label: 'Batch',
    sortKey: 'name',
    render: (b) => (
      <>
        <Link to={batchPath(b.id)} className="lnk">
          {b.name}
        </Link>
        <div className="mono fs12">{b.code}</div>
      </>
    ),
  },
  { key: 'district', label: 'District', render: (b) => b.district.name },
  { key: 'centre', label: 'Centre', render: (b) => <Wrap min={88}>{b.centre.name}</Wrap> },
  { key: 'students', label: 'Students', render: (b) => fmt(b.students) },
  {
    key: 'stages',
    label: 'Where they are now',
    render: (b) => (
      <Wrap min={180}>
        <StageCounts stages={b.stages} />
      </Wrap>
    ),
  },
  { key: 'toDecide', label: 'To decide', render: (b) => (b.toDecide ? <b>{fmt(b.toDecide)}</b> : '0') },
  { key: 'receivedAt', label: 'Received', sortKey: 'receivedAt', render: (b) => fmtDateTime(b.receivedAt) },
  {
    key: 'actions',
    label: 'Actions',
    render: (b) => (
      <Link to={batchPath(b.id)} className="btn xs tw-relative">
        Open
        <ForWhom>{`batch ${b.code}`}</ForWhom>
      </Link>
    ),
  },
];

/* The batches IPP has sent: a batch is listed when the user may see at least one of its applications. */
export default function BatchesPage() {
  useTitle('IPP batches');
  const { text, id, oneOf, page, update } = useListParams();
  const search = text('q');
  const districtId = id('district');
  const sortBy = oneOf('sort', SORTS);
  const sortOrder = oneOf('dir', ['ASC', 'DESC'] as const) ?? 'ASC';
  const sort: ServerSort | undefined = sortBy ? { sortBy, sortOrder } : undefined;
  const [searchInput, setSearchInput] = useDebouncedSearch(search, (q) => update({ q }));

  const summary = useApprovalSummary();
  const own = summary.data?.districts;
  const allDistricts = useIppDistricts(summary.isSuccess && !own);
  const districts = own ?? allDistricts.data ?? [];
  const list = useBatches({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    districtId: districtId || undefined,
    sortBy,
    sortOrder: sortBy ? sortOrder : undefined,
  });
  useExistingPage(page, list.isPlaceholderData ? undefined : list.data?.meta.totalPages, (p) => update({ page: String(p) }));

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'IPP Approvals', link: '#/ipp-approvals' }, { l: 'Batches' }]}
        title="IPP Batches"
        sub="Batches of student forms sent by the IPP Auditor. Counts cover the applications you may see."
      />
      <ApprovalNav current="batches" />

      <div className="filterbar" role="search" aria-label="Filter batches">
        <div className="fld">
          <label htmlFor="ipp-batch-q">Search</label>
          <input
            id="ipp-batch-q"
            className="inp"
            placeholder="Code, name or centre"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="fld">
          <label htmlFor="ipp-batch-district">District</label>
          <select id="ipp-batch-district" className="inp" value={districtId} onChange={(e) => update({ district: e.target.value })}>
            <option value="">All districts</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
            {districtId && !districts.some((d) => d.id === districtId) ? <option value={districtId}>Selected district</option> : null}
          </select>
        </div>
        <div className="fb-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSearchInput('');
              update({ q: '', district: '' });
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {list.isError ? (
        <LoadProblem error={list.error} what="the batches" onRetry={() => void list.refetch()} />
      ) : list.isPending ? (
        <div className="card">
          <div className="card-b">
            <Loading what="batches" />
          </div>
        </div>
      ) : (
        <div className="card">
          <ServerTable
            rows={list.data.items}
            rowKey={(b) => b.id}
            columns={COLUMNS}
            meta={list.data.meta}
            page={page}
            onPage={(p) => update({ page: String(p) })}
            sort={sort}
            onSort={(s) => update({ sort: s.sortBy, dir: s.sortOrder })}
            fetching={list.isFetching}
            emptyText={search || districtId ? 'No batches match these filters.' : 'No batches yet. They appear here when IPP sends one.'}
          />
        </div>
      )}
    </div>
  );
}
