import { Callout } from '../../../components/ui';
import type { DocumentsReport } from '../services/importApi';

/* Result of the last documents ZIP upload: what was stored, rejected (with reasons) and not matched to any row. */
export default function DocumentsReportCard({ report }: { report: DocumentsReport }) {
  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>
          Documents{' '}
          <span className="sub">
            {report.zipName} · {new Date(report.uploadedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </h3>
      </div>
      <div className="card-b">
        <div className="tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-4">
          <Stat label="Files stored" value={report.stored} tone="tw-text-ok" />
          <Stat label="Students with files" value={report.studentsWithFiles} />
          <Stat label="Rejected files" value={report.rejected.length} tone={report.rejected.length ? 'tw-text-danger' : undefined} />
          <Stat
            label="Folders not matched"
            value={report.unmatchedFolders.length}
            tone={report.unmatchedFolders.length ? 'tw-text-warn' : undefined}
          />
        </div>
        {report.replaced ? <div className="hint mt10">{report.replaced} earlier documents were replaced by this upload.</div> : null}
        {report.rejected.length ? (
          <details className="mt14">
            <summary className="tw-cursor-pointer tw-font-semibold">Rejected files ({report.rejected.length})</summary>
            <ul className="tw-mt-2 tw-max-h-60 tw-overflow-auto tw-pl-5 tw-text-sm">
              {report.rejected.map((r) => (
                <li key={r.path} className="tw-mb-1">
                  <span className="mono">{r.path}</span> — {r.reason}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {report.unmatchedFolders.length ? (
          <div className="mt14">
            <Callout tone="warn" title="Folders without a matching row. ">
              {report.unmatchedFolders.slice(0, 20).join(', ')}
              {report.unmatchedFolders.length > 20 ? ` and ${report.unmatchedFolders.length - 20} more` : ''}. Folder names must equal a
              source_record_id in this batch.
            </Callout>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="tw-rounded tw-border tw-border-solid tw-border-line tw-bg-surface-2 tw-p-3">
      <div className={`tw-text-xl tw-font-bold ${tone ?? 'tw-text-ink'}`}>{value.toLocaleString('en-IN')}</div>
      <div className="tw-text-xs tw-text-ink-muted">{label}</div>
    </div>
  );
}
