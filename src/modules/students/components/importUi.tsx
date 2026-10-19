import { useState, type ReactNode } from 'react';
import { Badge } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import type { PageMeta } from '../../../services/api-client';

export const BATCH_STATUS_LABEL: Record<string, [string, string]> = {
  IMPORT_PENDING: ['Pending', 'grey'],
  IMPORT_FAILED: ['Import failed', 'red'],
  VALIDATING: ['Validating', 'blue'],
  VALIDATED_WITH_EXCEPTIONS: ['Needs review', 'amber'],
  READY_TO_FINALISE: ['Ready to finalise', 'blue'],
  FINALISED: ['Finalised', 'green'],
  CANCELLED: ['Cancelled', 'grey'],
};
export const ROW_STATUS_LABEL: Record<string, [string, string]> = {
  DATA_VALIDATION_PENDING: ['Pending', 'grey'],
  VALID: ['Valid', 'green'],
  DATA_EXCEPTION: ['Exception', 'red'],
  POSSIBLE_DUPLICATE: ['Possible duplicate', 'amber'],
  SKIPPED_UNCHANGED: ['Skipped (unchanged)', 'grey'],
  ROW_REJECTED: ['Rejected', 'grey'],
  RECONCILED: ['Imported', 'green'],
};

export function StatusBadge({ map, status }: { map: Record<string, [string, string]>; status: string }) {
  const [label, tone] = map[status] ?? [status, 'grey'];
  return <Badge tone={tone}>{label}</Badge>;
}

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export interface ServerColumn<T> { k: string; l: string; render: (row: T) => ReactNode; className?: string }

/* Table whose rows, total and paging come from the server (the API pages at most 200 rows). */
export function ServerTable<T extends { id: string }>({ rows, columns, meta, page, onPage, onRowClick, empty, loading }: {
  rows: T[]; columns: ServerColumn<T>[]; meta?: PageMeta; page: number; onPage: (p: number) => void;
  onRowClick?: (row: T) => void; empty: string; loading?: boolean;
}) {
  const pages = meta?.totalPages ?? 1;
  const from = meta && meta.total ? (page - 1) * meta.limit + 1 : 0;
  const to = meta ? Math.min(meta.total, page * meta.limit) : rows.length;
  return (
    <div className="dt">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr>{columns.map((c) => <th key={c.k}>{c.l}</th>)}</tr></thead>
          <tbody style={loading ? { opacity: 0.55 } : undefined}>
            {rows.length ? rows.map((r) => (
              <tr key={r.id} className={onRowClick ? 'pointer' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => <td key={c.k} className={c.className}>{c.render(r)}</td>)}
              </tr>
            )) : <tr><td colSpan={columns.length} className="muted" style={{ textAlign: 'center', padding: 28 }}>{loading ? 'Loading…' : empty}</td></tr>}
          </tbody>
        </table>
      </div>
      {meta && meta.total > 0 ? (
        <div className="tbl-bot">
          <div className="info">Showing <b>{from}-{to}</b> of <b>{meta.total.toLocaleString('en-IN')}</b></div>
          <div className="pager">
            <button type="button" disabled={page <= 1} onClick={() => onPage(1)}>«</button>
            <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
            <button type="button" className="on">{page} / {pages}</button>
            <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
            <button type="button" disabled={page >= pages} onClick={() => onPage(pages)}>»</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* Dialog asking for a mandatory reason (decisions, rejections and waivers are audited with it). */
export function ReasonModal({ title, intro, confirmLabel, danger, busy, onConfirm, onClose }: {
  title: string; intro?: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean;
  onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const ok = reason.trim().length >= 3;
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className={'btn ' + (danger ? 'danger' : 'primary')} disabled={!ok || busy} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</button>
    </>}>
      {intro ? <div className="mb10 fs13">{intro}</div> : null}
      <div className="fld">
        <label htmlFor="reason-inp">Reason <span className="muted">(required, recorded in the audit log)</span></label>
        <textarea id="reason-inp" className="inp" rows={3} value={reason} autoFocus onChange={(e) => setReason(e.target.value)} />
      </div>
    </Modal>
  );
}
