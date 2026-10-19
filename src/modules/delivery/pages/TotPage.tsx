import { useEffect } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, DemoNote, Badge, ModeTag, ListRows, titleCase } from '../../../components/ui';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as S from '../../../services/mock/deliveryService';
import type { Trainer } from '../../../types/domain';
import type { ListItem } from '../../../components/ui';
import { Can } from '../../auth';

const TOT_DAY1 = [
  'Programme orientation',
  'Curriculum walkthrough',
  'Teaching methodology',
  'Student engagement techniques',
  'Practical training methodology',
];
const TOT_DAY2 = [
  'Portal usage',
  'Attendance marking',
  'Assessment process',
  'Documentation standards',
  'Reporting & escalation',
  'Mock session & evaluation',
];
const doneBadge = (v: boolean) => (v ? <Badge tone="green">Completed</Badge> : <Badge tone="amber">Pending</Badge>);

const columns: Column<Trainer>[] = [
  { k: 'id', l: 'Trainer ID', render: (t) => <span className="lnk mono">{t.id}</span> },
  { k: 'name', l: 'Name', render: (t) => <b>{t.name}</b> },
  { k: 'centreId', l: 'Centre / unit', exportVal: (t) => S.centre(t.centreId).name, render: (t) => S.centre(t.centreId).name },
  { k: 'mode', l: 'Mode', render: (t) => <ModeTag mode={t.mode} /> },
  { k: 'totDay1', l: 'Day 1', exportVal: (t) => (t.totDay1 ? 'Completed' : 'Pending'), render: (t) => doneBadge(t.totDay1) },
  { k: 'totDay2', l: 'Day 2', exportVal: (t) => (t.totDay2 ? 'Completed' : 'Pending'), render: (t) => doneBadge(t.totDay2) },
  {
    k: 'totStatus',
    l: 'ToT status',
    exportVal: (t) => titleCase(t.totStatus),
    render: (t) => <Badge tone={S.totTone(t.totStatus)}>{titleCase(t.totStatus)}</Badge>,
  },
  { k: 'score', l: 'Trainer score', align: 'right', exportVal: (t) => t.score + '/100', render: (t) => t.score + '/100' },
];

export default function TotPage() {
  useLegacyTick();
  useEffect(() => {
    document.title = 'Trainer ToT — AMRUT × SUMAGO Admin';
  }, []);

  const all = S.trainers();
  const cert = all.filter((t) => t.totStatus === 'CERTIFIED');
  const day1 = all.filter((t) => t.totDay1).length;
  const day2 = all.filter((t) => t.totDay2).length;
  const sessions = (list: string[], n: number, bg: string, fg: string): ListItem[] =>
    list.map((s, i) => ({
      title: s,
      sub: 'Session ' + (i + 1),
      right: <Badge tone="green">{n} trainers</Badge>,
      iconText: String(i + 1),
      iconBg: bg,
      iconFg: fg,
    }));

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Trainers', link: '#/trainers' }, { l: 'ToT management' }]}
        title="Trainer ToT Management"
        sub="Two-day Training of Trainers programme. A trainer must be ToT-certified before independent batch delivery."
        actions={
          <Can action="createBatch">
            <button
              type="button"
              className="btn primary"
              onClick={() => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok')}
            >
              <Icon name="plus" />
              Schedule ToT batch
            </button>
          </Can>
        }
      />
      <div className="grid g4 mb14">
        <Kpi label="Trainer pool" value={all.length} tone="b" link="#/trainers" />
        <Kpi label="Day 1 completed" value={day1} tone="g" />
        <Kpi label="Day 2 completed" value={day2} tone="g" />
        <Kpi label="Certified / approved" value={cert.length} tone="v" pct={Math.round((cert.length / all.length) * 100)} progTone="g" />
      </div>
      <div className="grid g2 mb14">
        <Card title="Day 1 — Programme & pedagogy" flush>
          <ListRows items={sessions(TOT_DAY1, day1, 'var(--brand-100)', 'var(--brand-600)')} />
        </Card>
        <Card title="Day 2 — Systems & assessment" flush>
          <ListRows items={sessions(TOT_DAY2, day2, 'var(--saffron-100)', '#A85B08')} />
        </Card>
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Trainer ToT completion</h3>
        </div>
        <DataTable
          rows={all}
          columns={columns}
          pageSize={12}
          exportName="Trainer_ToT_Status"
          search={['name', 'id']}
          rowLink={(t) => '#/trainers/' + t.id}
        />
      </div>
      <DemoNote />
    </div>
  );
}
