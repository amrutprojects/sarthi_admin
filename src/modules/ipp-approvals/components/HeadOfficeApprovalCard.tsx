import { useState } from 'react';
import { ConfirmModal, fmtDateTime, toastError } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, Card } from '../../../components/ui';
import { useCan } from '../../auth';
import { useHeadOffice, useSetHeadOffice } from '../hooks/useIppApprovals';
import { plural } from '../labels';
import { errorText, isStatus } from '../utils';
import { LoadProblem } from './common';

const EXPLAIN = {
  on: 'On: the Head Officer gives the final approval. The Super Admin sees every application and does not decide.',
  off: 'Off: the Super Admin gives the final approval. The Head Officer sees the applications and does not decide.',
};

/*
 * System Settings card: who gives the final approval of the IPP applications. Changing it moves the applications that
 * wait for the final decision. Hidden when the API does not offer it to this user (403) or at all (404); read-only
 * without settings.update.
 */
export function HeadOfficeApprovalCard() {
  const can = useCan();
  const q = useHeadOffice();
  const set = useSetHeadOffice();
  const [confirm, setConfirm] = useState(false);
  if (isStatus(q.error, 403, 404) || q.isPending) return null;
  if (!q.data) {
    return (
      <div className="mb14">
        <Card title="Head Office approval" sub="IPP applications">
          <LoadProblem error={q.error} what="the Head Office approval setting" onRetry={() => void q.refetch()} />
        </Card>
      </div>
    );
  }
  const { enabled, updatedAt, updatedBy } = q.data;
  const next = !enabled;
  const moved = set.data;

  return (
    <div className="mb14">
      <Card title="Head Office approval" sub="IPP applications">
        <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
          <div className="tw-min-w-0 tw-flex-1 tw-basis-56">
            <b>Head Office gives the final approval</b>
            <div className="muted fs12 mt8">
              <div>{EXPLAIN.on}</div>
              <div>{EXPLAIN.off}</div>
            </div>
          </div>
          <div className="tw-flex tw-items-center tw-gap-2">
            <Badge tone={enabled ? 'green' : 'grey'}>{enabled ? 'On' : 'Off'}</Badge>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Head Office approval"
              className={'switch' + (enabled ? ' on' : '')}
              disabled={!can('editSettings') || set.isPending}
              onClick={() => setConfirm(true)}
            />
          </div>
        </div>
        <div aria-live="polite">
          {moved ? (
            <div className="mt10">
              <Callout tone="ok">
                Head Office approval is {moved.enabled ? 'on' : 'off'}.{' '}
                {moved.moved
                  ? `${plural(moved.moved, 'waiting application')} moved to ${moved.enabled ? 'Head Office' : 'the Super Admin'}.`
                  : 'No application was waiting for the final approval.'}
              </Callout>
            </div>
          ) : null}
        </div>
        {set.isError ? (
          <div className="mt10" role="alert">
            <Callout tone="err" title="Not saved. ">
              {errorText(set.error)}
            </Callout>
          </div>
        ) : null}
        {updatedAt ? (
          <div className="muted fs12 mt8">
            Last changed {fmtDateTime(updatedAt)}
            {updatedBy ? ` by ${updatedBy}` : ''}.
          </div>
        ) : null}
      </Card>
      {confirm ? (
        <ConfirmModal
          title={next ? 'Switch Head Office approval on' : 'Switch Head Office approval off'}
          message={
            next
              ? 'On: the Head Officer gives the final approval. The applications that wait for the Super Admin move to Head Office now.'
              : 'Off: the Super Admin gives the final approval. The applications that wait for Head Office move to the Super Admin now.'
          }
          confirmLabel={set.isPending ? 'Saving…' : next ? 'Switch on' : 'Switch off'}
          busy={set.isPending}
          onClose={() => setConfirm(false)}
          onConfirm={() => set.mutate(next, { onError: toastError, onSettled: () => setConfirm(false) })}
        />
      ) : null}
    </div>
  );
}
