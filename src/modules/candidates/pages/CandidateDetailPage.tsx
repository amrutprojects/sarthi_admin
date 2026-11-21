import { useQuery } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Callout, Card, EmptyState, KvList, LinkButton, PageHead } from '../../../components/ui';
import { toastError } from '../../../components/feedback/apiFeedback';
import { ApiError } from '../../../services/api-client';
import { useAuth } from '../../auth';
import { LmsSyncCard } from '../../lms-sync';
import {
  fmtDate,
  profileGroups,
  studentApi,
  studentStatusLabel,
  type ProfilePair,
  type StudentDetail,
  type StudentDocument,
} from '../../students';

const SOURCE: Record<string, string> = { IMPORT: 'Imported', PUBLIC_REGISTRATION: 'Registration' };
const dash = (v: ReactNode) => (v === null || v === undefined || v === '' ? '—' : v);

/*
 * One student from the register (GET /students/:id and /students/:id/documents). Contact and identity values are masked
 * by the server; file downloads need imports.view and are audited server-side.
 */
export default function CandidateDetailPage() {
  const { id = '' } = useParams();
  const { permissions } = useAuth();
  const student = useQuery({ queryKey: ['students', id], queryFn: () => studentApi.get(id), enabled: !!id });
  const files = useQuery({ queryKey: ['students', id, 'documents'], queryFn: () => studentApi.documents(id), enabled: !!id });
  useEffect(() => {
    document.title = 'Candidate — AMRUT × SUMAGO Admin';
  }, []);

  const crumbs = [
    { l: 'Dashboard', link: '#/dashboard' },
    { l: 'Candidates', link: '#/candidates' },
  ];
  if (student.isPending) {
    return (
      <div className="page">
        <PageHead crumbs={crumbs} title="Student" />
        <div className="skel" style={{ height: 240 }} aria-label="Loading student" />
      </div>
    );
  }
  if (student.isError) {
    const notFound = student.error instanceof ApiError && student.error.status === 404;
    return (
      <div className="page">
        <PageHead crumbs={crumbs} title="Student" />
        {notFound ? (
          <EmptyState title="Student not found" msg={'No student exists with ID ' + id}>
            <LinkButton to="#/candidates" className="btn primary">
              Back to candidate master
            </LinkButton>
          </EmptyState>
        ) : (
          <Callout tone="err" title="Could not load this student. ">
            {student.error.message}{' '}
            <button type="button" className="btn xs" onClick={() => void student.refetch()}>
              Retry
            </button>
          </Callout>
        )}
      </div>
    );
  }

  const s = student.data;
  const [statusLabel, statusTone] = studentStatusLabel(s);
  /* Profile and source details of an imported application; groups without a value are left out. */
  const g = profileGroups(s);
  const group = (title: string, pairs: ProfilePair[]) =>
    pairs.length ? (
      <>
        <h4 className="mb6 mt14">{title}</h4>
        <div className="kv-grid">
          <KvList pairs={pairs} />
        </div>
      </>
    ) : null;
  const track = s.trackToBeConfirmed ? `To be confirmed (source: ${dash(s.trackSourceValue)})` : `${s.trackCode} · ${dash(s.trackName)}`;
  const batch =
    s.batch === undefined
      ? '—'
      : s.batch
        ? `${s.batch.code} · ${s.batch.name}`
        : s.status === 'RECEIVED'
          ? 'Awaiting batch'
          : 'Not assigned';

  return (
    <div className="page">
      <PageHead
        crumbs={[...crumbs, { l: s.code }]}
        title={s.name}
        badge={
          <>
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <Badge tone="blue">{SOURCE[s.source] ?? s.source}</Badge>
          </>
        }
        sub={
          <>
            <span className="mono">{s.code}</span>
            {s.registrationNumber ? <> · {s.registrationNumber}</> : null} · {dash(s.centreName ?? s.centreCode)} · {track}
          </>
        }
        actions={
          <>
            <LinkButton to="#/candidates">Back to list</LinkButton>
            {s.source === 'PUBLIC_REGISTRATION' && permissions.has('registrations.view') ? (
              <LinkButton to={'#/student-registrations/' + s.id}>Open registration</LinkButton>
            ) : null}
          </>
        }
      />

      <div className="grid g-2-1 mb14">
        <Card title="Profile">
          <div className="kv-grid">
            <KvList
              pairs={[
                ['First name', dash(s.firstName)],
                ['Last name', dash(s.lastName)],
                ['Father name', dash(s.fatherName)],
                ['Mother name', dash(s.motherName)],
                ['Date of birth', dash(s.dateOfBirth)],
                ['Religion', dash(s.religion)],
                ['Caste', dash(s.caste)],
                ['Education', dash(s.educationQualification)],
                ...g.profile,
              ]}
            />
          </div>
          <h4 className="mb6 mt14">
            Contact & identity <span className="muted fs11">(masked)</span>
          </h4>
          <div className="kv-grid">
            <KvList pairs={[['Mobile', dash(s.mobile)], ['Email', dash(s.email)], ['Aadhaar', dash(s.aadhaar)], ...g.contact]} />
          </div>
          {group('Address & location', g.address)}
          {group('Qualification', g.qualification)}
        </Card>
        <Card title="Programme">
          <KvList
            pairs={[
              ['District', s.centreName ? `${s.centreName} (${s.centreCode})` : dash(s.centreCode)],
              ['Track', track],
              ['Batch', batch],
              ['Source', SOURCE[s.source] ?? s.source],
              ['External status', dash(s.externalStatus)],
              ['Approved', fmtDate(s.approvedAt)],
              ['Added to register', fmtDate(s.createdAt)],
              ['Evidence reference', dash(s.evidenceRef)],
              ['Declaration', s.declarationAccepted === null ? 'Not supplied' : s.declarationAccepted ? 'Accepted' : 'Not accepted'],
            ]}
          />
          <h4 className="mb6 mt14">Lifecycle</h4>
          <Lifecycle s={s} />
        </Card>
      </div>

      {g.source.length || g.extra.length ? (
        <div className="mb14">
          <Card title="Source record" sub="as received from the source portal">
            {g.source.length ? (
              <div className="kv-grid">
                <KvList pairs={g.source} />
              </div>
            ) : null}
            {g.extra.length ? (
              <>
                <h4 className={'mb6' + (g.source.length ? ' mt14' : '')}>
                  Other source values <span className="muted fs11">(columns not stored in a field, as received)</span>
                </h4>
                <div className="kv-grid">
                  <KvList pairs={g.extra} />
                </div>
              </>
            ) : null}
          </Card>
        </div>
      ) : null}

      {/* M1: renders only when the server has the LMS sync and the user holds lms-sync.view. */}
      <LmsSyncSection studentId={s.id} />

      <Card title="Documents" sub="declared by the source, and the files stored for this student">
        <Documents s={s} files={files} canDownload={permissions.has('imports.view')} />
      </Card>
    </div>
  );
}

