import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Callout, PageHead } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { EditsCard, FormCards, HistoryCard, SummaryCard } from '../components/ApplicationRecord';
import ApproveModal from '../components/ApproveModal';
import DocumentsCard from '../components/DocumentsCard';
import RejectModal from '../components/RejectModal';
import { LoadProblem, Loading, Notice, StageBadge } from '../components/common';
import { useIppCrumbs } from '../hooks/useIppCrumbs';
import { useDecisions } from '../hooks/useDecisions';
import { useApplication } from '../hooks/useIppApprovals';
import { useShowNames } from '../hooks/useShowNames';
import { approveOneQuestion, whoLabel } from '../labels';
import type { ApplicationDetail } from '../types/ippApprovals.types';
import { APPLICATIONS_PATH, applicationPath, isStatus, useTitle, type ListState } from '../utils';

/* The list this page was opened from, when there was one (router state survives a reload, not a new tab). */
function useListState(): ListState | null {
  const state = useLocation().state as Partial<ListState> | null;
  return state && Array.isArray(state.ids) && typeof state.back === 'string' ? { ids: state.ids, back: state.back } : null;
}

/* Where the application stands for this user: the rejection that brought it back, or that it is not theirs to decide. */
function StandingNote({ application: a }: { application: ApplicationDetail }) {
  const names = useShowNames();
  /* The last move; a correction by the Auditor is not one. */
  const last = a.history.find((e) => e.event !== 'CORRECTED');
  return (
    <>
      {last?.event === 'REJECTED' ? (
        <div className="mb14">
          <Callout tone="warn" title={`Sent back by ${whoLabel(last, names)}. `}>
            {last.reason}
          </Callout>
        </div>
      ) : null}
      {a.canDecide ? null : (
        <div className="mb14">
          <Callout tone="info">This application is not waiting for your decision. Now: {a.stageLabel}.</Callout>
        </div>
      )}
    </>
  );
}

/* One application: the form, its documents, the Auditor's corrections, the history, and the decision when it is the user's. */
export default function ApplicationDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const listState = useListState();
  const q = useApplication(id);
  const decisions = useDecisions(id);
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null);
  const a = q.data;
  useTitle(a ? `${a.name} (${a.registrationId})` : 'IPP application');
  const crumbs = useIppCrumbs({ l: 'Applications', link: '#' + APPLICATIONS_PATH }, { l: a?.registrationId ?? 'Application' });

  const position = listState ? listState.ids.indexOf(id) : -1;
  const goTo = (target: string | undefined) => {
    if (target) navigate(applicationPath(target), { replace: true, state: listState });
  };
  const close = () => setDialog(null);
  /* The API names the targets only to the user who may decide; both are there or the buttons are not. */
  const approveTo = a?.canDecide ? a.approveTo : null;
  const rejectTo = a?.canDecide ? a.rejectTo : null;

  return (
    <div className="page">
      <PageHead
        crumbs={crumbs}
        title={a ? a.name : 'IPP application'}
        badge={a ? <StageBadge stage={a.stage} label={a.stageLabel} /> : undefined}
        sub={a ? `${a.registrationId} · ${a.district.name} · batch ${a.batch.code}` : undefined}
        actions={
          <>
            {approveTo ? (
              <button
                type="button"
                className="btn primary"
                disabled={decisions.busy}
                onClick={() => {
                  decisions.resetApprove();
                  setDialog('approve');
                }}
              >
                Approve
              </button>
            ) : null}
            {rejectTo ? (
              <button
                type="button"
                className="btn danger"
                disabled={decisions.rejecting}
                onClick={() => {
                  decisions.resetReject();
                  setDialog('reject');
                }}
              >
                Reject
              </button>
            ) : null}
            {listState && position >= 0 ? (
              <>
                <button
                  type="button"
                  className="btn"
                  aria-label="Previous application"
                  disabled={position === 0}
                  onClick={() => goTo(listState.ids[position - 1])}
                >
                  ‹ Previous
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-label="Next application"
                  disabled={position >= listState.ids.length - 1}
                  onClick={() => goTo(listState.ids[position + 1])}
                >
                  Next ›
                </button>
              </>
            ) : null}
            <button type="button" className="btn" onClick={() => navigate(listState?.back ?? APPLICATIONS_PATH)}>
              <Icon name="chevL" />
              Back
            </button>
          </>
        }
      />

      <Notice value={decisions.notice} />

      {q.isError ? (
        isStatus(q.error, 404) ? (
          <div role="alert">
            <Callout tone="warn" title="Application not found. ">
              It does not exist, or it is not one that you may see.
            </Callout>
          </div>
        ) : (
          <LoadProblem error={q.error} what="the application" onRetry={() => void q.refetch()} />
        )
      ) : !a ? (
        <div className="card">
          <div className="card-b">
            <Loading what="application" lines={8} />
          </div>
        </div>
      ) : (
        <>
          <StandingNote application={a} />
          <div className="tw-grid tw-grid-cols-1 tw-items-start tw-gap-4 lg:tw-grid-cols-2">
            <div className="tw-flex tw-min-w-0 tw-flex-col tw-gap-4">
              <SummaryCard application={a} />
              <FormCards fields={a.fields} />
            </div>
            <div className="tw-flex tw-min-w-0 tw-flex-col tw-gap-4">
              <DocumentsCard applicationId={a.id} documents={a.documentList} />
              <HistoryCard history={a.history} />
              <EditsCard edits={a.edits} />
            </div>
          </div>
        </>
      )}

      {a && approveTo && dialog === 'approve' ? (
        <ApproveModal
          title={`Approve — ${a.name} (${a.registrationId})`}
          message={approveOneQuestion(approveTo.stage)}
          confirmLabel={decisions.busy ? 'Approving…' : 'Approve application'}
          askReason={a.reasonRequired}
          busy={decisions.busy}
          error={decisions.approveError}
          onClose={close}
          onApprove={(reason) => decisions.approveOne(a.id, reason, close)}
        />
      ) : null}
      {a && rejectTo && dialog === 'reject' ? (
        <RejectModal
          name={a.name}
          registrationId={a.registrationId}
          returnsTo={rejectTo.label}
          busy={decisions.rejecting}
          error={decisions.rejectError}
          onClose={close}
          onReject={(reason) => decisions.reject(a.id, reason, close)}
        />
      ) : null}
    </div>
  );
}
