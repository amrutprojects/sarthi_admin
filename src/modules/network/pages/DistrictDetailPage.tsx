import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PageHead,
  Card,
  Kpi,
  KvList,
  LinkButton,
  EmptyState,
  DemoNote,
  DemoChip,
  Callout,
  Badge,
  GenBadge,
  ModeTag,
  AlertCard,
  dateFmt,
  fmt,
  useGo,
} from '../../../components/ui';
import { Funnel, Donut } from '../../../components/charts';
import Icon from '../../../components/ui/Icon';
import Avatar from '../../../components/ui/Avatar';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/networkService';
import type { District } from '../../../types/domain';
import { Can } from '../../auth';
import { studentColumns } from '../../candidates';
import { ServerTable, asOfLabel, pctOf, studentListLink, useStudentList, useStudentSummary } from '../../students';

const STUDENT_PAGE = 10;
/* The district table drops the District column (it is this district for every row). */
const districtStudentColumns = studentColumns.filter((c) => c.k !== 'district');

/* Card title with the Demo data chip (figures with no live source yet). */
const demo = (title: ReactNode) => (
  <>
    {title} <DemoChip />
  </>
);

export default function DistrictDetailPage() {
  useLegacyTick();
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
  const go = useGo();
  const navigate = useNavigate();
  /* Live student figures for this district (district code = students.centreCode). */
  const summary = useStudentSummary(d.code);
  const t = summary.data?.totals;
  const asOf = asOfLabel(summary.data?.asOf);
  const liveValue = (n: number | undefined): number | string => (summary.isPending ? '…' : summary.isError ? '—' : (n ?? 0));
  const [studentPage, setStudentPage] = useState(1);
  const list = useStudentList({ centre: d.code, page: studentPage, limit: STUDENT_PAGE });

  const rows = S.byDistrict(d.code);
  const k = S.kpis(rows, d.target);
  const st = S.districtStatus(d);
  const centres = S.centres().filter((c) => c.districtId === d.code);
  const batches = S.batches().filter((b) => b.districtId === d.code);
  const coord = S.coordinator(d.coordinatorId);
  const tal = S.talukaRollup(d.code);
  const issues = S.tasksFor(d.code);
  const q = studentListLink({ centre: d.code });
  const bucketLink = (bucket: string) => studentListLink({ bucket, centre: d.code });

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Districts', link: '#/districts' }, { l: d.name }]}
        title={d.name + ' District'}
        badge={
          <>
            <Badge tone={st.tone}>{st.l}</Badge>
            <DemoChip />
            <span className="tag">{d.region}</span>
          </>
        }
        sub={
          <>
            District code <b>{d.code}</b> · {d.talukas.length} talukas · {centres.length} approved centre{centres.length === 1 ? '' : 's'} ·
            target {d.target} students · Applications, Eligible and Enrolled are live{asOf ? ' ' + asOf : ''}
          </>
        }
        actions={
          <>
            <LinkButton to={q} icon="users">
              Candidates
            </LinkButton>
            <Can action="createTask">
              <button type="button" className="btn" onClick={() => S.newTask(d.code)}>
                <Icon name="plus" />
                Create task
              </button>
            </Can>
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
        <Kpi label="Target" value={k.target} badge={<DemoChip />} />
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
        <Kpi label="Training active" value={k.trainingActive} tone="s" link="#/lifecycle" badge={<DemoChip />} />
        <Kpi label="Completed" value={k.completed} tone="g" link="#/lifecycle" badge={<DemoChip />} />
        <Kpi
          label="Attendance"
          value={k.attendance + '%'}
          tone={k.attendance >= 75 ? 'g' : 'a'}
          link={'#/attendance?district=' + d.code}
          badge={<DemoChip />}
        />
        <Kpi label="Certified" value={k.certified} tone="v" link={'#/certification?district=' + d.code} badge={<DemoChip />} />
      </div>

      <div className="grid g-2-1 mb14">
        <Card title="Progress charts" sub={'Applications, Eligible, Enrolled live' + (asOf ? ' ' + asOf : '')}>
          <div className="grid g2">
            <div>
              <b className="fs12">
                Enrollment funnel <span className="muted fs11">(Completed, Certified:</span> <DemoChip />
                <span className="muted fs11">)</span>
              </b>
              <Funnel
                stages={[
                  { l: 'Applications', v: t?.applications ?? 0, c: '#B3A08D', link: bucketLink('applications') },
                  { l: 'Eligible', v: t?.eligible ?? 0, c: '#E2A166', link: bucketLink('eligible') },
                  { l: 'Enrolled', v: t?.enrolled ?? 0, c: '#C8651C', link: bucketLink('enrolled') },
                  { l: 'Completed', v: k.completed, c: '#1E7A46' },
                  { l: 'Certified', v: k.certified, c: '#E88C2C' },
                ]}
              />
            </div>
            <div>
              <b className="fs12">
                Mode split <DemoChip />
              </b>
              <Donut
                items={[
                  { l: 'Offline', v: k.offline, c: '#8A4116' },
                  { l: 'Online', v: k.online, c: '#1E7A46' },
                ]}
                opts={{ centerValue: k.enrolled, centerLabel: 'Enrolled', size: 158 }}
              />
            </div>
          </div>
        </Card>
        <Card
          title={demo('District coordinator')}
          footer={
            <LinkButton to="#/pmo" className="btn sm">
              PMO team
            </LinkButton>
          }
        >
          {coord ? (
            <>
              <div className="f gp10 ac mb14">
                <Avatar name={coord.name} cls="lg" />
                <div>
                  <b className="fs16">{coord.name}</b>
                  <div className="fs12 muted">District Coordinator</div>
                </div>
              </div>
              <KvList
                pairs={[
                  ['Mobile', coord.phone],
                  ['Email', coord.email],
                  ['Districts assigned', String(coord.districts.length)],
                  ['Centres in this district', String(centres.length)],
                  ['Batches monitored', String(batches.length)],
                ]}
              />
            </>
          ) : (
            <EmptyState title="No coordinator assigned" msg="Assign a district/cluster coordinator from Administration." />
          )}
        </Card>
      </div>

      <div className="grid g2 mb14">
        <Card title={demo('Training centres in ' + d.name)} flush>
          {centres.length ? (
            <div className="list">
              {centres.map((c) => (
                <div key={c.id} className="list-row" onClick={() => go('#/centres/' + c.id)}>
                  <div className="icon-sq" style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}>
                    <Icon name="building" />
                  </div>
                  <div className="lr-main">
                    <b>{c.name}</b>
                    <span>
                      {c.taluka} · {c.students} students · {c.activeBatches} active batches
                    </span>
                  </div>
                  <Badge tone={c.score >= 80 ? 'green' : c.score >= 70 ? 'amber' : 'red'}>{c.score}/100</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No offline centre"
              msg="This district is currently served through the online training mode only. Centre allocation is configurable."
            >
              <LinkButton to="#/centre-onboarding" className="btn sm primary">
                Start centre onboarding
              </LinkButton>
            </EmptyState>
          )}
        </Card>
        <Card title={demo('Taluka rollup')} sub="No taluka in the student register yet · drill down one more level" flush>
          <div className="list">
            {tal.map((t) => (
              <div
                key={t.taluka}
                className="list-row"
                onClick={() => go('#/districts/' + d.code + '/talukas/' + encodeURIComponent(t.taluka))}
              >
                <div className="lr-main">
                  <b>{t.taluka}</b>
                  <span>
                    {t.k.enrolled} enrolled · {t.k.trainingActive} active · {t.k.certified} certified
                  </span>
                </div>
                <Icon name="chevR" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g2 mb14">
        <Card title={demo('Batches')} flush>
          {batches.length ? (
            <div className="list">
              {batches.map((b) => (
                <div key={b.id} className="list-row" onClick={() => go('#/batches/' + b.id)}>
                  <div className="lr-main">
                    <b className="mono">{b.id}</b>
                    <span>
                      {S.centreName(b.centreId)} · {b.students}/{b.seats} students
                    </span>
                  </div>
                  <ModeTag mode={b.mode} />
                  <GenBadge status={b.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No batches" msg="No batches have been scheduled in this district." />
          )}
        </Card>
        <Card
          title={demo('Top issues')}
          flush
          footer={
            <Can action="createTask">
              <button type="button" className="btn sm primary" onClick={() => S.newTask(d.code)}>
                Create task
              </button>
            </Can>
          }
        >
          {issues.length ? (
            issues.map((t) => (
              <AlertCard
                key={t.id}
                color={t.priority === 'HIGH' ? 'var(--red)' : 'var(--amber)'}
                title={t.title}
                sub={t.ownerName + ' · due ' + dateFmt(t.due)}
                right={<GenBadge status={t.status} />}
                onClick={() => S.openTask(t.id)}
              />
            ))
          ) : (
            <EmptyState title="No open issues" msg="No tasks or alerts are currently raised for this district." />
          )}
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
      <DemoNote>
        Indicative values, subject to AMRUT / COEP approval. Applications, Eligible, Enrolled and the student table come from the live
        student register.
      </DemoNote>
    </div>
  );
}
