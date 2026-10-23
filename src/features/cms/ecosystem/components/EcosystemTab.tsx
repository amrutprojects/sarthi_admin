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
import { ecosystemEditPath, ecosystemViewPath, iconLabel, programmeLabel } from '../constants';
import { ecosystemService } from '../services/ecosystemService';
import type { ApiProgramme, Bilingual } from '../types/ecosystem.types';

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

/* The card's icon on its saffron tile, as the website draws it, named for screen readers. */
const IconTile = ({ id }: { id: string }) => (
  <div
    title={iconLabel(id)}
    role="img"
    aria-label={`Icon: ${iconLabel(id)}`}
    style={{
      width: 32,
      height: 32,
      borderRadius: 9,
      background: 'var(--saffron-100)',
      color: 'var(--brand-600)',
      display: 'grid',
      placeItems: 'center',
    }}
  >
    <Icon name={id} />
  </div>
);

/* Search, sorting and paging in the browser: the API returns the whole (short) list at once. */
const LIST: ClientListOptions<ApiProgramme> = {
  searchText: (p) => `${p.name.en} ${p.name.mr} ${p.description.en} ${p.description.mr}`,
  sortValue: {
    displayOrder: (p) => p.displayOrder,
    nameEn: (p) => p.name.en,
    isActive: (p) => (p.isActive ? 0 : 1),
    updatedAt: (p) => p.updatedAt,
  },
  isActive: (p) => p.isActive,
};

/*
 * The AMRUT Ecosystem — its tab of Home Page Management: the अमृत प्रणाली cards of the home and About pages as a
 * listing like FAQ Management's, and the section settings under them.
 *
 * Every action names its card by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, deactivate or reorder the wrong card.
 */
