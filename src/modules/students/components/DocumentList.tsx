import { useQuery } from '@tanstack/react-query';
import { Badge } from '../../../components/ui';
import { toastError } from '../../../components/feedback/apiFeedback';
import type { StudentDocument } from '../services/importApi';

const size = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const kind: Record<StudentDocument['mimeType'], string> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' };

/*
 * Stored document files with download buttons. `load` fetches the list (student register or a staged import row);
 * `download` streams one file through the API (downloads are audited server-side).
 */
export default function DocumentList({
  queryKey,
  load,
  download,
  emptyText,
}: {
  queryKey: readonly unknown[];
  load: () => Promise<StudentDocument[]>;
  download: (doc: StudentDocument) => Promise<void>;
  emptyText: string;
}) {
  const docs = useQuery({ queryKey, queryFn: load });
  if (docs.isPending) return <div className="skel" style={{ height: 60 }} aria-label="Loading documents" />;
  if (docs.isError) return <div className="callout c-err">Could not load documents.</div>;
  if (!docs.data.length) return <div className="muted fs12">{emptyText}</div>;
  return (
    <div className="list">
      {docs.data.map((d) => (
        <div key={d.id} className="list-row norow">
          <div className="lr-main">
            <b>{d.label}</b>
            <span>
              {d.originalName} · {size(d.sizeBytes)}
            </span>
          </div>
          <Badge tone="green">{kind[d.mimeType]}</Badge>
          <button type="button" className="btn xs" onClick={() => download(d).catch(toastError)} aria-label={`Download ${d.label}`}>
            Download
          </button>
        </div>
      ))}
    </div>
  );
}
