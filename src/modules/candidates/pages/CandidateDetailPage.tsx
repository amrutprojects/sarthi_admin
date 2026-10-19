import { useEffect, useReducer, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  PageHead, Card, Kpi, KvList, LinkButton, EmptyState, DemoNote, Badge, GenBadge, StatusBadge, ModeTag, ProgRow,
  Timeline, ListRows, Callout, Html, dateFmt, useGo,
} from '../../../components/ui';
import { HBar, Calendar } from '../../../components/charts';
import Icon from '../../../components/ui/Icon';
import AS from '../../../legacy';
import { useLegacyTick } from '../../../utils/legacyBus';
import { qrSvg } from '../../../utils/learnerPanel';
import * as S from '../../../services/mock/candidateService';
import type { Batch, Candidate, Centre, District, ProgrammeConfig } from '../../../types/domain';
import type { TimelineItem } from '../../../components/ui';

type DetailDialog = { type: 'msg' } | { type: 'status' } | { type: 'doc'; name: string };
import { MessageDrawer, StatusModal, DocumentDrawer } from './CandidateDialogs';
import { Can } from '../../auth';

const LIFECYCLE: [label: string, stage: number][] = [
  ['Lead', 1], ['Application', 4], ['Documents submitted', 6], ['Eligibility verification', 7],
  ['Approved', 10], ['Enrolled', 11], ['Batch allocated', 12], ['Training started', 13],
  ['Training progress', 14], ['Assessment', 17], ['Completed', 18], ['Certified', 20],
];

const TABS: [key: string, label: string][] = [['profile', 'Profile'], ['documents', 'Documents'], ['training', 'Training'], ['attendance', 'Attendance'],
  ['assignments', 'Assignments'], ['assessments', 'Assessments'], ['communication', 'Communication'], ['certificate', 'Certificate']];

