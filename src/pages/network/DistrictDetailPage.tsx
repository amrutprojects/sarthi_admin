import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  PageHead, Card, Kpi, KvList, LinkButton, EmptyState, DemoNote, Badge, GenBadge, StatusBadge, ModeTag, AttendanceCell, AlertCard,
  dateFmt, useGo,
} from '../../components/ui';
import { Funnel, Donut } from '../../components/charts';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import { useLegacyTick } from '../../utils/legacyBus';
import * as S from '../../services/networkService';
import type { Candidate } from '../../types/domain';
import { Can } from '../../auth/Can';

const candColumns: Column<Candidate>[] = [
  { k: 'id', l: 'Candidate ID', render: (x) => <span className="lnk mono">{x.id}</span> },
  { k: 'name', l: 'Name' }, { k: 'taluka', l: 'Taluka' },
  { k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> },
  { k: 'batchId', l: 'Batch', render: (x) => (x.batchId ? <span className="mono">{x.batchId}</span> : '—') },
  { k: 'status', l: 'Status', render: (x) => <StatusBadge status={x.status} /> },
  { k: 'attendance', l: 'Attendance', align: 'right', exportVal: (x) => x.attendance + '%', render: (x) => <AttendanceCell value={x.attendance} /> },
];

export default function DistrictDetailPage() {
  useLegacyTick();
  const go = useGo();
  const { id = '' } = useParams();
  useEffect(() => { document.title = 'District — AMRUT × SUMAGO Admin'; }, []);

  const d = S.district(id);
  if (!d) {
    return (
      <div className="page">
        <EmptyState title="District not found" msg={'No district with code ' + id}><LinkButton to="#/districts" className="btn primary">All districts</LinkButton></EmptyState>
      </div>
    );
  }
  const rows = S.byDistrict(d.code);
  const k = S.kpis(rows, d.target);
  const st = S.districtStatus(d);
  const centres = S.centres().filter((c) => c.districtId === d.code);
  const batches = S.batches().filter((b) => b.districtId === d.code);
  const coord = S.coordinator(d.coordinatorId);
  const tal = S.talukaRollup(d.code);
  const issues = S.tasksFor(d.code);
  const q = '#/candidates?district=' + d.code;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Districts', link: '#/districts' }, { l: d.name }]}
        title={d.name + ' District'}
        badge={<><Badge tone={st.tone}>{st.l}</Badge><span className="tag">{d.region}</span></>}
        sub={<>District code <b>{d.code}</b> · {d.talukas.length} talukas · {centres.length} approved centre{centres.length === 1 ? '' : 's'} · target {d.target} students</>}
        actions={<>
          <LinkButton to={q} icon="users">Candidates</LinkButton>
          <Can action="createTask"><button type="button" className="btn" onClick={() => S.newTask(d.code)}><Icon name="plus" />Create task</button></Can>
          <LinkButton to={'#/reports/district?district=' + d.code} className="btn primary">Export report</LinkButton>
        </>}
      />
      <div className="grid g8 mb14">
        <Kpi label="Target" value={k.target} />
        <Kpi label="Applications" value={k.applications} tone="b" link={q} />
        <Kpi label="Eligible" value={k.eligible} tone="b" link={q + '&bucket=eligible'} />
        <Kpi label="Enrolled" value={k.enrolled} tone="g" pct={k.achievementPct} progTone="g" sub={k.achievementPct + '% of target'} link={q + '&bucket=enrolled'} />
        <Kpi label="Training active" value={k.trainingActive} tone="s" link={q + '&bucket=active'} />
        <Kpi label="Completed" value={k.completed} tone="g" link={q + '&bucket=completed'} />
        <Kpi label="Attendance" value={k.attendance + '%'} tone={k.attendance >= 75 ? 'g' : 'a'} link={'#/attendance?district=' + d.code} />
        <Kpi label="Certified" value={k.certified} tone="v" link={'#/certification?district=' + d.code} />
      </div>

      <div className="grid g-2-1 mb14">
        <Card title="Progress charts">
          <div className="grid g2">
            <div><b className="fs12">Enrollment funnel</b>
              <Funnel stages={[
                { l: 'Applications', v: k.applications, c: '#B3A08D' }, { l: 'Eligible', v: k.eligible, c: '#E2A166' },
                { l: 'Enrolled', v: k.enrolled, c: '#C8651C' }, { l: 'Completed', v: k.completed, c: '#1E7A46' },
                { l: 'Certified', v: k.certified, c: '#E88C2C' },
              ]} />
            </div>
            <div><b className="fs12">Mode split</b>
              <Donut items={[{ l: 'Offline', v: k.offline, c: '#8A4116' }, { l: 'Online', v: k.online, c: '#1E7A46' }]} opts={{ centerValue: k.enrolled, centerLabel: 'Enrolled', size: 158 }} />
            </div>
          </div>
        </Card>
        <Card title="District coordinator" footer={<LinkButton to="#/pmo" className="btn sm">PMO team</LinkButton>}>
          {coord ? (
            <>
              <div className="f gp10 ac mb14"><Avatar name={coord.name} cls="lg" /><div><b className="fs16">{coord.name}</b><div className="fs12 muted">District Coordinator</div></div></div>
              <KvList pairs={[['Mobile', coord.phone], ['Email', coord.email], ['Districts assigned', String(coord.districts.length)],
                ['Centres in this district', String(centres.length)], ['Batches monitored', String(batches.length)]]} />
            </>
          ) : <EmptyState title="No coordinator assigned" msg="Assign a district/cluster coordinator from Administration." />}
        </Card>
      </div>

      <div className="grid g2 mb14">
        <Card title={'Training centres in ' + d.name} flush>
          {centres.length ? (
            <div className="list">
              {centres.map((c) => (
                <div key={c.id} className="list-row" onClick={() => go('#/centres/' + c.id)}>
                  <div className="icon-sq" style={{ background: 'var(--brand-100)', color: 'var(--brand-600)' }}><Icon name="building" /></div>
                  <div className="lr-main"><b>{c.name}</b><span>{c.taluka} · {c.students} students · {c.activeBatches} active batches</span></div>
                  <Badge tone={c.score >= 80 ? 'green' : c.score >= 70 ? 'amber' : 'red'}>{c.score}/100</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No offline centre" msg="This district is currently served through the online training mode only. Centre allocation is configurable.">
              <LinkButton to="#/centre-onboarding" className="btn sm primary">Start centre onboarding</LinkButton>
            </EmptyState>
          )}
        </Card>
        <Card title="Taluka rollup" sub="Drill down one more level" flush>
          <div className="list">
            {tal.map((t) => (
              <div key={t.taluka} className="list-row" onClick={() => go('#/districts/' + d.code + '/talukas/' + encodeURIComponent(t.taluka))}>
                <div className="lr-main"><b>{t.taluka}</b><span>{t.k.enrolled} enrolled · {t.k.trainingActive} active · {t.k.certified} certified</span></div>
                <Icon name="chevR" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g2 mb14">
        <Card title="Batches" flush>
          {batches.length ? (
            <div className="list">
              {batches.map((b) => (
                <div key={b.id} className="list-row" onClick={() => go('#/batches/' + b.id)}>
                  <div className="lr-main"><b className="mono">{b.id}</b><span>{S.centreName(b.centreId)} · {b.students}/{b.seats} students</span></div>
                  <ModeTag mode={b.mode} /><GenBadge status={b.status} />
                </div>
              ))}
            </div>
          ) : <EmptyState title="No batches" msg="No batches have been scheduled in this district." />}
        </Card>
        <Card title="Top issues" flush footer={<Can action="createTask"><button type="button" className="btn sm primary" onClick={() => S.newTask(d.code)}>Create task</button></Can>}>
          {issues.length ? issues.map((t) => (
            <AlertCard key={t.id} color={t.priority === 'HIGH' ? 'var(--red)' : 'var(--amber)'} title={t.title} sub={t.ownerName + ' · due ' + dateFmt(t.due)} right={<GenBadge status={t.status} />} onClick={() => S.openTask(t.id)} />
          )) : <EmptyState title="No open issues" msg="No tasks or alerts are currently raised for this district." />}
        </Card>
      </div>

      <div className="card">
        <div className="card-h"><h3>Candidates in {d.name}</h3><LinkButton to={q} className="btn sm">Open in candidate master</LinkButton></div>
        <DataTable key={d.code} rows={rows} columns={candColumns} pageSize={10} exportName={'District_' + d.code + '_Candidates'}
          search={['id', 'name']} searchLabel="candidates" rowLink={(x) => '#/candidates/' + x.id} />
      </div>
      <DemoNote />
    </div>
  );
}
