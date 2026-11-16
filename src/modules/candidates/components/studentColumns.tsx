import { Badge } from '../../../components/ui';
import { studentStatusLabel, type ServerColumn, type StudentListItem, type StudentSource } from '../../students';

/* Student register columns, shared by the candidate master (/candidates) and the district page's student table. */
export const SOURCES: Record<StudentSource, string> = { IMPORT: 'Imported', PUBLIC_REGISTRATION: 'Registration' };

const dateOnly = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—');

export const studentColumns: ServerColumn<StudentListItem>[] = [
  { k: 'code', l: 'Code', render: (s) => <span className="lnk mono">{s.code}</span> },
  { k: 'name', l: 'Name', render: (s) => <b>{s.name}</b> },
  { k: 'district', l: 'District', render: (s) => s.centreName ?? s.centreCode ?? '—' },
  {
    k: 'track',
    l: 'Track',
    render: (s) =>
      s.trackToBeConfirmed ? (
        <Badge tone="amber">To be confirmed</Badge>
      ) : (
        <span title={s.trackName ?? undefined}>
          <span className="mono">{s.trackCode}</span>
          {s.trackName ? <span className="muted"> · {s.trackName}</span> : null}
        </span>
      ),
  },
  { k: 'education', l: 'Education', render: (s) => s.educationQualification || '—' },
  { k: 'caste', l: 'Caste', render: (s) => s.caste || '—' },
  { k: 'source', l: 'Source', render: (s) => SOURCES[s.source] ?? s.source },
  {
    k: 'status',
    l: 'Status',
    render: (s) => {
      const [l, tone] = studentStatusLabel(s);
      return <Badge tone={tone}>{l}</Badge>;
    },
  },
  { k: 'approved', l: 'Approved', render: (s) => dateOnly(s.approvedAt) },
  {
    k: 'batch',
    l: 'Batch',
    render: (s) =>
      s.batch ? (
        <span className="mono" title={s.batch.name}>
          {s.batch.code}
        </span>
      ) : s.status === 'RECEIVED' ? (
        <span className="muted">Awaiting</span>
      ) : (
        '—'
      ),
  },
];
