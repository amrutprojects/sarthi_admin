import { fmtDateTime, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Badge, Callout, Card, KvList, fmt, titleCase } from '../../../components/ui';
import { useCan } from '../../auth';
import { useLink, useRetryLink, useTestLink } from '../hooks/useIppApprovals';
import { STAGE_NAME, plural } from '../labels';
import type { LinkItem, LinkState } from '../types/ippApprovals.types';
import { errorText, isStatus } from '../utils';
import { ForWhom, LoadProblem, Wrap } from './common';

function status(l: LinkState): { tone: string; label: string; note: string | null } {
  const waits = 'Officers can read and decide; their decisions wait here, and documents cannot be opened.';
  if (!l.enabled) return { tone: 'grey', label: 'Switched off', note: `The connection is switched off on the server. ${waits}` };
  if (!l.configured) return { tone: 'amber', label: 'Not configured', note: `The connection is not configured on the server. ${waits}` };
  return { tone: 'green', label: 'On', note: null };
}

function Items({ items, mayEdit, busy, onRetry }: { items: LinkItem[]; mayEdit: boolean; busy: boolean; onRetry: (id: string) => void }) {
  return (
    <div className="tbl-wrap mt10">
      <table className="tbl" aria-label="Decisions not sent to IPP yet">
        <thead>
          <tr>
            <th scope="col">Application</th>
            <th scope="col">Decision</th>
            <th scope="col">Status</th>
            <th scope="col">Reason</th>
            <th scope="col">Since</th>
            {mayEdit ? <th scope="col">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="norow">
              <td>
                {i.application.name}
                <div className="mono fs12">{i.application.registrationId}</div>
              </td>
              <td>
                {titleCase(i.action)}
                <div className="muted fs12">
                  {STAGE_NAME[i.from] ?? i.from} → {STAGE_NAME[i.to] ?? i.to}
                </div>
              </td>
              <td>
                <Badge tone={i.status === 'FAILED' ? 'red' : 'amber'}>{i.status === 'FAILED' ? 'Failed' : 'Waiting'}</Badge>
                <div className="muted fs12">{plural(i.attempts, 'attempt')}</div>
              </td>
              <td>
                <Wrap min={160}>{i.lastError}</Wrap>
                {i.status !== 'FAILED' && i.nextAttemptAt ? (
                  <div className="muted fs12">Next attempt {fmtDateTime(i.nextAttemptAt)}</div>
                ) : null}
              </td>
              <td>{fmtDateTime(i.createdAt)}</td>
              {mayEdit ? (
                <td>
                  {i.status === 'FAILED' ? (
                    <button type="button" className="btn xs tw-relative" disabled={busy} onClick={() => onRetry(i.id)}>
                      Retry
                      <ForWhom>{i.application.registrationId}</ForWhom>
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/*
 * System Settings card: the connection that sends the officers' decisions to IPP. Hidden when the API does not offer
 * it to this user (403) or at all (404); Retry and Test need settings.update. The secret never leaves the server.
 */
export function IppConnectionCard() {
  const can = useCan();
  const q = useLink();
  const retry = useRetryLink();
  const test = useTestLink();
  if (isStatus(q.error, 403, 404) || q.isPending) return null;
  if (!q.data) {
    return (
      <div className="mb14">
        <Card title="IPP connection">
          <LoadProblem error={q.error} what="the IPP connection" onRetry={() => void q.refetch()} />
        </Card>
      </div>
    );
  }
  const link = q.data;
  const { tone, label, note } = status(link);
  const mayEdit = can('editSettings');
  const doRetry = (ids?: string[]) =>
    retry.mutate(ids, {
      onSuccess: (r) => toastOk(r.retried ? `${plural(r.retried, 'decision')} will be sent again` : 'Nothing to send again'),
      onError: toastError,
    });

  return (
    <div className="mb14">
      <Card title="IPP connection" sub="sends the officers' decisions to IPP">
        <KvList
          pairs={[
            ['Status', <Badge tone={tone}>{label}</Badge>],
            ['Server', link.host ? <span className="mono">{link.host}</span> : '—'],
            ['Last sent to IPP', fmtDateTime(link.lastSentAt)],
            ['Last received from IPP', fmtDateTime(link.lastReceivedAt)],
            ['Waiting to be sent', fmt(link.pending)],
            ['Failed', link.failed ? <Badge tone="red">{fmt(link.failed)}</Badge> : '0'],
          ]}
        />
        {note ? (
          <div className="mt10">
            <Callout tone="warn">{note}</Callout>
          </div>
        ) : null}
        {mayEdit ? (
          <div className="tw-flex tw-flex-wrap tw-gap-2 mt10">
            <button
              type="button"
              className="btn sm"
              disabled={test.isPending}
              onClick={() => test.mutate(undefined, { onError: toastError })}
            >
              {test.isPending ? 'Testing…' : 'Test connection'}
            </button>
            {link.failed ? (
              <button type="button" className="btn sm" disabled={retry.isPending} onClick={() => doRetry()}>
                Retry all failed ({fmt(link.failed)})
              </button>
            ) : null}
          </div>
        ) : null}
        <div aria-live="polite">
          {test.data ? (
            <div className="mt10" role={test.data.ok ? undefined : 'alert'}>
              <Callout tone={test.data.ok ? 'ok' : 'err'} title={test.data.ok ? 'IPP answered. ' : 'IPP did not answer. '}>
                {test.data.message}
              </Callout>
            </div>
          ) : test.isError ? (
            <div className="mt10" role="alert">
              <Callout tone="err" title="The test could not be made. ">
                {errorText(test.error)}
              </Callout>
            </div>
          ) : null}
        </div>
        {link.items.length ? (
          <Items items={link.items} mayEdit={mayEdit} busy={retry.isPending} onRetry={(id) => doRetry([id])} />
        ) : (
          <p className="muted fs12 mt10 tw-mb-0">Every decision has been sent.</p>
        )}
      </Card>
    </div>
  );
}
