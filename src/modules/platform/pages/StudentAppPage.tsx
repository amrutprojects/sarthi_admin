import { useEffect, useState } from 'react';
import { PageHead, Card, Kpi, KvList, LinkButton, DemoNote, Badge, ListRows, ProgRow, Html } from '../../../components/ui';
import { LineChart, HBar } from '../../../components/charts';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick } from '../../../utils/legacyBus';
import { learnerPanelHtml } from '../../../utils/learnerPanel';
import * as G from '../../../services/mock/governanceService';
import { CampaignDrawer } from '../../outreach/pages/CommunicationsPage';
import { Can } from '../../auth/components/Can';

export default function StudentAppPage() {
  useLegacyTick();
  const [pushing, setPushing] = useState(false);
  useEffect(() => { document.title = 'Student app — AMRUT × SUMAGO Admin'; }, []);
  const DB = G.db();
  const a = DB.studentApp;
  const cfg = DB.config;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Student app' }]}
        title={cfg.appName + ' Management'}
        badge={<Badge tone="amber">DEMO / MOCK</Badge>}
        sub="Study material, daily MCQs, assignments, notifications and continuous learning support for enrolled candidates."
        actions={<>
          <Can action="sendCommunication"><button type="button" className="btn" onClick={() => setPushing(true)}><Icon name="bell" />Push notification</button></Can>
          <LinkButton to="#/lms" className="btn primary">LMS integration</LinkButton>
        </>}
      />
      <div className="grid g6 mb14">
        <Kpi label="Registered students" value={a.registered} tone="b" />
        <Kpi label="Active (30 days)" value={a.active30d} tone="g" pct={Math.round(a.active30d / a.registered * 100)} progTone="g" />
        <Kpi label="Daily active users" value={a.dau} tone="s" />
        <Kpi label="Study material views" value={a.materialViews} tone="b" />
        <Kpi label="MCQ completion" value={a.mcqCompletion + '%'} tone="v" pct={a.mcqCompletion} progTone="" />
        <Kpi label="Assignments submitted" value={a.assignmentsSubmitted} tone="g" />
      </div>
      <Html className="mb14" html={learnerPanelHtml(null)} />
      <div className="grid g-2-1 mb14">
        <Card title="App engagement">
          <LineChart
            series={[
              { l: 'Daily active users', v: [286, 312, 344, 358, 372, 390, 410, 402, 418], c: '#C8651C' },
              { l: 'MCQ attempts', v: [180, 214, 260, 271, 288, 302, 318, 306, 330], c: '#1E7A46' },
            ]}
            labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9']}
            opts={{ height: 240 }}
          />
        </Card>
        <Card title="App content — today" sub="Sample learner view">
          <div style={{ border: '8px solid #5C2A0D', borderRadius: 26, padding: 14, background: '#F8FAFC' }}>
            <div className="f jb ac mb10"><b className="fs13">{cfg.appName}</b><Badge tone="grey">{'v' + a.androidVersion.split(' ')[0]}</Badge></div>
            <div className="card pad mb10"><div className="fs11 muted">Daily study material</div><b className="fs13">{a.todayMaterial}</b></div>
            <div className="card pad mb10">
              <div className="fs11 muted">Today&apos;s MCQ</div><b className="fs13">{a.todayMcq}</b>
              <div className="prog sm mt8"><i className="g" style={{ width: a.mcqCompletion + '%' }} /></div>
              <div className="fs11 muted mt4">{a.mcqCompletion}% of learners completed</div>
            </div>
            <div className="card pad mb10"><div className="fs11 muted">Upcoming session</div><b className="fs13">{a.upcoming}</b></div>
            <div className="card pad"><div className="fs11 muted">Your progress</div><ProgRow pct={64} tone="s" /></div>
          </div>
        </Card>
      </div>
      <div className="grid g3">
        <Card title="Platform">
          <KvList pairs={[['Android', a.androidVersion], ['iOS', a.iosVersion], ['Crash-free sessions', a.crashFree + '%'],
            ['Notifications sent (30d)', String(a.notificationsSent)], ['Offline material', 'Supported (cached modules)']]} />
        </Card>
        <Card title="Feature usage">
          <HBar items={[
            { l: 'Study material', v: a.materialViews, c: '#C8651C' }, { l: 'MCQ practice', v: DB.lms.mcqsCompleted, c: '#1E7A46' },
            { l: 'Assignments', v: a.assignmentsSubmitted, c: '#E88C2C' }, { l: 'Notifications opened', v: 9640, c: '#6B3FA0' },
            { l: 'Attendance / session join', v: 7420, c: '#146A72' },
          ]} />
        </Card>
        <Card title="Notification log" flush>
          <ListRows items={[
            { title: 'Daily MCQ published', sub: 'Sent to 1,000 learners · today 08:00', right: <Badge tone="green">Delivered</Badge>, icon: 'bell' },
            { title: 'Expert talk reminder', sub: 'Online mode learners · today 16:00', right: <Badge tone="blue">Scheduled</Badge>, icon: 'bell' },
            { title: 'Assignment due tomorrow', sub: 'Sent to 486 learners · yesterday', right: <Badge tone="green">Delivered</Badge>, icon: 'bell' },
            { title: 'Certificate available', sub: '150 certified learners', right: <Badge tone="green">Delivered</Badge>, icon: 'award' },
          ]} />
        </Card>
      </div>
      <DemoNote />
      {pushing && <CampaignDrawer onClose={() => setPushing(false)} />}
    </div>
  );
}
