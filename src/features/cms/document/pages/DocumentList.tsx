import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Dash, FilterBar, GenBadge, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan, useCanOpen } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import { listBackTarget } from '../../backTarget';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS, geoFilterOptions } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { masterOptions } from '../../options';
import { ConfirmModal, fmtDateTime, toastError, useAction, useApiData } from '../../shared';
import type { GeoOption } from '../../types';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { documentService, type DocumentQuery } from '../services/documentService';
import {
  CATEGORY_LABEL, DOCUMENT_CATEGORIES, VERIFICATION_LABEL, VERIFICATION_STATUSES, fileSizeLabel, fileTypeLabel, type ApiDocument,
} from '../types/document.types';

const CATEGORY_OPTIONS: Option[] = [{ v: '', l: 'All categories' }, ...DOCUMENT_CATEGORIES.map((c) => ({ v: c, l: CATEGORY_LABEL[c] }))];
const VERIFICATION_OPTIONS: Option[] = [{ v: '', l: 'Any verification' }, ...VERIFICATION_STATUSES.map((s) => ({ v: s, l: VERIFICATION_LABEL[s] }))];

/* The listing with no search and no filters, newest uploads first; centreId comes from a ?centreId= deep link. */
const emptyQuery = (centreId = ''): DocumentQuery => ({
  ...masterQuery('createdAt'),
  /* A document register is read by recency rather than A to Z. */
  sortOrder: 'desc',
  category: '',
  verificationStatus: '',
  stateId: '',
  districtId: '',
  centreId,
});

/*
 * Document Master listing. Accepts ?centreId= so a training centre can link straight to its documents.
 * The State filter lists the documents linked to a district of that state, and narrows the District filter.
 */
