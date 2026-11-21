import { useState } from 'react';
import { Callout, fmt } from '../../../components/ui';
import { ConfirmModal, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import type { ServerColumn, StudentListItem } from '../../students';
import { useBulkPush } from '../hooks/useLmsSync';
import { SYNC_FLAGS, isSyncFlag, type LmsSyncStatus } from '../types/lmsSync.types';
import { SYNC_FLAG_LABEL, SyncFlagBadge } from './SyncFlagBadge';

/* The register's pieces for M1: flag column, flag filter options, row selection and the bulk "Push to LMS" bar. */

/* Rows from a server without M1 carry no `lmsSync` (dash); null = the student has no link yet (Not synced). */
export const syncFlagColumn: ServerColumn<StudentListItem> = {
  k: 'lmsSync',
  l: 'LMS sync',
  render: (s) =>
    s.lmsSync === undefined ? (
      <span className="muted">—</span>
    ) : (
      <span title={s.lmsSync?.lmsLearnerCode ?? undefined}>
        <SyncFlagBadge flag={s.lmsSync && isSyncFlag(s.lmsSync.status) ? s.lmsSync.status : null} />
      </span>
    ),
};

export const syncFilterOptions = (status: LmsSyncStatus | undefined) => [
  { v: '', l: 'All' },
  ...SYNC_FLAGS.map((f) => {
    const n = status?.counts[f];
    return { v: f, l: SYNC_FLAG_LABEL[f][0] + (n != null ? ` (${fmt(n)})` : '') };
  }),
];

/* The API takes at most this many students per bulk push. */
export const BULK_PUSH_MAX = 200;

/* Selected student ids, kept across pages and filters until cleared or pushed. */
export function useRowSelection() {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const addAll = (rowIds: string[]) => setIds((prev) => new Set([...prev, ...rowIds]));
  const clear = () => setIds(new Set());
  return { ids, toggle, addAll, clear };
}
export type RowSelection = ReturnType<typeof useRowSelection>;

export const selectColumn = (sel: RowSelection): ServerColumn<StudentListItem> => ({
  k: 'select',
  l: 'Select',
  render: (s) => (
    <input
      type="checkbox"
      aria-label={'Select ' + s.code}
      checked={sel.ids.has(s.id)}
      onClick={(e) => e.stopPropagation()}
      onChange={() => sel.toggle(s.id)}
    />
  ),
});

/* Bulk bar above the register: select the page, clear, and push the selection to the LMS (confirmed first). */
export function BulkPushBar({ sel, pageIds, paused }: { sel: RowSelection; pageIds: string[]; paused?: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const push = useBulkPush();
  const n = sel.ids.size;
  const tooMany = n > BULK_PUSH_MAX;
  const submit = () =>
    push.mutate([...sel.ids], {
      onSuccess: (r) => {
        sel.clear();
        setConfirm(false);
        toastOk(
          `${fmt(r.queued)} student${r.queued === 1 ? '' : 's'} queued for the LMS` +
            (r.skipped.length ? `; ${fmt(r.skipped.length)} skipped.` : '.'),
        );
      },
      onError: toastError,
    });
  return (
    <div className="mb14">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2" role="group" aria-label="LMS bulk actions">
        <span className="fs13">
          <b>{fmt(n)}</b> selected
        </span>
        <button type="button" className="btn xs" disabled={!pageIds.length} onClick={() => sel.addAll(pageIds)}>
          Select page
        </button>
        <button type="button" className="btn xs" disabled={!n} onClick={sel.clear}>
          Clear
        </button>
        <button
          type="button"
          className="btn xs primary"
          disabled={!n || tooMany || paused || push.isPending}
          title={paused ? 'LMS sync is switched off on the server' : undefined}
          onClick={() => setConfirm(true)}
        >
          Push to LMS
        </button>
      </div>
      {tooMany ? (
        <div className="mt6">
          <Callout tone="warn">Select at most {BULK_PUSH_MAX} students per push.</Callout>
        </div>
      ) : null}
      {confirm ? (
        <ConfirmModal
          title="Push to LMS"
          message={`Queue ${fmt(n)} selected student${n === 1 ? '' : 's'} for the LMS now? Students already in flight or held for review are skipped by the server.`}
          confirmLabel="Push to LMS"
          busy={push.isPending}
          onConfirm={submit}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}
