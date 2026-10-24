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
import { topBarLinkEditPath, topBarLinkName, topBarLinkViewPath } from '../constants';
import { topBarService } from '../services/topBarService';
import type { ApiTopBarLink, Bilingual } from '../types/topbar.types';

/* Marathi first, as on the public site; English underneath. */
const Pair = ({ value }: { value: Bilingual | null }) =>
  value && (value.mr || value.en) ? (
    <div>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">None — no bold text is shown</span>
  );

/* Where a click on the button leads: a page of the website or another site. */
const Destination = ({ link }: { link: string }) =>
  link.startsWith('/') ? (
    <span className="mono fs12">{link}</span>
  ) : (
    <span className="mono fs12" style={{ display: 'inline-block', whiteSpace: 'normal', wordBreak: 'break-all', maxWidth: 240 }}>
      {link} <span aria-label="opens another site">↗</span>
    </span>
  );

/* Search, sorting and paging in the browser: the API returns every link at once (clientList.ts). */
const LIST: ClientListOptions<ApiTopBarLink> = {
  searchText: (l) => [l.label.en, l.label.mr, l.link].join(' '),
  sortValue: {
    displayOrder: (l) => l.displayOrder,
    label: (l) => l.label.en,
    link: (l) => l.link,
    /* Active first on ascending. */
    isActive: (l) => (l.isActive ? 0 : 1),
    updatedAt: (l) => l.updatedAt,
  },
  isActive: (l) => l.isActive,
};

/*
 * Top Bar — the Top Bar tab of Home Page Management: the strip at the very top of every page of the public
 * website (the government name, the link buttons such as Verify Certificate, and the language switch), and its
 * settings below. The links are a listing like FAQ Management's: search, sorting and paging, each row viewed,
 * edited, switched on or off and deleted on its own, and moved up or down while the table shows the website order.
 *
 * Every action names its link by id, never by its position on screen, so a list that has moved on since it
 * was loaded can never delete, hide or reorder the wrong one.
 */
