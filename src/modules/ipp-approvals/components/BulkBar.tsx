import { useState } from 'react';
import { ConfirmModal } from '../../../components/feedback/apiFeedback';
import { Callout, fmt } from '../../../components/ui';
import type { RowSelection } from '../hooks/useRowSelection';
import { plural } from '../labels';
import { BULK_APPROVE_MAX, type ApplicationRow, type BatchRow } from '../types/ippApprovals.types';

interface Props {
  selection: RowSelection;
  rows: ApplicationRow[];
  /* The batch of the batch filter; its applications can be chosen together. */
  batch?: BatchRow;
  /* The search or another filter is set as well: it does not limit a whole batch. */
  otherFilters: boolean;
  /* Where an approval sends the applications; null when it differs from one to the next. */
  goesTo: string | null;
  busy: boolean;
  onApprove: (choice: { ids: string[] } | { batchId: string }, outcome: { onDone: () => void; onFailed: () => void }) => void;
}

/* Choose the page or the whole batch, then approve the chosen applications after one confirmation. */
export default function BulkBar({ selection, rows, batch, otherFilters, goesTo, busy, onApprove }: Props) {
  const [confirm, setConfirm] = useState(false);
  const wholeBatch = selection.wholeBatch ? batch : undefined;
  const n = wholeBatch ? wholeBatch.toDecide : selection.ids.size;
  const tooMany = !wholeBatch && n > BULK_APPROVE_MAX;
  const pageIds = rows.filter((r) => r.canDecide).map((r) => r.id);
  const batchName = batch ? `batch ${batch.code}` : '';
  const after = goesTo ? ` After your approval: ${goesTo}.` : ' Each goes on to its next level.';

  const run = () => {
    onApprove(wholeBatch ? { batchId: wholeBatch.id } : { ids: [...selection.ids] }, {
      onDone: () => {
        selection.clear();
        setConfirm(false);
      },
      onFailed: () => setConfirm(false),
    });
  };

  return (
    <div className="mb14">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2" role="group" aria-label="Approve several applications">
        <span className="fs13" aria-live="polite">
          <b>{fmt(n)}</b> selected{wholeBatch ? ` (all of ${batchName} that wait for you)` : ''}
        </span>
        <button
          type="button"
          className="btn xs"
          disabled={!pageIds.length || selection.wholeBatch}
          onClick={() => selection.set(pageIds, true)}
        >
          Select page
        </button>
        {batch ? (
          <button type="button" className="btn xs" disabled={!batch.toDecide || selection.wholeBatch} onClick={selection.selectBatch}>
            Select all in this batch ({fmt(batch.toDecide)})
          </button>
        ) : null}
        <button type="button" className="btn xs" disabled={!n} onClick={selection.clear}>
          Clear
        </button>
        <button type="button" className="btn xs primary" disabled={!n || tooMany || busy} onClick={() => setConfirm(true)}>
          Approve selected
        </button>
      </div>
      {tooMany ? (
        <div className="mt8">
          <Callout tone="warn">Approve at most {BULK_APPROVE_MAX} applications at a time.</Callout>
        </div>
      ) : null}
      {confirm ? (
        <ConfirmModal
          title="Approve applications"
          message={
            wholeBatch
              ? `Approve all ${plural(n, 'application')} of ${batchName} that wait for you, on every page${otherFilters ? ' and whatever the other filters show' : ''}?${after}`
              : `Approve ${plural(n, 'selected application')}?${after}`
          }
          confirmLabel={busy ? 'Approving…' : `Approve ${fmt(n)}`}
          busy={busy}
          onConfirm={run}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}
