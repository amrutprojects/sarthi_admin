import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  PageHead, Kpi, FilterBar, LinkButton, DemoNote, Badge, StatusBadge, ModeTag, ProgRow, AttendanceCell, Dash,
  districtOptions, modeOptions, fmt, dateFmt,
} from '../../components/ui';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Icon from '../../components/Icon';
import { useLegacyTick } from '../../utils/legacyBus';
import * as S from '../../services/candidateService';
import type { CandidateFilter } from '../../services/candidateService';
import usePersistentState from '../../hooks/usePersistentState';
import { NewCandidateModal } from './CandidateDialogs';
import type { Candidate } from '../../types/domain';
import { Can } from '../../auth/Can';

const QUERY_KEYS = ['district', 'mode', 'centre', 'batch', 'status', 'bucket', 'taluka'];

export const candidateColumns = (): Column<Candidate>[] => [
  { k: 'id', l: 'Candidate ID', render: (r) => <span className="lnk mono">{r.id}</span> },
  { k: 'name', l: 'Name', render: (r) => <b>{r.name}</b> },
  { k: 'districtId', l: 'District', sortVal: (r) => S.districtName(r.districtId), render: (r) => S.districtName(r.districtId) },
  { k: 'taluka', l: 'Taluka' },
  { k: 'mode', l: 'Mode', render: (r) => <ModeTag mode={r.mode} /> },
  { k: 'centreId', l: 'Centre', sortVal: (r) => S.centre(r.centreId)?.name ?? '', render: (r) => S.centre(r.centreId)?.name ?? <Dash /> },
  { k: 'batchId', l: 'Batch', render: (r) => (r.batchId ? <span className="mono">{r.batchId}</span> : <Dash />) },
  { k: 'status', l: 'Status', exportVal: (r) => S.statusDef(r.status).l, render: (r) => <StatusBadge status={r.status} /> },
  {
    k: 'eligibility', l: 'Eligibility', sortVal: (r) => (r.status === 'NOT_ELIGIBLE' ? 0 : 1),
    exportVal: (r) => (r.status === 'NOT_ELIGIBLE' ? 'Not eligible' : 'Eligible'),
    render: (r) => (r.status === 'NOT_ELIGIBLE' ? <Badge tone="red">Not eligible</Badge> : <Badge tone="green">Eligible</Badge>),
  },
  { k: 'attendance', l: 'Attendance', align: 'right', render: (r) => <AttendanceCell value={r.attendance} />, exportVal: (r) => r.attendance + '%' },
  { k: 'progress', l: 'Progress', align: 'right', render: (r) => (r.progress ? <ProgRow pct={r.progress} /> : <Dash />), exportVal: (r) => r.progress + '%' },
  { k: 'score', l: 'Assessment', align: 'right', render: (r) => (r.score == null ? <Dash /> : <b style={{ color: r.score >= 50 ? 'var(--green)' : 'var(--red)' }}>{r.score}</b>) },
  { k: 'certificateNo', l: 'Certificate', render: (r) => (r.certificateNo ? <span className="mono">{r.certificateNo}</span> : <Dash />) },
  { k: 'lastActivity', l: 'Last activity', exportVal: (r) => dateFmt(r.lastActivity), render: (r) => dateFmt(r.lastActivity) },
  {
    k: 'risks', l: 'Risk', sortVal: (r) => r.risks.length, exportVal: (r) => r.risks.map((x) => x.l).join('; '),
    render: (r) => (r.risks.length ? <Badge tone={r.risks[0].tone}>{r.risks.length} risk</Badge> : <Dash />),
  },
];

/* Filter state persists across navigation (AS.state.cand); URL query params override it. */
function useCandFilter() {
  const { search } = useLocation();
  const [f, setF] = usePersistentState<CandidateFilter>('cand', S.DEFAULT_CAND_FILTER);
  useEffect(() => {
    const q = new URLSearchParams(search);
    const fromUrl: Record<string, string> = {};
    QUERY_KEYS.forEach((k) => { const v = q.get(k); if (v) fromUrl[k] = v; });
    if (Object.keys(fromUrl).length) setF((s) => ({ ...s, ...fromUrl }));
  }, [search, setF]);
  return [f, setF] as const;
}

export default function CandidatesPage() {
  useLegacyTick();
  const [f, setF] = useCandFilter();
  const [adding, setAdding] = useState(false);
  useEffect(() => { document.title = 'Candidates — AMRUT × SUMAGO Admin'; }, []);

  const rows = S.filterCandidates(f);
  const k = S.candidateKpis(rows, f);
  const kpis = [
    { label: 'Applications', value: k.applications, tone: 'b', link: '#/candidates?bucket=applications' },
    { label: 'Eligible', value: k.eligible, tone: 'b', link: '#/candidates?bucket=eligible' },
    { label: 'Enrolled', value: k.enrolled, tone: 'g', link: '#/candidates?bucket=enrolled' },
    { label: 'Training active', value: k.trainingActive, tone: 's', link: '#/candidates?bucket=active' },
    { label: 'Completed', value: k.completed, tone: 'g', link: '#/candidates?bucket=completed' },
    { label: 'Certified', value: k.certified, tone: 'v', link: '#/candidates?bucket=certified' },
  ];

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Candidates' }]}
        title="Candidate Master"
        badge={<span className="tag">{fmt(rows.length)} records</span>}
        sub="Complete candidate database with full lifecycle traceability from application to certification."
        actions={<>
          <LinkButton to="#/lifecycle">Lifecycle funnel</LinkButton>
          <LinkButton to="#/at-risk">At-risk students</LinkButton>
          <Can action="createCandidate"><button type="button" className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" />Add candidate</button></Can>
        </>}
      />
      <div className="grid g6 mb14">{kpis.map((x) => <Kpi key={x.label} {...x} />)}</div>

      <div className="pills mb14">
        {Object.keys(S.BUCKETS).filter((b) => b !== 'ALL').map((b) => (
          <button type="button" key={b} className={'chip' + (f.bucket === b ? ' on' : '')} onClick={() => setF((s) => ({ ...s, bucket: s.bucket === b ? 'ALL' : b }))}>
            {S.BUCKETS[b].l}
          </button>
        ))}
      </div>

      <FilterBar
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'taluka', l: 'Taluka', options: S.talukaOptions(f.district) },
          { k: 'mode', l: 'Training mode', options: modeOptions() },
          { k: 'centre', l: 'Training centre', options: S.centreOptions() },
          { k: 'batch', l: 'Batch', options: S.batchOptions() },
          { k: 'status', l: 'Status', options: S.statusOptions() },
          { k: 'gender', l: 'Gender', options: [{ v: 'ALL', l: 'All' }, { v: 'Male', l: 'Male' }, { v: 'Female', l: 'Female' }] },
        ]}
        value={f}
        onChange={(key, v) => setF((s) => ({ ...s, [key]: v, ...(key === 'district' ? { taluka: 'ALL' } : {}) }))}
        onReset={() => setF(S.DEFAULT_CAND_FILTER)}
      />

      <div className="card">
        <DataTable
          key={JSON.stringify(f)}
          rows={rows} columns={candidateColumns()} pageSize={12} exportName="Candidate_Master"
          search={['id', 'name', 'phone', 'taluka']} searchLabel="name, ID or mobile"
          rowLink={(r) => '#/candidates/' + r.id}
          emptyMsg="No candidates match the selected filters."
        />
      </div>
      <DemoNote />
      {adding && <NewCandidateModal onClose={() => setAdding(false)} />}
    </div>
  );
}
