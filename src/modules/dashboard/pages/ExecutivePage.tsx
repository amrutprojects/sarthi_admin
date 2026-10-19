import { useEffect, useReducer } from 'react';
import AS from '../../../legacy';
import {
  PageHead,
  Card,
  Kpi,
  KvList,
  AlertCard,
  LinkButton,
  Callout,
  DemoNote,
  GenBadge,
  dateFmt,
  money,
  titleCase,
  useGo,
} from '../../../components/ui';
import { Ring, Stacked, Heatmap, Donut } from '../../../components/charts';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/dashboardService';
import type { Rag } from '../../../types/domain';

export default function ExecutivePage() {
  useLegacyTick(); // re-render when a legacy drawer (e.g. task status) changes data
  const [, refresh] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    document.title = 'Executive Command Centre — AMRUT × SUMAGO Admin';
  }, []);

  const k = S.stateKpis();
  const health = S.healthScore();
  const rag: Record<Rag, number> = { GREEN: 0, AMBER: 0, RED: 0, GREY: 0 };
  S.districts().forEach((d) => {
    rag[S.districtRag(d)]++;
  });
  const cfg = S.config();
  const budget = cfg.target * cfg.perStudentValue;
  const committed = S.payments().reduce((a, p) => a + p.committed, 0);
  const paid = S.payments().reduce((a, p) => a + p.paid, 0);

  function onRefresh() {
    AS.ui.toast('Dashboard refreshed from mock data service.', 'ok');
    refresh();
  }

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Executive Command Centre' }]}
        title="Executive Command Centre"
        badge={<span className="demo-pill">DEMO DATA</span>}
        sub={
          <>
            PMO-level programme health · Last updated <b>{new Date().toLocaleString('en-IN')}</b>
          </>
        }
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

      <div className="grid g-1-2 mb14">
        <Card title="Overall programme health" sub="RAG composite">
          <div className="f gp14 ac">
            <Ring value={health.score} opts={{ label: health.score + '', sub: health.status, size: 130 }} />
            <div className="flex1">
              {health.factors.map((f) => (
                <div className="mb6" key={f.k}>
                  <div className="f jb fs11">
                    <span>{f.k}</span>
                    <b>{Math.round(f.v)}</b>
                  </div>
                  <div className="prog sm">
                    <i className={f.v >= 80 ? 'g' : f.v >= 60 ? 'a' : 'r'} style={{ width: Math.min(100, f.v) + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="disclaim mt10">
            System-generated Programme Health Indicator — weighted composite, internal dashboard metric only.
          </div>
        </Card>
        <Card title="Target vs achievement" sub="Programme to date">
          <div className="grid g4 mb14">
            <Kpi label="Target" value={k.target} tone="" />
            <Kpi label="Enrolled" value={k.enrolled} tone="g" link="#/candidates?bucket=enrolled" />
            <Kpi label="In training" value={k.trainingActive} tone="s" link="#/candidates?bucket=active" />
            <Kpi label="Certified" value={k.certified} tone="v" link="#/certification" />
          </div>
          <Stacked
            labels={['Target', 'Achieved']}
            series={[
              { l: 'Certified', v: [0, k.certified], c: '#E88C2C' },
              { l: 'Completed (not certified)', v: [0, k.completed - k.certified], c: '#1E7A46' },
              { l: 'In training', v: [0, k.trainingActive], c: '#C8651C' },
              { l: 'Balance to target', v: [k.target, Math.max(0, k.target - k.enrolled)], c: '#EFE2D2' },
            ]}
            opts={{ height: 190 }}
          />
        </Card>
      </div>

      <div className="grid g4 mb14">
        <Kpi label="Districts GREEN" value={rag.GREEN} tone="g" sub="On track" link="#/districts?filter=green" />
        <Kpi label="Districts AMBER" value={rag.AMBER} tone="a" sub="Needs attention" link="#/districts?filter=amber" />
        <Kpi label="Districts RED" value={rag.RED} tone="r" sub="Critical / delayed" link="#/districts?filter=critical" />
        <Kpi label="Districts GREY" value={rag.GREY} tone="" sub="Not started / on hold" link="#/districts" />
      </div>

      <div className="card mb14">
        <div className="card-h">
          <h3>
            District heatmap <span className="sub">enrolled against target</span>
          </h3>
          <LinkButton to="#/map" className="btn sm">
            Open full map
          </LinkButton>
        </div>
        <div className="card-b">
          <Heatmap
            cells={S.districts().map((d) => ({
              l: d.name,
              v: S.districtKpis(d).enrolled,
              sub: 'target ' + d.target,
              link: '#/districts/' + d.code,
            }))}
            opts={{ cols: 9 }}
          />
        </div>
      </div>

      <div className="grid g3 mb14">
        <Card
          title="Centre health"
          flush
          footer={
            <LinkButton to="#/centres" className="btn sm">
              All centres
            </LinkButton>
          }
        >
          <CentreHealth />
        </Card>
        <Card
          title="Trainer availability"
          flush
          footer={
            <LinkButton to="#/trainers" className="btn sm">
              Trainer management
            </LinkButton>
          }
        >
          <TrainerAvailability />
        </Card>
        <Card
          title="Batch status"
          flush
          footer={
            <LinkButton to="#/batches" className="btn sm">
              All batches
            </LinkButton>
          }
        >
          <BatchStatus />
        </Card>
      </div>

      <div className="grid g-2-1">
        <Card
          title="Critical alerts"
          flush
          footer={
            <LinkButton to="#/tasks" className="btn sm">
              All tasks
            </LinkButton>
          }
        >
          {S.tasks()
            .filter((t) => t.priority === 'HIGH' && t.status !== 'CLOSED')
            .map((t) => (
              <AlertCard
                key={t.id}
                color="var(--red)"
                title={t.title}
                sub={t.ownerName + ' · due ' + dateFmt(t.due)}
                right={<GenBadge status={t.status} />}
                onClick={() => S.openTask(t.id)}
              />
            ))}
        </Card>
        <Card
          title="Financial snapshot"
          footer={
            <LinkButton to="#/finance" className="btn sm">
              Finance dashboard
            </LinkButton>
          }
        >
          <div className="mt4">
            <KvList
              pairs={[
                ['Gross project value (indicative)', money(budget)],
                ['Rate per student', money(cfg.perStudentValue)],
                ['Committed to centres', money(committed)],
                ['Released to date', money(paid)],
                ['Balance committed', money(committed - paid)],
              ]}
            />
          </div>
          <Callout tone="warn" title="Indicative / configurable">
            Commercial values are configuration parameters in this prototype and are not contractual terms.
          </Callout>
        </Card>
      </div>
      <DemoNote />
    </div>
  );
}

function CentreHealth() {
  const go = useGo();
  return (
    <div className="list">
      {S.centres()
        .slice()
        .sort((a, b) => a.score - b.score)
        .slice(0, 6)
        .map((c) => (
          <div key={c.id} className="list-row" onClick={() => go('#/centres/' + c.id)}>
            <div className="lr-main">
              <b>{c.name}</b>
              <span>
                {S.districtName(c.districtId)} · {c.students} students
              </span>
            </div>
            <b className="fs13" style={{ color: c.score >= 80 ? 'var(--green)' : c.score >= 70 ? 'var(--amber)' : 'var(--red)' }}>
              {c.score}
            </b>
          </div>
        ))}
    </div>
  );
}

function TrainerAvailability() {
  const g: Record<string, number> = {};
  S.trainers().forEach((t) => {
    g[t.availability] = (g[t.availability] || 0) + 1;
  });
  return (
    <div className="card-b">
      <Donut
        items={Object.keys(g).map((kk) => ({
          l: titleCase(kk),
          v: g[kk],
          c: kk === 'ACTIVE' ? '#1E7A46' : kk === 'BACKUP' ? '#C8651C' : '#B3A08D',
        }))}
        opts={{ centerValue: S.trainers().length, centerLabel: 'Trainers', size: 150 }}
      />
    </div>
  );
}

function BatchStatus() {
  const g: Record<string, number> = {};
  S.batches().forEach((b) => {
    g[b.status] = (g[b.status] || 0) + 1;
  });
  return (
    <div className="card-b">
      <Donut
        items={Object.keys(g).map((kk) => ({
          l: titleCase(kk),
          v: g[kk],
          link: '#/batches?status=' + kk,
          c: kk === 'ACTIVE' ? '#C8651C' : kk === 'COMPLETED' ? '#1E7A46' : kk === 'UPCOMING' ? '#B3A08D' : '#B3271E',
        }))}
        opts={{ centerValue: S.batches().length, centerLabel: 'Batches', size: 150, click: true }}
      />
    </div>
  );
}
