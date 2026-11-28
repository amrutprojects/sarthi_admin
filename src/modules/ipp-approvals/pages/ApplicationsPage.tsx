import { PageHead } from '../../../components/ui';
import ApplicationsPanel from '../components/ApplicationsPanel';
import { DecideAs, ReadOnlyNote } from '../components/DecideAs';
import { ApprovalNav, LoadProblem, Loading } from '../components/common';
import { useIppCrumbs } from '../hooks/useIppCrumbs';
import { useApprovalSummary } from '../hooks/useIppApprovals';
import { useTitle } from '../utils';

/* Student forms of IPP that wait for, or have passed, the officers' decision. What each user sees and decides comes from the API. */
export default function ApplicationsPage() {
  useTitle('IPP applications');
  const summary = useApprovalSummary();
  const crumbs = useIppCrumbs({ l: 'Applications' });
  return (
    <div className="page">
      <PageHead
        crumbs={crumbs}
        title="IPP Applications"
        sub={summary.data ? <DecideAs summary={summary.data} /> : 'Student forms of the 3 Month Internship Placement Program (IPP).'}
      />
      <ApprovalNav current="applications" />
      {summary.data ? (
        <>
          <ReadOnlyNote summary={summary.data} />
          <ApplicationsPanel summary={summary.data} defaultView="TO_DECIDE" />
        </>
      ) : summary.isError ? (
        <LoadProblem error={summary.error} what="the IPP applications" onRetry={() => void summary.refetch()} />
      ) : (
        <Loading what="IPP applications" />
      )}
    </div>
  );
}
