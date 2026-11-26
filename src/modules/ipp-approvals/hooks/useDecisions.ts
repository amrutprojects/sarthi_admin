import { useEffect, useState } from 'react';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { plural } from '../labels';
import type { ApplicationDetail, ApproveResult } from '../types/ippApprovals.types';
import { errorText, isStatus, type NoticeValue } from '../utils';
import { useApproveBatch, useApproveMany, useApproveOne, useReject } from './useIppApprovals';

const RELOADED = ' The current state was loaded again.';

/* "3 applications approved; 1 skipped: it no longer waits for you." */
export function approveResultText({ approved, skipped }: ApproveResult): string {
  const skip = skipped ? `${plural(skipped, 'application')} skipped: not waiting for you any more` : '';
  if (!approved) return skip ? `Nothing approved; ${skip}.` : 'Nothing was waiting for you.';
  return `${plural(approved, 'application')} approved${skip ? `; ${skip}` : ''}.`;
}

interface Outcome {
  onDone: () => void;
  onFailed: () => void;
}

/*
 * The decisions, each with its reason, with the outcome as a toast and as a notice that stays on the page until `scope`
 * (the tab and the filters, or the application) changes. A refusal because the application has moved on (409) says that
 * the current state was loaded again: the hooks do that after every write. Any other refusal (a reason the API did not
 * take, 422) is shown in the dialog, which stays open.
 */
export function useDecisions(scope: string) {
  const [notice, setNotice] = useState<NoticeValue | null>(null);
  useEffect(() => setNotice(null), [scope]);
  const many = useApproveMany();
  const batch = useApproveBatch();
  const one = useApproveOne();
  const rejection = useReject();

  const ok = (text: string) => {
    setNotice({ tone: 'ok', text });
    toastOk(text);
  };
  const failed = (err: unknown) => {
    setNotice({ tone: 'err', text: errorText(err) + (isStatus(err, 409) ? RELOADED : '') });
    toastError(err);
  };
  const decided = (d: ApplicationDetail, what: string) => ok(`${d.name} (${d.registrationId}) ${what}. Now: ${d.stageLabel}.`);

  /* The approval that failed last, unless the application had moved on (that closes the dialog). */
  const approveFailure = [one, many, batch].find((m) => m.isError)?.error;

  return {
    notice,
    busy: many.isPending || batch.isPending || one.isPending,
    /* A refused reason (422) is shown in the dialog. */
    approveError: approveFailure && !isStatus(approveFailure, 409) ? errorText(approveFailure) : null,
    resetApprove: () => {
      one.reset();
      many.reset();
      batch.reset();
    },
    rejecting: rejection.isPending,
    /* A refused reason (422) is shown in the dialog. */
    rejectError: rejection.isError && !isStatus(rejection.error, 409) ? errorText(rejection.error) : null,
    resetReject: rejection.reset,

    approveMany(choice: { ids: string[] } | { batchId: string }, reason: string | null, { onDone, onFailed }: Outcome) {
      const handlers = {
        onSuccess: (r: ApproveResult) => {
          onDone();
          ok(approveResultText(r));
        },
        onError: (err: unknown) => {
          if (isStatus(err, 422)) return;
          onFailed();
          failed(err);
        },
      };
      if ('batchId' in choice) batch.mutate({ batchId: choice.batchId, reason }, handlers);
      else many.mutate({ ids: choice.ids, reason }, handlers);
    },
    approveOne(id: string, reason: string | null, done: () => void) {
      one.mutate(
        { id, reason },
        {
          onSuccess: (d) => {
            done();
            decided(d, 'approved');
          },
          onError: (err) => {
            if (!isStatus(err, 409)) return;
            done();
            failed(err);
          },
        },
      );
    },
    reject(id: string, reason: string, done: () => void) {
      rejection.mutate(
        { id, reason },
        {
          onSuccess: (d) => {
            done();
            decided(d, 'rejected');
          },
          onError: (err) => {
            if (!isStatus(err, 409)) return;
            done();
            failed(err);
          },
        },
      );
    },
  };
}
