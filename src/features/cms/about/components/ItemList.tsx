import { useState } from 'react';
import Icon from '../../../../components/ui/Icon';
import { EmptyState, useGo } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import MasterStatusBadge from '../../components/MasterStatusBadge';
import { ConfirmModal, useAction } from '../../shared';
import { KINDS } from '../constants';
import { aboutService } from '../services/aboutService';
import type { AboutItem, AboutKind, Bilingual } from '../types/about.types';

/* Marathi first, as on the public site; English underneath. Long text wraps (cells do not by default). */
const Pair = ({ value, wrap }: { value: Bilingual; wrap?: boolean }) => (
  <div style={wrap ? { whiteSpace: 'pre-line', minWidth: 180, maxWidth: 420 } : undefined}>
    <div lang="mr">{value.mr}</div>
    <div className="muted fs12" lang="en">
      {value.en}
    </div>
  </div>
);

/*
 * The information rows or the cards, in display order, with reorder, edit, show/hide and delete.
 * Every action names its record by id, never by its position on screen. Required cards (Mission,
 * Vision, Values) offer no hide or delete: the server refuses both.
 */
export default function ItemList({ kind, items, onChanged }: { kind: AboutKind; items: AboutItem[]; onChanged: () => Promise<void> }) {
  const k = KINDS[kind];
  const go = useGo();
  const can = useCan();
  const { busy, run } = useAction();
  const [deleting, setDeleting] = useState<AboutItem | null>(null);
  const [toggling, setToggling] = useState<AboutItem | null>(null);
  const label = (i: AboutItem) => `${i.first.mr} / ${i.first.en}`;
  const canUpdate = can('updateAbout');

  const move = (index: number, by: -1 | 1) => {
    const ids = items.map((i) => i.id);
    const to = index + by;
    [ids[index], ids[to]] = [ids[to]!, ids[index]!];
    void run(() => aboutService.reorder(kind, ids), 'Display order updated', onChanged).then((ok) => {
      if (!ok) void onChanged();
    });
  };

  if (items.length === 0) {
    return <EmptyState title={`No ${k.nounLower}s`} msg={`The website shows no ${k.nounLower}s until one is added.`} />;
  }

  return (
    <>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 92 }}>Order</th>
              <th>{k.first.label}</th>
              <th>{k.second.label}</th>
              <th>Status</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, index) => (
              <tr key={i.id} className="norow" data-item-id={i.id}>
                <td>
                  <div className="f ac gp4">
                    <b className="mono fs12" style={{ minWidth: 22 }}>
                      {i.displayOrder}
                    </b>
                    {canUpdate && items.length > 1 ? (
                      <>
                        <button
                          type="button"
                          className="btn xs"
                          aria-label={`Move ${i.first.en} up`}
                          title="Move up"
                          disabled={busy || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn xs"
                          aria-label={`Move ${i.first.en} down`}
                          title="Move down"
                          disabled={busy || index === items.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
                <td>
                  <Pair value={i.first} />
                </td>
                <td>
                  <Pair value={i.second} wrap />
                </td>
                <td>
                  <div className="f ac gp4 wrap">
                    <MasterStatusBadge isActive={i.isActive} />
                    {i.isRequired ? (
                      <span className="tag" title="Can be edited and reordered, not hidden or deleted">
                        Required
                      </span>
                    ) : null}
                  </div>
                </td>
                <td>
                  <div className="f gp4">
                    {canUpdate ? (
                      <button
                        type="button"
                        className="btn xs"
                        title="Edit"
                        aria-label={`Edit ${i.first.en}`}
                        onClick={() => go(`/cms/about-amrut/${kind}/${i.id}/edit`)}
                      >
                        <Icon name="edit" />
                      </button>
                    ) : null}
                    {canUpdate && !i.isRequired ? (
                      <button
                        type="button"
                        className="btn xs"
                        title={i.isActive ? 'Hide from the website' : 'Show on the website'}
                        aria-label={`${i.isActive ? 'Hide' : 'Show'} ${i.first.en}`}
                        style={{ color: i.isActive ? 'var(--amber)' : 'var(--green)' }}
                        disabled={busy}
                        onClick={() => setToggling(i)}
                      >
                        <Icon name="power" />
                      </button>
                    ) : null}
                    {can('deleteAboutItem') && !i.isRequired ? (
                      <button
                        type="button"
                        className="btn xs"
                        title="Delete"
                        aria-label={`Delete ${i.first.en}`}
                        style={{ color: 'var(--red)' }}
                        disabled={busy}
                        onClick={() => setDeleting(i)}
                      >
                        <Icon name="trash" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toggling ? (
        <ConfirmModal
          title={toggling.isActive ? `Hide ${k.nounLower}` : `Show ${k.nounLower}`}
          busy={busy}
          confirmLabel={toggling.isActive ? 'Yes, hide' : 'Yes, show'}
          message={
            toggling.isActive
              ? `Hide ${label(toggling)} from the website? It stays here and can be shown again.`
              : `Show ${label(toggling)} on the website again?`
          }
          onClose={() => setToggling(null)}
          onConfirm={() => {
            const i = toggling;
            void run(
              () => aboutService.setItemStatus(kind, i.id, !i.isActive),
              i.isActive ? `${k.noun} hidden` : `${k.noun} shown`,
              async () => {
                setToggling(null);
                await onChanged();
              },
            );
          }}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title={`Delete ${k.nounLower}`}
          danger
          busy={busy}
          confirmLabel="Delete"
          message={`Delete ${label(deleting)}? It is removed from the website and from this list. The record itself is kept for audit history.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const i = deleting;
            void run(
              () => aboutService.removeItem(kind, i.id),
              `${k.noun} deleted`,
              async () => {
                setDeleting(null);
                await onChanged();
              },
            );
          }}
        />
      ) : null}
    </>
  );
}