export default function CandidateDetailPage() {
  useLegacyTick();
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const { id = '' } = useParams();
  const { search } = useLocation();
  const go = useGo();
  const [dialog, setDialog] = useState<DetailDialog | null>(null);
  const tab = new URLSearchParams(search).get('tab') || 'profile';
  const c = S.getCandidate(id);

  useEffect(() => { document.title = 'Candidate — AMRUT × SUMAGO Admin'; }, []);

  if (!c) {
    return (
      <div className="page">
        <EmptyState title="Candidate not found" msg={'No record exists for ID ' + id}>
          <LinkButton to="#/candidates" className="btn primary">Back to candidate master</LinkButton>
        </EmptyState>
      </div>
    );
  }

  const d = S.district(c.districtId);
  const b = S.batch(c.batchId);
  const centre = S.centre(c.centreId);
  const cfg = S.config();
  const stage = S.statusDef(c.status).stage;
  const overall = Math.round((stage / 20) * 100);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Candidates', link: '#/candidates' }, { l: d.name, link: '#/districts/' + d.code }, { l: c.id }]}
        title={c.name}
        badge={<><StatusBadge status={c.status} /><ModeTag mode={c.mode} /></>}
        sub={<>
          <span className="mono">{c.id}</span> · {d.name} / {c.taluka} · {centre ? <a onClick={() => go('#/centres/' + centre.id)}>{centre.name}</a> : 'No centre allocated'}
          {b ? <> · <a onClick={() => go('#/batches/' + b.id)}>{b.id}</a></> : null}
        </>}
        actions={<>
          <Can action="messageCandidate"><button type="button" className="btn" onClick={() => setDialog({ type: 'msg' })}><Icon name="mail" />Send message</button></Can>
          {c.certificateNo ? <LinkButton to={'#/verify?no=' + encodeURIComponent(c.certificateNo)} icon="qr">Certificate</LinkButton> : null}
          <Can action="updateCandidate"><button type="button" className="btn primary" onClick={() => setDialog({ type: 'status' })}>Update status</button></Can>
        </>}
      />

      <div className="grid g5 mb14">
        <Kpi label="Overall progress" value={overall + '%'} tone="b" pct={overall} sub={'Stage ' + stage + ' of 20'} />
        <Kpi label="Attendance" value={c.attendance ? c.attendance + '%' : '—'} tone={c.attendance >= 75 ? 'g' : c.attendance ? 'a' : ''} pct={c.attendance} progTone={c.attendance >= 75 ? 'g' : 'a'} sub={'Minimum ' + cfg.minAttendancePct + '%'} />
        <Kpi label="Curriculum" value={c.progress ? c.progress + '%' : '—'} tone="s" pct={c.progress} progTone="s" sub={b ? b.sessionsDone + ' / ' + b.sessionsPlanned + ' sessions' : '—'} />
        <Kpi label="Assessment" value={c.score == null ? '—' : c.score} tone={c.score == null ? '' : c.score >= 50 ? 'g' : 'r'} sub={c.score == null ? 'Not attempted' : (c.score >= 50 ? 'Passed' : 'Failed') + ' · pass mark ' + cfg.passMarkPct} />
        <Kpi label="Risk flags" value={c.risks.length} tone={c.risks.length ? 'r' : 'g'} sub={c.risks.length ? c.risks[0].l : 'No active risk'} />
      </div>

      {c.risks.length ? <div className="mb14"><Callout tone="warn" title="Risk indicators active">{c.risks.map((x) => x.l).join(' · ')}</Callout></div> : null}
      {c.status === 'NOT_ELIGIBLE' ? <div className="mb14"><Callout tone="err" title="Not eligible">{c.rejectReason || ''}</Callout></div> : null}

      <div className="card mb14">
        <div className="card-h"><h3>Candidate lifecycle timeline</h3><span className="sub">every status transition is recorded</span></div>
        <div className="card-b">
          <div className="steps">
            {LIFECYCLE.map(([l, n]) => {
              const done = stage >= n;
              const cur = !done && stage >= n - 3;
              return <div key={l} className={'step ' + (done ? 'done' : cur ? 'cur' : '')}><b>{l}</b><span>{done ? 'Done' : cur ? 'Current' : 'Pending'}</span></div>;
            })}
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => go('#/candidates/' + c.id + '?tab=' + k)}>{l}</button>
        ))}
      </div>
      <TabBody tab={tab} c={c} d={d} b={b} centre={centre} cfg={cfg} openDialog={setDialog} />
      <DemoNote />

      {dialog?.type === 'msg' && <MessageDrawer candidate={c} onClose={() => setDialog(null)} />}
      {dialog?.type === 'status' && <StatusModal candidate={c} onClose={() => setDialog(null)} onSaved={rerender} />}
      {dialog?.type === 'doc' && <DocumentDrawer name={dialog.name} onClose={() => setDialog(null)} />}
    </div>
  );
}

interface TabBodyProps {
  tab: string; c: Candidate; d: District; b: Batch | null; centre: Centre | null; cfg: ProgrammeConfig;
  openDialog: (d: DetailDialog) => void;
}

