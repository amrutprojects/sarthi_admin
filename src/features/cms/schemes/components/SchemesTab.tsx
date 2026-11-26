import { useMemo, useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, KvList, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import { clientPage, type ClientListOptions } from '../../clientList';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import MasterTable, { masterQuery, type MasterColumn } from '../../components/MasterTable';
import { SectionTabHead } from '../../components/SectionTabs';
import StatusToggle from '../../components/StatusToggle';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { useMasterQuery } from '../../useMasterQuery';
import { fmtDeadline, isExpired, schemeEditPath, schemeLabel, schemeViewPath, todayIso } from '../constants';
import { schemesService } from '../services/schemesService';
import type { ApiScheme, Bilingual } from '../types/schemes.types';

/* Marathi first, as on the public site; English underneath. */
const Pair = ({ value }: { value: Bilingual }) =>
  value.mr || value.en ? (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">—</span>
  );

/* Where the card's button leads: a page of the website, another site (new tab), or nowhere. */
const Destination = ({ link }: { link: string | null }) =>
  !link ? (
    <span className="muted fs12" title="The button says the page is not available yet">
      No link
    </span>
  ) : link.startsWith('/') ? (
    <span className="mono fs12">{link}</span>
  ) : (
    <span className="mono fs12" style={{ display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-all', maxWidth: 240 }}>
      {link} <span aria-label="opens another site">↗</span>
    </span>
  );

/* The last date, and a note once it has passed. Informational only: nothing hides an expired scheme. */
const Deadline = ({ deadline, today }: { deadline: string | null; today: string }) =>
  deadline ? (
    <div>
      <span className="mono fs12">{fmtDeadline(deadline)}</span>
      {isExpired(deadline, today) ? (
        <div>
          <span className="tag" title="The date has passed. The scheme stays on the website until it is deactivated or deleted.">
            Date passed
          </span>
        </div>
      ) : null}
    </div>
  ) : (
    <span className="muted fs12">No last date</span>
  );

/* Search, sorting and paging in the browser: the API returns every scheme at once (clientList.ts). */
const LIST: ClientListOptions<ApiScheme> = {
  searchText: (s) => [s.title.en, s.title.mr, s.description.en, s.description.mr, s.badge.en, s.badge.mr, s.link ?? ''].join(' '),
  sortValue: {
    displayOrder: (s) => s.displayOrder,
    title: (s) => s.title.en,
    link: (s) => s.link,
    deadline: (s) => s.deadline,
    /* Active first on ascending. */
    isActive: (s) => (s.isActive ? 0 : 1),
    updatedAt: (s) => s.updatedAt,
  },
  isActive: (s) => s.isActive,
};

/*
 * SARTHI Schemes — the SARTHI Schemes Management tab of Home Page Management: the सारथी योजना विभाग cards of the
 * public home page, and the section settings below them. The schemes are a listing like FAQ Management's: search,
 * sorting and paging, each row viewed, edited, switched on or off and deleted on its own, and moved up or down
 * while the table shows the website order.
 *
 * Every action names its scheme by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, hide or reorder the wrong scheme.
 */
export default function SchemesTab() {
  const go = useGo();
  const can = useCan();
  const schemes = useApiData(() => schemesService.list(), []);
  const section = useApiData(() => schemesService.getSection(), []);
  /* Display order first, so the table reads the way the website shows the cards. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiScheme | null>(null);
  const [confirming, setConfirming] = useState<ApiScheme | null>(null);
  const today = todayIso();

  const all = useMemo(() => schemes.data ?? [], [schemes.data]);
  const { rows, meta } = useMemo(() => clientPage(all, query, LIST), [all, query]);

  /*
   * Moving a scheme swaps it with its neighbour in the website order, so the buttons only work while the table
   * shows exactly that order: sorted by Order ascending, nothing searched. Paging is fine — the neighbour may be
   * on the next page, and the whole list is sent.
   */
  const canReorder = can('updateScheme') && all.length > 1;
  const inWebsiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && query.search === '' && query.status === '';

  const move = (s: ApiScheme, by: -1 | 1) => {
    const ids = all.map((x) => x.id);
    const from = ids.indexOf(s.id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => schemesService.reorder(ids),
      'Display order updated',
      () => schemes.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void schemes.reload();
    });
  };

  const columns: MasterColumn<ApiScheme>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_s, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (s) => {
        const at = all.findIndex((x) => x.id === s.id);
        const off = busy || !inWebsiteOrder;
        const why = inWebsiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
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
                  aria-label={`Move ${s.title.en} up`}
                  disabled={off || at <= 0}
                  onClick={() => move(s, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${s.title.en} down`}
                  disabled={off || at < 0 || at === all.length - 1}
                  onClick={() => move(s, 1)}
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
      k: 'title',
      l: 'Scheme',
      render: (s) => (
        /* Titles run long, and panel cells do not wrap unless told to. */
        <div style={{ whiteSpace: 'normal', minWidth: 180, maxWidth: 360 }}>
          <b className="lnk">{s.title.en}</b>
          <div className="muted fs12" lang="mr">
            {s.title.mr}
          </div>
          {s.featured ? (
            <div className="mt4">
              <Badge tone="amber" nodot>
                Highlighted
              </Badge>
            </div>
          ) : null}
        </div>
      ),
    },
    { k: 'link', l: 'Link', render: (s) => <Destination link={s.link} /> },
    { k: 'deadline', l: 'Last date', render: (s) => <Deadline deadline={s.deadline} today={today} /> },
    { k: 'isActive', l: 'Status', render: (s) => <MasterStatusBadge isActive={s.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (s) => <span className="fs12">{fmtDateTime(s.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (s) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn xs" title="View" aria-label={`View ${s.title.en}`} onClick={() => go(schemeViewPath(s.id))}>
            <Icon name="eye" />
          </button>
          <Can action="updateScheme">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${s.title.en}`}
              onClick={() => go(schemeEditPath(s.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateScheme">
            <StatusToggle compact isActive={s.isActive} name={s.title.en} canChange disabled={busy} onToggle={() => setConfirming(s)} />
          </Can>
          <Can action="deleteScheme">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label={`Delete ${s.title.en}`}
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

  const filtered = query.search !== '' || query.status !== '';
  const sec = section.data;

  return (
    <>
      <SectionTabHead
        actions={
          <>
            <Can action="updateScheme">
              <button type="button" className="btn" disabled={!sec} onClick={() => go('/cms/amrut-schemes/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
            <Can action="createScheme">
              <button type="button" className="btn primary" onClick={() => go('/cms/amrut-schemes/create')}>
                <Icon name="plus" />
                Add New Scheme
              </button>
            </Can>
          </>
        }
      >
        The SARTHI Schemes cards of the public home page: each scheme&rsquo;s title, description, badge, last date and button, in display
        order.
      </SectionTabHead>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Schemes <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inWebsiteOrder ? (
              <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span>
            ) : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {schemes.data ? (
              <span className="tag">
                {all.length} listed, {all.filter((s) => s.isActive).length} shown on the website
              </span>
            ) : null}
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={schemes.data ? meta : undefined}
          loading={schemes.loading}
          error={schemes.error}
          query={query}
          onQuery={patch}
          onRetry={() => void schemes.reload()}
          searchLabel="title, description, badge or link"
          emptyMsg={
            filtered
              ? 'No scheme matches the current search.'
              : 'No schemes have been added yet. Use Add New Scheme to create the first card.'
          }
          rowLink={can('viewSchemes') ? (s) => schemeViewPath(s.id) : undefined}
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
                ['Subtitle', <Pair key="s" value={sec.subtitle} />],
                ['Default button label', <Pair key="l" value={sec.buttonLabel} />],
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

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate scheme' : 'Activate scheme'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate ${schemeLabel(confirming)}? The card is hidden from the website; the scheme stays in this list and can be activated again.`
              : `Activate ${schemeLabel(confirming)}? The card is shown on the website again.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const s = confirming;
            void run(
              () => schemesService.setStatus(s.id, !s.isActive),
              s.isActive ? 'Scheme deactivated' : 'Scheme activated',
              async () => {
                setConfirming(null);
                await schemes.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete scheme"
          danger
          busy={busy}
          confirmLabel="Delete"
          dependencies={{ kind: 'scheme', id: deleting.id }}
          message={`Delete ${schemeLabel(deleting)}? The scheme is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const s = deleting;
            void run(
              () => schemesService.remove(s.id),
              'Scheme deleted',
              async () => {
                setDeleting(null);
                await schemes.reload();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}
