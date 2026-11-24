import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead, Card, Kpi, LinkButton, EmptyState, Callout, NO_VALUE, NoData, NoDataLabel, fmt } from '../../../components/ui';
import { Funnel } from '../../../components/charts';
import * as S from '../../../services/geography';
import type { District } from '../../../types/domain';
import { studentColumns } from '../../candidates';
import { ServerTable, asOfLabel, pctOf, studentListLink, useStudentList, useStudentSummary } from '../../students';

const STUDENT_PAGE = 10;
/* The district table drops the District column (it is this district for every row). */
const districtStudentColumns = studentColumns.filter((c) => c.k !== 'district');

/*
 * The district's name, code, region and talukas are real geography; Applications, Eligible, Enrolled and the student
 * table are live. Everything else (target, training, attendance, coordinator, centres, batches, issues) has no live
 * source yet and shows "No data yet" (user decision 24 Nov 2026).
 */
export default function DistrictDetailPage() {
  const { id = '' } = useParams();
  useEffect(() => {
    document.title = 'District — AMRUT × SUMAGO Admin';
  }, []);

  const d = S.district(id);
  if (!d) {
    return (
      <div className="page">
        <EmptyState title="District not found" msg={'No district with code ' + id}>
          <LinkButton to="#/districts" className="btn primary">
            All districts
          </LinkButton>
        </EmptyState>
      </div>
    );
  }
  /* Keyed by code so paging resets when moving to another district. */
  return <DistrictView key={d.code} d={d} />;
}

function DistrictView({ d }: { d: District }) {
  const navigate = useNavigate();
  /* Live student figures for this district (district code = students.centreCode). */
  const summary = useStudentSummary(d.code);
  const t = summary.data?.totals;
  const asOf = asOfLabel(summary.data?.asOf);
  const liveValue = (n: number | undefined): number | string => (summary.isPending ? '…' : summary.isError ? '—' : (n ?? 0));
  const [studentPage, setStudentPage] = useState(1);
  const list = useStudentList({ centre: d.code, page: studentPage, limit: STUDENT_PAGE });

  const q = studentListLink({ centre: d.code });
  const bucketLink = (bucket: string) => studentListLink({ bucket, centre: d.code });
  const noData = <NoDataLabel />;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Districts', link: '#/districts' }, { l: d.name }]}
        title={d.name + ' District'}
        badge={<span className="tag">{d.region}</span>}
        sub={
          <>
            District code <b>{d.code}</b> · {d.talukas.length} talukas · Applications, Eligible and Enrolled are live
            {asOf ? ' ' + asOf : ''}
          </>
        }
        actions={
          <>
            <LinkButton to={q} icon="users">
              Candidates
            </LinkButton>
            <LinkButton to={'#/reports/district?district=' + d.code} className="btn primary">
              Export report
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
      <div className="grid g8 mb14">
        <Kpi label="Target" value={NO_VALUE} sub={noData} />
        <Kpi
          label="Applications"
          value={liveValue(t?.applications)}
          tone="b"
          sub={t ? fmt(t.pending) + ' pending verification' : 'Students in the register'}
          link={bucketLink('applications')}
          title={asOf}
        />
        <Kpi
          label="Eligible"
          value={liveValue(t?.eligible)}
          tone="b"
          sub={t ? pctOf(t.eligible, t.applications) + '% of applications' : 'Approved and active'}
          link={bucketLink('eligible')}
          title={asOf}
        />
        <Kpi
          label="Enrolled"
          value={liveValue(t?.enrolled)}
          tone="g"
          sub={t ? fmt(t.awaitingBatch) + ' awaiting batch' : 'Assigned to a batch'}
          link={bucketLink('enrolled')}
          title={asOf}
        />
        <Kpi label="Training active" value={NO_VALUE} sub={noData} />
        <Kpi label="Completed" value={NO_VALUE} sub={noData} />
        <Kpi label="Attendance" value={NO_VALUE} sub={noData} />
        <Kpi label="Certified" value={NO_VALUE} sub={noData} />
      </div>

      <div className="grid g-2-1 mb14">
        <Card title="Enrollment funnel" sub={'Applications, Eligible, Enrolled live' + (asOf ? ' ' + asOf : '')}>
          <Funnel
            stages={[
              { l: 'Applications', v: t?.applications ?? 0, c: '#B3A08D', link: bucketLink('applications') },
              { l: 'Eligible', v: t?.eligible ?? 0, c: '#E2A166', link: bucketLink('eligible') },
              { l: 'Enrolled', v: t?.enrolled ?? 0, c: '#C8651C', link: bucketLink('enrolled') },
            ]}
          />
        </Card>
        <Card title="Mode split">
          <NoData />
        </Card>
      </div>

      <div className="grid g2 mb14">
        <Card title="District coordinator">
          <NoData />
        </Card>
        <Card title={'Training centres in ' + d.name}>
          <NoData />
        </Card>
      </div>

      <div className="grid g3 mb14">
        <Card title="Taluka rollup">
          <NoData />
        </Card>
        <Card title="Batches">
          <NoData />
        </Card>
        <Card title="Top issues">
          <NoData />
        </Card>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>
            Candidates in {d.name}{' '}
            <span className="sub">
              {list.data?.meta ? fmt(list.data.meta.total) + ' in the student register' : 'Student register'}
              {asOf ? ' · counts ' + asOf : ''}
            </span>
          </h3>
          <LinkButton to={q} className="btn sm">
            View all
          </LinkButton>
        </div>
        {list.isError ? (
          <div className="card-b">
            <Callout tone="err" title="Could not load the students. ">
              <button type="button" className="btn xs" onClick={() => void list.refetch()}>
                Retry
              </button>
            </Callout>
          </div>
        ) : (
          <ServerTable
            rows={list.data?.items ?? []}
            columns={districtStudentColumns}
            meta={list.data?.meta}
            page={studentPage}
            onPage={setStudentPage}
            onRowClick={(s) => navigate('/candidates/' + s.id)}
            loading={list.isFetching}
            empty={
              list.isPending
                ? 'Loading students…'
                : 'No students from this district in the register yet. Imported students appear once their import batch is finalised.'
            }
          />
        )}
      </div>
    </div>
  );
}
