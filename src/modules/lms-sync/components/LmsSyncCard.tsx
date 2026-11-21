import type { ReactNode } from 'react';
import { Callout, Card, KvList, Timeline, type TimelineItem } from '../../../components/ui';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import Icon from '../../../components/ui/Icon';
import { ApiError } from '../../../services/api-client';
import { fmtDate } from '../../students';
import { useLmsSyncDetail, useLmsSyncFeature, useSyncActions } from '../hooks/useLmsSync';
import { SYNC_ERROR_LABEL, type LmsSyncDetail } from '../types/lmsSync.types';
import { SyncFlagBadge } from './SyncFlagBadge';

const dash = (v: string | null | undefined) => (v ? v : '—');

/*
 * The API keeps the latest timestamps of each step (no event log), so the history is built from them, oldest first.
 */
function history(d: LmsSyncDetail): TimelineItem[] {
  const steps: [string, string | null, TimelineItem['state']][] = [
    ['Linked to the LMS sync', d.linkCreatedAt, 'done'],
    ['Queued', d.queuedAt, d.syncStatus === 'PENDING' ? 'cur' : 'done'],
    ['Sent to the LMS', d.lastSentAt, d.syncStatus === 'SENT' ? 'cur' : 'done'],
    ['Checked with the LMS', d.lastCheckedAt, 'done'],
    ['Synced', d.lastSyncedAt, 'done'],
  ];
  const items: TimelineItem[] = steps.filter(([, at]) => at).map(([title, at, state]) => ({ title, sub: fmtDate(at), state }));
  if (d.syncStatus === 'FAILED') items.push({ title: 'Failed', sub: dash(d.lastErrorCode), state: 'fail' });
  if (d.nextAttemptAt) items.push({ title: 'Next attempt', sub: fmtDate(d.nextAttemptAt), state: '' });
  return items;
}

/*
 * The student's LMS sync (GET /lms-sync/students/:id): flag, LMS learner id and code, LMS status, attempts, last
 * error with field codes, missing fields and the history, with "Push to LMS" and (for FAILED) "Retry". Renders
 * nothing unless the server has the sync and the user may read it, so the student detail is unchanged otherwise.
 */
export function LmsSyncCard({ studentId }: { studentId: string }) {
  const feature = useLmsSyncFeature();
  const detail = useLmsSyncDetail(studentId, feature.visible);
  const { push, retry } = useSyncActions();
  if (!feature.visible) return null;

  const d = detail.data;
  const busy = push.isPending || retry.isPending;
  const doPush = () =>
    push.mutate([studentId], {
      onSuccess: (r) =>
        r.queued.includes(studentId)
          ? toastOk(r.syncEnabled ? 'Student queued for the LMS.' : 'Student queued; it is sent once the LMS sync is switched on.')
          : toastError(new ApiError('Not queued: the student is not approved or not active', 409, r.skipped[0]?.reason ?? 'NOT_ELIGIBLE')),
      onError: toastError,
    });
  const doRetry = () =>
    retry.mutate([studentId], {
      onSuccess: (r) =>
        r.queued.length ? toastOk('Retry queued.') : toastError(new ApiError('This student is no longer failed', 409, 'NOT_FAILED')),
      onError: toastError,
    });

  return (
    <Card
      title="LMS sync"
      sub={d?.tenantCode ? `tenant ${d.tenantCode}` : 'student copy in the LMS'}
      action={
        feature.canPush && d ? (
          <div className="tw-flex tw-items-center tw-gap-2">
            {d.syncStatus === 'FAILED' ? (
              <button type="button" className="btn sm" disabled={busy} onClick={doRetry}>
                <Icon name="refresh" />
                Retry
              </button>
            ) : null}
            <button
              type="button"
              className="btn sm primary"
              disabled={!d.eligible || busy}
              title={d.eligible ? undefined : 'Only approved, active students are sent to the LMS'}
              onClick={doPush}
            >
              Push to LMS
            </button>
          </div>
        ) : null
      }
    >
      {detail.isPending ? (
        <div className="skel" style={{ height: 120 }} aria-label="Loading LMS sync" />
      ) : detail.isError ? (
        <Callout tone="err" title="Could not load the LMS sync. ">
          {detail.error instanceof ApiError ? detail.error.message + ' ' : null}
          <button type="button" className="btn xs" onClick={() => void detail.refetch()}>
            Retry
          </button>
        </Callout>
      ) : (
        <SyncDetailBody d={detail.data} />
      )}
    </Card>
  );
}

function SyncDetailBody({ d }: { d: LmsSyncDetail }) {
  const note = (tone: 'info' | 'warn' | 'err', title: string, body: ReactNode) => (
    <div className="mb10">
      <Callout tone={tone} title={title}>
        {body}
      </Callout>
    </div>
  );
  return (
    <>
      {!d.syncEnabled
        ? note('warn', 'LMS sync is switched off. ', 'Queued students are sent once the server’s sync is switched on.')
        : null}
      {!d.eligible ? note('info', 'Not sent. ', 'Only approved, active students are sent to the LMS.') : null}
      {d.syncStatus === 'REVIEW'
        ? note('info', 'Held for review. ', 'The LMS suspects a duplicate learner; it waits for a same-person / different-person decision.')
        : null}
      {d.payload.missingRequiredFields.length
        ? note('warn', 'Fill these in to sync: ', <span className="mono">{d.payload.missingRequiredFields.join(', ')}</span>)
        : null}
      {d.syncStatus === 'SYNCED' && d.payload.changedSinceLastSend
        ? note('info', 'Changed since the last send. ', 'The edit is sent in the next cycle.')
        : null}
      <div className="kv-grid">
        <KvList
          pairs={[
            ['Sync flag', <SyncFlagBadge key="f" flag={d.syncStatus} />],
            [
              'LMS status',
              <span key="s" className="mono">
                {dash(d.lmsStatus)}
              </span>,
            ],
            [
              'LMS learner code',
              <span key="c" className="mono">
                {dash(d.lmsLearnerCode)}
              </span>,
            ],
            [
              'LMS learner id',
              <span key="i" className="mono">
                {dash(d.lmsLearnerId)}
              </span>,
            ],
            ['Attempts', String(d.attempts)],
            ['Last sent', fmtDate(d.lastSentAt)],
            ['Last synced', fmtDate(d.lastSyncedAt)],
            ...(d.lmsReasonCodes.length
              ? ([
                  [
                    'LMS reason codes',
                    <span key="r" className="mono">
                      {d.lmsReasonCodes.join(', ')}
                    </span>,
                  ],
                ] as [string, ReactNode][])
              : []),
          ]}
        />
      </div>
      {d.lastErrorCode ? (
        <div className="mt14">
          <Callout tone="err" title="Last error: ">
            <span className="mono">{d.lastErrorCode}</span>
            {SYNC_ERROR_LABEL[d.lastErrorCode] ? <> — {SYNC_ERROR_LABEL[d.lastErrorCode]}</> : null}
            {d.lastErrorDetails.length ? (
              <ul className="mt6" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {d.lastErrorDetails.map((e) => (
                  <li key={e.field + e.code}>
                    <span className="mono">{e.field}</span>: {e.code}
                  </li>
                ))}
              </ul>
            ) : null}
          </Callout>
        </div>
      ) : null}
      <h4 className="mb6 mt14">History</h4>
      {history(d).length ? (
        <Timeline items={history(d)} />
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No sync activity yet.
        </p>
      )}
    </>
  );
}
