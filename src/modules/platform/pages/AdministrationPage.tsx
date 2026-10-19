import { useEffect, useState } from 'react';
import AS from '../../../legacy';
import { PageHead, Card, Callout, DemoNote, Badge, LinkButton, titleCase, useGo } from '../../../components/ui';
import { useLegacyTick } from '../../../utils/legacyBus';
import * as G from '../../../services/mock/governanceService';
import { Can } from '../../auth/components/Can';

const demoToast = () => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok');

export default function AdministrationPage() {
  useLegacyTick();
  const go = useGo();
  useEffect(() => { document.title = 'Administration — AMRUT × SUMAGO Admin'; }, []);
  const DB = G.db();
  const [targets, setTargets] = useState(() => Object.fromEntries(DB.districts.map((d) => [d.code, String(d.target)])));

  const masters: [label: string, count: number, link: string, desc: string][] = [
    ['Districts', DB.districts.length, '#/districts', 'Names, codes, regions, targets, coordinators'],
    ['Talukas', DB.districts.reduce((a, d) => a + d.talukas.length, 0), '#/districts', 'Taluka master under each district'],
    ['Training centres', DB.allCentres.length, '#/centres', 'Centre master, capacity, managers'],
    ['Courses', DB.courses.length, '#/administration', 'Course catalogue and duration'],
    ['Batches', DB.batches.length, '#/batches', 'Batch register and scheduling'],
    ['Trainers', DB.trainers.length, '#/trainers', 'Trainer pool and ToT'],
    ['Users', DB.users.length, '#/users', 'Portal user accounts'],
    ['Roles', DB.ROLES.length, '#/users', 'Role definitions and permissions'],
    ['Training modes', 2, '#/administration', 'Offline and Online (independent modes)'],
    ['Status values', DB.STATUS.length, '#/lifecycle', 'Candidate status state machine'],
    ['Project targets', 1, '#/settings', 'Target, batch size, district targets'],
    ['Assessment rules', 1, '#/settings', 'Pass mark, attendance minimum, attempts'],
    ['Certificate templates', 1, '#/settings', 'Certificate layout and numbering'],
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Administration' }]}
        title="Administration — Master Configuration"
        sub="Programme masters and configuration. Nothing here is hard-coded — targets, allocations and commercial parameters remain configurable."
        actions={<LinkButton to="#/settings" icon="settings" className="btn primary">System settings</LinkButton>}
      />
      <div className="grid g3 mb14">
        {masters.map(([l, n, link, desc]) => (
          <div key={l} className="card pad pointer" onClick={() => go(link)}>
            <div className="f jb ac"><b className="fs13">{l}</b><span className="tag">{n}</span></div>
            <div className="fs11 muted mt4">{desc}</div>
          </div>
        ))}
      </div>
      <div className="grid g2 mb14">
        <Card title="Course catalogue" flush footer={<Can action="editSettings"><button type="button" className="btn sm" onClick={demoToast}>Add course</button></Can>}>
          <div className="list">
            {DB.courses.map((c) => (
              <div key={c.id} className="list-row norow">
                <div className="lr-main"><b>{c.name}</b><span className="mono">{c.id}</span> <span>· {c.hours} hours · {DB.batches.filter((b) => b.courseId === c.id).length} batches</span></div>
                <Badge tone="blue">{c.mode === 'BOTH' ? 'Offline + Online' : titleCase(c.mode)}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card title="District target allocation" footer={<Can action="editSettings"><button type="button" className="btn sm primary" onClick={demoToast}>Save allocation</button></Can>}>
          <div style={{ maxHeight: 340, overflow: 'auto' }}>
            {DB.districts.slice().sort((a, b) => b.target - a.target).map((d) => (
              <div key={d.code} className="f jb ac gp10 mb6">
                <span className="fs12 flex1 ell">{d.name}</span>
                <input className="inp sm" style={{ width: 70 }} value={targets[d.code]} onChange={(e) => setTargets((t) => ({ ...t, [d.code]: e.target.value }))} aria-label={'Target for ' + d.name} />
                <span className="fs11 muted" style={{ width: 56 }}>{d.hasCentre ? 'centre' : 'online'}</span>
              </div>
            ))}
          </div>
          <div className="f jb ac mt10"><b className="fs12">Total allocated</b><b>{DB.districts.reduce((a, d) => a + d.target, 0)} / {DB.config.target}</b></div>
        </Card>
      </div>
      <Card title="Offline centre district allocation">
        <Callout tone="warn" title="Indicative demo distribution">
          {'Approved offline centres currently sit in: ' + DB.centres.map((c) => G.districtName(c.districtId)).join(', ') + '. This is an indicative demo distribution and is '}<b>not</b>{' a final approved district allocation. It is fully configurable.'}
        </Callout>
        <div className="grid g5 mt14">
          {DB.centres.map((c) => (
            <div key={c.id} className="card pad pointer" onClick={() => go('#/centres/' + c.id)}>
              <b className="fs12">{G.districtName(c.districtId)}</b>
              <div className="fs11 muted ell">{c.name}</div>
              <div className="fs11 mt4">{c.students} students</div>
            </div>
          ))}
        </div>
      </Card>
      <DemoNote />
    </div>
  );
}
