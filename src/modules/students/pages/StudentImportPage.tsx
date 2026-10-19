import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Callout, Kpi, PageHead } from '../../../components/ui';
import { Drawer } from '../../../components/ui/Overlay';
import Icon from '../../../components/ui/Icon';
import { Can } from '../../auth';
import { ApiError, type PageMeta } from '../../../services/api-client';
import { importApi, studentApi, type ImportBatch, type ImportReference, type StudentDetail, type StudentView } from '../services/importApi';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { BATCH_STATUS_LABEL, ServerTable, StatusBadge, fmtDate } from '../components/importUi';

type Tab = 'batches' | 'students' | 'guide';

/*
 * Student Data Import Facility (spec A-11..A-18): approved-student files are uploaded as import batches,
 * validated row by row, reviewed, and finalised by a second person into the student register.
 */
export default function StudentImportPage() {
  const [tab, setTab] = useState<Tab>('batches');
  const [ref, setRef] = useState<ImportReference | null>(null);
  useEffect(() => { document.title = 'Student import — AMRUT × SUMAGO Admin'; importApi.reference().then(setRef).catch(() => undefined); }, []);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Student import' }]}
        title="Student Data Import"
        badge={<Badge tone="green">Live</Badge>}
        sub="Upload the approved-student file (CSV or XLSX). Every row is validated, duplicates are flagged, and a second person finalises the batch into the student register."
        actions={<button type="button" className="btn" onClick={() => importApi.template().catch(toastError)}><Icon name="download" />Download template</button>}
      />
      <div className="tabs">
        {([['batches', 'Import batches'], ['students', 'Student register'], ['guide', 'Fields & rules']] as [Tab, string][]).map(([k, l]) => (
          <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'batches' ? <BatchesTab reference={ref} /> : null}
      {tab === 'students' ? <StudentsTab reference={ref} /> : null}
      {tab === 'guide' ? <GuideTab reference={ref} /> : null}
    </div>
  );
}

function UploadCard({ reference, onUploaded }: { reference: ImportReference | null; onUploaded: (b: ImportBatch) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceRef, setSourceRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const maxMb = reference?.maxFileMb ?? 20;

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) { toastError(new ApiError('Choose a .csv or .xlsx file', 400, 'BAD_FILE')); return; }
    if (f.size > maxMb * 1024 * 1024) { toastError(new ApiError(`The file is larger than ${maxMb} MB`, 400, 'TOO_LARGE')); return; }
    setFile(f);
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); };

  async function submit() {
    if (!file) return;
    setBusy(true);
    try {
      const res = await importApi.upload(file, sourceRef.trim() || undefined);
      if (res.data.status === 'IMPORT_FAILED') toastError(new ApiError(res.message, 422, 'IMPORT_FAILED'));
      else toastOk(res.message);
      setFile(null); setSourceRef('');
      if (input.current) input.current.value = '';
      onUploaded(res.data);
    } catch (e) { toastError(e); } finally { setBusy(false); }
  }

  return (
    <div className="card mb14">
      <div className="card-h"><h3>Upload approved-student file</h3></div>
      <div className="card-b">
        <div
          className="import-drop" data-drag={drag || undefined}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          onClick={() => input.current?.click()} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
        >
          <Icon name="download" />
          {file ? <div><b>{file.name}</b> <span className="muted">· {(file.size / 1024).toFixed(0)} KB</span></div>
            : <div><b>Drop a CSV or XLSX file here</b>, or click to choose</div>}
          <div className="fs11 muted">UTF-8 CSV or Excel · up to {maxMb} MB · up to {(reference?.maxRows ?? 50000).toLocaleString('en-IN')} rows · first sheet, first row is the header</div>
          <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <div className="f gp10 wrap mt10" style={{ alignItems: 'flex-end' }}>
          <div className="fld" style={{ flex: '1 1 240px' }}>
            <label htmlFor="src-ref">Source reference <span className="muted">(transmittal or API batch reference, optional)</span></label>
            <input id="src-ref" className="inp" value={sourceRef} maxLength={120} onChange={(e) => setSourceRef(e.target.value)} placeholder="e.g. MahaAmrut transmittal 2026-10-19" />
          </div>
          <button type="button" className="btn primary" disabled={!file || busy} onClick={() => void submit()}>{busy ? 'Uploading & validating…' : 'Upload and validate'}</button>
        </div>
        <div className="hint mt10">Uploading creates an import batch only; no student is created until a second person reviews and finalises it. The same file cannot be uploaded twice.</div>
      </div>
    </div>
  );
}

