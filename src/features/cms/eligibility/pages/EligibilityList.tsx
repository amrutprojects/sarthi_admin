import { useMemo, useState, type ReactNode } from 'react';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import FieldTable, { Bi } from '../../components/FieldTable';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import { eligibilityService, type EligibilityQuery } from '../services/eligibilityService';
import {
  ELIGIBILITY_TABS,
  KIND_LABEL,
  SETTINGS_KEYS,
  SETTINGS_LABEL,
  eligibilityListPath,
  type ApiEligibilityItem,
  type EligibilityKind,
} from '../types/eligibility.types';

/* Where an item appears on the public page, for the confirmations. */
const listName = (r: ApiEligibilityItem) => (r.kind === 'DOCUMENT' ? 'required documents checklist' : 'eligibility criteria card');

/* The wording of the two list tabs. */
const LIST_COPY: Record<
  EligibilityKind,
  { title: string; sub: string; labelCol: string; search: string; empty: string; emptyFiltered: string }
> = {
  CRITERION: {
    title: 'Eligibility criteria',
    sub: 'the label and value rows of the criteria card, in website order',
    labelCol: 'Criterion',
    search: 'criterion or value',
    empty: 'No criteria have been added yet. Use Add Criterion to create the first one.',
    emptyFiltered: 'No criterion matches the current search and filters.',
  },
  DOCUMENT: {
    title: 'Required documents',
    sub: 'the lines of the required documents checklist, in website order',
    labelCol: 'Document',
    search: 'document',
    empty: 'No documents have been added yet. Use Add Document to create the first one.',
    emptyFiltered: 'No document matches the current search and filters.',
  },
};

/* Page text tab: the heading, card titles and note around the two lists. */
function PageTextTab() {
  const go = useGo();
  const settings = useApiData(() => eligibilityService.getSettings(), []);
  const pageText = settings.data;
  return (
    <>
      <div className="card">
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
        {settings.loading || settings.error ? (
          <div className="card-b">
            <LoadState loading={settings.loading} error={settings.error} onRetry={() => void settings.reload()} />
          </div>
        ) : null}
        {pageText ? (
          <FieldTable rows={SETTINGS_KEYS.map((k): [string, ReactNode] => [SETTINGS_LABEL[k], <Bi value={pageText[k]} />])} />
        ) : null}
      </div>
      {pageText ? <div className="fs13 t2 mt10">Last updated {fmtDateTime(pageText.updatedAt)}.</div> : null}
    </>
  );
}

/*
 * Eligibility criteria / Required documents tab: one of the two lists, with its own search, status filter,
 * sorting and paging, all served by the backend, in website order by default.
 */
function ItemsTab({ kind, onChanged }: { kind: EligibilityKind; onChanged: () => void }) {
  const go = useGo();
  const can = useCan();
  const copy = LIST_COPY[kind];
  const initial = useMemo((): EligibilityQuery => ({ ...masterQuery('displayOrder'), kind }), [kind]);
  const { query, patch, reset } = useMasterQuery<EligibilityQuery>(initial);
  const page = useApiData(() => eligibilityService.list(query), [query]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiEligibilityItem | null>(null);
  const [confirming, setConfirming] = useState<ApiEligibilityItem | null>(null);

  /* Any write changes both this list and the totals above the tabs. */
  const reload = async () => {
    onChanged();
    await page.reload();
  };

  const columns: MasterColumn<ApiEligibilityItem>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="t2">{srNo}</span> },
    { k: 'displayOrder', l: 'Order', w: '86px', render: (r) => <b className="mono">{r.displayOrder}</b> },
    {
      k: 'labelEn',
      l: copy.labelCol,
      render: (r) => (
        <div>
          <b className="lnk">{r.label.en}</b>
          <div className="bi-alt" lang="mr">
            {r.label.mr}
          </div>
        </div>
      ),
    },
    /* Only a criterion carries a value; a document is a single line. */
    ...(kind === 'CRITERION'
      ? [
          {
            k: 'value',
            l: 'Value',
            sortable: false,
            render: (r: ApiEligibilityItem) =>
              r.value ? (
                <div>
                  <div className="bi-main" style={{ whiteSpace: 'pre-line' }}>
                    {r.value.en}
                  </div>
                  <div className="bi-alt" lang="mr" style={{ whiteSpace: 'pre-line' }}>
                    {r.value.mr}
                  </div>
                </div>
              ) : null,
          },
        ]
      : []),
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="t2">{fmtDateTime(r.updatedAt)}</span> },
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

  const filtered = query.search !== '' || query.status !== '';

  return (
    <>
      <FilterBar
        id={`cms-eligibility-${kind.toLowerCase()}`}
        fields={[{ k: 'status', l: 'Status', options: STATUS_OPTIONS }]}
        value={{ status: query.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<EligibilityQuery>)}
        onReset={reset}
      />

      <div className="card">
        <div className="card-h">
          <h3>
            {copy.title} <span className="sub">{copy.sub}</span>
          </h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <MasterTable
          columns={columns}
          rows={page.data?.items ?? []}
          meta={page.data?.meta}
          loading={page.loading}
          error={page.error}
          query={query}
          onQuery={patch}
          onRetry={reload}
          searchLabel={copy.search}
          emptyMsg={filtered ? copy.emptyFiltered : copy.empty}
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
    </>
  );
}

/*
 * Eligibility Page Management: the page text of the public Eligibility page, and its two lists — the
 * eligibility criteria and the required documents — one per tab, with the same tab strip as Modules Page
 * Management. Each list has its own search, status filter, sorting and paging, all served by the backend.
 * The active tab is kept in the URL (?tab=), so Back from an item or the page-text form returns to it.
 */
export default function EligibilityList() {
  usePageTitle('Eligibility Page Management');
  const go = useGo();
  const [tab, selectTab] = useSectionTab(ELIGIBILITY_TABS);

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
  const onChanged = () => setStatsKey((n) => n + 1);

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

      {/* The two list tiles open their tab. */}
      <MasterKpis
        items={[
          {
            label: 'Criteria',
            value: stats.data?.criteria,
            tone: 'b',
            title: 'Rows of the eligibility criteria card',
            link: eligibilityListPath('criteria'),
          },
          {
            label: 'Required documents',
            value: stats.data?.documents,
            tone: 'v',
            title: 'Lines of the required documents checklist',
            link: eligibilityListPath('documents'),
          },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Shown on the public Eligibility page' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept here but hidden from the website' },
        ]}
      />

      {/* Larger, higher-contrast table text than the panel defaults: see .cms-sections in cms-tables.css. */}
      <div className="cms-sections">
        <SectionTabBar tabs={ELIGIBILITY_TABS} active={tab} onChange={selectTab} idPrefix="eligibility" label="Eligibility page sections" />

        <SectionTabPanel tab="page" active={tab} idPrefix="eligibility">
          <PageTextTab />
        </SectionTabPanel>
        <SectionTabPanel tab="criteria" active={tab} idPrefix="eligibility">
          <ItemsTab kind="CRITERION" onChanged={onChanged} />
        </SectionTabPanel>
        <SectionTabPanel tab="documents" active={tab} idPrefix="eligibility">
          <ItemsTab kind="DOCUMENT" onChanged={onChanged} />
        </SectionTabPanel>
      </div>
    </div>
  );
}
