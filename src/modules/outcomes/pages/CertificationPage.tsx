import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AS from '../../../legacy';
import { PageHead, Card, Kpi, FilterBar, LinkButton, DemoNote, Badge, ModeTag, Timeline, districtOptions, modeOptions, useGo } from '../../../components/ui';
import { HBar, Donut } from '../../../components/charts';
import { Modal } from '../../../components/ui/Overlay';
import DataTable, { type Column } from '../../../components/tables/DataTable';
import Icon from '../../../components/ui/Icon';
import { useLegacyTick, bump } from '../../../utils/legacyBus';
import usePersistentState from '../../../hooks/usePersistentState';
import * as S from '../../../services/mock/outcomeService';
import type { Candidate } from '../../../types/domain';
import { Can } from '../../auth';

const QUERY_KEYS: string[] = ['district', 'centre', 'mode', 'state'];

export default function CertificationPage() {
  useLegacyTick();
  const go = useGo();
  const { search } = useLocation();
  const [f, setF] = usePersistentState('cert', S.DEFAULT_CERT);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { document.title = 'Certification — AMRUT × SUMAGO Admin'; }, []);
  useEffect(() => {
    const q = new URLSearchParams(search);
    const next: Record<string, string> = {};
    QUERY_KEYS.forEach((k) => { const v = q.get(k); if (v) next[k] = v; });
    if (Object.keys(next).length) setF((x) => ({ ...x, ...next }));
  }, [search, setF]);

  const all = S.candidates();
  const passed = all.filter(S.isPassed);
  const rows = S.certRows(f);
  const generated = passed.filter((c) => c.status === 'CERTIFICATE_GENERATED');
  const issued = passed.filter((c) => c.status === 'CERTIFIED');
  const eligible = all.filter((c) => c.status === 'ASSESSMENT_ATTEMPTED' || c.status === 'PASSED');

  const columns: Column<Candidate>[] = [
    { k: 'certificateNo', l: 'Certificate no.', render: (x) => <span className="lnk mono">{x.certificateNo}</span> },
    { k: 'id', l: 'Candidate ID', render: (x) => <span className="mono">{x.id}</span> },
    { k: 'name', l: 'Name', render: (x) => <b>{x.name}</b> },
    { k: 'courseId', l: 'Course', sortVal: (x) => x.courseId, exportVal: (x) => S.courseName(x.courseId), render: (x) => S.courseName(x.courseId) },
    { k: 'centreId', l: 'Centre / unit', exportVal: (x) => S.centreName(x.centreId), render: (x) => S.centreName(x.centreId) },
    { k: 'districtId', l: 'District', exportVal: (x) => S.districtName(x.districtId), render: (x) => S.districtName(x.districtId) },
    { k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> },
    { k: 'score', l: 'Result', align: 'right', exportVal: (x) => x.score + '/100', render: (x) => <b style={{ color: 'var(--green)' }}>{x.score}/100</b> },
    { k: 'status', l: 'State', exportVal: (x) => (x.status === 'CERTIFIED' ? 'Issued' : 'Generated'), render: (x) => (x.status === 'CERTIFIED' ? <Badge tone="green">Issued</Badge> : <Badge tone="blue">Generated</Badge>) },
    { k: 'act', l: '', sortable: false, exportVal: () => '', render: (x) => <button type="button" className="btn xs" onClick={(e) => { e.stopPropagation(); go('#/verify?no=' + encodeURIComponent(x.certificateNo ?? '')); }}>Verify</button> },
  ];

  function issue() {
    const n = S.issueGenerated();
    setConfirming(false);
    AS.ui.toast(n + ' certificates issued (session only).', 'ok');
    bump();
  }

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Certification' }]}
        title="Certification"
        sub="Certificate generation, issuance and QR verification for candidates who have cleared the assessment."
        actions={<>
          <LinkButton to="#/verify" icon="qr">Verify a certificate</LinkButton>
          <Can action="issueCertificates"><button type="button" className="btn primary" onClick={() => setConfirming(true)}><Icon name="award" />Generate pending ({generated.length})</button></Can>
        </>}
      />
      <div className="grid g5 mb14">
        <Kpi label="Eligible for certificate" value={passed.length} tone="b" />
        <Kpi label="Certificate generated" value={generated.length} tone="a" link="#/certification?state=generated" />
        <Kpi label="Certificate issued" value={issued.length} tone="g" link="#/certification?state=issued" />
        <Kpi label="Pending generation" value={eligible.length} tone="a" />
        <Kpi label="Verified (public lookups)" value={412} tone="v" link="#/verify" />
      </div>
      <FilterBar
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'centre', l: 'Centre', options: AS.ui.centreOptions() },
          { k: 'mode', l: 'Mode', options: modeOptions() },
          { k: 'state', l: 'Certificate state', options: [{ v: 'ALL', l: 'All' }, { v: 'generated', l: 'Generated (not issued)' }, { v: 'issued', l: 'Issued' }] },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF(S.DEFAULT_CERT)}
      />
      <div className="grid g3 mb14">
        <Card title="Certificates by district"><HBar items={S.certByDistrict()} /></Card>
        <Card title="Certificates by mode">
          <Donut
            items={[
              { l: 'Offline', v: passed.filter((c) => c.mode === 'OFFLINE').length, c: '#8A4116' },
              { l: 'Online', v: passed.filter((c) => c.mode === 'ONLINE').length, c: '#1E7A46' },
            ]}
            opts={{ centerValue: passed.length, centerLabel: 'Certificates', size: 168 }}
          />
        </Card>
        <Card title="Certificate lifecycle">
          <Timeline items={[
            { title: 'Assessment cleared', sub: passed.length + ' candidates', state: 'done' },
            { title: 'Certificate generated', sub: passed.length + ' generated', state: 'done' },
            { title: 'Certificate issued', sub: issued.length + ' issued', state: 'cur' },
            { title: 'QR registered for public verification', sub: 'Automatic on issue', state: 'cur' },
            { title: 'Archived', sub: 'At programme closure', state: '' },
          ]} />
        </Card>
      </div>
      <div className="card">
        <div className="card-h"><h3>Certificate register</h3></div>
        <DataTable key={JSON.stringify(f)} rows={rows} columns={columns} pageSize={12} exportName="Certificate_Register" search={['id', 'name', 'certificateNo']} rowLink={(x) => '#/candidates/' + x.id + '?tab=certificate'} />
      </div>
      <DemoNote />
      {confirming && (
        <Modal title="Issue certificates" onClose={() => setConfirming(false)} footer={<>
          <button type="button" className="btn" onClick={() => setConfirming(false)}>Cancel</button>
          <button type="button" className="btn primary" onClick={issue}>Issue certificates</button>
        </>}>
          <p style={{ margin: 0 }}>Issue <b>{generated.length}</b> generated certificates? Each will be registered for public QR verification.</p>
        </Modal>
      )}
    </div>
  );
}
