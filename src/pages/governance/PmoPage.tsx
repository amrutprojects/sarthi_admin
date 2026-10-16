import { useEffect } from 'react';
import { PageHead, Card, Kpi, LinkButton, DemoNote, titleCase } from '../../components/ui';
import { HBar } from '../../components/charts';
import Avatar from '../../components/Avatar';
import { useLegacyTick } from '../../utils/legacyBus';
import * as G from '../../services/governanceService';

export default function PmoPage() {
  useLegacyTick();
  useEffect(() => { document.title = 'PMO dashboard — AMRUT × SUMAGO Admin'; }, []);

  const DB = G.db();
  const k = DB.stateKpis;
  const h = DB.healthScore();
  const byType: Record<string, number> = {};
  DB.tasks.forEach((t) => { byType[t.type] = (byType[t.type] || 0) + 1; });

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'PMO dashboard' }]}
        title="PMO Dashboard"
        sub="Central project management office — team, ownership and workload across the programme."
        actions={<>
          <LinkButton to="#/tasks">Task register</LinkButton>
          <LinkButton to="#/executive" className="btn primary">Executive view</LinkButton>
        </>}
      />
      <div className="grid g8 mb14">
        <Kpi label="Programme health" value={h.score + '/100'} tone={h.score >= 80 ? 'g' : 'a'} pct={h.score} progTone={h.score >= 80 ? 'g' : 'a'} />
        <Kpi label="Districts" value={DB.districts.length} tone="b" link="#/districts" />
        <Kpi label="Centres" value={DB.centres.length} tone="b" link="#/centres" />
        <Kpi label="Trainers" value={DB.trainers.length} tone="b" link="#/trainers" />
        <Kpi label="Batches" value={DB.batches.length} tone="b" link="#/batches" />
        <Kpi label="Students" value={k.enrolled} tone="g" link="#/candidates?bucket=enrolled" />
        <Kpi label="Open issues" value={DB.tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length} tone="a" link="#/tasks" />
        <Kpi label="Coordinators" value={DB.coordinators.length} tone="v" />
      </div>
      <div className="grid g2 mb14">
        <Card title="PMO team & ownership" flush>
          <div className="list">
            {DB.pmoTeam.map((p) => (
              <div key={p.name} className="list-row norow">
                <Avatar name={p.name} />
                <div className="lr-main"><b>{p.name}</b><span>{p.role} · {p.focus}</span></div>
                <div className="tr"><b className="fs13">{p.tasks}</b><div className="fs11 muted">tasks</div></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="District / cluster coordinators" flush>
          <div className="list">
            {DB.coordinators.map((c) => {
              const enrolled = c.districts.reduce((a, dc) => a + DB.kpis(DB.byDistrict(dc), 0).enrolled, 0);
              const centres = DB.centres.filter((x) => c.districts.includes(x.districtId)).length;
              return (
                <div key={c.id || c.name} className="list-row norow">
                  <Avatar name={c.name} />
                  <div className="lr-main"><b>{c.name}</b><span>{c.districts.length} districts · {centres} centres · {enrolled} students</span></div>
                  <LinkButton to={'#/districts/' + c.districts[0]} className="btn xs">View</LinkButton>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div className="grid g3 mb14">
        <Card title="Workload by owner"><HBar items={DB.pmoTeam.map((p) => ({ l: p.name, v: p.tasks, c: '#C8651C' })).sort((a, b) => b.v - a.v)} /></Card>
        <Card title="Issues by category"><HBar items={Object.keys(byType).map((t) => ({ l: titleCase(t), v: byType[t], c: '#E88C2C' })).sort((a, b) => b.v - a.v)} /></Card>
        <Card title="Health factors">
          {h.factors.map((f) => (
            <div className="mb6" key={f.k}>
              <div className="f jb fs12"><span>{f.k}</span><b>{Math.round(f.v)}</b></div>
              <div className="prog sm"><i className={f.v >= 80 ? 'g' : f.v >= 60 ? 'a' : 'r'} style={{ width: Math.min(100, f.v) + '%' }} /></div>
            </div>
          ))}
        </Card>
      </div>
      <DemoNote />
    </div>
  );
}
