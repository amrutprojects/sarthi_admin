import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Callout, Kpi, PageHead } from '../../../components/ui';
import { Drawer, Modal } from '../../../components/ui/Overlay';
import { useCan } from '../../auth/components/Can';
import { useAuth } from '../../auth/AuthContext';
import type { PageMeta } from '../../../services/api-client';
import { importApi, type ImportBatch, type ImportRowView } from '../services/importApi';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { BATCH_STATUS_LABEL, ROW_STATUS_LABEL, ReasonModal, ServerTable, StatusBadge, fmtDate } from '../components/importUi';

const FILTERS: [string, string][] = [
  ['', 'All rows'], ['DATA_EXCEPTION', 'Exceptions'], ['POSSIBLE_DUPLICATE', 'Possible duplicates'], ['VALID', 'Valid'],
  ['SKIPPED_UNCHANGED', 'Skipped'], ['ROW_REJECTED', 'Rejected'], ['RECONCILED', 'Imported'],
];
const EDITABLE = ['VALIDATED_WITH_EXCEPTIONS', 'READY_TO_FINALISE'];

type Action = { type: 'accept' } | { type: 'reject' } | { type: 'decide'; decision: 'SAME_PERSON' | 'DIFFERENT_PERSON' | 'HOLD' };

/* Import batch detail (UI-224) with the import preview (UI-223): counts, row grid, row drawer, finalise. */
export default function ImportBatchPage() {
  const { id = '' } = useParams();
  const can = useCan();
  const { user } = useAuth();
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportRowView[]>([]);
  const [meta, setMeta] = useState<PageMeta>();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ImportRowView | null>(null);
  const [finalising, setFinalising] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadBatch = useCallback(async () => {
    try { const b = await importApi.get(id); setBatch(b); document.title = `${b.code} — Student import`; } catch (e) { toastError(e); }
  }, [id]);
  const loadRows = useCallback(async () => {
    setLoading(true);
    try { const r = await importApi.rows(id, { page, limit: 50, status: status || undefined, search: search || undefined }); setRows(r.items); setMeta(r.meta); }
    catch (e) { toastError(e); } finally { setLoading(false); }
  }, [id, page, status, search]);
  useEffect(() => { void loadBatch(); }, [loadBatch]);
  useEffect(() => { void loadRows(); }, [loadRows]);
  const reloadAll = async () => { await Promise.all([loadBatch(), loadRows()]); };

  if (!batch) return <div className="page"><div className="skel" style={{ height: 160 }} /></div>;
  const c = batch.counts;
  const editable = EDITABLE.includes(batch.status);
  const isCreator = batch.createdById === user?.id;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Student import', link: '#/student-import' }, { l: batch.code }]}
        title={batch.code}
        badge={<StatusBadge map={BATCH_STATUS_LABEL} status={batch.status} />}
        sub={`${batch.fileName} · received ${fmtDate(batch.createdAt)}${batch.sourceReference ? ' · ' + batch.sourceReference : ''}`}
        actions={<>
          {can('cancelImport') && !['FINALISED', 'CANCELLED'].includes(batch.status) ? <button type="button" className="btn" onClick={() => setCancelling(true)}>Cancel batch</button> : null}
          {can('finaliseImport') && batch.status === 'READY_TO_FINALISE' ? (
            <button type="button" className="btn primary" disabled={isCreator} title={isCreator ? 'A second person must finalise the batch you uploaded' : ''} onClick={() => setFinalising(true)}>Finalise batch</button>
          ) : null}
        </>}
      />

      {batch.status === 'IMPORT_FAILED' ? <Callout tone="err" title="Import failed. ">{batch.failureReason}</Callout> : null}
      {batch.status === 'VALIDATED_WITH_EXCEPTIONS' ? <Callout tone="warn" title="Review needed. ">Resolve or reject every exception and decide every possible duplicate. The batch then becomes ready to finalise.</Callout> : null}
      {batch.status === 'READY_TO_FINALISE' ? <Callout tone="ok" title="Ready to finalise. ">{isCreator ? 'You uploaded this batch, so another person with the finalise permission must finalise it.' : 'All rows are valid, rejected or skipped.'}</Callout> : null}
      {batch.status === 'FINALISED' ? <Callout tone="ok" title="Finalised. ">{`${c.created ?? 0} students created and ${c.linked ?? 0} linked to existing students on ${fmtDate(batch.finalisedAt)}. The batch can no longer change.`}</Callout> : null}

      <div className="grid g6 mb14 mt14">
        <Kpi label="Rows" value={c.total.toLocaleString('en-IN')} tone="b" />
        <Kpi label="Valid" value={c.valid.toLocaleString('en-IN')} tone="g" />
        <Kpi label="Exceptions" value={c.exceptions.toLocaleString('en-IN')} tone="r" />
        <Kpi label="Possible duplicates" value={c.duplicates.toLocaleString('en-IN')} tone="a" />
        <Kpi label="Skipped / rejected" value={`${c.skipped} / ${c.rejected}`} tone="" />
        <Kpi label="Imported" value={c.reconciled.toLocaleString('en-IN')} tone="v" />
      </div>

      {batch.ignoredColumns.length ? <div className="mb14"><Callout tone="info" title="Columns ignored: ">{batch.ignoredColumns.join(', ')}</Callout></div> : null}

      <div className="card">
        <div className="card-h">
          <h3>Rows <span className="sub">protected values masked</span></h3>
          <input className="inp sm" placeholder="Search name or source ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ width: 220 }} />
        </div>
        <div className="chips" style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(([k, l]) => (
            <button type="button" key={k} className={'btn xs' + (status === k ? ' primary' : '')} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>
          ))}
        </div>
        <ServerTable
          rows={rows} meta={meta} page={page} onPage={setPage} loading={loading} empty="No rows match." onRowClick={setOpen}
          columns={[
            { k: 'n', l: 'Row', className: 'mono', render: (r) => r.rowNumber },
            { k: 'name', l: 'Student', render: (r) => <div><b>{r.name || '—'}</b><div className="fs11 muted mono">{r.sourceRecordId ?? 'no source ID'}</div></div> },
            { k: 'status', l: 'Status', render: (r) => <StatusBadge map={ROW_STATUS_LABEL} status={r.status} /> },
            { k: 'issues', l: 'Issues', render: (r) => {
              const open = r.issues.filter((i) => i.status === 'OPEN');
              return open.length ? <span className="fs12">{open.slice(0, 2).map((i) => i.message).join('; ')}{open.length > 2 ? ` +${open.length - 2}` : ''}</span>
                : r.match ? <span className="fs12">{r.match.note}</span> : <span className="muted">—</span>;
            } },
            { k: 'track', l: 'Track', render: (r) => r.trackCode ?? <span className="muted">{r.trackSourceValue || '—'}</span> },
            { k: 'aadhaar', l: 'Aadhaar', className: 'mono', render: (r) => r.aadhaar ?? '—' },
          ]}
        />
      </div>

      {open ? (
        <RowDrawer
          row={open} batchId={batch.id} editable={editable && can('resolveImport')}
          onClose={() => setOpen(null)}
          onChanged={async (r) => { setOpen(r); await reloadAll(); }}
        />
      ) : null}
      {finalising ? <FinaliseModal batch={batch} onClose={() => setFinalising(false)} onDone={async () => { setFinalising(false); await reloadAll(); }} /> : null}
      {cancelling ? (
        <ReasonModal
          title={`Cancel ${batch.code}`} danger confirmLabel="Cancel batch"
          intro="Cancelling abandons the batch: none of its rows become students. The same file can then be uploaded again."
          onClose={() => setCancelling(false)}
          onConfirm={async () => {
            try { await importApi.cancel(batch.id); toastOk('Batch cancelled'); setCancelling(false); await reloadAll(); } catch (e) { toastError(e); }
          }}
        />
      ) : null}
    </div>
  );
}