function LmsSyncSection({ studentId }: { studentId: string }) {
  return (
    <div className="mb14">
      <LmsSyncCard studentId={studentId} />
    </div>
  );
}

function Lifecycle({ s }: { s: StudentDetail }) {
  const steps: [string, string | null, boolean][] = [
    ['Application', fmtDate(s.createdAt), true],
    ['Approved', s.approvedAt ? fmtDate(s.approvedAt) : null, s.status === 'RECEIVED'],
    ['Batch allocated', s.batch ? s.batch.code : null, !!s.batch],
  ];
  return (
    <div className="list">
      {steps.map(([l, at, done]) => (
        <div key={l} className="list-row norow">
          <div className="lr-main">
            <b>{l}</b>
            <span>{at ?? 'Not yet'}</span>
          </div>
          {done ? <Badge tone="green">Done</Badge> : <Badge tone="grey">Pending</Badge>}
        </div>
      ))}
    </div>
  );
}

function Documents({
  s,
  files,
  canDownload,
}: {
  s: StudentDetail;
  files: { isPending: boolean; isError: boolean; data?: StudentDocument[] };
  canDownload: boolean;
}) {
  const stored = files.data ?? [];
  const byType = new Map(stored.map((d) => [d.docType, d]));
  const declared = new Set(s.documents.map((d) => d.key));
  const extra = stored.filter((d) => !declared.has(d.docType));
  const fileCell = (f: StudentDocument | undefined) =>
    files.isPending ? (
      '…'
    ) : files.isError ? (
      <span className="muted">Could not load</span>
    ) : f ? (
      f.originalName
    ) : (
      <span className="muted">No file</span>
    );
  const verifiedCell = (f: StudentDocument | undefined) =>
    !f ? '—' : f.verifiedAt ? <Badge tone="green">Verified {fmtDate(f.verifiedAt)}</Badge> : <Badge tone="grey">Not verified</Badge>;
  const download = (f: StudentDocument | undefined) =>
    f && canDownload ? (
      <button
        type="button"
        className="btn xs"
        onClick={() => studentApi.downloadDocument(s.id, f).catch(toastError)}
        aria-label={`Download ${f.label}`}
      >
        Download
      </button>
    ) : null;
  if (!s.documents.length && !stored.length && !files.isPending)
    return <div className="muted fs12">No documents recorded for this student.</div>;
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Document</th>
            <th>Required</th>
            <th>Supplied</th>
            <th>File</th>
            <th>Verified</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {s.documents.map((d) => {
            const f = byType.get(d.key);
            return (
              <tr key={d.key}>
                <td>
                  <b>{d.label}</b>
                  {d.barcode ? <div className="muted fs11">barcode {d.barcode}</div> : null}
                </td>
                <td>{d.required ? 'Required' : 'Optional'}</td>
                <td>
                  {d.supplied ? <Badge tone="green">Supplied</Badge> : <Badge tone={d.required ? 'amber' : 'grey'}>Not supplied</Badge>}
                </td>
                <td>{fileCell(f)}</td>
                <td>{verifiedCell(f)}</td>
                <td>{download(f)}</td>
              </tr>
            );
          })}
          {extra.map((f) => (
            <tr key={f.id}>
              <td>
                <b>{f.label}</b>
              </td>
              <td>—</td>
              <td>—</td>
              <td>{f.originalName}</td>
              <td>{verifiedCell(f)}</td>
              <td>{download(f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
