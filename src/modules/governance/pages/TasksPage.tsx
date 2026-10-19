import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, KvList, FilterBar, EmptyState, DemoNote, Badge, GenBadge, dateFmt, titleCase } from '../../../components/ui';
import { HBar } from '../../../components/charts';
import { Prio } from '../../../components/feedback/GlobalDialogs';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as G from '../../../services/mock/governanceService';
import { Can } from '../../auth/components/Can';

const PRIO_COLOR: Record<string, string> = { HIGH: 'var(--red)', MEDIUM: 'var(--amber)' };

export default function TasksPage() {
  useLegacyTick();
  const { search } = useLocation();
  const [f, setF] = usePersistentState('task', G.DEFAULT_TASK);
  useEffect(() => { document.title = 'Tasks & alerts — AMRUT × SUMAGO Admin'; }, []);
  useEffect(() => {
    const q = new URLSearchParams(search);
    const next: Record<string, string> = {};
    const priority = q.get('priority'), status = q.get('status');
    if (priority) next.priority = priority;
    if (status) next.status = status;
    if (Object.keys(next).length) setF((x) => ({ ...x, ...next }));
  }, [search, setF]);

  const all = G.db().tasks;
  const rows = G.filterTasks(f);
  const types = [...new Set(all.map((t) => t.type))];
  const owners: Record<string, string> = {};
  all.forEach((t) => { owners[t.owner] = t.ownerName; });
  const count = (st: string) => all.filter((t) => t.status === st).length;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Tasks & alerts' }]}
        title="Tasks & Alerts"
        badge={<Badge tone="amber">{count('OPEN')} open</Badge>}
        sub="Central action management. Alerts raised by the system and tasks assigned to owners with due dates."
        actions={<Can action="createTask"><button type="button" className="btn primary" onClick={() => AS.actions.newTask()}><Icon name="plus" />Create task</button></Can>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Total" value={all.length} tone="b" />
        <Kpi label="Open" value={count('OPEN')} tone="a" link="#/tasks?status=OPEN" />
        <Kpi label="In progress" value={count('IN_PROGRESS')} tone="b" />
        <Kpi label="Resolved" value={count('RESOLVED')} tone="g" />
        <Kpi label="Closed" value={count('CLOSED')} tone="" />
        <Kpi label="High priority" value={all.filter((t) => t.priority === 'HIGH' && t.status !== 'CLOSED').length} tone="r" link="#/tasks?priority=HIGH" />
      </div>
      <FilterBar
        fields={[
          { k: 'priority', l: 'Priority', options: [{ v: 'ALL', l: 'All' }, { v: 'HIGH', l: 'High' }, { v: 'MEDIUM', l: 'Medium' }, { v: 'LOW', l: 'Low' }] },
          { k: 'status', l: 'Status', options: [{ v: 'ALL', l: 'All' }, { v: 'OPEN', l: 'Open' }, { v: 'IN_PROGRESS', l: 'In progress' }, { v: 'RESOLVED', l: 'Resolved' }, { v: 'CLOSED', l: 'Closed' }] },
          { k: 'type', l: 'Category', options: [{ v: 'ALL', l: 'All categories' }].concat(types.map((t) => ({ v: t, l: titleCase(t) }))) },
          { k: 'owner', l: 'Owner', options: [{ v: 'ALL', l: 'All owners' }].concat(Object.keys(owners).map((o) => ({ v: o, l: owners[o] }))) },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(G.DEFAULT_TASK)}
      />
      <div className="grid g-2-1">
        <div className="card">
          <div className="card-h"><h3>Task register</h3></div>
          <div className="list">
            {rows.length ? rows.map((t) => (
              <div key={t.id} className="alert-card" onClick={() => AS.actions.openTask(t.id)}>
                <span className="pdot" style={{ background: PRIO_COLOR[t.priority] || 'var(--grey)' }} />
                <div className="ac-b"><b>{t.title}</b><span>{t.id} · {titleCase(t.type)} · {t.ownerName} · due {dateFmt(t.due)}</span></div>
                <div className="f gp6"><Prio p={t.priority} /><GenBadge status={t.status} /></div>
              </div>
            )) : <EmptyState title="No tasks match" msg="Adjust the filters." />}
          </div>
        </div>
        <Card title="Alert categories">
          <HBar items={types.map((t) => ({ l: titleCase(t), v: all.filter((x) => x.type === t).length, c: '#C8651C' })).sort((a, b) => b.v - a.v)} />
          <div className="sep" />
          <KvList pairs={[
            ['Low attendance alerts', 'Automatic, daily'], ['Centre infrastructure', 'On QA inspection'],
            ['Trainer unavailable', 'On availability change'], ['Batch delayed', 'On schedule slip'],
            ['Documents pending', '7 days after registration'], ['Assessment pending', 'On batch completion'],
            ['Certification pending', 'On assessment pass'], ['District behind target', 'Monthly review'],
          ]} />
        </Card>
      </div>
      <DemoNote />
    </div>
  );
}
