import { useState } from 'react';
import { Callout, fmt } from '../../../components/ui';
import type { RowSelection } from '../hooks/useRowSelection';
import { approveManyQuestion, plural } from '../labels';
import { BULK_APPROVE_MAX, type ApplicationRow, type BatchRow, type Stage } from '../types/ippApprovals.types';
import ApproveModal from './ApproveModal';

interface Props {
  selection: RowSelection;
  rows: ApplicationRow[];
  /* The batch of the batch filter; its applications can be chosen together. */
  batch?: BatchRow;
  /* The search or another filter is set as well: it does not limit a whole batch. */
  otherFilters: boolean;
  /* The stages the chosen applications are at, and those the batch's waiting ones are at: the confirmation names who is next. */
  chosenStages: readonly Stage[];
  batchStages: readonly Stage[];
  headOfficeEnabled: boolean;
  busy: boolean;
  /* The API's refusal of the reason (422), shown in the dialog. */
  error?: string | null;
  /* The dialog opens: an earlier refusal is forgotten. */
  onOpen?: () => void;
  onApprove: (
    choice: { ids: string[] } | { batchId: string },
    reason: string | null,
    outcome: { onDone: () => void; onFailed: () => void },
  ) => void;
}

/* Choose the page or the whole batch, then approve the chosen applications with one reason, kept for each. */
export default function BulkBar({
  selection,
  rows,
  batch,
  otherFilters,
  chosenStages,
  batchStages,
  headOfficeEnabled,
  busy,
  error,
  onOpen,
  onApprove,
}: Props) {
  const [confirm, setConfirm] = useState(false);
  const wholeBatch = selection.wholeBatch ? batch : undefined;
  const n = wholeBatch ? wholeBatch.toDecide : selection.ids.size;
  const tooMany = !wholeBatch && n > BULK_APPROVE_MAX;
  const pageIds = rows.filter((r) => r.canDecide).map((r) => r.id);
  const batchName = batch ? `batch ${batch.code}` : '';

  /* Chosen on this page and approved a second time: the reason is asked (for a whole batch, the API says so: 422). */
  const again = wholeBatch ? 0 : rows.filter((r) => selection.ids.has(r.id) && r.reasonRequired).length;
  const run = (reason: string | null) => {
    onApprove(wholeBatch ? { batchId: wholeBatch.id } : { ids: [...selection.ids] }, reason, {
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
        <button
          type="button"
          className="btn xs primary"
          disabled={!n || tooMany || busy}
          onClick={() => {
            onOpen?.();
            setConfirm(true);
          }}
        >
          Approve selected
        </button>
      </div>
      {tooMany ? (
        <div className="mt8">
          <Callout tone="warn">Approve at most {BULK_APPROVE_MAX} applications at a time.</Callout>
        </div>
      ) : null}
      {confirm ? (
        <ApproveModal
          title="Approve applications"
          message={approveManyQuestion(
            wholeBatch
              ? `all ${plural(n, 'application')} of ${batchName} that wait for you, on every page${otherFilters ? ' and whatever the other filters show' : ''}`
              : n === 1
                ? 'this application'
                : `these ${plural(n, 'selected application')}`,
            wholeBatch ? batchStages : chosenStages,
            headOfficeEnabled,
            n,
          )}
          confirmLabel={busy ? 'Approving…' : `Approve ${fmt(n)}`}
          askReason={again > 0}
          several={n > 1}
          busy={busy}
          error={error}
          onApprove={run}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}
