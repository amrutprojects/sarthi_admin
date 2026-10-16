import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AS from '../../legacy';
import { PageHead, FilterBar, LinkButton, EmptyState, DemoNote, Badge, GenBadge, StatusBadge, ModeTag, districtOptions, modeOptions, fmt, dateFmt, titleCase } from '../../components/ui';
import DataTable, { type Column, type SearchKey } from '../../components/ui/DataTable';
import type { Batch, Campaign, Candidate, Centre, District, Kpis, LeadSource, TalukaRollup, Trainer } from '../../types/domain';
import { useLegacyTick } from '../../utils/legacyBus';
import * as G from '../../services/governanceService';

/* One report: its rows, columns, search keys, row link and how to read a row's district (for ?district=). */
interface ReportConfig<T> {
  rows: T[];
  columns: Column<T>[];
  search: SearchKey<T>[];
  rowLink?: (row: T) => string;
  districtOf?: (row: T) => string | null;
}
/*
 * Each report has its own row type; the page renders whichever one is selected. The generic is
 * checked here and erased at the boundary so one DataTable can render any report.
 */
const defineReport = <T,>(cfg: ReportConfig<T>) => cfg as unknown as ReportConfig<unknown>;

interface DistrictReportRow { d: District; k: Kpis }
interface TalukaReportRow { d: District; t: TalukaRollup }
interface ModeReportRow { m: string; off: number; on: number }
type ScoredCandidate = Candidate & { score: number };
const isScored = (c: Candidate): c is ScoredCandidate => c.score != null;

const lnk = (t: string) => <b className="lnk">{t}</b>;
const mono = (t: string | null, link?: boolean) => <span className={(link ? 'lnk ' : '') + 'mono'}>{t}</span>;
const num = <T,>(k: string, l: string, get: (row: T) => number): Column<T> => ({ k, l, align: 'right', sortVal: get, exportVal: get, render: get });
const pct = <T,>(k: string, l: string, get: (row: T) => number): Column<T> => ({ k, l, align: 'right', sortVal: get, exportVal: (r) => get(r) + '%', render: (r) => get(r) + '%' });
const dist = <T extends { districtId: string }>(): Column<T> => ({ k: 'districtId', l: 'District', exportVal: (x) => G.districtName(x.districtId), render: (x) => G.districtName(x.districtId) });
const mode = <T extends { mode: string }>(): Column<T> => ({ k: 'mode', l: 'Mode', render: (x) => <ModeTag mode={x.mode} /> });
const centre = <T extends { centreId: string | null }>(l = 'Centre'): Column<T> => ({ k: 'centreId', l, exportVal: (x) => G.centreName(x.centreId), render: (x) => G.centreName(x.centreId) });
const byDistrictId = (x: { districtId: string | null }) => x.districtId;

