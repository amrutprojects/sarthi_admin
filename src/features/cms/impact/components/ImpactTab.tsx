import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, Callout, KvList, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { SectionTabHead } from '../../components/SectionTabs';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { impactEditPath, impactViewPath, statLabel } from '../constants';
import { impactService } from '../services/impactService';
import type { ApiImpactStat, Bilingual } from '../types/impact.types';

/* Marathi first, as on the public site; English underneath. Long text wraps (cells do not by default). */
const Pair = ({ value }: { value: Bilingual }) =>
  value.mr || value.en ? (
    <div style={{ whiteSpace: 'normal', minWidth: 150, maxWidth: 260 }}>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">—</span>
  );

/* The figure as a number where it reads as one ("1,000+" → 1000), so the Figure column sorts 6+ before 1,000+. */
const figureSort = (value: string): number | string => {
  const n = parseFloat(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : value;
};

/* Search, sorting and paging in the browser: the API returns the whole (short) list at once. */
const LIST: ClientListOptions<ApiImpactStat> = {
  searchText: (s) => `${s.value} ${s.label.en} ${s.label.mr}`,
  sortValue: {
    displayOrder: (s) => s.displayOrder,
    labelEn: (s) => s.label.en,
    value: (s) => figureSort(s.value),
    isActive: (s) => (s.isActive ? 0 : 1),
    updatedAt: (s) => s.updatedAt,
  },
  isActive: (s) => s.isActive,
};

/*
 * SARTHI's Impact — the SARTHI Impact Management tab of Home Page Management: the SARTHI's Impact (सारथीचा प्रभाव)
 * figures of the public home page as a listing like FAQ Management's, and the section settings under them.
 *
 * Every action names its card by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, deactivate or reorder the wrong card.
 */
export default function ImpactTab() {
  const go = useGo();
  const can = useCan();
  /* Display order first, so the list reads the way the website shows the cards. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const stats = useApiData(() => impactService.list(), []);
  const section = useApiData(() => impactService.getSection(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiImpactStat | null>(null);
  const [toggling, setToggling] = useState<ApiImpactStat | null>(null);

  /* The whole list, in the server's display order; the table shows one sorted, searched page of it. */
  const all = stats.data ?? [];
  const page = stats.data ? clientPage(stats.data, query, LIST) : null;
  const filtered = query.search !== '';
  /*
   * Moving a card is only unambiguous while the table shows the website's order: sorted by Order, ascending,
   * with nothing searched away; otherwise the buttons stay disabled. The move itself uses the full list, so it
   * also works across pages.
   */
  const inSiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && !filtered;
  const canReorder = can('updateImpactStat') && all.length > 1;

  const move = (id: string, by: -1 | 1) => {
    const ids = all.map((s) => s.id);
    const from = ids.indexOf(id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => impactService.reorder(ids),
      'Display order updated',
      () => stats.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void stats.reload();
    });
  };

  const columns: MasterColumn<ApiImpactStat>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_s, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (s) => {
        const i = all.findIndex((x) => x.id === s.id);
        const off = busy || !inSiteOrder;
        const why = inSiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
        return (
          <div className="f ac gp4">
            <span className="mono fs12" style={{ minWidth: 22 }}>
              {s.displayOrder}
            </span>
            {canReorder ? (
              /* The row itself opens the View page, so the buttons must not also trigger it. */
              <span className="f ac gp4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move up' + why}
                  aria-label={`Move ${s.label.en} up`}
                  disabled={off || i <= 0}
                  onClick={() => move(s.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${s.label.en} down`}
                  disabled={off || i < 0 || i === all.length - 1}
                  onClick={() => move(s.id, 1)}
                >
                  ↓
                </button>
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      k: 'labelEn',
      l: 'Label',
      render: (s) => (
        <div style={{ whiteSpace: 'normal', minWidth: 160 }}>
          <b className="lnk" lang="en">
            {s.label.en}
          </b>
          <div className="muted fs12" lang="mr">
            {s.label.mr}
          </div>
        </div>
      ),
    },
    {
      k: 'value',
      l: 'Figure',
      render: (s) => <b style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--brand-600)', whiteSpace: 'nowrap' }}>{s.value}</b>,
    },
    { k: 'isActive', l: 'Status', render: (s) => <MasterStatusBadge isActive={s.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (s) => <span className="fs12">{fmtDateTime(s.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (s) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${s.label.en}`} onClick={() => go(impactViewPath(s.id))}>
            <Icon name="eye" />
          </button>
          <Can action="updateImpactStat">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${s.label.en}`}
              onClick={() => go(impactEditPath(s.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateImpactStat">
            <StatusToggle compact isActive={s.isActive} name={s.label.en} canChange disabled={busy} onToggle={() => setToggling(s)} />
          </Can>
          <Can action="deleteImpactStat">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label={`Delete ${s.label.en}`}
              style={{ color: 'var(--red)' }}
              disabled={busy}
              onClick={() => setDeleting(s)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const sec = section.data;

  return (
    <>
      <SectionTabHead
        actions={
          <>
            <Can action="updateImpactStat">
              <button type="button" className="btn" onClick={() => go('/cms/impact/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
            <Can action="createImpactStat">
              <button type="button" className="btn primary" onClick={() => go('/cms/impact/create')}>
                <Icon name="plus" />
                Add New Statistic
              </button>
            </Can>
          </>
        }
      >
        The SARTHI&rsquo;s Impact figures of the public home page: each card&rsquo;s value and label, in display order.
      </SectionTabHead>

      <div className="mb14">
        <Callout tone="info" title="These figures are entered by hand">
          Each value is shown on the website exactly as typed here; none of them is counted automatically. In particular, &ldquo;Schemes
          running&rdquo; does not update from SARTHI Schemes Management — update it here when schemes are added or removed.
        </Callout>
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Statistics <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inSiteOrder ? <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span> : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {stats.data ? (
              <span className="tag">
                {all.length} listed, {all.filter((s) => s.isActive).length} shown on the website
              </span>
            ) : null}
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={page?.rows ?? []}
          meta={page?.meta}
          loading={stats.loading}
          error={stats.error}
          query={query}
          onQuery={patch}
          onRetry={() => void stats.reload()}
          searchLabel="label or figure"
          emptyMsg={
            filtered
              ? 'No statistic matches the current search.'
              : 'No statistics yet: the section shows no cards until one is added. Use Add New Statistic to create the first one.'
          }
          rowLink={can('viewImpact') ? (s) => impactViewPath(s.id) : undefined}
        />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Section settings</h3>
        </div>
        <div className="card-b">
          <LoadState loading={section.loading && !section.data} error={section.error} onRetry={() => void section.reload()} />
          {sec ? (
            <KvList
              pairs={[
                ['Public heading', <Pair key="h" value={sec.heading} />],
                [
                  'Section',
                  <Badge key="v" tone={sec.showSection ? 'green' : 'grey'}>
                    {sec.showSection ? 'Shown' : 'Hidden'}
                  </Badge>,
                ],
                ['Last updated', fmtDateTime(sec.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      {toggling ? (
        <ConfirmModal
          title={toggling.isActive ? 'Deactivate statistic' : 'Activate statistic'}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            toggling.isActive
              ? `Deactivate ${statLabel(toggling)}? The card is hidden from the website but stays in this list and can be activated again.`
              : `Activate ${statLabel(toggling)} and show it on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const s = toggling;
            void run(
              () => impactService.setStatus(s.id, !s.isActive),
              s.isActive ? 'Statistic deactivated' : 'Statistic activated',
              async () => {
                setToggling(null);
                await stats.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete statistic"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'impact-stat', id: deleting.id }}
          message={`Delete ${statLabel(deleting)}? The card is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const s = deleting;
            void run(
              () => impactService.remove(s.id),
              'Statistic deleted',
              async () => {
                setDeleting(null);
                await stats.reload();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}
