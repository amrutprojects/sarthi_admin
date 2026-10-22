import { useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, Callout, EmptyState, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { IMPACT_CRUMBS } from '../constants';
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

const label = (s: ApiImpactStat) => `${s.value} — ${s.label.mr} / ${s.label.en}`;

/*
 * AMRUT Impact Management — the AMRUT's Impact (अमृतचा प्रभाव) figures of the public home page.
 *
 * Every action names its card by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, deactivate or reorder the wrong card.
 */
export default function ImpactPage() {
  usePageTitle('AMRUT Impact Management');
  const go = useGo();
  const can = useCan();
  const stats = useApiData(() => impactService.list(), []);
  const section = useApiData(() => impactService.getSection(), []);
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [deleting, setDeleting] = useState<ApiImpactStat | null>(null);
  const [toggling, setToggling] = useState<ApiImpactStat | null>(null);

  const all = stats.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = all.filter(
    (s) =>
      (!q || [s.value, s.label.mr, s.label.en].some((t) => t.toLowerCase().includes(q))) &&
      (status === '' || s.isActive === (status === 'active')),
  );
  const filtered = q !== '' || status !== '';
  /* Moving a card within a filtered view would be ambiguous, so reordering needs the full list. */
  const canReorder = can('updateImpactStat') && !filtered && all.length > 1;

  const move = (index: number, by: -1 | 1) => {
    const ids = all.map((s) => s.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to]!, ids[index]!];
    void run(
      () => impactService.reorder(ids),
      'Display order updated',
      () => stats.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void stats.reload();
    });
  };

  const sec = section.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...IMPACT_CRUMBS.slice(0, 2), { l: 'AMRUT Impact Management' }]}
        title="AMRUT Impact Management"
        sub="The AMRUT's Impact figures of the public home page: each card's value and label, in display order."
        actions={
          <Can action="createImpactStat">
            <button type="button" className="btn primary" onClick={() => go('/cms/impact/create')}>
              <Icon name="plus" />
              Add New Statistic
            </button>
          </Can>
        }
      />

      <div className="mb14">
        <Callout tone="info" title="These figures are entered by hand">
          Each value is shown on the website exactly as typed here; none of them is counted automatically. In particular, &ldquo;Schemes
          running&rdquo; does not update from AMRUT Schemes Management — update it here when schemes are added or removed.
        </Callout>
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Statistics{' '}
            <span className="sub">
              {stats.data ? `${all.length} listed, ${all.filter((s) => s.isActive).length} shown on the website` : ''}
            </span>
          </h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <div className="card-b f ac gp8 wrap" style={{ paddingBottom: 0 }}>
          <input
            className="inp"
            type="search"
            aria-label="Search statistics"
            placeholder="Search value or label…"
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
          {filtered && can('updateImpactStat') ? <span className="muted fs12">Clear the filters to reorder.</span> : null}
        </div>

        <LoadState loading={stats.loading && !stats.data} error={stats.error} onRetry={() => void stats.reload()} />
        {stats.data && all.length === 0 ? (
          <EmptyState title="No statistics yet" msg="The section shows no cards until a statistic is added.">
            <Can action="createImpactStat">
              <button type="button" className="btn primary" onClick={() => go('/cms/impact/create')}>
                <Icon name="plus" />
                Add New Statistic
              </button>
            </Can>
          </EmptyState>
        ) : null}
        {stats.data && all.length > 0 && rows.length === 0 ? (
          <p className="muted fs13" style={{ padding: '14px 16px' }}>
            No statistic matches the current search and filter.
          </p>
        ) : null}

        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 92 }}>Order</th>
                  <th>Value</th>
                  <th>Label</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const i = all.indexOf(s);
                  return (
                    <tr key={s.id} className="norow" data-stat-id={s.id}>
                      <td>
                        <div className="f ac gp4">
                          <b className="mono fs12" style={{ minWidth: 22 }}>
                            {s.displayOrder}
                          </b>
                          {canReorder ? (
                            <>
                              <button
                                type="button"
                                className="btn xs"
                                title="Move up"
                                aria-label={`Move ${s.label.en} up`}
                                disabled={busy || i === 0}
                                onClick={() => move(i, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="btn xs"
                                title="Move down"
                                aria-label={`Move ${s.label.en} down`}
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
                        <b style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--brand-600)', whiteSpace: 'nowrap' }}>
                          {s.value}
                        </b>
                      </td>
                      <td>
                        <Pair value={s.label} />
                      </td>
                      <td>
                        <MasterStatusBadge isActive={s.isActive} />
                      </td>
                      <td>
                        <div className="f gp4">
                          <Can action="updateImpactStat">
                            <button
                              type="button"
                              className="btn xs"
                              title="Edit"
                              aria-label={`Edit ${s.label.en}`}
                              onClick={() => go(`/cms/impact/${s.id}/edit`)}
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              type="button"
                              className="btn xs"
                              title={s.isActive ? 'Deactivate — hide from the website' : 'Activate — show on the website'}
                              aria-label={`${s.isActive ? 'Deactivate' : 'Activate'} ${s.label.en}`}
                              style={{ color: s.isActive ? 'var(--amber)' : 'var(--green)' }}
                              disabled={busy}
                              onClick={() => setToggling(s)}
                            >
                              <Icon name="power" />
                            </button>
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
          {sec ? (
            <Can action="updateImpactStat">
              <button type="button" className="btn sm" onClick={() => go('/cms/impact/settings')}>
                <Icon name="edit" />
                Edit settings
              </button>
            </Can>
          ) : null}
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
              ? `Deactivate ${label(toggling)}? The card is hidden from the website but stays in this list and can be activated again.`
              : `Activate ${label(toggling)} and show it on the website again?`
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
          message={`Delete ${label(deleting)}? The card is removed from the website and from this list. The record itself is kept for audit history.`}
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
    </div>
  );
}
