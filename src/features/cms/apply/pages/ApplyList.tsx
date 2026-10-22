import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../../../components/ui/Icon';
import { Callout, EmptyState, FilterBar, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import type { ApiError } from '../../../../services/api-client';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { applyService, type ApplyQuery } from '../services/applyService';
import {
  APPLY_TABS,
  CTA_URL_LABEL,
  ITEM_NAME,
  SETTINGS_GROUPS,
  SETTINGS_LABEL,
  applyListPath,
  isApplyTab,
  type ApiApplyItem,
  type ApiApplySettings,
  type ApplyKind,
  type ApplyTab,
  type Bilingual,
} from '../types/apply.types';

/*
 * Marathi first, as on the public site; English underneath. Both lines use the strong text colours of
 * .cms-sections (cms-tables.css) rather than the greyed-out muted style, so each language is easy to check.
 */
const pair = (value: Bilingual) => (
  <div>
    <div className="bi-main" lang="mr" style={{ whiteSpace: 'pre-line' }}>
      {value.mr}
    </div>
    <div className="bi-alt" lang="en" style={{ whiteSpace: 'pre-line' }}>
      {value.en}
    </div>
  </div>
);

/* The icon of each tab, so the four sections can be told apart at a glance. */
const TAB_ICON: Record<ApplyTab, string> = { page: 'doc', steps: 'layers', facts: 'eye', documents: 'folder' };

/* A short note at the top of a tab, about where that section's surrounding text is edited. */
const sectionNote = (children: ReactNode) => (
  <div className="sec-note">
    <Icon name="help" />
    <div>{children}</div>
  </div>
);

/* The portal link, opened in a new tab so it can be checked without leaving the panel. */
const portalLink = (url: string) => (
  <a className="lnk" href={url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
    {url}
  </a>
);

/* "Card heading on the website: …" — the title the public page prints above a tab's list. */
const headingLine = (heading: Bilingual) =>
  sectionNote(
    <>
      Card heading on the website: <b lang="mr">{heading.mr}</b> · <b>{heading.en}</b> — change it on the <b>Page Text</b> tab.
    </>,
  );

/* The wording of the two list tabs. */
const LIST_COPY: Record<
  ApplyKind,
  { title: string; sub: string; labelCol: string; valueCol: string; search: string; empty: string; emptyFiltered: string; where: string }
> = {
  STEP: {
    title: 'Application steps',
    sub: 'numbered 1, 2, 3… on the website, in this order',
    labelCol: 'Step title',
    valueCol: 'Description',
    search: 'step title or description',
    empty: 'No steps have been added yet. Use Add Step to create the first one.',
    emptyFiltered: 'No step matches the current search and filters.',
    where: 'application steps',
  },
  FACT: {
    title: 'At a glance rows',
    sub: 'the label and value rows of the "At a glance" card',
    labelCol: 'Label',
    valueCol: 'Value',
    search: 'label or value',
    empty: 'No rows have been added yet. Use Add At-a-glance Row to create the first one.',
    emptyFiltered: 'No row matches the current search and filters.',
    where: '"At a glance" card',
  },
};

/* Page Text tab: the page's own words, grouped by where each appears on the public page. */
function PageTextTab({
  settings,
  loading,
  error,
  onRetry,
}: {
  settings: ApiApplySettings | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}) {
  return (
    <>
      <LoadState loading={loading} error={error} onRetry={onRetry} />
      {settings ? (
        <>
          <div className="grid g2">
            {SETTINGS_GROUPS.map((group) => (
              <div className="card" key={group.title}>
                <div className="card-h">
                  <h3>
                    {group.title} <span className="sub">{group.sub}</span>
                  </h3>
                </div>
                <div className="card-b">
                  <KvList
                    pairs={group.keys.map((key): [string, ReactNode] =>
                      key === 'ctaUrl' ? [CTA_URL_LABEL, portalLink(settings.ctaUrl)] : [SETTINGS_LABEL[key], pair(settings[key])],
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="fs13 t2 mt10">Last updated {fmtDateTime(settings.updatedAt)}.</div>
        </>
      ) : null}
    </>
  );
}

/*
 * Application Steps / At a Glance tab: one of the two lists, with its own search, status filter,
 * sorting and paging, all served by the backend. Keyed by kind in the parent, so each tab starts from
 * its own clean query.
 */
function ItemsTab({ kind, context, onChanged }: { kind: ApplyKind; context?: ReactNode; onChanged: () => void }) {
  const go = useGo();
  const can = useCan();
  const copy = LIST_COPY[kind];
  /* Website order by default: the steps are numbered by it. */
  const initial = useMemo((): ApplyQuery => ({ ...masterQuery('displayOrder'), kind }), [kind]);
  const { query, patch, reset } = useMasterQuery<ApplyQuery>(initial);
  const page = useApiData(() => applyService.list(query), [query]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiApplyItem | null>(null);
  const [confirming, setConfirming] = useState<ApiApplyItem | null>(null);

  /* Any write changes both this list and the totals above the tabs. */
  const reload = async () => {
    onChanged();
    await page.reload();
  };

  const columns: MasterColumn<ApiApplyItem>[] = [
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
    {
      k: 'value',
      l: copy.valueCol,
      sortable: false,
      render: (r) => (
        <div>
          <div className="bi-main" style={{ whiteSpace: 'pre-line' }}>
            {r.value.en}
          </div>
          <div className="bi-alt" lang="mr" style={{ whiteSpace: 'pre-line' }}>
            {r.value.mr}
          </div>
        </div>
      ),
    },
    { k: 'isActive', l: 'Status', sortable: false, render: (r) => <MasterStatusBadge isActive={r.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (r) => <span className="t2">{fmtDateTime(r.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (r) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/apply/${r.id}`)}>
            <Icon name="eye" />
          </button>
          <Can action="updateApplyPage">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/apply/${r.id}/edit`)}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateApplyPage">
            <StatusToggle compact isActive={r.isActive} name={r.label.en} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteApplyItem">
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
      {context}

      <FilterBar
        id={`cms-apply-${kind.toLowerCase()}`}
        fields={[{ k: 'status', l: 'Status', options: STATUS_OPTIONS }]}
        value={{ status: query.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<ApplyQuery>)}
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
          rowLink={can('viewApplyPage') ? (r) => `/cms/apply/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={`${confirming.isActive ? 'Deactivate' : 'Activate'} ${ITEM_NAME[kind].toLowerCase()}`}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate "${confirming.label.en}"? It will no longer be shown in the ${copy.where} on the public Apply page.`
              : `Activate "${confirming.label.en}"? It will be shown in the ${copy.where} on the public Apply page.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => applyService.setStatus(row.id, !row.isActive),
              `${ITEM_NAME[kind]} ${row.isActive ? 'deactivated' : 'activated'}`,
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
          title={`Delete ${ITEM_NAME[kind].toLowerCase()}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete "${deleting.label.en}"? It is removed from the ${copy.where} on the public Apply page and soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(
              () => applyService.remove(deleting.id),
              `${ITEM_NAME[kind]} deleted`,
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
 * Documents to Keep Ready tab: the list exactly as the public Apply page shows it. It is the Eligibility
 * page's required documents list — one list for both pages — so it is shown here and edited there.
 */
function DocumentsTab({
  heading,
  documents,
  loading,
  error,
  onRetry,
}: {
  heading?: Bilingual;
  documents: Bilingual[] | null;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
}) {
  return (
    <>
      {heading ? headingLine(heading) : null}
      <div className="card">
        <div className="card-h">
          <h3>
            Documents to keep ready <span className="sub">as the public Apply page shows them</span>
          </h3>
          {documents ? <span className="tag">{documents.length} listed</span> : null}
        </div>
        <div className="card-b">
          <LoadState loading={loading} error={error} onRetry={onRetry} />
          {documents ? (
            documents.length ? (
              <ol className="sec-list">
                {documents.map((doc, index) => (
                  <li key={index}>{pair(doc)}</li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No documents are listed"
                msg="The public Apply page shows no documents: every document is inactive in Eligibility Page Management."
              />
            )
          ) : null}
          <div className="mt14">
            <Callout tone="info" title="Edited in Eligibility Page Management. ">
              This is the Eligibility page&apos;s required documents list, so it is kept once and both pages show it. Add, edit, reorder or
              deactivate documents there (choose &quot;Required documents&quot; in its Type filter); only active documents appear here and
              on the website.
            </Callout>
          </div>
        </div>
      </div>
    </>
  );
}

/*
 * Apply Page Management: the public Apply ("How to Apply") page, one tab per section of that page — its
 * page text (heading, Important note and Apply box), the application steps, the "At a glance" rows and
 * the documents list. The active tab is kept in the URL (?tab=), so Back from a step, a row or the
 * page-text form returns to it.
 */
export default function ApplyList() {
  usePageTitle('Apply Page Management');
  const go = useGo();
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: ApplyTab = isApplyTab(requested) ? requested : 'page';

  const selectTab = (k: ApplyTab) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', k);
        return next;
      },
      { replace: true },
    );

  const settings = useApiData(() => applyService.getSettings(), []);
  const documents = useApiData(() => applyService.publicDocuments(), []);

  /* Totals for the KPI row: counted by the backend, so they ignore the current page and filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(async () => {
    const [steps, stepsActive, facts, factsActive] = await Promise.all([
      applyService.count({ kind: 'STEP' }),
      applyService.count({ kind: 'STEP', isActive: 'true' }),
      applyService.count({ kind: 'FACT' }),
      applyService.count({ kind: 'FACT', isActive: 'true' }),
    ]);
    return { steps, stepsActive, facts, factsActive, inactive: steps - stepsActive + facts - factsActive };
  }, [statsKey]);
  const s = stats.data;
  const pageText = settings.data;
  /* The badge on each list tab; undefined (no badge) while loading. */
  const counts: Record<ApplyTab, number | undefined> = {
    page: undefined,
    steps: s?.steps,
    facts: s?.facts,
    documents: documents.data?.length,
  };

  /* The header action follows the tab: whatever that section of the page is changed with. */
  const action =
    tab === 'page' ? (
      pageText ? (
        <Can action="updateApplyPage">
          <button type="button" className="btn primary" onClick={() => go('/cms/apply/page/edit')}>
            <Icon name="edit" />
            Edit Page Text
          </button>
        </Can>
      ) : null
    ) : tab === 'steps' ? (
      <Can action="createApplyItem">
        <button type="button" className="btn primary" onClick={() => go('/cms/apply/create?kind=STEP')}>
          <Icon name="plus" />
          Add Step
        </button>
      </Can>
    ) : tab === 'facts' ? (
      <Can action="createApplyItem">
        <button type="button" className="btn primary" onClick={() => go('/cms/apply/create?kind=FACT')}>
          <Icon name="plus" />
          Add At-a-glance Row
        </button>
      </Can>
    ) : can('viewEligibility') ? (
      <button type="button" className="btn" onClick={() => go('/cms/eligibility')}>
        <Icon name="edit" />
        Manage in Eligibility Page Management
      </button>
    ) : null;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'Apply Page Management' }]}
        title="Apply Page Management"
        sub={`The public website's Apply page, section by section: its page text, the application steps, the "At a glance" card and the documents list, in Marathi and English.`}
        back={<BackButton to="/dashboard" />}
        actions={<div className="f ac gp8 wrap">{action}</div>}
      />

      {/* Each tile opens the tab it counts. */}
      <MasterKpis
        items={[
          {
            label: 'Application steps',
            value: s?.steps,
            sub: s ? `${s.stepsActive} on the website` : undefined,
            tone: 'b',
            link: applyListPath('steps'),
          },
          {
            label: 'At-a-glance rows',
            value: s?.facts,
            sub: s ? `${s.factsActive} on the website` : undefined,
            tone: 'v',
            link: applyListPath('facts'),
          },
          {
            label: 'Documents to keep ready',
            value: documents.data?.length,
            sub: 'from Eligibility Page Management',
            tone: 'g',
            link: applyListPath('documents'),
          },
          { label: 'Inactive', value: s?.inactive, tone: 'a', title: 'Steps and rows kept here but hidden from the website' },
        ]}
      />

      {/* Larger, higher-contrast tabs and text than the panel defaults: see .cms-sections in cms-tables.css. */}
      <div className="cms-sections">
        <div className="sec-tabs" role="tablist" aria-label="Apply page sections">
          {APPLY_TABS.map((t) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === t.k}
              key={t.k}
              className={tab === t.k ? 'on' : ''}
              onClick={() => selectTab(t.k)}
            >
              <Icon name={TAB_ICON[t.k]} />
              {t.l}
              {/* The count is also on the KPI tiles; hidden from screen readers so the tab name stays clean. */}
              {counts[t.k] !== undefined ? (
                <span className="cnt" aria-hidden="true">
                  {counts[t.k]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div role="tabpanel" aria-label={APPLY_TABS.find((t) => t.k === tab)?.l}>
          {tab === 'page' ? (
            <PageTextTab settings={pageText} loading={settings.loading} error={settings.error} onRetry={() => void settings.reload()} />
          ) : null}
          {tab === 'steps' ? (
            <ItemsTab
              key="STEP"
              kind="STEP"
              context={sectionNote(
                <>
                  The <b>&quot;Important&quot;</b> note shown under the steps is edited on the <b>Page Text</b> tab.
                </>,
              )}
              onChanged={() => setStatsKey((n) => n + 1)}
            />
          ) : null}
          {tab === 'facts' ? (
            <ItemsTab
              key="FACT"
              kind="FACT"
              context={pageText ? headingLine(pageText.glanceHeading) : null}
              onChanged={() => setStatsKey((n) => n + 1)}
            />
          ) : null}
          {tab === 'documents' ? (
            <DocumentsTab
              heading={pageText?.documentsHeading}
              documents={documents.data}
              loading={documents.loading}
              error={documents.error}
              onRetry={() => void documents.reload()}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