export default function EcosystemTab() {
  const go = useGo();
  const can = useCan();
  /* Display order first, so the list reads the way the website shows the cards. */
  const initial = useMemo(() => masterQuery('displayOrder'), []);
  const { query, patch } = useMasterQuery(initial);
  const programmes = useApiData(() => ecosystemService.list(), []);
  const section = useApiData(() => ecosystemService.getSection(), []);
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<ApiProgramme | null>(null);
  const [toggling, setToggling] = useState<ApiProgramme | null>(null);

  /* The whole list, in the server's display order; the table shows one sorted, searched page of it. */
  const all = programmes.data ?? [];
  const page = programmes.data ? clientPage(programmes.data, query, LIST) : null;
  const filtered = query.search !== '';
  /*
   * Moving a card is only unambiguous while the table shows the website's order: sorted by Order, ascending,
   * with nothing searched away; otherwise the buttons stay disabled. The move itself uses the full list, so it
   * also works across pages.
   */
  const inSiteOrder = query.sortBy === 'displayOrder' && query.sortOrder === 'asc' && !filtered;
  const canReorder = can('updateEcosystemProgramme') && all.length > 1;

  const move = (id: string, by: -1 | 1) => {
    const ids = all.map((p) => p.id);
    const from = ids.indexOf(id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to]!, ids[from]!];
    void run(
      () => ecosystemService.reorder(ids),
      'Display order updated',
      () => programmes.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void programmes.reload();
    });
  };

  const columns: MasterColumn<ApiProgramme>[] = [
    { k: 'srNo', l: 'Sr. No.', w: '76px', sortable: false, render: (_p, srNo) => <span className="muted fs12">{srNo}</span> },
    {
      k: 'displayOrder',
      l: 'Order',
      w: canReorder ? '120px' : '86px',
      render: (p) => {
        const i = all.findIndex((x) => x.id === p.id);
        const off = busy || !inSiteOrder;
        const why = inSiteOrder ? '' : ' — sort by Order (ascending) with no search to reorder';
        return (
          <div className="f ac gp4">
            <span className="mono fs12" style={{ minWidth: 22 }}>
              {p.displayOrder}
            </span>
            {canReorder ? (
              /* The row itself opens the View page, so the buttons must not also trigger it. */
              <span className="f ac gp4" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move up' + why}
                  aria-label={`Move ${p.name.en} up`}
                  disabled={off || i <= 0}
                  onClick={() => move(p.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn xs"
                  title={'Move down' + why}
                  aria-label={`Move ${p.name.en} down`}
                  disabled={off || i < 0 || i === all.length - 1}
                  onClick={() => move(p.id, 1)}
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
      k: 'nameEn',
      l: 'Programme',
      render: (p) => (
        <div style={{ whiteSpace: 'normal', minWidth: 160 }}>
          <b className="lnk" lang="en">
            {p.name.en}
          </b>
          <div className="muted fs12" lang="mr">
            {p.name.mr}
          </div>
        </div>
      ),
    },
    { k: 'icon', l: 'Icon', w: '64px', sortable: false, render: (p) => <IconTile id={p.icon} /> },
    { k: 'isActive', l: 'Status', render: (p) => <MasterStatusBadge isActive={p.isActive} /> },
    { k: 'updatedAt', l: 'Updated', render: (p) => <span className="fs12">{fmtDateTime(p.updatedAt)}</span> },
    {
      k: 'actions',
      l: 'Action',
      sortable: false,
      render: (p) => (
        /* The row itself opens the View page, so the buttons must not also trigger it. */
        <div className="f gp4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn xs"
            title="View"
            aria-label={`View ${p.name.en}`}
            onClick={() => go(ecosystemViewPath(p.id))}
          >
            <Icon name="eye" />
          </button>
          <Can action="updateEcosystemProgramme">
            <button
              type="button"
              className="btn xs"
              title="Edit"
              aria-label={`Edit ${p.name.en}`}
              onClick={() => go(ecosystemEditPath(p.id))}
            >
              <Icon name="edit" />
            </button>
          </Can>
          <Can action="updateEcosystemProgramme">
            <StatusToggle compact isActive={p.isActive} name={p.name.en} canChange disabled={busy} onToggle={() => setToggling(p)} />
          </Can>
          <Can action="deleteEcosystemProgramme">
            <button
              type="button"
              className="btn xs"
              title="Delete"
              aria-label={`Delete ${p.name.en}`}
              style={{ color: 'var(--red)' }}
              disabled={busy}
              onClick={() => setDeleting(p)}
            >
              <Icon name="trash" />
            </button>
          </Can>
        </div>
      ),
    },
  ];

  const s = section.data;

  return (
    <>
      <SectionTabHead
        actions={
          <>
            <Can action="updateEcosystemProgramme">
              <button type="button" className="btn" onClick={() => go('/cms/amrut-ecosystem/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
            <Can action="createEcosystemProgramme">
              <button type="button" className="btn primary" onClick={() => go('/cms/amrut-ecosystem/create')}>
                <Icon name="plus" />
                Add New Programme
              </button>
            </Can>
          </>
        }
      >
        The अमृत प्रणाली cards of the public home and About pages: each programme&rsquo;s icon, name, description and destination, in
        display order.
      </SectionTabHead>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Programmes <span className="sub">live from the backend</span>
          </h3>
          <div className="f ac gp8 wrap">
            {canReorder && !inSiteOrder ? <span className="muted fs12">Sort by Order, ascending, with no search to reorder.</span> : null}
            {filtered ? <span className="tag">filtered</span> : null}
            {programmes.data ? (
              <span className="tag">
                {all.length} listed, {all.filter((p) => p.isActive).length} shown on the website
              </span>
            ) : null}
          </div>
        </div>
        <MasterTable
          columns={columns}
          rows={page?.rows ?? []}
          meta={page?.meta}
          loading={programmes.loading}
          error={programmes.error}
          query={query}
          onQuery={patch}
          onRetry={() => void programmes.reload()}
          searchLabel="name or description"
          emptyMsg={
            filtered
              ? 'No programme matches the current search.'
              : 'No programmes yet: the section shows no cards until one is added. Use Add New Programme to create the first one.'
          }
          rowLink={can('viewEcosystem') ? (p) => ecosystemViewPath(p.id) : undefined}
        />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Section settings</h3>
        </div>
        <div className="card-b">
          <LoadState loading={section.loading && !section.data} error={section.error} onRetry={() => void section.reload()} />
          {s ? (
            <KvList
              pairs={[
                ['Public heading', <Pair key="h" value={s.heading} />],
                ['Subtitle', <Pair key="s" value={s.subtitle} />],
                ['Default link label', <Pair key="l" value={s.linkLabel} />],
                [
                  'Section',
                  <Badge key="v" tone={s.showSection ? 'green' : 'grey'}>
                    {s.showSection ? 'Shown' : 'Hidden'}
                  </Badge>,
                ],
                ['Last updated', fmtDateTime(s.updatedAt)],
              ]}
            />
          ) : null}
        </div>
      </div>

      {toggling ? (
        <ConfirmModal
          title={toggling.isActive ? 'Deactivate programme' : 'Activate programme'}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, deactivate' : 'Yes, activate'}
          message={
            toggling.isActive
              ? `Deactivate ${programmeLabel(toggling)}? The card is hidden from the website but stays in this list and can be activated again.`
              : `Activate ${programmeLabel(toggling)} and show it on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const p = toggling;
            void run(
              () => ecosystemService.setStatus(p.id, !p.isActive),
              p.isActive ? 'Programme deactivated' : 'Programme activated',
              async () => {
                setToggling(null);
                await programmes.reload();
              },
            );
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title="Delete programme"
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${programmeLabel(deleting)}? The card is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const p = deleting;
            void run(
              () => ecosystemService.remove(p.id),
              'Programme deleted',
              async () => {
                setDeleting(null);
                await programmes.reload();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}