/* Report definitions, same as the original buildReport() in admin.js. */
function reportConfig(id: string): ReportConfig<unknown> {
  const DB = G.db();
  if (id === 'district' || id === 'state') {
    const st = (x: DistrictReportRow) => DB.DISTRICT_STATUS[x.d.status];
    return defineReport<DistrictReportRow>({
      rows: DB.districts.map((d) => ({ d, k: DB.kpis(DB.byDistrict(d.code), d.target) })),
      search: [(x) => x.d.name], rowLink: (x) => '#/districts/' + x.d.code,
      columns: [
        { k: 'name', l: 'District', sortVal: (x) => x.d.name, exportVal: (x) => x.d.name, render: (x) => lnk(x.d.name) },
        { k: 'region', l: 'Region', sortVal: (x) => x.d.region, exportVal: (x) => x.d.region, render: (x) => x.d.region },
        num('target', 'Target', (x) => x.d.target), num('app', 'Applications', (x) => x.k.applications), num('eli', 'Eligible', (x) => x.k.eligible),
        num('enr', 'Enrolled', (x) => x.k.enrolled), num('act', 'Training active', (x) => x.k.trainingActive), num('com', 'Completed', (x) => x.k.completed),
        num('cer', 'Certified', (x) => x.k.certified),
        pct('att', 'Attendance %', (x) => x.k.attendance),
        pct('ach', 'Achievement %', (x) => x.k.achievementPct),
        { k: 'st', l: 'Status', sortVal: (x) => x.d.status, exportVal: (x) => st(x).l, render: (x) => <Badge tone={st(x).tone}>{st(x).l}</Badge> },
      ],
    });
  }
  if (id === 'taluka') {
    const all: TalukaReportRow[] = [];
    DB.districts.forEach((d) => DB.talukaRollup(d.code).forEach((t) => all.push({ d, t })));
    return defineReport<TalukaReportRow>({
      districtOf: (x) => x.d.code,
      rows: all, search: [(x) => x.t.taluka + ' ' + x.d.name],
      rowLink: (x) => '#/districts/' + x.d.code + '/talukas/' + encodeURIComponent(x.t.taluka),
      columns: [
        { k: 'dist', l: 'District', sortVal: (x) => x.d.name, exportVal: (x) => x.d.name, render: (x) => x.d.name },
        { k: 'tal', l: 'Taluka', sortVal: (x) => x.t.taluka, exportVal: (x) => x.t.taluka, render: (x) => lnk(x.t.taluka) },
        num('app', 'Applications', (x) => x.t.k.applications), num('enr', 'Enrolled', (x) => x.t.k.enrolled),
        num('act', 'Active', (x) => x.t.k.trainingActive), num('cer', 'Certified', (x) => x.t.k.certified),
      ],
    });
  }
  if (id === 'centre') {
    return defineReport<Centre>({
      districtOf: byDistrictId,
      rows: DB.allCentres, search: ['name'], rowLink: (c) => '#/centres/' + c.id,
      columns: [
        { k: 'id', l: 'Centre ID', render: (c) => mono(c.id) }, { k: 'name', l: 'Centre', render: (c) => lnk(c.name) }, dist(), mode(),
        { k: 'capacity', l: 'Capacity', align: 'right' }, { k: 'students', l: 'Students', align: 'right' }, { k: 'activeBatches', l: 'Active batches', align: 'right' },
        { k: 'attendance', l: 'Attendance %', align: 'right', exportVal: (c) => c.attendance + '%', render: (c) => c.attendance + '%' },
        { k: 'score', l: 'Score', align: 'right', exportVal: (c) => c.score + '/100', render: (c) => c.score + '/100' },
        { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
      ],
    });
  }
  if (id === 'batch') {
    return defineReport<Batch>({
      districtOf: byDistrictId,
      rows: DB.batches, search: ['id'], rowLink: (b) => '#/batches/' + b.id,
      columns: [
        { k: 'id', l: 'Batch ID', render: (b) => mono(b.id, true) }, centre(), mode(),
        { k: 'students', l: 'Students', align: 'right' }, { k: 'seats', l: 'Seats', align: 'right' },
        { k: 'start', l: 'Start', exportVal: (b) => dateFmt(b.start), render: (b) => dateFmt(b.start) },
        { k: 'end', l: 'End', exportVal: (b) => dateFmt(b.end), render: (b) => dateFmt(b.end) },
        { k: 'attendance', l: 'Attendance %', align: 'right', exportVal: (b) => b.attendance + '%', render: (b) => b.attendance + '%' },
        { k: 'progress', l: 'Progress %', align: 'right', exportVal: (b) => b.progress + '%', render: (b) => b.progress + '%' },
        { k: 'status', l: 'Status', render: (b) => <GenBadge status={b.status} /> },
      ],
    });
  }
  if (id === 'trainer') {
    return defineReport<Trainer>({
      districtOf: byDistrictId,
      rows: DB.trainers, search: ['name'], rowLink: (t) => '#/trainers/' + t.id,
      columns: [
        { k: 'id', l: 'Trainer ID', render: (t) => mono(t.id) }, { k: 'name', l: 'Name', render: (t) => lnk(t.name) },
        { k: 'qualification', l: 'Qualification' }, { k: 'experience', l: 'Experience', align: 'right' }, centre(), mode(),
        num('batches', 'Batches', (t) => t.batches.length), { k: 'students', l: 'Students', align: 'right' },
        { k: 'totStatus', l: 'ToT', exportVal: (t) => titleCase(t.totStatus), render: (t) => titleCase(t.totStatus) },
        { k: 'score', l: 'Score', align: 'right', exportVal: (t) => t.score + '/100', render: (t) => t.score + '/100' },
      ],
    });
  }
  if (id === 'marketing') {
    return defineReport<Campaign>({
      rows: DB.campaigns, search: ['name'], rowLink: (c) => '#/marketing/' + c.id,
      columns: [
        { k: 'id', l: 'ID' }, { k: 'name', l: 'Campaign', render: (c) => lnk(c.name) }, { k: 'platform', l: 'Platform' },
        { k: 'reach', l: 'Reach', align: 'right', exportVal: (c) => fmt(c.reach), render: (c) => fmt(c.reach) },
        { k: 'leads', l: 'Leads', align: 'right' }, { k: 'reg', l: 'Registrations', align: 'right' },
        { k: 'conversion', l: 'Conversion %', align: 'right', exportVal: (c) => c.conversion + '%', render: (c) => c.conversion + '%' },
        { k: 'cpl', l: 'Cost / lead', align: 'right', exportVal: (c) => '₹' + c.cpl, render: (c) => '₹' + c.cpl },
        { k: 'status', l: 'Status', render: (c) => <GenBadge status={c.status} /> },
      ],
    });
  }
  if (id === 'mobilization') {
    const ratio = (a: number, b: number) => Math.round(a / b * 1000) / 10 + '%';
    return defineReport<LeadSource>({
      rows: DB.leadSources, search: ['s'],
      columns: [
        { k: 's', l: 'Source', render: (x) => <b>{x.s}</b> },
        { k: 'leads', l: 'Leads', align: 'right', exportVal: (x) => fmt(x.leads), render: (x) => fmt(x.leads) },
        { k: 'reg', l: 'Registrations', align: 'right', exportVal: (x) => fmt(x.reg), render: (x) => fmt(x.reg) },
        { k: 'enr', l: 'Enrolled', align: 'right', exportVal: (x) => fmt(x.enr), render: (x) => fmt(x.enr) },
        { k: 'c1', l: 'Lead → registration', align: 'right', sortVal: (x) => x.reg / x.leads, exportVal: (x) => ratio(x.reg, x.leads), render: (x) => ratio(x.reg, x.leads) },
        { k: 'c2', l: 'Lead → enrollment', align: 'right', sortVal: (x) => x.enr / x.leads, exportVal: (x) => ratio(x.enr, x.leads), render: (x) => ratio(x.enr, x.leads) },
      ],
    });
  }
  if (id === 'mode') {
    const off = DB.kpis(DB.candidates.filter((c) => c.mode === 'OFFLINE'), 800);
    const on = DB.kpis(DB.candidates.filter((c) => c.mode === 'ONLINE'), 200);
    const metrics: [string, keyof Kpis][] = [['Target (indicative)', 'target'], ['Enrolled', 'enrolled'], ['Training active', 'trainingActive'], ['Completed', 'completed'],
      ['Assessed', 'assessed'], ['Certified', 'certified'], ['Attendance %', 'attendance'], ['Completion %', 'completionPct'],
      ['Certification %', 'certificationPct'], ['Pass rate %', 'passRate']];
    return defineReport<ModeReportRow>({
      rows: metrics.map(([m, k]) => ({ m, off: off[k], on: on[k] })), search: ['m'],
      columns: [
        { k: 'm', l: 'Metric', render: (x) => <b>{x.m}</b> },
        { k: 'off', l: 'Offline', align: 'right', exportVal: (x) => fmt(x.off), render: (x) => fmt(x.off) },
        { k: 'on', l: 'Online', align: 'right', exportVal: (x) => fmt(x.on), render: (x) => fmt(x.on) },
        { k: 'tot', l: 'Total', align: 'right', sortVal: (x) => x.off + x.on, exportVal: (x) => fmt(x.off + x.on), render: (x) => fmt(x.off + x.on) },
      ],
    });
  }
  if (id === 'attendance') {
    return defineReport<Candidate>({
      districtOf: byDistrictId,
      rows: DB.candidates.filter((c) => c.attendance > 0), search: ['id', 'name'], rowLink: (x) => '#/candidates/' + x.id,
      columns: [
        { k: 'id', l: 'Candidate ID', render: (x) => mono(x.id, true) }, { k: 'name', l: 'Name' }, dist(), centre(),
        { k: 'batchId', l: 'Batch' }, mode(),
        { k: 'attendance', l: 'Attendance %', align: 'right', exportVal: (x) => x.attendance + '%', render: (x) => x.attendance + '%' },
        { k: 'flag', l: 'Meets minimum', sortVal: (x) => (x.attendance >= 75 ? 1 : 0), exportVal: (x) => (x.attendance >= 75 ? 'Yes' : 'No'), render: (x) => (x.attendance >= 75 ? <Badge tone="green">Yes</Badge> : <Badge tone="red">No</Badge>) },
      ],
    });
  }
  if (id === 'assessment') {
    return defineReport<ScoredCandidate>({
      districtOf: byDistrictId,
      rows: DB.candidates.filter(isScored), search: ['id', 'name'], rowLink: (x) => '#/candidates/' + x.id + '?tab=assessments',
      columns: [
        { k: 'id', l: 'Candidate ID', render: (x) => mono(x.id, true) }, { k: 'name', l: 'Name' }, dist(), { k: 'batchId', l: 'Batch' }, mode(),
        { k: 'th', l: 'Theory /60', align: 'right', sortVal: (x) => x.score, exportVal: (x) => Math.round(x.score * 0.6), render: (x) => Math.round(x.score * 0.6) },
        { k: 'pr', l: 'Practical /40', align: 'right', sortVal: (x) => x.score, exportVal: (x) => Math.round(x.score * 0.4), render: (x) => Math.round(x.score * 0.4) },
        { k: 'score', l: 'Total', align: 'right' },
        { k: 'res', l: 'Result', sortVal: (x) => (x.score >= 50 ? 1 : 0), exportVal: (x) => (x.score >= 50 ? 'Passed' : 'Failed'), render: (x) => (x.score >= 50 ? <Badge tone="green">Passed</Badge> : <Badge tone="red">Failed</Badge>) },
      ],
    });
  }
  if (id === 'certification') {
    return defineReport<Candidate>({
      districtOf: byDistrictId,
      rows: DB.candidates.filter((c) => c.certificateNo), search: ['certificateNo', 'name'], rowLink: (x) => '#/candidates/' + x.id + '?tab=certificate',
      columns: [
        { k: 'certificateNo', l: 'Certificate no.', render: (x) => mono(x.certificateNo, true) }, { k: 'id', l: 'Candidate ID', render: (x) => mono(x.id) },
        { k: 'name', l: 'Name' }, dist(), mode(), { k: 'score', l: 'Result', align: 'right' },
        { k: 'status', l: 'State', exportVal: (x) => (x.status === 'CERTIFIED' ? 'Issued' : 'Generated'), render: (x) => (x.status === 'CERTIFIED' ? <Badge tone="green">Issued</Badge> : <Badge tone="blue">Generated</Badge>) },
      ],
    });
  }
  if (id === 'completion') {
    return defineReport<Batch>({
      districtOf: byDistrictId,
      rows: DB.batches, search: ['id'], rowLink: (b) => '#/batches/' + b.id,
      columns: [
        { k: 'id', l: 'Batch', render: (b) => mono(b.id, true) }, centre(), mode(), { k: 'students', l: 'Enrolled', align: 'right' },
        num('comp', 'Completed', (b) => b._k.completed),
        { ...num('pct', 'Completion %', (b) => b._k.completionPct), exportVal: (b) => b._k.completionPct + '%', render: (b) => b._k.completionPct + '%' },
        num('cert', 'Certified', (b) => b._k.certified), { k: 'status', l: 'Status', render: (b) => <GenBadge status={b.status} /> },
      ],
    });
  }
  return defineReport<Candidate>({
    districtOf: byDistrictId,
    rows: DB.candidates, search: ['id', 'name'], rowLink: (x) => '#/candidates/' + x.id,
    columns: [
      { k: 'id', l: 'Candidate ID', render: (x) => mono(x.id, true) }, { k: 'name', l: 'Name' }, { k: 'gender', l: 'Gender' }, { k: 'age', l: 'Age', align: 'right' },
      dist(), { k: 'taluka', l: 'Taluka' }, mode(), centre(), { k: 'batchId', l: 'Batch' },
      { k: 'status', l: 'Status', exportVal: (x) => DB.STATUS_MAP[x.status].l, render: (x) => <StatusBadge status={x.status} /> },
      { k: 'attendance', l: 'Attendance %', align: 'right' }, { k: 'progress', l: 'Progress %', align: 'right' },
      { k: 'score', l: 'Assessment', align: 'right', exportVal: (x) => (x.score == null ? '—' : x.score), render: (x) => (x.score == null ? '—' : x.score) },
      { k: 'certificateNo', l: 'Certificate', exportVal: (x) => x.certificateNo || '—', render: (x) => x.certificateNo || '—' },
    ],
  });
}

export default function ReportDetailPage() {
  useLegacyTick();
  const { id = '' } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const q = new URLSearchParams(search);
  const cfgDates = G.db().config;
  const [f, setF] = useState(() => ({ district: q.get('district') || 'ALL', mode: 'ALL', from: cfgDates.projectStart, to: cfgDates.asOf }));
  useEffect(() => { document.title = 'Report — AMRUT × SUMAGO Admin'; }, []);

  const def = G.REPORTS.find((x) => x[0] === id);
  if (!def) return <div className="page"><EmptyState title="Report not found" msg=""><LinkButton to="#/reports" className="btn primary">All reports</LinkButton></EmptyState></div>;

  const cfg = reportConfig(def[0]);
  const district = q.get('district');
  const districtOf = cfg.districtOf;
  const rows = district && district !== 'ALL' && districtOf ? cfg.rows.filter((x) => districtOf(x) === district) : cfg.rows;

  function apply() {
    AS.ui.toast('Filters applied to report.', 'ok');
    navigate('/reports/' + id + (f.district !== 'ALL' ? '?district=' + f.district : ''));
  }

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Reports & MIS', link: '#/reports' }, { l: def[1] }]}
        title={def[1]}
        sub={def[2] + ' · generated ' + new Date().toLocaleString('en-IN')}
        actions={<LinkButton to="#/reports" icon="chevL">All reports</LinkButton>}
      />
      <FilterBar
        fields={[
          { k: 'district', l: 'District', options: districtOptions() },
          { k: 'mode', l: 'Training mode', options: modeOptions() },
          { k: 'from', l: 'From', type: 'date' },
          { k: 'to', l: 'To', type: 'date' },
        ]}
        value={f}
        onChange={(k, v) => setF((x) => ({ ...x, [k]: v }))}
        onReset={() => setF({ district: 'ALL', mode: 'ALL', from: cfgDates.projectStart, to: cfgDates.asOf })}
        extra={<button type="button" className="btn primary" onClick={apply}>Apply filters</button>}
      />
      <div className="card">
        <div className="card-h"><h3>{def[1]}</h3><span className="sub">use the export buttons for Excel / CSV / PDF</span></div>
        <DataTable key={id + (district || '')} rows={rows} columns={cfg.columns} pageSize={15} exportName={def[1]} search={cfg.search} rowLink={cfg.rowLink} />
      </div>
      <DemoNote />
    </div>
  );
}
