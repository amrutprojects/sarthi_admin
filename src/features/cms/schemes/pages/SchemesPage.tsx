import { useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { Badge, EmptyState, KvList, PageHead, useGo } from '../../../../components/ui';
import { Can, useCan } from '../../../../modules/auth/components/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, LoadState, fmtDateTime, useAction, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { SCHEMES_CRUMBS, fmtDeadline, isExpired, todayIso } from '../constants';
import { schemesService } from '../services/schemesService';
import type { ApiScheme, ApiSchemesSection, Bilingual } from '../types/schemes.types';

/* Marathi first, as on the public site; English underneath. Long text wraps (cells do not by default). */
const Pair = ({ value, wrap }: { value: Bilingual; wrap?: boolean }) =>
  value.mr || value.en ? (
    <div style={wrap ? { whiteSpace: 'normal', minWidth: 160, maxWidth: 260 } : { whiteSpace: 'normal', minWidth: 150, maxWidth: 230 }}>
      <div lang="mr">{value.mr}</div>
      <div className="muted fs12" lang="en">
        {value.en}
      </div>
    </div>
  ) : (
    <span className="muted">—</span>
  );

/* The description is long; the list shows its start and the whole text on hover. */
const Short = ({ value }: { value: Bilingual }) => {
  const cut = (t: string) => (t.length > 90 ? `${t.slice(0, 90).trimEnd()}…` : t);
  return (
    <div style={{ whiteSpace: 'normal', minWidth: 170, maxWidth: 260 }} title={`${value.mr}\n\n${value.en}`}>
      <div lang="mr">{cut(value.mr)}</div>
      <div className="muted fs12" lang="en">
        {cut(value.en)}
      </div>
    </div>
  );
};

const Deadline = ({ deadline, today }: { deadline: string | null; today: string }) =>
  deadline ? (
    <div>
      <span className="mono fs12" style={{ whiteSpace: 'nowrap' }}>
        {fmtDeadline(deadline)}
      </span>
      {isExpired(deadline, today) ? (
        <div>
          <span className="tag" title="The date has passed. The scheme stays on the website until it is hidden or deleted.">
            Date passed
          </span>
        </div>
      ) : null}
    </div>
  ) : (
    <span className="muted fs12">No last date</span>
  );

const Button = ({ s, section }: { s: ApiScheme; section: ApiSchemesSection | null }) => {
  const own = s.buttonLabel.mr || s.buttonLabel.en;
  const label = own ? s.buttonLabel.en : section ? section.buttonLabel.en : null;
  return (
    <div style={{ whiteSpace: 'normal', maxWidth: 220 }}>
      {label ? (
        <div className="fs12">
          {label}
          {own ? null : <span className="muted"> (default)</span>}
        </div>
      ) : null}
      {!s.link ? (
        <span className="muted fs12">No link — shows &ldquo;not available&rdquo;</span>
      ) : s.link.startsWith('/') ? (
        <span className="mono fs12" style={{ whiteSpace: 'nowrap' }}>
          {s.link}
        </span>
      ) : (
        <span className="mono fs12" style={{ wordBreak: 'break-all' }}>
          {s.link} <span aria-label="opens another site">↗</span>
        </span>
      )}
    </div>
  );
};

const label = (s: ApiScheme) => `${s.title.mr} / ${s.title.en}`;

/*
 * AMRUT Schemes Management — the अमृत योजना विभाग cards of the public home page.
 *
 * Every action names its scheme by id, never by its position on screen, so a list that has moved on
 * since it was loaded can never delete, hide or reorder the wrong scheme.
 */
export default function SchemesPage() {
  usePageTitle('AMRUT Schemes Management');
  const go = useGo();
  const can = useCan();
  const schemes = useApiData(() => schemesService.list(), []);
  const section = useApiData(() => schemesService.getSection(), []);
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'inactive'>('');
  const [deleting, setDeleting] = useState<ApiScheme | null>(null);
  const [toggling, setToggling] = useState<ApiScheme | null>(null);
  const today = todayIso();

  const all = schemes.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = all.filter(
    (s) =>
      (!q ||
        [s.title.mr, s.title.en, s.description.mr, s.description.en, s.badge.mr, s.badge.en].some((t) => t.toLowerCase().includes(q))) &&
      (status === '' || s.isActive === (status === 'active')),
  );
  const filtered = q !== '' || status !== '';
  /* Moving a scheme within a filtered view would be ambiguous, so reordering needs the full list. */
  const canReorder = can('updateScheme') && !filtered && all.length > 1;

  const move = (index: number, by: -1 | 1) => {
    const ids = all.map((s) => s.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to]!, ids[index]!];
    void run(
      () => schemesService.reorder(ids),
      'Display order updated',
      () => schemes.reload(),
    ).then((ok) => {
      /* A 409 means the list changed elsewhere; show the current one rather than the stale one. */
      if (!ok) void schemes.reload();
    });
  };

  const sec = section.data;

  return (
    <div className="page">
      <PageHead
        crumbs={[...SCHEMES_CRUMBS.slice(0, 2), { l: 'AMRUT Schemes Management' }]}
        title="AMRUT Schemes Management"
        sub="The AMRUT Schemes cards of the public home page: each scheme's title, description, badge, last date and button, in display order."
        actions={
          <Can action="createScheme">
            <button type="button" className="btn primary" onClick={() => go('/cms/amrut-schemes/create')}>
              <Icon name="plus" />
              Add New Scheme
            </button>
          </Can>
        }
      />

      <div className="card mb14">
        <div className="card-h">
          <h3>
            Schemes{' '}
            <span className="sub">
              {schemes.data ? `${all.length} listed, ${all.filter((s) => s.isActive).length} shown on the website` : ''}
            </span>
          </h3>
          {filtered ? <span className="tag">filtered</span> : null}
        </div>
        <div className="card-b f ac gp8 wrap" style={{ paddingBottom: 0 }}>
          <input
            className="inp"
            type="search"
            aria-label="Search schemes"
            placeholder="Search title, description or badge…"
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
          {filtered && can('updateScheme') ? <span className="muted fs12">Clear the filters to reorder.</span> : null}
        </div>

        <LoadState loading={schemes.loading && !schemes.data} error={schemes.error} onRetry={() => void schemes.reload()} />
        {schemes.data && all.length === 0 ? (
          <EmptyState title="No schemes yet" msg="The section shows no cards until a scheme is added.">
            <Can action="createScheme">
              <button type="button" className="btn primary" onClick={() => go('/cms/amrut-schemes/create')}>
                <Icon name="plus" />
                Add New Scheme
              </button>
            </Can>
          </EmptyState>
        ) : null}
        {schemes.data && all.length > 0 && rows.length === 0 ? (
          <p className="muted fs13" style={{ padding: '14px 16px' }}>
            No scheme matches the current search and filter.
          </p>
        ) : null}

        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 92 }}>Order</th>
                  <th>Scheme</th>
                  <th>Description</th>
                  <th>Badge</th>
                  <th>Last date</th>
                  <th>Button</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const i = all.indexOf(s);
                  return (
                    <tr key={s.id} className="norow" data-scheme-id={s.id}>
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
                                aria-label={`Move ${s.title.en} up`}
                                disabled={busy || i === 0}
                                onClick={() => move(i, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className="btn xs"
                                title="Move down"
                                aria-label={`Move ${s.title.en} down`}
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
                        <Pair value={s.title} />
                        {s.featured ? (
                          <div className="mt4">
                            <Badge tone="amber" nodot>
                              Highlighted
                            </Badge>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <Short value={s.description} />
                      </td>
                      <td>
                        <Pair value={s.badge} />
                      </td>
                      <td>
                        <Deadline deadline={s.deadline} today={today} />
                      </td>
                      <td>
                        <Button s={s} section={sec} />
                      </td>
                      <td>
                        <MasterStatusBadge isActive={s.isActive} />
                      </td>
                      <td>
                        <div className="f gp4">
                          <Can action="updateScheme">
                            <button
                              type="button"
                              className="btn xs"
                              title="Edit"
                              aria-label={`Edit ${s.title.en}`}
                              onClick={() => go(`/cms/amrut-schemes/${s.id}/edit`)}
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              type="button"
                              className="btn xs"
                              title={s.isActive ? 'Hide from the website' : 'Show on the website'}
                              aria-label={`${s.isActive ? 'Hide' : 'Show'} ${s.title.en}`}
                              style={{ color: s.isActive ? 'var(--amber)' : 'var(--green)' }}
                              disabled={busy}
                              onClick={() => setToggling(s)}
                            >
                              <Icon name="power" />
                            </button>
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
            <Can action="updateScheme">
              <button type="button" className="btn sm" onClick={() => go('/cms/amrut-schemes/settings')}>
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

      {toggling ? (
        <ConfirmModal
          title={toggling.isActive ? 'Hide scheme' : 'Show scheme'}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, hide' : 'Yes, show'}
          message={
            toggling.isActive
              ? `Hide ${label(toggling)} from the website? The scheme stays in this list and can be shown again.`
              : `Show ${label(toggling)} on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const s = toggling;
            void run(
              () => schemesService.setStatus(s.id, !s.isActive),
              s.isActive ? 'Scheme hidden' : 'Scheme shown',
              async () => {
                setToggling(null);
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
          message={`Delete ${label(deleting)}? The scheme is removed from the website and from this list. The record itself is kept for audit history.`}
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
    </div>
  );
}
