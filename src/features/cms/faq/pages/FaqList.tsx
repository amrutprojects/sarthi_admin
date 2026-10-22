import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { FilterBar, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth';
import BackButton from '../../components/BackButton';
import MasterKpis from '../../components/MasterKpis';
import { STATUS_OPTIONS } from '../../components/MasterFilters';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import StatusToggle from '../../components/StatusToggle';
import MasterTable, { masterQuery, type MasterColumn, type MasterQuery } from '../../components/MasterTable';
import { ConfirmModal, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle, useMasterQuery } from '../../useMasterQuery';
import { faqService } from '../services/faqService';
import type { ApiFaq } from '../types/faq.types';

/* FAQ Management listing: search, status filter, sorting, paging — all served by the backend. */
export default function FaqList() {
  usePageTitle('FAQ Management');
  const go = useGo();
  const can = useCan();
  /* Display order first, so the list reads the way the website shows the questions. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch, reset } = useMasterQuery(initial);
  const page = useApiData(() => faqService.list(query), [query]);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiFaq | null>(null);
  const [confirming, setConfirming] = useState<ApiFaq | null>(null);

  /* Totals for the KPI row: counted by the backend, so they ignore the current page and filters. */
  const [statsKey, setStatsKey] = useState(0);
  const stats = useApiData(async () => {
    const [total, active] = await Promise.all([faqService.count(), faqService.count('true')]);
    return { total, active, inactive: total - active };
  }, [statsKey]);

  const rows = page.data?.items ?? [];
  /* Any write changes both the page and the totals. */
  const reload = async () => {
    setStatsKey((n) => n + 1);
    await page.reload();
  };

  const columns: MasterColumn<ApiFaq>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_r, srNo) => <span className="muted fs12">{srNo}</span> },
    { k: 'displayOrder', l: 'Order', w: '86px', render: (r) => <span className="mono fs12">{r.displayOrder}</span> },
    {
      k: 'questionEn',
      l: 'Question',
      render: (r) => (
        <div>
          <b className="lnk">{r.question.en}</b>
          <div className="muted fs12" lang="mr">
            {r.question.mr}
          </div>
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
          <button type="button" className="btn xs" title="View" aria-label="View" onClick={() => go(`/cms/faqs/${r.id}`)}>
            <Icon name="eye" />
          </button>
          <Can action="updateFaq">
            <button type="button" className="btn xs" title="Edit" aria-label="Edit" onClick={() => go(`/cms/faqs/${r.id}/edit`)}>
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateFaq">
            <StatusToggle compact isActive={r.isActive} name={r.question.en} canChange disabled={busy} onToggle={() => setConfirming(r)} />
          </Can>
          <Can action="deleteFaq">
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
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: 'FAQ Management' }]}
        title="FAQ Management"
        sub="The questions and answers on the public website's FAQ page, in Marathi and English."
        back={<BackButton to="/dashboard" />}
        actions={
          <div className="f ac gp8 wrap">
            <Can action="createFaq">
              <button type="button" className="btn primary" onClick={() => go('/cms/faqs/create')}>
                <Icon name="plus" />
                Add FAQ
              </button>
            </Can>
          </div>
        }
      />

      <MasterKpis
        items={[
          { label: 'Total FAQs', value: stats.data?.total, tone: 'b' },
          { label: 'Active', value: stats.data?.active, tone: 'g', title: 'Shown on the public FAQ page' },
          { label: 'Inactive', value: stats.data?.inactive, tone: 'a', title: 'Kept here but hidden from the website' },
        ]}
      />

      <FilterBar
        id="cms-faqs"
        fields={[{ k: 'status', l: 'Status', options: STATUS_OPTIONS }]}
        value={{ status: query.status }}
        onChange={(key, value) => patch({ [key]: value } as Partial<MasterQuery>)}
        onReset={reset}
      />

      <div className="card">
        <div className="card-h">
          <h3>
            FAQs <span className="sub">live from the backend</span>
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
          searchLabel="question or answer"
          emptyMsg={
            filtered
              ? 'No FAQ matches the current search and filters.'
              : 'No FAQs have been added yet. Use Add FAQ to create the first one.'
          }
          rowLink={can('viewFaqs') ? (r) => `/cms/faqs/${r.id}` : undefined}
        />
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate FAQ' : 'Activate FAQ'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate "${confirming.question.en}"? It will no longer be shown on the public FAQ page.`
              : `Activate "${confirming.question.en}"? It will be shown on the public FAQ page.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const row = confirming;
            run(
              () => faqService.setStatus(row.id, !row.isActive),
              row.isActive ? 'FAQ deactivated' : 'FAQ activated',
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
          title="Delete FAQ"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete "${deleting.question.en}"? It is removed from the public FAQ page and soft-deleted, kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            run(
              () => faqService.remove(deleting.id),
              'FAQ deleted',
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
