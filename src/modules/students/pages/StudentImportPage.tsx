import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Callout, Kpi, PageHead } from '../../../components/ui';
import { Drawer } from '../../../components/ui/Overlay';
import Icon from '../../../components/ui/Icon';
import { Can, useAuth } from '../../auth';
import { ApiError, type PageMeta } from '../../../services/api-client';
import { importApi, studentApi, type ImportBatch, type ImportReference, type StudentDetail, type StudentView } from '../services/importApi';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import DocumentList from '../components/DocumentList';
import FileDrop from '../components/FileDrop';
import { BATCH_STATUS_LABEL, ServerTable, StatusBadge, fmtDate } from '../components/importUi';
import { useStudentSummary } from '../hooks/useStudents';
import { asOfLabel, pctOf, studentListLink } from '../services/studentFigures';

type Tab = 'batches' | 'students' | 'guide';

/*
 * Student Data Import Facility (spec A-11..A-18): approved-student files are uploaded as import batches,
 * validated row by row, reviewed, and finalised by a second person into the student register.
 */
export default function StudentImportPage() {
  const [tab, setTab] = useState<Tab>('batches');
  const [ref, setRef] = useState<ImportReference | null>(null);
  useEffect(() => {
    document.title = 'Student import — AMRUT × SUMAGO Admin';
    importApi
      .reference()
      .then(setRef)
      .catch(() => undefined);
  }, []);

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Student import' }]}
        title="Student Data Import"
        badge={<Badge tone="green">Live</Badge>}
        sub="Upload the approved-student file (CSV or XLSX). Every row is validated, duplicates are flagged, and a second person finalises the batch into the student register."
        actions={
          <>
            <button type="button" className="btn" onClick={() => importApi.templateXlsx().catch(toastError)}>
              <Icon name="download" />
              Excel template
            </button>
            <button type="button" className="btn" onClick={() => importApi.sampleDocuments().catch(toastError)}>
              <Icon name="download" />
              Sample documents ZIP
            </button>
            <button type="button" className="btn ghost" onClick={() => importApi.template().catch(toastError)}>
              CSV template
            </button>
          </>
        }
      />
      <div className="tabs">
        {(
          [
            ['batches', 'Import batches'],
            ['students', 'Student register'],
            ['guide', 'Fields & rules'],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button type="button" key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
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
  const [zip, setZip] = useState<File | null>(null);
  const [sourceRef, setSourceRef] = useState('');
  const [busy, setBusy] = useState(false);
  const maxMb = reference?.maxFileMb ?? 20;
  const reject = (msg: string) => toastError(new ApiError(msg, 400, 'BAD_FILE'));

  async function submit() {
    if (!file) return;
    setBusy(true);
    try {
      const res = await importApi.upload(file, sourceRef.trim() || undefined, zip ?? undefined);
      if (res.data.status === 'IMPORT_FAILED') toastError(new ApiError(res.message, 422, 'IMPORT_FAILED'));
      else toastOk(res.message);
      setFile(null);
      setZip(null);
      setSourceRef('');
      onUploaded(res.data);
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>Upload approved-student file</h3>
      </div>
      <div className="card-b">
        <div className="tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-2">
          <div>
            <div className="tw-mb-1 tw-text-xs tw-font-semibold tw-text-ink-2">1. Student data (required)</div>
            <FileDrop
              file={file}
              accept=".csv,.xlsx"
              prompt="Drop the Excel or CSV file here"
              hint={`Excel (.xlsx) or UTF-8 CSV · up to ${maxMb} MB · up to ${(reference?.maxRows ?? 50000).toLocaleString('en-IN')} rows · first sheet, first row is the header`}
              maxMb={maxMb}
              onPick={setFile}
              onReject={reject}
              ariaLabel="Choose the student data file"
            />
          </div>
          <div>
            <div className="tw-mb-1 tw-text-xs tw-font-semibold tw-text-ink-2">2. Documents ZIP (optional)</div>
            <FileDrop
              file={zip}
              accept=".zip"
              prompt="Drop the documents ZIP here"
              hint="One folder per student, named by source_record_id (e.g. MA-0001/photo.jpg) — no other folders · the Excel doc_ columns name the file (photo.jpg) · PDF, JPG or PNG, up to 5 MB each"
              maxMb={500}
              onPick={setZip}
              onReject={reject}
              ariaLabel="Choose the documents ZIP"
            />
          </div>
        </div>
        <div className="f gp10 wrap mt10" style={{ alignItems: 'flex-end' }}>
          <div className="fld" style={{ flex: '1 1 240px' }}>
            <label htmlFor="src-ref">
              Source reference <span className="muted">(transmittal or API batch reference, optional)</span>
            </label>
            <input
              id="src-ref"
              className="inp"
              value={sourceRef}
              maxLength={120}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="e.g. MahaAmrut transmittal 2026-10-19"
            />
          </div>
          <button type="button" className="btn primary" disabled={!file || busy} onClick={() => void submit()}>
            {busy ? 'Uploading & validating…' : 'Upload and validate'}
          </button>
        </div>
        <div className="hint mt10">
          Uploading creates an import batch only; no student is created until a second person reviews and finalises it. Documents are stored
          per student and move to the student's own folder when the batch is finalised. Documents can also be added later from the batch
          page.
        </div>
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
    try {
      const r = await importApi.list({ page, limit: 25, status: status || undefined, search: search || undefined });
      setRows(r.items);
      setMeta(r.meta);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);
  useEffect(() => {
    void load();
  }, [load]);

  const c = (k: keyof ImportBatch['counts'], b: ImportBatch) => (b.counts?.[k] ?? 0).toLocaleString('en-IN');
  return (
    <>
      <Can action="createImport">
        <UploadCard reference={reference} onUploaded={(b) => navigate('/student-import/' + b.id)} />
      </Can>
      <div className="card">
        <div className="card-h">
          <h3>Import batches</h3>
          <div className="f gp8 wrap">
            <input
              className="inp sm"
              placeholder="Search code, file, reference"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: 220 }}
            />
            <select
              className="inp sm"
              style={{ width: 'auto' }}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {Object.entries(BATCH_STATUS_LABEL).map(([k, [l]]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ServerTable
          rows={rows}
          meta={meta}
          page={page}
          onPage={setPage}
          loading={loading}
          empty="No import batches yet. Upload the approved-student file above."
          onRowClick={(b) => navigate('/student-import/' + b.id)}
          columns={[
            {
              k: 'code',
              l: 'Batch',
              render: (b) => (
                <div>
                  <b className="mono">{b.code}</b>
                  <div className="fs11 muted">{b.fileName}</div>
                </div>
              ),
            },
            { k: 'status', l: 'Status', render: (b) => <StatusBadge map={BATCH_STATUS_LABEL} status={b.status} /> },
            { k: 'total', l: 'Rows', render: (b) => c('total', b) },
            { k: 'valid', l: 'Valid', render: (b) => c('valid', b) },
            {
              k: 'review',
              l: 'Needs review',
              render: (b) => ((b.counts?.exceptions ?? 0) + (b.counts?.duplicates ?? 0)).toLocaleString('en-IN'),
            },
            {
              k: 'done',
              l: 'Imported',
              render: (b) => (b.status === 'FINALISED' ? `${b.counts.created ?? 0} new · ${b.counts.linked ?? 0} linked` : '—'),
            },
            { k: 'at', l: 'Received', render: (b) => fmtDate(b.createdAt) },
          ]}
        />
      </div>
    </>
  );
}

/* Live register counts (GET /students/summary): each tile opens the student list (/candidates) for its bucket. */
function RegisterKpis() {
  const summary = useStudentSummary();
  const t = summary.data?.totals;
  const asOf = asOfLabel(summary.data?.asOf);
  const value = (n: number | undefined) => (summary.isPending ? '…' : summary.isError ? '—' : (n ?? 0).toLocaleString('en-IN'));
  return (
    <>
      <div className="grid g4 mb6">
        <Kpi
          label="Students in register"
          value={value(t?.applications)}
          tone="b"
          sub={t ? t.pending.toLocaleString('en-IN') + ' pending verification' : 'Import + registration'}
          link={studentListLink({ bucket: 'applications' })}
          title={asOf}
        />
        <Kpi
          label="Eligible"
          value={value(t?.eligible)}
          tone="b"
          sub={t ? pctOf(t.eligible, t.applications) + '% of the register' : 'Approved and active'}
          link={studentListLink({ bucket: 'eligible' })}
          title={asOf}
        />
        <Kpi
          label="Enrolled"
          value={value(t?.enrolled)}
          tone="g"
          sub="Assigned to a batch"
          link={studentListLink({ bucket: 'enrolled' })}
          title={asOf}
        />
        <Kpi
          label="Awaiting batch"
          value={value(t?.awaitingBatch)}
          tone="a"
          sub="Eligible, not yet in a batch"
          link={studentListLink({ bucket: 'awaiting' })}
          title={asOf}
        />
      </div>
      <div className="fs11 muted mb14">
        {summary.isError ? (
          <>
            Could not load the register counts.{' '}
            <button type="button" className="btn xs" onClick={() => void summary.refetch()}>
              Retry
            </button>
          </>
        ) : asOf ? (
          'Live register counts ' + asOf + '.'
        ) : null}
      </div>
    </>
  );
}

function StudentsTab({ reference }: { reference: ImportReference | null }) {
  /* Reviewers open the full student page (full details, documents with Preview / Verify); others get the masked panel. */
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const canOpenDetail = permissions.has('registrations.view');
  const [rows, setRows] = useState<StudentView[]>([]);
  const [meta, setMeta] = useState<PageMeta>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [centre, setCentre] = useState('');
  const [track, setTrack] = useState('');
  const [source, setSource] = useState<'' | 'IMPORT' | 'PUBLIC_REGISTRATION'>('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<StudentDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await studentApi.list({
        page,
        limit: 25,
        search: search || undefined,
        centre: centre || undefined,
        track: track || undefined,
        source: source || undefined,
      });
      setRows(r.items);
      setMeta(r.meta);
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, centre, track, source]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <RegisterKpis />
      <div className="card">
        <div className="card-h">
          <h3>
            Student register <span className="sub">full details for reviewers; every view is audited</span>
          </h3>
          <div className="f gp8 wrap">
            <input
              className="inp sm"
              placeholder="Name, code, source ID, email, mobile last 4"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ width: 250 }}
            />
            <select
              className="inp sm"
              style={{ width: 'auto' }}
              aria-label="Filter by source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value as typeof source);
                setPage(1);
              }}
            >
              <option value="">All sources</option>
              <option value="IMPORT">Import</option>
              <option value="PUBLIC_REGISTRATION">Registration</option>
            </select>
            <select
              className="inp sm"
              style={{ width: 'auto' }}
              value={centre}
              onChange={(e) => {
                setCentre(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All centres</option>
              {reference?.centres.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="inp sm"
              style={{ width: 'auto' }}
              value={track}
              onChange={(e) => {
                setTrack(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All tracks</option>
              <option value="TBC">Track to be confirmed</option>
              {reference?.tracks.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} · {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ServerTable
          rows={rows}
          meta={meta}
          page={page}
          onPage={setPage}
          loading={loading}
          empty="No students yet. Students appear here when an import batch is finalised or a registration is submitted."
          onRowClick={(s) =>
            canOpenDetail ? navigate(`/student-registrations/${s.id}`) : studentApi.get(s.id).then(setOpen).catch(toastError)
          }
          columns={[
            {
              k: 'sr',
              l: 'Sr. No.',
              className: 'mono',
              render: (_s, i) => (page - 1) * (meta?.limit ?? 25) + i + 1,
            },
            {
              k: 'code',
              l: 'Student',
              render: (s) => (
                <div>
                  <b>{s.name}</b>
                  <div className="fs11 muted">{s.unmasked?.email ?? s.email ?? ''}</div>
                  <div className="fs11 muted mono">
                    {s.registrationNumber ?? '—'}
                    {s.sourceRecordId ? ` · ${s.sourceRecordId}` : ''}
                  </div>
                </div>
              ),
            },
            { k: 'centre', l: 'Course centre', render: (s) => s.centreName ?? '—' },
            {
              k: 'track',
              l: 'Track',
              render: (s) =>
                s.trackToBeConfirmed ? (
                  <Badge tone="amber">To be confirmed</Badge>
                ) : (
                  <span>
                    {s.trackCode} · {s.trackName}
                  </span>
                ),
            },
            { k: 'mobile', l: 'Mobile', className: 'mono', render: (s) => s.unmasked?.mobile ?? s.mobile ?? '—' },
            { k: 'aadhaar', l: 'Aadhaar', className: 'mono', render: (s) => s.unmasked?.aadhaar ?? s.aadhaar ?? '—' },
            { k: 'status', l: 'Status', render: (s) => <Badge tone="blue">{s.status === 'RECEIVED' ? 'Received' : s.status}</Badge> },
            { k: 'at', l: 'Approved', render: (s) => (s.approvedAt ? fmtDate(s.approvedAt) : '—') },
          ]}
        />
      </div>
      {open ? <StudentDrawer s={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function StudentDrawer({ s, onClose }: { s: StudentDetail; onClose: () => void }) {
  const field = (l: string, v: React.ReactNode) => (
    <div className="kv">
      <span>{l}</span>
      <b>{v ?? '—'}</b>
    </div>
  );
  return (
    <Drawer title={s.name} onClose={onClose}>
      <div className="mono fs12 muted mb10">
        {s.registrationNumber ?? '—'} · source {s.sourceRecordId ?? '—'}
      </div>
      <h4 className="mb6">Personal</h4>
      <div className="kv-grid">
        {field('First name', s.firstName)}
        {field('Last name', s.lastName)}
        {field('Father name', s.fatherName)}
        {field('Mother name', s.motherName)}
        {field('Date of birth', s.dateOfBirth)}
        {field('Religion', s.religion)}
        {field('Caste', s.caste)}
        {field('Education', s.educationQualification)}
      </div>
      <h4 className="mb6 mt14">
        Contact & identity <span className="muted fs11">(masked)</span>
      </h4>
      <div className="kv-grid">
        {field('Mobile', s.mobile)}
        {field('Email', s.email)}
        {field('Aadhaar', s.aadhaar)}
      </div>
      <h4 className="mb6 mt14">Programme</h4>
      <div className="kv-grid">
        {field('Course centre', s.centreName)}
        {field('Track', s.trackToBeConfirmed ? `To be confirmed (source: ${s.trackSourceValue})` : `${s.trackCode} · ${s.trackName}`)}
      </div>
      <h4 className="mb6 mt14">Source and evidence</h4>
      <div className="kv-grid">
        {field('External status', s.externalStatus)}
        {field('Approved at', fmtDate(s.approvedAt))}
        {field('Evidence reference', s.evidenceRef)}
        {field('Declaration', s.declarationAccepted === null ? 'Not supplied' : s.declarationAccepted ? 'Accepted' : 'Not accepted')}
      </div>
      <h4 className="mb6 mt14">
        Document files <span className="muted fs11">(stored in this student's folder)</span>
      </h4>
      <DocumentList
        queryKey={['students', s.id, 'documents']}
        load={() => studentApi.documents(s.id)}
        download={(d) => studentApi.downloadDocument(s.id, d)}
        emptyText="No document files were uploaded for this student."
      />
      <h4 className="mb6 mt14">
        Documents declared by the source <span className="muted fs11">(metadata)</span>
      </h4>
      <div className="list">
        {s.documents.map((d) => (
          <div key={d.key} className="list-row norow">
            <div className="lr-main">
              <b>{d.label}</b>
              <span>
                {d.required ? 'Required' : 'Optional'}
                {d.barcode ? ` · barcode ${d.barcode}` : ''}
              </span>
            </div>
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
        {' '}
        1 Upload the approved-student file → 2 every row is validated and checked for duplicates → 3 the operator resolves exceptions
        (accept with reason, or reject) and the reviewer decides possible duplicates → 4 a second person types the batch code to finalise.
        Only then are students written to the register, in one transaction.
      </Callout>
      <div className="grid g-2-1 mt14">
        <div className="card">
          <div className="card-h">
            <h3>
              Columns <span className="sub">header names; the external form's labels are accepted too</span>
            </h3>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Meaning</th>
                  <th>Required</th>
                </tr>
              </thead>
              <tbody>
                {reference.columns.map((c) => (
                  <tr key={c.field}>
                    <td className="mono fs12">{c.field}</td>
                    <td>{c.label}</td>
                    <td>{c.required ? <Badge tone="saffron">Required</Badge> : <span className="muted">Optional</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="card mb14">
            <div className="card-h">
              <h3>Key rules</h3>
            </div>
            <div className="card-b fs13">
              <ul className="rules">
                <li>
                  <b>Aadhaar</b>: 12 digits with a valid checksum. Encrypted at rest; only the last 4 digits are ever shown.
                </li>
                <li>
                  <b>Mobile</b>: Indian 10-digit number starting 6–9; +91, 91 or a leading 0 is removed.
                </li>
                <li>
                  <b>Date of birth</b>: YYYY-MM-DD (Excel dates are read automatically). Other formats are not guessed.
                </li>
                <li>
                  <b>Religion and caste</b>: must equal a supplied source option exactly.
                </li>
                <li>
                  <b>Approval</b>: approval_status must be APPROVED with a past approved_at; never waivable.
                </li>
                <li>
                  <b>Documents</b>: Yes/No presence flags; a missing required document can be accepted with a reason.
                </li>
                <li>
                  <b>Documents ZIP</b>: one folder per student, named exactly like <span className="mono">source_record_id</span> (e.g.{' '}
                  <span className="mono">MA-0001/photo.jpg</span>); files in any other folder are rejected. In the Excel document columns
                  write the file name in that folder (<span className="mono">doc_photo</span> = <span className="mono">photo.jpg</span>), or
                  write Yes and name files by type (<span className="mono">AADHAAR_CARD.pdf</span>). PDF, JPG or PNG up to 5 MB each; files
                  move to the student’s own folder on finalise.
                </li>
                <li>
                  <b>Duplicates</b>: same source ID, same Aadhaar, or same name + date of birth + contact need a reviewer's decision.
                </li>
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <h3>Technology tracks</h3>
            </div>
            <div className="card-b flush">
              <div className="list">
                {reference.tracks.map((t) => (
                  <div key={t.code} className="list-row norow">
                    <div className="lr-main">
                      <b>
                        {t.code} · {t.name}
                      </b>
                      <span>{t.aliases.filter((a) => a !== t.name).join(', ') || 'exact name'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