export default function TopBarTab() {
  const go = useGo();
  const can = useCan();
  const links = useApiData(() => topBarService.list(), []);
  const settings = useApiData(() => topBarService.getSettings(), []);
  /* Display order first, so the table reads the way the strip shows the buttons, left to right. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiTopBarLink | null>(null);
  const [confirming, setConfirming] = useState<ApiTopBarLink | null>(null);

  const all = useMemo(() => links.data ?? [], [links.data]);
  const { rows, meta } = useMemo(() => clientPage(all, query, LIST), [all, query]);

  /*
   * Moving a link swaps it with its neighbour in the website order, so the buttons only work while the table
   * shows exactly that order: sorted by Order ascending, nothing searched. Paging is fine — the neighbour may be
   * on the next page, and the whole list is sent.
   */
  const canReorder = can('updateTopBar') && all.length > 1;
  const inWebsiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && query.search === '' && query.status === '';

  const move = (l: ApiTopBarLink, by: -1 | 1) => {
    const ids = all.map((x) => x.id);
    const from = ids.indexOf(l.id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => topBarService.reorder(ids),
      'Display order updated',
      () => links.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void links.reload();
    });
  };

  const columns: MasterColumn<ApiTopBarLink>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_l, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (l) => {
        const at = all.findIndex((x) => x.id === l.id);
        const off = busy || !inWebsiteOrder;
        const why = inWebsiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
        return (
          <div className="f ac gp4">
            <span className="mono fs12" style={{ minWidth: 22 }}>
              {l.displayOrder}
            </span>
            {canReorder ? (
              /* The row itself opens the View page, so the buttons must not also trigger it. */
              <span className="f ac gp4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move up' + why}
                  aria-label={`Move ${l.label.en} up`}
                  disabled={off || at <= 0}
                  onClick={() => move(l, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${l.label.en} down`}
                  disabled={off || at < 0 || at === all.length - 1}
                  onClick={() => move(l, 1)}
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
      k: 'label',
      l: 'Label',
      render: (l) => (
        <div style={{ whiteSpace: 'normal', minWidth: 160, maxWidth: 320 }}>
          <b className="lnk">{l.label.en}</b>
          <div className="muted fs12" lang="mr">
            {l.label.mr}
          </div>
        </div>
      ),
    },
    { k: 'link', l: 'Link', render: (l) => <Destination link={l.link} /> },
    { k: 'isActive', l: 'Status', render: (l) => <MasterStatusBadge isActive={l.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (l) => <span className="fs12">{fmtDateTime(l.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (l) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn xs"
            title="View"
            aria-label={`View ${l.label.en}`}
            onClick={() => go(topBarLinkViewPath(l.id))}
          >
            <Icon name="eye" />
          </button>
          <Can action="updateTopBar">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${l.label.en}`}
              onClick={() => go(topBarLinkEditPath(l.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateTopBar">
            <StatusToggle compact isActive={l.isActive} name={l.label.en} canChange disabled={busy} onToggle={() => setConfirming(l)} />
          </Can>
          <Can action="deleteTopBarLink">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label={`Delete ${l.label.en}`}
              style={{ color: 'var(--red)' }}
              disabled={busy}
              onClick={() => setDeleting(l)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const filtered = query.search !== '' || query.status !== '';
  const cfg = settings.data;

  return (
    <>
      <SectionTabHead
        actions={
          <>
            <Can action="updateTopBar">
              <button type="button" className="btn" disabled={!cfg} onClick={() => go('/cms/top-bar/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
            <Can action="createTopBarLink">
              <button type="button" className="btn primary" onClick={() => go('/cms/top-bar/create')}>
                <Icon name="plus" />
                Add link
              </button>
            </Can>
          </>
        }
      >
        The strip at the very top of every page of the public website: the government name, the link buttons in display order
        from the left, and the Marathi / English language switch.
      </SectionTabHead>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Links <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inWebsiteOrder ? (
              <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span>
            ) : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {links.data ? (
              <span className="tag">
                {all.length} listed, {all.filter((l) => l.isActive).length} shown on the website
              </span>
            ) : null}
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={rows}
          meta={links.data ? meta : undefined}
          loading={links.loading}
          error={links.error}
          query={query}
          onQuery={patch}
          onRetry={() => void links.reload()}
          searchLabel="label or link"
          emptyMsg={
            filtered
              ? 'No link matches the current search.'
              : 'No links have been added yet. Use Add link to create the first one. While the list is empty, the website shows no buttons in the top bar.'
          }
          rowLink={can('viewTopBar') ? (l) => topBarLinkViewPath(l.id) : undefined}
        />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Top bar settings</h3>
        </div>
        <div className="card-b">
          <LoadState loading={settings.loading && !settings.data} error={settings.error} onRetry={() => void settings.reload()} />
          {cfg ? (
            <KvList
              pairs={[
                ['Government name', <Pair key="n" value={cfg.governmentName} />],
                [
                  'Language switch',
                  <Badge key="v" tone={cfg.showLanguageToggle ? 'green' : 'grey'}>
                    {cfg.showLanguageToggle ? 'Shown' : 'Hidden'}
                  </Badge>,
                ],
                ['Last updated', fmtDateTime(cfg.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      {confirming ? (
        <ConfirmModal
          title={confirming.isActive ? 'Deactivate link' : 'Activate link'}
          busy={busy}
          confirmLabel={confirming.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            confirming.isActive
              ? `Deactivate ${topBarLinkName(confirming)}? The button leaves the top bar on the website; the link stays in this list and can be activated again.`
              : `Activate ${topBarLinkName(confirming)}? The button appears in the top bar on the website again.`
          }
          onClose={() => setConfirming(null)}
          onConfirm={() => {
            const l = confirming;
            void run(
              () => topBarService.setStatus(l.id, !l.isActive),
              l.isActive ? 'Link deactivated' : 'Link activated',
              async () => {
                setConfirming(null);
                await links.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete link"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${topBarLinkName(deleting)}? The button is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const l = deleting;
            void run(
              () => topBarService.remove(l.id),
              'Link deleted',
              async () => {
                setDeleting(null);
                await links.reload();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}
