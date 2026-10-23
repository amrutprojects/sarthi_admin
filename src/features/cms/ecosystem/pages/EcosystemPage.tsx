import { useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, EmptyState, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { ECOSYSTEM_CRUMBS, iconLabel } from '../constants';
import { ecosystemService } from '../services/ecosystemService';
import type { ApiProgramme, Bilingual } from '../types/ecosystem.types';

/* Marathi first, as on the public site; English underneath. Long text wraps (cells do not by default). */
const Pair = ({ value, wrap }: { value: Bilingual; wrap?: boolean }) =>
  value.mr || value.en ? (
    <div style={wrap ? { whiteSpace: 'normal', minWidth: 150, maxWidth: 240 } : undefined}>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">—</span>
  );

const Destination = ({ link }: { link: string | null }) =>
  !link ? (
    <span className="muted fs12">No link — shows &ldquo;not available&rdquo;</span>
  ) : link.startsWith('/') ? (
    <span className="mono fs12">{link}</span>
  ) : (
    <span className="mono fs12" style={{ whiteSpace: 'normal', wordBreak: 'break-all', maxWidth: 220, display: 'inline-block' }}>
      {link} <span aria-label="opens another site">↗</span>
    </span>
  );

const label = (p: ApiProgramme) => `${p.name.mr} / ${p.name.en}`;

/*
 * The AMRUT Ecosystem — the अमृत प्रणाली cards of the home and About pages.
 *
 * Every action names its card by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, hide or reorder the wrong card.
 */
export default function EcosystemPage() {
  usePageTitle('The AMRUT Ecosystem');
  const go = useGo();
  const can = useCan();
  const programmes = useApiData(() => ecosystemService.list(), []);
  const section = useApiData(() => ecosystemService.getSection(), []);
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [deleting, setDeleting] = useState<ApiProgramme | null>(null);
  const [toggling, setToggling] = useState<ApiProgramme | null>(null);

  const all = programmes.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = all.filter(
    (p) =>
      (!q || [p.name.mr, p.name.en, p.description.mr, p.description.en].some((t) => t.toLowerCase().includes(q))) &&
      (status === '' || p.isActive === (status === 'active')),
  );
  const filtered = q !== '' || status !== '';
  /* Moving a card within a filtered view would be ambiguous, so reordering needs the full list. */
  const canReorder = can('updateEcosystemProgramme') && !filtered && all.length > 1;

  const move = (index: number, by: -1 | 1) => {
    const ids = all.map((p) => p.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to]!, ids[index]!];
    void run(
      () => ecosystemService.reorder(ids),
      'Display order updated',
      () => programmes.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void programmes.reload();
    });
  };

  const s = section.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...ECOSYSTEM_CRUMBS.slice(0, 2), { l: 'The AMRUT Ecosystem' }]}
        title="The AMRUT Ecosystem"
        sub="The अमृत प्रणाली cards of the public home and About pages: each programme's icon, name, description and destination, in display order."
        actions={
          <Can action="createEcosystemProgramme">
            <button type="button" className="btn primary" onClick={() => go('/cms/amrut-ecosystem/create')}>
              <Icon name="plus" />
              Add New Programme
            </button>
          </Can>
        }
      />

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Programmes{' '}
            <span className="sub">
              {programmes.data ? `${all.length} listed, ${all.filter((p) => p.isActive).length} shown on the website` : ''}
            </span>
          </h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <div className="card-b f ac gp8 wrap" style={{ paddingBottom: 0 }}>
          <input
            className="inp"
            type="search"
            aria-label="Search programmes"
            placeholder="Search name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <select
            className="inp"
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            style={{ maxWidth: 180 }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {filtered ? (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setSearch('');
                setStatus('');
              }}
            >
              Clear filters
            </button>
          ) : null}
          {filtered && can('updateEcosystemProgramme') ? <span className="muted fs12">Clear the filters to reorder.</span> : null}
        </div>

        <LoadState loading={programmes.loading && !programmes.data} error={programmes.error} onRetry={() => void programmes.reload()} />
        {programmes.data && all.length === 0 ? (
          <EmptyState title="No programmes yet" msg="The section shows no cards until a programme is added.">
            <Can action="createEcosystemProgramme">
              <button type="button" className="btn primary" onClick={() => go('/cms/amrut-ecosystem/create')}>
                <Icon name="plus" />
                Add New Programme
              </button>
            </Can>
          </EmptyState>
        ) : null}
        {programmes.data && all.length > 0 && rows.length === 0 ? (
          <p className="muted fs13" style={{ padding: '14px 16px' }}>
            No programme matches the current search and filter.
          </p>
        ) : null}

        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 92 }}>Order</th>
                  <th style={{ width: 56 }}>Icon</th>
                  <th>Programme</th>
                  <th>Description</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const i = all.indexOf(p);
                  return (
                    <tr key={p.id} className="norow" data-programme-id={p.id}>
                      <td>
                        <div className="f ac gp4">
                          <b className="mono fs12" style={{ minWidth: 22 }}>
                            {p.displayOrder}
                          </b>
                          {canReorder ? (
                            <>
                              <button
                                type="button"
                                className="btn xs"
                                title="Move up"
                                aria-label={`Move ${p.name.en} up`}
                                disabled={busy || i === 0}
                                onClick={() => move(i, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="btn xs"
                                title="Move down"
                                aria-label={`Move ${p.name.en} down`}
                                disabled={busy || i === all.length - 1}
                                onClick={() => move(i, 1)}
                              >
                                ↓
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div
                          title={iconLabel(p.icon)}
                          role="img"
                          aria-label={`Icon: ${iconLabel(p.icon)}`}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'var(--saffron-100)',
                            color: 'var(--brand-600)',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <Icon name={p.icon} />
                        </div>
                      </td>
                      <td>
                        <Pair value={p.name} />
                      </td>
                      <td>
                        <Pair value={p.description} wrap />
                      </td>
                      <td>
                        <Destination link={p.link} />
                      </td>
                      <td>
                        <MasterStatusBadge isActive={p.isActive} />
                      </td>
                      <td>
                        <div className="f gp4">
                          <Can action="updateEcosystemProgramme">
                            <button
                              type="button"
                              className="btn xs"
                              title="Edit"
                              aria-label={`Edit ${p.name.en}`}
                              onClick={() => go(`/cms/amrut-ecosystem/${p.id}/edit`)}
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              type="button"
                              className="btn xs"
                              title={p.isActive ? 'Hide from the website' : 'Show on the website'}
                              aria-label={`${p.isActive ? 'Hide' : 'Show'} ${p.name.en}`}
                              style={{ color: p.isActive ? 'var(--amber)' : 'var(--green)' }}
                              disabled={busy}
                              onClick={() => setToggling(p)}
                            >
                              <Icon name="power" />
                            </button>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>Section settings</h3>
          {s ? (
            <Can action="updateEcosystemProgramme">
              <button type="button" className="btn sm" onClick={() => go('/cms/amrut-ecosystem/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
          ) : null}
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
          title={toggling.isActive ? 'Hide programme' : 'Show programme'}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, hide' : 'Yes, show'}
          message={
            toggling.isActive
              ? `Hide ${label(toggling)} from the website? The card stays in this list and can be shown again.`
              : `Show ${label(toggling)} on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const p = toggling;
            void run(
              () => ecosystemService.setStatus(p.id, !p.isActive),
              p.isActive ? 'Programme hidden' : 'Programme shown',
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
          message={`Delete ${label(deleting)}? The card is removed from the website and from this list. The record itself is kept for audit history.`}
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
    </div>
  );
}