export default function DocumentList() {
  usePageTitle('Document Master');
  const go = useGo();
  const can = useCan();
  const canOpen = useCanOpen();
  const [params, setSearchParams] = useSearchParams();
  const urlCentreId = params.get('centreId') ?? '';

  const initial = useMemo<DocumentQuery>(() => emptyQuery(urlCentreId), [urlCentreId]);
  const { query: q, patch } = useMasterQuery<DocumentQuery>(initial);
  const page = useApiData(() => documentService.list(q), [q]);
  const centres = useApiData(() => masterOptions.trainingCentres(), []);
  const states = useApiData(() => masterOptions.states(), []);
  const districts = useApiData(
    () => (q.stateId ? masterOptions.districtsOfState(q.stateId) : Promise.resolve([] as GeoOption[])),
    [q.stateId],
  );
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiDocument | null>(null);
  const [confirming, setConfirming] = useState<ApiDocument | null>(null);

  /* A fresh ?centreId= (clicking through from a centre) replaces the filter; the mount value is already in. */
  const appliedCentreId = useRef(urlCentreId);
  useEffect(() => {
    if (appliedCentreId.current === urlCentreId) return;
    appliedCentreId.current = urlCentreId;
    patch({ centreId: urlCentreId });
  }, [urlCentreId, patch]);

  /*
   * Reset clears every filter, the deep-linked centre included: ?centreId= leaves the URL as well, so the
   * listing really shows all documents again instead of quietly restoring the link's centre.
   */
  const resetFilters = () => {
    if (urlCentreId) {
      appliedCentreId.current = '';
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('centreId');
        return next;
      }, { replace: true });
    }
    patch(emptyQuery());
  };

  /*
   * Totals for the KPI row: Total / Active / Inactive like every master, plus the approvers' queue. They
   * follow the centre / state / district filter (the page is then about that centre or area) but not the
   * search box or the other filters, so the tiles stay a stable frame of reference. Pending counts active
   * documents only: an inactive one cannot be verified until it is reactivated.
   */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(
    async () => {
      const scope = { centreId: q.centreId || undefined, stateId: q.stateId || undefined, districtId: q.districtId || undefined };
      const [total, active, pending] = await Promise.all([
        documentService.count(scope),
        documentService.count({ ...scope, isActive: 'true' }),
        documentService.count({ ...scope, verificationStatus: 'PENDING', isActive: 'true' }),
      ]);
      return { total, active, inactive: total - active, pending };
    },
    [statsKey, q.centreId, q.stateId, q.districtId],
  );

  const rows = page.data?.items ?? [];
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const download = async (r: ApiDocument) => {
    try {
      await documentService.download(r.id, r.fileName);
    } catch (err) {
      toastError(err);
    }
  };

  /* A deep-linked centre may be inactive (not in the active list); the filter then names it from the rows. */
  const linkedRow = q.centreId ? rows.find((r) => r.centreId === q.centreId) : undefined;
  /* Only an active centre can be linked to a new document, so an inactive deep-linked one is not carried into Add. */
  const centreIsOffered = !!q.centreId && (centres.data ?? []).some((c) => c.id === q.centreId);

  const columns: MasterColumn<ApiDocument>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'title', l: 'Title', render: (r) => <b className="lnk">{r.title}</b> },
    { k: 'category', l: 'Category', render: (r) => <span className="fs12">{CATEGORY_LABEL[r.category] ?? r.category}</span> },
    {
      k: 'linked',
      l: 'Linked To',
      sortable: false,
      render: (r) =>
        r.centreName || r.districtName ? (
          <div className="fs12">
            {r.centreName ? (
              <div>
                {r.centreName} {r.centreCode ? <span className="mono muted">{r.centreCode}</span> : null}
                {r.centreIsActive === false ? <span className="muted"> (inactive)</span> : null}
              </div>
            ) : null}
            {r.districtName ? (
              <div className="muted">
                {r.districtName} district{r.districtIsActive === false ? ' (inactive)' : ''}
              </div>
            ) : null}
          </div>
        ) : (
          <Dash />
        ),
    },
    {
      k: 'fileSize',
      l: 'File',
      render: (r) => (
        <div className="fs12" style={{ maxWidth: 240 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.fileName}>{r.fileName}</div>
          <div className="muted">{fileTypeLabel(r.mimeType)} · {fileSizeLabel(r.fileSize)}</div>
        </div>
      ),
    },
    { k: 'verificationStatus', l: 'Verification', render: (r) => <GenBadge status={r.verificationStatus} /> },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    {
      k: 'createdAt',
      l: 'Uploaded',
      render: (r) => (
        <div className="fs12">
          <div>{fmtDateTime(r.createdAt)}</div>
          {r.uploadedByName ? <div className="muted">by {r.uploadedByName}</div> : null}
        </div>
      ),
    },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/documents/${r.id}`)}><Icon name="eye" /></button>
          <button type="button" className="btn xs" title="Download" aria-label="Download" onClick={() => void download(r)}><Icon name="download" /></button>
          <Can action="updateCmsDocument">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/documents/${r.id}/edit`)}><Icon name="edit" /></button>
          </Can>
          <Can action="updateCmsDocument">
            <StatusToggle compact isActive={r.isActive} name={r.title} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteCmsDocument">
            <button type="button" className="btn xs" title="Delete" aria-label="Delete" style={{ color: 'var(--red)' }} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered =
    q.search !== '' || q.status !== '' || q.category !== '' || q.verificationStatus !== '' ||
    q.stateId !== '' || q.districtId !== '' || q.centreId !== '';
  const scoped = q.centreId !== '' || q.stateId !== '' || q.districtId !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'Masters' }, { l: 'Document Master' }]}
        title="Document Master"
        sub="Centre profiles, agreements, approval letters and other documents, stored privately and verified by an approver."
        back={
          <BackButton
            to={listBackTarget([[urlCentreId, '/cms/training-centres', can('viewTrainingCentres') && canOpen('cms-training-centres')]])}
          />
        }
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createCmsDocument">
              <button
                type="button"
                className="btn primary"
                onClick={() => go(centreIsOffered ? `/cms/documents/create?centreId=${q.centreId}` : '/cms/documents/create')}
              >
                <Icon name="plus" />Add Document
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: scoped ? 'Documents in scope' : 'Total documents', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Can be verified and downloaded' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept, but cannot be verified until reactivated' },
          { label: 'Pending verification', value: stats.data?.pending, tone: 'v', title: 'Active documents waiting for an approver' },
        ]}
      />

      <FilterBar
        id="cms-documents"
        fields={[
          { k: 'category', l: 'Category', options: CATEGORY_OPTIONS },
          { k: 'verificationStatus', l: 'Verification', options: VERIFICATION_OPTIONS },
          {
            k: 'centreId',
            l: 'Training centre',
            options: geoFilterOptions({
              options: centres.data ?? [],
              loading: centres.loading,
              allLabel: 'All centres',
              selected: q.centreId,
              selectedLabel: linkedRow?.centreName
                ? `${linkedRow.centreName}${linkedRow.centreCode ? ` (${linkedRow.centreCode})` : ''}${linkedRow.centreIsActive === false ? ' (inactive)' : ''}`
                : 'Selected centre (inactive)',
            }),
          },
          {
            k: 'stateId',
            l: 'State',
            options: geoFilterOptions({ options: states.data ?? [], loading: states.loading, allLabel: 'All states' }),
          },
          {
            k: 'districtId',
            l: 'District',
            options: geoFilterOptions({
              options: districts.data ?? [],
              loading: districts.loading,
              allLabel: 'All districts',
              waitingLabel: 'All districts (pick a state)',
              waiting: !q.stateId,
            }),
          },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{
          category: q.category,
          verificationStatus: q.verificationStatus,
          centreId: q.centreId,
          stateId: q.stateId,
          districtId: q.districtId,
          status: q.status,
        }}
        onChange={(key, value) =>
          patch(key === 'stateId' ? { stateId: value, districtId: '' } : ({ [key]: value } as Partial<DocumentQuery>))
        }
        onReset={resetFilters}
      />

      <div className="card">
        <div className="card-h">
          <h3>Documents <span className="sub">live from the backend</span></h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={q}
          onQuery={patch}
          onRetry={reload}
          searchLabel="title, file name or centre"
          emptyMsg={filtered ? 'No document matches the current search and filters.' : 'No documents have been uploaded yet. Use Add Document to upload the first one.'}
          rowLink={can('viewCmsDocuments') ? (r) => `/cms/documents/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate document' : 'Activate document'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Are you sure you want to deactivate the document ${confirming.title}? An inactive document is kept but cannot be verified.`
              : `Are you sure you want to activate the document ${confirming.title}?`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(() => documentService.setStatus(row.id, !row.isActive), row.isActive ? 'Document deactivated' : 'Document activated', async () => {
              setConfirming(null);
              await reload();
            });
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete document"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'document', id: deleting.id }}
          message={
            `Delete the document ${deleting.title}? It is soft-deleted: the record and its file are kept for audit history. ` +
            'No other record depends on a document, so nothing blocks the deletion.'
          }
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(() => documentService.remove(deleting.id), 'Document deleted', async () => {
              setDeleting(null);
              await reload();
            })
          }
        />
      ) : null}
    </div>
  );
}