function BatchesTab({ reference }: { reference: ImportReference | null }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ImportBatch[]>([]);
  const [meta, setMeta] = useState<PageMeta>();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await importApi.list({ page, limit: 25, status: status || undefined, search: search || undefined }); setRows(r.items); setMeta(r.meta); }
    catch (e) { toastError(e); } finally { setLoading(false); }
  }, [page, status, search]);
  useEffect(() => { void load(); }, [load]);

  const c = (k: keyof ImportBatch['counts'], b: ImportBatch) => (b.counts?.[k] ?? 0).toLocaleString('en-IN');
  return (
    <>
      <Can action="createImport"><UploadCard reference={reference} onUploaded={(b) => navigate('/student-import/' + b.id)} /></Can>
      <div className="card">
        <div className="card-h">
          <h3>Import batches</h3>
          <div className="f gp8 wrap">
            <input className="inp sm" placeholder="Search code, file, reference" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 220 }} />
            <select className="inp sm" style={{ width: 'auto' }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {Object.entries(BATCH_STATUS_LABEL).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>
        <ServerTable
          rows={rows} meta={meta} page={page} onPage={setPage} loading={loading}
          empty="No import batches yet. Upload the approved-student file above."
          onRowClick={(b) => navigate('/student-import/' + b.id)}
          columns={[
            { k: 'code', l: 'Batch', render: (b) => <div><b className="mono">{b.code}</b><div className="fs11 muted">{b.fileName}</div></div> },
            { k: 'status', l: 'Status', render: (b) => <StatusBadge map={BATCH_STATUS_LABEL} status={b.status} /> },
            { k: 'total', l: 'Rows', render: (b) => c('total', b) },
            { k: 'valid', l: 'Valid', render: (b) => c('valid', b) },
            { k: 'review', l: 'Needs review', render: (b) => ((b.counts?.exceptions ?? 0) + (b.counts?.duplicates ?? 0)).toLocaleString('en-IN') },
            { k: 'done', l: 'Imported', render: (b) => (b.status === 'FINALISED' ? `${b.counts.created ?? 0} new · ${b.counts.linked ?? 0} linked` : '—') },
            { k: 'at', l: 'Received', render: (b) => fmtDate(b.createdAt) },
          ]}
        />
      </div>
    </>
  );
}