function TabBody({ tab, c, d, b, centre, cfg, openDialog }: TabBodyProps) {
  const toastDemo = () => AS.ui.toast('Demo action recorded — no data was persisted.', 'ok');

  if (tab === 'documents') {
    const docs: [name: string, verified: boolean][] = [['Aadhaar / identity proof', c.docs.aadhaar], ['Passport photograph', c.docs.photo], ['Education certificate', c.docs.education], ['Income certificate', c.docs.income], ['Bank passbook', c.docs.bank]];
    return (
      <Card title="Document checklist" flush footer={<>
        <Can action="manageDocuments"><button type="button" className="btn sm" onClick={toastDemo}>Upload document</button></Can>
        <LinkButton to="#/documents" className="btn sm ghost">Document repository</LinkButton>
      </>}>
        <div className="list">
          {docs.map(([name, ok]) => (
            <div key={name} className="list-row norow">
              <div className="icon-sq" style={{ background: ok ? 'var(--green-bg)' : 'var(--amber-bg)', color: ok ? 'var(--green)' : 'var(--amber)' }}><Icon name="doc" /></div>
              <div className="lr-main"><b>{name}</b><span>{ok ? 'Verified · uploaded ' + dateFmt(c.appliedOn) : 'Not submitted'}</span></div>
              {ok ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}
              <button type="button" className="btn xs" onClick={() => openDialog({ type: 'doc', name })}>View</button>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (tab === 'training') {
    if (!b || !centre) return <Card title="Training"><EmptyState title="Not yet in training" msg="This candidate has not been allocated to a batch." /></Card>;
    const course = S.course(b.courseId);
    const panel = S.learnerPanelHtml(c);
    const modules = [
      { l: 'Module 1 — Fundamentals', v: 100 }, { l: 'Module 2 — Operating systems', v: Math.min(100, c.progress + 20) },
      { l: 'Module 3 — Office applications', v: c.progress }, { l: 'Module 4 — Internet & e-services', v: Math.max(0, c.progress - 22) },
      { l: 'Module 5 — Practical / project', v: Math.max(0, c.progress - 40) },
    ].map((x) => ({ l: x.l, v: x.v, display: x.v + '%', c: x.v >= 75 ? '#1E7A46' : '#C8651C' }));
    return (
      <>
        {panel ? <Html className="mb14" html={panel} /> : null}
        <div className="grid g-2-1">
          <Card title="Training details" footer={<>
            <LinkButton to={'#/batches/' + b.id} className="btn sm">Open batch</LinkButton>
            <LinkButton to={'#/centres/' + centre.id} className="btn sm ghost">Open centre</LinkButton>
          </>}>
            <KvList pairs={[
              ['Training mode', c.mode === 'ONLINE' ? 'Online — centrally managed' : 'Offline — centre managed'],
              ['Batch', b.id], ['Course', course?.name ?? '—'], ['Course hours', (course?.hours ?? 0) + ' hours'],
              ['Centre / unit', centre.name], ['Trainer', S.trainerName(b.trainerId)],
              ['Start date', dateFmt(b.start)], ['Expected completion', dateFmt(b.end)],
              ['Sessions delivered', b.sessionsDone + ' of ' + b.sessionsPlanned],
            ]} />
            <div className="mt14"><b className="fs12">Curriculum progress</b><ProgRow pct={c.progress} tone={c.progress >= 75 ? 'g' : 's'} /></div>
          </Card>
          <Card title="Module completion"><HBar items={modules} opts={{ max: 100 }} /></Card>
        </div>
      </>
    );
  }

  if (tab === 'attendance') {
    const days = [];
    for (let i = 0; i < 28; i++) {
      const day = S.addDays('2026-08-11', i);
      const dt = new Date(day + 'T00:00:00');
      const v = dt.getDay() === 0 ? 0 : (c.attendance ? (((i * 37) % 100) < c.attendance ? 100 : 0) : 0);
      days.push({ d: dt.getDate(), v, full: dateFmt(day) });
    }
    const present = days.filter((x) => x.v === 100).length;
    return (
      <div className="grid g-1-2">
        <Card title="Attendance summary" footer={<LinkButton to="#/attendance" className="btn sm">Attendance module</LinkButton>}>
          <div className="grid g2 mb14">
            <Kpi label="Attendance" value={c.attendance + '%'} tone={c.attendance >= 75 ? 'g' : 'a'} />
            <Kpi label="Sessions present" value={present} sub="of last 28 days" />
          </div>
          <KvList pairs={[
            ['Status', c.attendance >= 75 ? 'Meets minimum' : 'Below minimum'], ['Minimum required', cfg.minAttendancePct + '%'],
            ['Capture method', c.mode === 'ONLINE' ? 'Session join + LMS activity' : 'Digital attendance at centre'],
            ['Manual/paper backup', c.mode === 'OFFLINE' ? 'Recorded separately at centre' : 'Not applicable'],
          ]} />
        </Card>
        <Card title="Attendance calendar" sub="Last 4 weeks · green = present, red = absent, grey = no session"><Calendar days={days} /></Card>
      </div>
    );
  }

  if (tab === 'assignments') {
    const names = ['Computer basics', 'OS & file management', 'Word processing', 'Spreadsheets', 'Capstone project'];
    const items = [1, 2, 3, 4, 5].map((i) => {
      const done = c.progress >= i * 20;
      return {
        title: 'Assignment ' + i + ' — ' + names[i - 1],
        sub: done ? 'Submitted · scored ' + (60 + ((i * 7) % 35)) + '/100' : 'Not submitted',
        right: done ? <Badge tone="green">Submitted</Badge> : <Badge tone="amber">Pending</Badge>,
      };
    });
    return <Card title="Assignments" flush sub={c.mode === 'ONLINE' ? 'Submitted through SUMAGO LMS' : 'Submitted at centre'}><ListRows items={items} /></Card>;
  }

  if (tab === 'assessments') {
    if (c.score == null) {
      return <Card title="Assessments"><EmptyState title="No assessment yet" msg={'The candidate becomes eligible after completing training and meeting the ' + cfg.minAttendancePct + '% attendance minimum.'} /></Card>;
    }
    const pass = c.score >= 50;
    return (
      <div className="grid g2">
        <Card title="Assessment result">
          <div className="tc" style={{ padding: '10px 0' }}>
            <div className="scorebig" style={{ color: pass ? 'var(--green)' : 'var(--red)' }}>{c.score}<span className="fs16 muted">/100</span></div>
            <div className="mt8"><Badge tone={pass ? 'green' : 'red'}>{pass ? 'Passed' : 'Failed'}</Badge></div>
          </div>
          <KvList pairs={[['Theory (60 marks)', Math.round(c.score * 0.6) + ''], ['Practical (40 marks)', Math.round(c.score * 0.4) + ''],
            ['Pass mark', cfg.passMarkPct + '%'], ['Attempt', '1 of 2'], ['Assessed on', dateFmt(c.lastActivity)]]} />
        </Card>
        <Card title="MCQ / module scores" footer={<LinkButton to="#/assessments" className="btn sm">Assessment dashboard</LinkButton>}>
          <HBar
            items={[
              { l: 'Module 1 MCQ', v: Math.min(100, c.score + 8) }, { l: 'Module 2 MCQ', v: c.score },
              { l: 'Module 3 MCQ', v: Math.max(10, c.score - 6) }, { l: 'Practical evaluation', v: Math.max(10, c.score - 3) },
            ].map((x) => ({ l: x.l, v: x.v, display: x.v + '%', c: x.v >= 50 ? '#1E7A46' : '#B3271E' }))}
            opts={{ max: 100 }}
          />
        </Card>
      </div>
    );
  }

  if (tab === 'communication') {
    const items = S.communications().slice(0, 5).map((m) => ({
      title: m.name, sub: m.channel + ' · ' + m.when + ' · ' + m.status, right: <GenBadge status={m.status} />, icon: 'mail',
    }));
    return (
      <Card title="Communication history" flush footer={<>
        <Can action="messageCandidate"><button type="button" className="btn sm primary" onClick={() => openDialog({ type: 'msg' })}>Send new message</button></Can>
        <LinkButton to="#/communications" className="btn sm ghost">Communication centre</LinkButton>
      </>}>
        <ListRows items={items} />
      </Card>
    );
  }

  if (tab === 'certificate') {
    if (!c.certificateNo) return <Card title="Certificate"><EmptyState title="No certificate yet" msg="A certificate is generated once the candidate clears the assessment." /></Card>;
    return <CertificateCard c={c} />;
  }

  return (
    <div className="grid g-2-1">
      <Card title="Personal & application details">
        <div className="grid g2" style={{ gap: '0 26px' }}>
          <div><KvList pairs={[['Candidate ID', c.id], ['Full name', c.name], ['Gender', c.gender], ['Age', c.age + ' years'], ['Mobile', c.phone], ['Email', c.email], ['Qualification', c.qualification]]} /></div>
          <div><KvList pairs={[['District', d.name], ['Taluka', c.taluka], ['Training mode', c.mode === 'ONLINE' ? 'Online' : 'Offline'],
            ['Lead source', c.source], ['Applied on', dateFmt(c.appliedOn)], ['Enrolled on', c.enrolledOn ? dateFmt(c.enrolledOn) : '—'], ['Last activity', dateFmt(c.lastActivity)]]} /></div>
        </div>
      </Card>
      <Card title="Status history" sub="Audit trail"><Timeline items={historyFor(c)} /></Card>
    </div>
  );
}

function historyFor(c: Candidate): TimelineItem[] {
  const stage = S.statusDef(c.status).stage;
  const b = S.batch(c.batchId);
  const evts: [title: string, stage: number, date: string | null][] = [
    ['Application submitted', 4, c.appliedOn],
    ['Documents submitted', 6, S.addDays(c.appliedOn, 2)],
    ['Under verification', 7, S.addDays(c.appliedOn, 4)],
    ['Eligibility verified', 8, S.addDays(c.appliedOn, 7)],
    ['Enrolled', 11, c.enrolledOn],
    ['Batch allocated', 12, c.enrolledOn],
    ['Training started', 13, b ? b.start : null],
    ['Training completed', 15, b ? b.end : null],
    ['Assessment attempted', 17, c.lastActivity],
    ['Certified', 20, c.lastActivity],
  ];
  const out: TimelineItem[] = evts.filter((e) => stage >= e[1]).map((e) => ({ title: e[0], sub: e[2] ? dateFmt(e[2]) + ' · recorded by system' : 'Recorded', state: 'done' }));
  out.push({ title: 'Current: ' + S.statusDef(c.status).l, sub: 'As on ' + dateFmt(S.config().asOf), state: c.status === 'NOT_ELIGIBLE' || c.status === 'FAILED' ? 'fail' : 'cur' });
  return out;
}

function CertificateCard({ c }: { c: Candidate }) {
  const b = S.batch(c.batchId);
  const course = S.course(c.courseId);
  function download() {
    AS.ui.toast('Demo certificate prepared — use browser print to save as PDF.', 'ok');
    window.print();
  }
  return (
    <div className="grid g-2-1">
      <div className="card">
        <div className="card-b" style={{ padding: 0 }}>
          <div style={{ border: '10px solid var(--brand-800)', borderRadius: 14, padding: 26, background: 'linear-gradient(180deg,#fff,#F7FAFD)', textAlign: 'center' }}>
            <div className="f ac jb"><div className="sb-logo">A×S</div><span className="demo-pill">DEMO CERTIFICATE</span></div>
            <div style={{ marginTop: 18, fontSize: 11, letterSpacing: '.22em', color: 'var(--muted)' }}>CERTIFICATE OF COMPLETION</div>
            <h2 style={{ fontSize: 23, marginTop: 10 }}>{c.name}</h2>
            <p className="fs13 t2" style={{ marginTop: 8 }}>
              has successfully completed the training programme<br /><b>{course?.name}</b><br />under the {S.config().projectName}
            </p>
            <div className="grid g3 mt18" style={{ textAlign: 'left' }}>
              <KvList pairs={[['Candidate ID', c.id]]} />
              <KvList pairs={[['Certificate No.', c.certificateNo]]} />
              <KvList pairs={[['Result', c.score + '/100']]} />
            </div>
            <div className="grid g3" style={{ textAlign: 'left' }}>
              <KvList pairs={[['Training period', b ? dateFmt(b.start) + ' – ' + dateFmt(b.end) : '—']]} />
              <KvList pairs={[['Centre / unit', S.centre(c.centreId)?.name ?? '—']]} />
              <KvList pairs={[['Mode', c.mode === 'ONLINE' ? 'Online' : 'Offline']]} />
            </div>
            <div className="f jb ac mt18" style={{ alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'left' }}><div style={{ width: 110, borderTop: '1px solid var(--border-strong)', paddingTop: 5 }} className="fs11 muted">Authorised signatory</div></div>
              <Html as="span" style={{ display: 'contents' }} html={qrSvg(c.certificateNo)} />
            </div>
          </div>
        </div>
        <div className="card-f">
          <button type="button" className="btn sm" onClick={download}><Icon name="download" />Download</button>
          <LinkButton to={'#/verify?no=' + encodeURIComponent(c.certificateNo ?? '')} className="btn sm" icon="qr">Verify certificate</LinkButton>
        </div>
      </div>
      <Card title="Certificate details">
        <KvList pairs={[
          ['Certificate number', c.certificateNo], ['Status', c.status === 'CERTIFIED' ? 'Issued' : 'Generated — pending issue'],
          ['Issue date', dateFmt(c.lastActivity)], ['Verification', 'QR + certificate number'], ['Verification URL', '#/verify'],
        ]} />
        <div className="mt14"><Callout tone="info" title="QR verification">The QR shown is a demo pattern. In production it encodes the public verification URL for this certificate number.</Callout></div>
      </Card>
    </div>
  );
}
