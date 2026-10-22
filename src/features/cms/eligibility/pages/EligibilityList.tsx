import { useMemo, useState, type ReactNode } from 'react';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import type { Option } from '../../../../types/legacy';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { eligibilityService, type EligibilityQuery } from '../services/eligibilityService';
import { KIND_LABEL, SETTINGS_KEYS, SETTINGS_LABEL, type ApiEligibilityItem, type Bilingual } from '../types/eligibility.types';

/* The listing with no search and no filters: criteria first, then documents, each in website order. */
const emptyQuery = (): EligibilityQuery => ({ ...masterQuery('kind'), kind: '' });

const TYPE_OPTIONS: Option[] = [
  { v: '', l: 'All types' },
  { v: 'CRITERION', l: 'Eligibility criteria' },
  { v: 'DOCUMENT', l: 'Required documents' },
];

/* Where an item appears on the public page, for the confirmations. */
const listName = (r: ApiEligibilityItem) => (r.kind === 'DOCUMENT' ? 'required documents checklist' : 'eligibility criteria card');

/* Marathi first, as on the public site; English underneath so both are checkable at a glance. */
const pair = (value: Bilingual) => (
  <div>
    <div lang="mr" style={{ whiteSpace: 'pre-line' }}>
      {value.mr}
    </div>
    <div className="muted fs12" lang="en" style={{ whiteSpace: 'pre-line' }}>
      {value.en}
    </div>
  </div>
);

/*
 * Eligibility Page Management: the page text of the public Eligibility page, and its two lists — the
 * eligibility criteria and the required documents — with search, type and status filters, sorting and
 * paging, all served by the backend.
 */
export default function EligibilityList() {
  usePageTitle('Eligibility Page Management');
  const go = useGo();
  const can = useCan();
  const initial = useMemo(() => emptyQuery(), []);
  const { query, patch, reset } = useMasterQuery<EligibilityQuery>(initial);
  const page = useApiData(() => eligibilityService.list(query), [query]);
  const settings = useApiData(() => eligibilityService.getSettings(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiEligibilityItem | null>(null);
  const [confirming, setConfirming] = useState<ApiEligibilityItem | null>(null);

  /* Totals for the KPI row: counted by the backend, so they ignore the current page and filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(async () => {
    const [criteria, documents, active] = await Promise.all([
      eligibilityService.count({ kind: 'CRITERION' }),
      eligibilityService.count({ kind: 'DOCUMENT' }),
      eligibilityService.count({ isActive: 'true' }),
    ]);
    return { criteria, documents, active, inactive: criteria + documents - active };
  }, [statsKey]);

  const rows = page.data?.items ?? [];
  const pageText = settings.data;
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiEligibilityItem>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'kind', l: 'Type', w: '110px', render: (r) => <span className="tag">{KIND_LABEL[r.kind]}</span> },
    { k: 'displayOrder', l: 'Order', w: '86px', render: (r) => <span className="mono fs12">{r.displayOrder}</span> },
    {
      k: 'labelEn',
      l: 'Item',
      render: (r) => (
        <div>
          <b className="lnk">{r.label.en}</b>
          <div className="muted fs12" lang="mr">
            {r.label.mr}
          </div>
          {r.value ? <div className="muted fs11 mt4">{r.value.en}</div> : null}
        </div>
      ),
    },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="fs12">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/eligibility/${r.id}`)}>
            <Icon name="eye" />
          </button>
          <Can action="updateEligibility">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/eligibility/${r.id}/edit`)}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateEligibility">
            <StatusToggle compact isActive={r.isActive} name={r.label.en} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteEligibility">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label="Delete"
              style={{ color: 'var(--red)' }}
              onClick={() => setDeleting(r)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = query.search !== '' || query.status !== '' || query.kind !== '';

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Eligibility Page Management' }]}
        title="Eligibility Page Management"
        sub="The public website's Eligibility page: its heading and note, the eligibility criteria and the required documents, in Marathi and English."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createEligibility">
              <button type="button" className="btn" onClick={() => go('/cms/eligibility/create?kind=DOCUMENT')}>
                <Icon name="plus" />
                Add Document
              </button>
            </Can>
            <Can action="createEligibility">
              <button type="button" className="btn primary" onClick={() => go('/cms/eligibility/create?kind=CRITERION')}>
                <Icon name="plus" />
                Add Criterion
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: 'Criteria', value: stats.data?.criteria, tone: 'b', title: 'Rows of the eligibility criteria card' },
          { label: 'Required documents', value: stats.data?.documents, tone: 'v', title: 'Lines of the required documents checklist' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Shown on the public Eligibility page' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept here but hidden from the website' },
        ]}
      />

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Page text <span className="sub">heading, card titles and note</span>
          </h3>
          {pageText ? (
            <Can action="updateEligibility">
              <button type="button" className="btn sm" onClick={() => go('/cms/eligibility/page/edit')}>
                <Icon name="edit" />
                Edit page text
              </button>
            </Can>
          ) : null}
        </div>
        <div className="card-b">
          <LoadState loading={settings.loading} error={settings.error} onRetry={() => void settings.reload()} />
          {pageText ? (
            <KvList
              pairs={[
                ...SETTINGS_KEYS.map((k): [string, ReactNode] => [SETTINGS_LABEL[k], pair(pageText[k])]),
                ['Last updated', fmtDateTime(pageText.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      <FilterBar
        id="cms-eligibility"
        fields={[
          { k: 'kind', l: 'Type', options: TYPE_OPTIONS },
          { k: 'status', l: 'Status', options: STATUS_OPTIONS },
        ]}
        value={{ kind: query.kind, status: query.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<EligibilityQuery>)}
        onReset={reset}
      />

      <div className="card">
        <div className="card-h">
          <h3>
            Criteria and documents <span className="sub">live from the backend</span>
          </h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={query}
          onQuery={patch}
          onRetry={reload}
          searchLabel="criterion, value or document"
          emptyMsg={
            filtered
              ? 'No criterion or document matches the current search and filters.'
              : 'Nothing has been added yet. Use Add Criterion or Add Document to create the first one.'
          }
          rowLink={can('viewEligibility') ? (r) => `/cms/eligibility/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={`${confirming.isActive ? 'Deactivate' : 'Activate'} ${KIND_LABEL[confirming.kind].toLowerCase()}`}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate "${confirming.label.en}"? It will no longer be shown in the ${listName(confirming)} on the public Eligibility page.`
              : `Activate "${confirming.label.en}"? It will be shown in the ${listName(confirming)} on the public Eligibility page.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => eligibilityService.setStatus(row.id, !row.isActive),
              `${KIND_LABEL[row.kind]} ${row.isActive ? 'deactivated' : 'activated'}`,
              async () => {
                setConfirming(null);
                await reload();
              },
            );
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title={`Delete ${KIND_LABEL[deleting.kind].toLowerCase()}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete "${deleting.label.en}"? It is removed from the ${listName(deleting)} on the public Eligibility page and soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(
              () => eligibilityService.remove(deleting.id),
              `${KIND_LABEL[deleting.kind]} deleted`,
              async () => {
                setDeleting(null);
                await reload();
              },
            )
          }
        />
      ) : null}
    </div>
  );
}