function StudentsTab({ reference }: { reference: ImportReference | null }) {
  const [rows, setRows] = useState<StudentView[]>([]);
  const [meta, setMeta] = useState<PageMeta>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [centre, setCentre] = useState('');
  const [track, setTrack] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<StudentDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await studentApi.list({ page, limit: 25, search: search || undefined, centre: centre || undefined, track: track || undefined }); setRows(r.items); setMeta(r.meta); }
    catch (e) { toastError(e); } finally { setLoading(false); }
  }, [page, search, centre, track]);
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <div className="grid g4 mb14">
        <Kpi label="Students in register" value={(meta?.total ?? 0).toLocaleString('en-IN')} tone="b" />
        <Kpi label="Source" value="Approved import" tone="g" sub="No manual entry" />
      </div>
      <div className="card">
        <div className="card-h">
          <h3>Student register <span className="sub">protected values are masked</span></h3>
          <div className="f gp8 wrap">
            <input className="inp sm" placeholder="Name, code, source ID, email, mobile last 4" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 250 }} />
            <select className="inp sm" style={{ width: 'auto' }} value={centre} onChange={(e) => { setCentre(e.target.value); setPage(1); }}>
              <option value="">All centres</option>
              {reference?.centres.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <select className="inp sm" style={{ width: 'auto' }} value={track} onChange={(e) => { setTrack(e.target.value); setPage(1); }}>
              <option value="">All tracks</option>
              <option value="TBC">Track to be confirmed</option>
              {reference?.tracks.map((t) => <option key={t.code} value={t.code}>{t.code} · {t.name}</option>)}
            </select>
          </div>
        </div>
        <ServerTable
          rows={rows} meta={meta} page={page} onPage={setPage} loading={loading}
          empty="No students yet. Students appear here when an import batch is finalised."
          onRowClick={(s) => studentApi.get(s.id).then(setOpen).catch(toastError)}
          columns={[
            { k: 'code', l: 'Student', render: (s) => <div><b>{s.name}</b><div className="fs11 muted mono">{s.code} · {s.sourceRecordId ?? '—'}</div></div> },
            { k: 'centre', l: 'Course centre', render: (s) => s.centreName ?? '—' },
            { k: 'track', l: 'Track', render: (s) => (s.trackToBeConfirmed ? <Badge tone="amber">To be confirmed</Badge> : <span>{s.trackCode} · {s.trackName}</span>) },
            { k: 'mobile', l: 'Mobile', className: 'mono', render: (s) => s.mobile ?? '—' },
            { k: 'aadhaar', l: 'Aadhaar', className: 'mono', render: (s) => s.aadhaar ?? '—' },
            { k: 'status', l: 'Status', render: (s) => <Badge tone="blue">{s.status === 'RECEIVED' ? 'Received' : s.status}</Badge> },
            { k: 'at', l: 'Approved', render: (s) => fmtDate(s.approvedAt) },
          ]}
        />
      </div>
      {open ? <StudentDrawer s={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function StudentDrawer({ s, onClose }: { s: StudentDetail; onClose: () => void }) {
  const field = (l: string, v: React.ReactNode) => <div className="kv"><span>{l}</span><b>{v ?? '—'}</b></div>;
  return (
    <Drawer title={s.name} onClose={onClose}>
      <div className="mono fs12 muted mb10">{s.code} · source {s.sourceRecordId ?? '—'}</div>
      <h4 className="mb6">Personal</h4>
      <div className="kv-grid">
        {field('First name', s.firstName)}{field('Last name', s.lastName)}
        {field('Father name', s.fatherName)}{field('Mother name', s.motherName)}
        {field('Date of birth', s.dateOfBirth)}{field('Religion', s.religion)}{field('Caste', s.caste)}
        {field('Education', s.educationQualification)}
      </div>
      <h4 className="mb6 mt14">Contact & identity <span className="muted fs11">(masked)</span></h4>
      <div className="kv-grid">{field('Mobile', s.mobile)}{field('Email', s.email)}{field('Aadhaar', s.aadhaar)}</div>
      <h4 className="mb6 mt14">Programme</h4>
      <div className="kv-grid">
        {field('Course centre', s.centreName)}
        {field('Track', s.trackToBeConfirmed ? `To be confirmed (source: ${s.trackSourceValue})` : `${s.trackCode} · ${s.trackName}`)}
      </div>
      <h4 className="mb6 mt14">Source and evidence</h4>
      <div className="kv-grid">
        {field('External status', s.externalStatus)}{field('Approved at', fmtDate(s.approvedAt))}
        {field('Evidence reference', s.evidenceRef)}{field('Declaration', s.declarationAccepted === null ? 'Not supplied' : s.declarationAccepted ? 'Accepted' : 'Not accepted')}
      </div>
      <h4 className="mb6 mt14">Documents <span className="muted fs11">(metadata from the source)</span></h4>
      <div className="list">
        {s.documents.map((d) => (
          <div key={d.key} className="list-row norow">
            <div className="lr-main"><b>{d.label}</b><span>{d.required ? 'Required' : 'Optional'}{d.barcode ? ` · barcode ${d.barcode}` : ''}</span></div>
            {d.supplied ? <Badge tone="green">Supplied</Badge> : <Badge tone={d.required ? 'amber' : 'grey'}>Not supplied</Badge>}
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function GuideTab({ reference }: { reference: ImportReference | null }) {
  if (!reference) return <div className="skel" style={{ height: 120 }} />;
  return (
    <>
      <Callout tone="info" title="How the import works">
        {' '}1 Upload the approved-student file → 2 every row is validated and checked for duplicates → 3 the operator resolves exceptions (accept with reason, or reject) and the reviewer decides possible duplicates → 4 a second person types the batch code to finalise. Only then are students written to the register, in one transaction.
      </Callout>
      <div className="grid g-2-1 mt14">
        <div className="card">
          <div className="card-h"><h3>Columns <span className="sub">header names; the external form's labels are accepted too</span></h3></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Column</th><th>Meaning</th><th>Required</th></tr></thead>
              <tbody>{reference.columns.map((c) => <tr key={c.field}><td className="mono fs12">{c.field}</td><td>{c.label}</td><td>{c.required ? <Badge tone="saffron">Required</Badge> : <span className="muted">Optional</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="card mb14">
            <div className="card-h"><h3>Key rules</h3></div>
            <div className="card-b fs13">
              <ul className="rules">
                <li><b>Aadhaar</b>: 12 digits with a valid checksum. Encrypted at rest; only the last 4 digits are ever shown.</li>
                <li><b>Mobile</b>: Indian 10-digit number starting 6–9; +91, 91 or a leading 0 is removed.</li>
                <li><b>Date of birth</b>: YYYY-MM-DD (Excel dates are read automatically). Other formats are not guessed.</li>
                <li><b>Religion and caste</b>: must equal a supplied source option exactly.</li>
                <li><b>Approval</b>: approval_status must be APPROVED with a past approved_at; never waivable.</li>
                <li><b>Documents</b>: Yes/No presence flags; a missing required document can be accepted with a reason.</li>
                <li><b>Duplicates</b>: same source ID, same Aadhaar, or same name + date of birth + contact need a reviewer's decision.</li>
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h3>Technology tracks</h3></div>
            <div className="card-b flush"><div className="list">
              {reference.tracks.map((t) => <div key={t.code} className="list-row norow"><div className="lr-main"><b>{t.code} · {t.name}</b><span>{t.aliases.filter((a) => a !== t.name).join(', ') || 'exact name'}</span></div></div>)}
            </div></div>
          </div>
        </div>
      </div>
    </>
  );
}
