import { Callout, Card, KvList, Timeline, type TimelineItem } from '../../../components/ui';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import Icon from '../../../components/ui/Icon';
import { ApiError } from '../../../services/api-client';
import { fmtDate } from '../../students';
import { useLmsSyncDetail, useLmsSyncFeature, useSyncAction } from '../hooks/useLmsSync';
import type { LmsSyncDetail, LmsSyncEvent } from '../types/lmsSync.types';
import { SYNC_FLAG_LABEL, SyncFlagBadge } from './SyncFlagBadge';

const dash = (v: string | null | undefined) => (v ? v : '—');
/* In flight (PENDING / SENT) or held for Amrut's same-person review: a manual push would only queue a duplicate. */
const derivedCanPush = (d: LmsSyncDetail) => d.status === 'NOT_SYNCED' || d.status === 'SYNCED' || d.status === 'FAILED';
const derivedCanRetry = (d: LmsSyncDetail) => d.status === 'FAILED';

const eventState = (e: LmsSyncEvent): TimelineItem['state'] =>
  e.status === 'FAILED' ? 'fail' : e.status === 'SYNCED' ? 'done' : e.status === 'PENDING' || e.status === 'SENT' ? 'cur' : '';

/*
 * The student's LMS sync (GET /students/:id/lms-sync): flag, LMS learner id and code, attempts, last error and
 * the history, with "Push to LMS" and "Retry". Renders nothing unless the server has the sync and the user holds
 * lms-sync.view, so the student detail is unchanged everywhere else.
 */
export function LmsSyncCard({ studentId }: { studentId: string }) {
  const feature = useLmsSyncFeature();
  const detail = useLmsSyncDetail(studentId, feature.visible);
  const action = useSyncAction(studentId);
  if (!feature.visible) return null;

  const run = (kind: 'push' | 'retry') =>
    action.mutate(kind, {
      onSuccess: () => toastOk(kind === 'push' ? 'Student queued for the LMS.' : 'Retry queued.'),
      onError: toastError,
    });

  const d = detail.data;
  const canPush = feature.canPush && !!d && (d.canPush ?? derivedCanPush(d));
  const canRetry = feature.canPush && !!d && (d.canRetry ?? derivedCanRetry(d));
  const showActions = feature.status && d && (feature.canPush || feature.paused);

  return (
    <Card
      title="LMS sync"
      sub={feature.status?.lmsTenantCode ? `tenant ${feature.status.lmsTenantCode}` : 'student copy in the LMS'}
      action={
        showActions ? (
          <div className="tw-flex tw-items-center tw-gap-2">
            {canRetry ? (
              <button type="button" className="btn sm" disabled={action.isPending} onClick={() => run('retry')}>
                <Icon name="refresh" />
                Retry
              </button>
            ) : null}
            <button
              type="button"
              className="btn sm primary"
              disabled={!canPush || action.isPending}
              title={feature.paused ? 'LMS sync is switched off on the server' : undefined}
              onClick={() => run('push')}
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
        detail.error instanceof ApiError && detail.error.status === 404 ? (
          <p className="muted" style={{ margin: 0 }}>
            This student has not been sent to the LMS yet.
          </p>
        ) : (
          <Callout tone="err" title="Could not load the LMS sync. ">
            <button type="button" className="btn xs" onClick={() => void detail.refetch()}>
              Retry
            </button>
          </Callout>
        )
      ) : (
        <SyncDetailBody d={detail.data} paused={feature.paused} />
      )}
    </Card>
  );
}

function SyncDetailBody({ d, paused }: { d: LmsSyncDetail; paused: boolean }) {
  return (
    <>
      {paused ? (
        <div className="mb10">
          <Callout tone="warn" title="LMS sync is switched off. ">
            Flags are shown as last recorded; pushes resume when the server&apos;s sync is switched on.
          </Callout>
        </div>
      ) : null}
      {d.status === 'REVIEW' ? (
        <div className="mb10">
          <Callout tone="info" title="Held for review. ">
            The LMS matched a possible existing learner. Decide same person / different person in Amrut&apos;s duplicate review.
          </Callout>
        </div>
      ) : null}
      <div className="kv-grid">
        <KvList
          pairs={[
            ['Sync flag', <SyncFlagBadge key="f" flag={d.status} />],
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
            ['Last attempt', fmtDate(d.lastAttemptAt)],
            ['Last synced', fmtDate(d.lastSyncedAt)],
            ...(d.nextAttemptAt ? ([['Next attempt', fmtDate(d.nextAttemptAt)]] as [string, string][]) : []),
          ]}
        />
      </div>
      {d.lastErrorMessage || d.lastErrorCodes.length ? (
        <div className="mt14">
          <Callout tone="err" title="Last error: ">
            {d.lastErrorMessage ?? ''}
            {d.lastErrorCodes.length ? <span className="mono"> ({d.lastErrorCodes.join(', ')})</span> : null}
          </Callout>
        </div>
      ) : null}
      <h4 className="mb6 mt14">History</h4>
      {d.timeline.length ? (
        <Timeline
          items={d.timeline.map((e) => ({
            title: e.status ? `${humanType(e.type)} · ${SYNC_FLAG_LABEL[e.status]?.[0] ?? e.status}` : humanType(e.type),
            sub: [fmtDate(e.at), e.actorName ?? 'Sync worker', e.message, e.errorCodes?.length ? e.errorCodes.join(', ') : null]
              .filter(Boolean)
              .join(' · '),
            state: eventState(e),
          }))}
        />
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No sync activity yet.
        </p>
      )}
    </>
  );
}

const humanType = (t: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ') : t);