function RowDrawer({ row, batchId, editable, onClose, onChanged }: {
  row: ImportRowView; batchId: string; editable: boolean; onClose: () => void; onChanged: (r: ImportRowView) => Promise<void>;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const open = row.issues.filter((i) => i.status === 'OPEN');
  const terminal = ['SKIPPED_UNCHANGED', 'RECONCILED'].includes(row.status);

  async function run(fn: () => Promise<{ data: ImportRowView; message: string }>) {
    setBusy(true);
    try { const r = await fn(); toastOk(r.message); setAction(null); await onChanged(r.data); } catch (e) { toastError(e); } finally { setBusy(false); }
  }

  const kv = (l: string, v: React.ReactNode) => <div className="kv"><span>{l}</span><b>{v ?? '—'}</b></div>;
  return (
    <Drawer title={`Row ${row.rowNumber} — ${row.name || 'unnamed'}`} size="wide" onClose={onClose} footer={editable && !terminal ? (
      <div className="f gp8 wrap" style={{ width: '100%', justifyContent: 'flex-end' }}>
        {row.status === 'ROW_REJECTED'
          ? <button type="button" className="btn" disabled={busy} onClick={() => run(() => importApi.restore(batchId, row.id))}>Restore row</button>
          : <button type="button" className="btn" style={{ color: 'var(--red)' }} onClick={() => setAction({ type: 'reject' })}>Reject row</button>}
        {open.length && row.status !== 'ROW_REJECTED' ? <button type="button" className="btn" onClick={() => setAction({ type: 'accept' })}>Accept issues with reason</button> : null}
        {row.match?.studentId && row.status !== 'ROW_REJECTED' ? <>
          <button type="button" className="btn" onClick={() => setAction({ type: 'decide', decision: 'HOLD' })}>Hold</button>
          <button type="button" className="btn" onClick={() => setAction({ type: 'decide', decision: 'DIFFERENT_PERSON' })}>Different person</button>
          <button type="button" className="btn primary" onClick={() => setAction({ type: 'decide', decision: 'SAME_PERSON' })}>Same person</button>
        </> : null}
      </div>
    ) : undefined}>
      <div className="f gp8 ac mb10"><StatusBadge map={ROW_STATUS_LABEL} status={row.status} /><span className="mono fs12 muted">{row.sourceRecordId ?? 'no source ID'}</span></div>

      {row.issues.length ? (
        <>
          <h4 className="mb6">Issues</h4>
          <div className="list mb14">
            {row.issues.map((i, n) => (
              <div key={n} className="list-row norow">
                <div className="lr-main"><b>{i.message}</b><span className="mono">{i.field} · {i.code}{i.reason ? ` · accepted: ${i.reason}` : ''}</span></div>
                {i.status === 'OPEN' ? <Badge tone="red">Open</Badge> : <Badge tone="green">Accepted</Badge>}
              </div>
            ))}
          </div>
        </>
      ) : null}
      {row.match ? (
        <div className="mb14"><Callout tone={row.match.tier === 'T3' ? 'info' : 'warn'} title={`Identity match (${row.match.tier}). `}>
          {row.match.note}{row.decision ? ` — decided: ${row.decision.replace('_', ' ').toLowerCase()} (${row.decisionReason})` : ''}
        </Callout></div>
      ) : null}
      {row.rejectReason ? <div className="mb14"><Callout tone="err" title="Rejected. ">{row.rejectReason}</Callout></div> : null}

      <h4 className="mb6">Values received <span className="muted fs11">(normalised; protected values masked)</span></h4>
      <div className="kv-grid">
        {kv('Name', row.name)}{kv('Father name', row.fatherName)}{kv('Mother name', row.motherName)}
        {kv('Date of birth', row.dateOfBirth)}{kv('Email', row.email)}{kv('Mobile', row.mobile)}{kv('Aadhaar', row.aadhaar)}
        {kv('Religion', row.religion)}{kv('Caste', row.caste)}{kv('Course centre', row.centreCode)}
        {kv('Technology', row.trackCode ? `${row.trackCode} (${row.trackSourceValue})` : row.trackSourceValue)}
        {kv('Education', row.educationQualification)}{kv('Approval', `${row.approvalStatus ?? '—'} · ${fmtDate(row.approvedAt)}`)}{kv('Evidence', row.evidenceRef)}
      </div>
      {row.documents ? (
        <>
          <h4 className="mb6 mt14">Documents</h4>
          <div className="f gp6 wrap">
            {Object.entries(row.documents).map(([k, d]) => <Badge key={k} tone={d.supplied ? 'green' : 'grey'}>{k.replace(/_/g, ' ').toLowerCase()}{d.barcode ? ` · ${d.barcode}` : ''}</Badge>)}
          </div>
        </>
      ) : null}

      {action ? (
        <ReasonModal
          busy={busy}
          title={action.type === 'accept' ? 'Accept issues with reason' : action.type === 'reject' ? 'Reject row' : `Decision: ${action.decision.replace('_', ' ').toLowerCase()}`}
          intro={action.type === 'accept' ? 'Only waivable issues (reference values, track not offered, missing documents) can be accepted. Identity, Aadhaar and approval issues must be corrected at the source.'
            : action.type === 'reject' ? 'A rejected row never becomes a student but stays visible in the batch. You can restore it before finalisation.'
              : action.decision === 'SAME_PERSON' ? 'The row will be linked to the existing student; protected identity fields are not overwritten.'
                : action.decision === 'DIFFERENT_PERSON' ? 'The row will become a new, separate student.' : 'The row stays on hold until the source clarifies; the batch cannot be finalised while it is on hold.'}
          confirmLabel={action.type === 'reject' ? 'Reject row' : 'Confirm'} danger={action.type === 'reject'}
          onClose={() => setAction(null)}
          onConfirm={(reason) => run(() => (action.type === 'accept' ? importApi.accept(batchId, row.id, reason)
            : action.type === 'reject' ? importApi.reject(batchId, row.id, reason)
              : importApi.decide(batchId, row.id, action.decision, reason)))}
        />
      ) : null}
    </Drawer>
  );
}

function FinaliseModal({ batch, onClose, onDone }: { batch: ImportBatch; onClose: () => void; onDone: () => Promise<void> }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { const r = await importApi.finalise(batch.id, code); toastOk(r.message); await onDone(); } catch (e) { toastError(e); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Finalise ${batch.code}`} onClose={onClose} footer={<>
      <button type="button" className="btn" onClick={onClose}>Cancel</button>
      <button type="button" className="btn primary" disabled={busy || code.trim().toUpperCase() !== batch.code} onClick={() => void go()}>Finalise</button>
    </>}>
      <p className="fs13" style={{ marginTop: 0 }}>
        {batch.counts.valid.toLocaleString('en-IN')} valid rows will be written to the student register in one transaction. The batch then becomes read-only.
      </p>
      <div className="fld">
        <label htmlFor="fin-code">Type <b className="mono">{batch.code}</b> to confirm</label>
        <input id="fin-code" className="inp mono" value={code} autoFocus onChange={(e) => setCode(e.target.value)} />
      </div>
    </Modal>
  );
}
