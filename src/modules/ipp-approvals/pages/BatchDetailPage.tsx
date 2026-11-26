import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fmtDateTime } from '../../../components/feedback/apiFeedback';
import { Card, Callout, KvList, PageHead, fmt, titleCase } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import ApplicationsPanel from '../components/ApplicationsPanel';
import ApproveModal from '../components/ApproveModal';
import { DecideAs, ReadOnlyNote } from '../components/DecideAs';
import { LoadProblem, Loading, Notice, StageCounts } from '../components/common';
import { useApprovalSummary, useBatch } from '../hooks/useIppApprovals';
import { useDecisions } from '../hooks/useDecisions';
import { STAGE_LABEL, plural, stageAfterApproval } from '../labels';
import type { BatchRow } from '../types/ippApprovals.types';
import { BATCHES_PATH, fmtDay, isStatus, useTitle } from '../utils';

function BatchData({ batch }: { batch: BatchRow }) {
  return (
    <Card title="Batch">
      <div className="tw-grid tw-grid-cols-1 tw-gap-x-8 md:tw-grid-cols-2">
        <div>
          <KvList
            pairs={[
              ['Code', <span className="mono">{batch.code}</span>],
              ['Name', batch.name],
              ['District', batch.district.name],
              ['Centre', `${batch.centre.name} (${batch.centre.code})`],
              ['Technology', batch.technology ?? '—'],
              ['Training', titleCase(batch.deliveryMode)],
            ]}
          />
        </div>
        <div>
          <KvList
            pairs={[
              ['Students', `${fmt(batch.students)} (batch size ${fmt(batch.size)})`],
              ['Starts', fmtDay(batch.startDate)],
              ['Ends', fmtDay(batch.endDate)],
              ['Sent by', batch.sentBy ?? '—'],
              ['Received', fmtDateTime(batch.receivedAt)],
              ['Where they are now', <StageCounts stages={batch.stages} />],
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

/* One batch: its data, its applications, and "Approve all that wait for me". */
export default function BatchDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const q = useBatch(id);
  const summary = useApprovalSummary();
  const decisions = useDecisions(id);
  const [confirm, setConfirm] = useState(false);
  const batch = q.data;
  useTitle(batch ? `Batch ${batch.code}` : 'IPP batch');

  const to = summary.data?.stages.length === 1 ? stageAfterApproval(summary.data.stages[0], summary.data.headOfficeEnabled) : null;
  const close = () => setConfirm(false);

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '#/dashboard' },
          { l: 'IPP Approvals', link: '#/ipp-approvals' },
          { l: 'Batches', link: '#' + BATCHES_PATH },
          { l: batch?.code ?? 'Batch' },
        ]}
        title={batch ? batch.name : 'IPP batch'}
        sub={summary.data ? <DecideAs summary={summary.data} /> : undefined}
        actions={
          <>
            {batch?.toDecide ? (
              <button
                type="button"
                className="btn primary"
                disabled={decisions.busy}
                onClick={() => {
                  decisions.resetApprove();
                  setConfirm(true);
                }}
              >
                Approve all that wait for me ({fmt(batch.toDecide)})
              </button>
            ) : null}
            <button type="button" className="btn" onClick={() => navigate(BATCHES_PATH)}>
              <Icon name="chevL" />
              Back
            </button>
          </>
        }
      />
      {q.isError ? (
        isStatus(q.error, 404) ? (
          <div role="alert">
            <Callout tone="warn" title="Batch not found. ">
              It does not exist, or none of its applications are yours to see.
            </Callout>
          </div>
        ) : (
          <LoadProblem error={q.error} what="the batch" onRetry={() => void q.refetch()} />
        )
      ) : summary.isError ? (
        <LoadProblem error={summary.error} what="the IPP applications" onRetry={() => void summary.refetch()} />
      ) : !batch || !summary.data ? (
        <Loading what="batch" />
      ) : (
        <>
          <ReadOnlyNote summary={summary.data} />
          <Notice value={decisions.notice} />
          <div className="mb14">
            <BatchData batch={batch} />
          </div>
          <h2 className="fs16 mb10">Applications of this batch</h2>
          <ApplicationsPanel summary={summary.data} batch={batch} defaultView="ALL" />
        </>
      )}
      {confirm && batch ? (
        <ApproveModal
          title="Approve all that wait for you"
          message={`Approve all ${plural(batch.toDecide, 'application')} of batch ${batch.code} that wait for you?${to ? ` After your approval: ${STAGE_LABEL[to]}.` : ' Each goes on to its next level.'}`}
          confirmLabel={decisions.busy ? 'Approving…' : `Approve ${fmt(batch.toDecide)}`}
          askReason={false}
          several={batch.toDecide > 1}
          busy={decisions.busy}
          error={decisions.approveError}
          onClose={close}
          onApprove={(reason) => decisions.approveMany({ batchId: batch.id }, reason, { onDone: close, onFailed: close })}
        />
      ) : null}
    </div>
  );
}
