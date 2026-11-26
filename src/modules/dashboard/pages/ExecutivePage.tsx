import { useEffect } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, LinkButton, Callout, NoData, NoDataLabel, NO_VALUE, districtOptions, fmt } from '../../../components/ui';
import { Heatmap } from '../../../components/charts';
import Icon from '../../../components/ui/Icon';
import { asOfLabel, centreIndex, centreCounts, pctOf, studentListLink, useStudentSummary } from '../../students';

/* A KPI tile with no live source yet: label only, an honest "No data yet" in place of a figure. */
const EmptyKpi = ({ label }: { label: string }) => <Kpi label={label} value={NO_VALUE} tone="" sub={<NoDataLabel />} />;

export default function ExecutivePage() {
  useEffect(() => {
    document.title = 'Executive Command Centre — SARTHI Admin';
  }, []);

  /* Live student figures (Applications / Eligible / Enrolled and the district heatmap). */
  const summary = useStudentSummary();
  const t = summary.data?.totals;
  const asOf = asOfLabel(summary.data?.asOf);
  const liveValue = (n: number | undefined): number | string => (summary.isPending ? '…' : summary.isError ? '—' : (n ?? 0));
  const idx = centreIndex(summary.data);
  /* While nobody is enrolled yet (no batches) the heatmap shades by eligible students instead. */
  const heatMetric = summary.data?.byCentre.some((c) => c.enrolled > 0) ? 'enrolled' : 'eligible';
  /* Real geography only: the district codes and names (no invented figures attached). */
  const districts = districtOptions().filter((o) => o.v !== 'ALL');

  function onRefresh() {
    void summary.refetch();
    AS.ui.toast('Dashboard refreshed: live student figures reloaded.', 'ok');
  }

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Executive Command Centre' }]}
        title="Executive Command Centre"
        sub={<>PMO-level programme health · Student figures are live{asOf ? ' ' + asOf : ''}</>}
        actions={
          <>
            <button type="button" className="btn" onClick={onRefresh}>
              <Icon name="refresh" />
              Refresh
            </button>
            <LinkButton to="#/reports" className="btn primary">
              Export MIS pack
            </LinkButton>
          </>
        }
      />

      {summary.isError ? (
        <div className="mb14">
          <Callout tone="err" title="Could not load the live student figures. ">
            Applications, Eligible and Enrolled show “—” until the server answers.{' '}
            <button type="button" className="btn xs" onClick={() => void summary.refetch()}>
              Retry
            </button>
          </Callout>
        </div>
      ) : null}
      <div className="grid g4 mb14">
        <Kpi
          label="Applications"
          value={liveValue(t?.applications)}
          tone="b"
          sub={t ? fmt(t.pending) + ' pending verification' : 'Students in the register'}
          link={studentListLink({ bucket: 'applications' })}
          title={asOf}
        />
        <Kpi
          label="Eligible"
          value={liveValue(t?.eligible)}
          tone="b"
          sub={t ? pctOf(t.eligible, t.applications) + '% of applications' : 'Approved and active'}
          link={studentListLink({ bucket: 'eligible' })}
          title={asOf}
        />
        <Kpi
          label="Enrolled"
          value={liveValue(t?.enrolled)}
          tone="g"
          sub="Assigned to a batch"
          link={studentListLink({ bucket: 'enrolled' })}
          title={asOf}
        />
        <Kpi
          label="Awaiting batch"
          value={liveValue(t?.awaitingBatch)}
          tone="a"
          sub="Eligible, not yet in a batch"
          link={studentListLink({ bucket: 'awaiting' })}
          title={asOf}
        />
      </div>

      <div className="grid g-1-2 mb14">
        <Card title="Overall programme health" sub="RAG composite">
          <NoData />
        </Card>
        <Card title="Target vs achievement" sub="Programme to date · no programme target is recorded yet">
          <div className="grid g4">
            <EmptyKpi label="Target" />
            <EmptyKpi label="In training" />
            <EmptyKpi label="Completed" />
            <EmptyKpi label="Certified" />
          </div>
        </Card>
      </div>

      <div className="grid g4 mb14">
        <EmptyKpi label="Districts GREEN" />
        <EmptyKpi label="Districts AMBER" />
        <EmptyKpi label="Districts RED" />
        <EmptyKpi label="Districts GREY" />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            District heatmap{' '}
            <span className="sub">
              {heatMetric === 'enrolled' ? 'enrolled students' : 'no students enrolled yet: eligible students'} per district
              {asOf ? ' · ' + asOf : ''}
            </span>
          </h3>
          <LinkButton to="#/map" className="btn sm">
            Open full map
          </LinkButton>
        </div>
        <div className="card-b">
          {summary.isPending ? (
            <div className="skel" style={{ height: 200 }} aria-label="Loading live figures" />
          ) : summary.isError ? (
            <div className="muted fs12">Could not load the live student figures.</div>
          ) : (
            <Heatmap
              cells={districts.map((d) => {
                const c = centreCounts(idx, d.v);
                return {
                  l: d.l,
                  v: c[heatMetric],
                  sub: fmt(c.applications) + ' applications · ' + fmt(c.eligible) + ' eligible · ' + fmt(c.enrolled) + ' enrolled',
                  link: studentListLink({ bucket: heatMetric, centre: d.v }),
                };
              })}
              opts={{ cols: 9 }}
            />
          )}
        </div>
      </div>

      <div className="grid g3 mb14">
        <Card
          title="Centre health"
          footer={
            <LinkButton to="#/centres" className="btn sm">
              All centres
            </LinkButton>
          }
        >
          <NoData />
        </Card>
        <Card
          title="Trainer availability"
          footer={
            <LinkButton to="#/trainers" className="btn sm">
              Trainer management
            </LinkButton>
          }
        >
          <NoData />
        </Card>
        <Card
          title="Batch status"
          footer={
            <LinkButton to="#/batches" className="btn sm">
              All batches
            </LinkButton>
          }
        >
          <NoData />
        </Card>
      </div>

      <div className="grid g-2-1">
        <Card
          title="Critical alerts"
          footer={
            <LinkButton to="#/tasks" className="btn sm">
              All tasks
            </LinkButton>
          }
        >
          <NoData />
        </Card>
        <Card
          title="Financial snapshot"
          footer={
            <LinkButton to="#/finance" className="btn sm">
              Finance dashboard
            </LinkButton>
          }
        >
          <NoData />
        </Card>
      </div>
    </div>
  );
}
