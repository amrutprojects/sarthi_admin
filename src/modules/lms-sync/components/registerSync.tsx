import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Callout, PageHead, fmt } from '../../../components/ui';
import { ConfirmModal, toastError, toastOk } from '../../../components/feedback/apiFeedback';
import Icon from '../../../components/ui/Icon';
import { ServerTable, fmtDate, type ServerColumn } from '../../students';
import { useLmsSyncList, useSyncActions, type LmsSyncFeature } from '../hooks/useLmsSync';
import { BULK_PUSH_MAX, SYNC_ERROR_LABEL, SYNC_FLAGS, isSyncFlag, type LmsSyncRow, type SyncFlag } from '../types/lmsSync.types';
import { SYNC_FLAG_LABEL, SyncFlagBadge } from './SyncFlagBadge';

const PAGE_SIZE = 25;
type Row = LmsSyncRow & { id: string };

/* Selected student ids, kept across pages and filters until cleared or pushed. */
function useRowSelection() {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { ids, toggle, addAll: (rowIds: string[]) => setIds((prev) => new Set([...prev, ...rowIds])), clear: () => setIds(new Set()) };
}
type RowSelection = ReturnType<typeof useRowSelection>;

const COLUMNS: ServerColumn<Row>[] = [
  { k: 'code', l: 'Code', render: (s) => <span className="lnk mono">{s.code}</span> },
  { k: 'name', l: 'Name', render: (s) => <b>{`${s.firstName} ${s.lastName}`.trim()}</b> },
  { k: 'centre', l: 'District', render: (s) => <span className="mono">{s.centreCode ?? '—'}</span> },
  { k: 'track', l: 'Track', render: (s) => <span className="mono">{s.trackCode ?? '—'}</span> },
  {
    k: 'eligible',
    l: 'Eligible',
    render: (s) => (s.eligible ? 'Yes' : <span className="muted">No ({s.studentStatus.toLowerCase().replace(/_/g, ' ')})</span>),
  },
  { k: 'flag', l: 'LMS sync', render: (s) => <SyncFlagBadge flag={s.syncStatus} /> },
  { k: 'lmsStatus', l: 'LMS status', render: (s) => (s.lmsStatus ? <span className="mono fs12">{s.lmsStatus}</span> : '—') },
  { k: 'learner', l: 'Learner code', render: (s) => <span className="mono">{s.lmsLearnerCode ?? '—'}</span> },
  { k: 'attempts', l: 'Attempts', render: (s) => String(s.attempts) },
  {
    k: 'error',
    l: 'Last error',
    render: (s) =>
      s.lastErrorCode ? (
        <span className="mono fs12" title={SYNC_ERROR_LABEL[s.lastErrorCode]}>
          {s.lastErrorCode}
        </span>
      ) : (
        '—'
      ),
  },
  { k: 'sent', l: 'Last sent', render: (s) => fmtDate(s.lastSentAt) },
];

const selectColumn = (sel: RowSelection): ServerColumn<Row> => ({
  k: 'select',
  l: 'Select',
  render: (s) => (
    <input
      type="checkbox"
      aria-label={'Select ' + s.code}
      checked={sel.ids.has(s.id)}
      onClick={(e) => e.stopPropagation()}
      onChange={() => sel.toggle(s.id)}
    />
  ),
});

/* Filters in the URL: sync (comma-separated flags), scope (all), q, page. */
function useSyncParams() {
  const [params, setParams] = useSearchParams();
  const flags = (params.get('sync') ?? '').split(',').filter(isSyncFlag);
  const scope: 'eligible' | 'all' = params.get('scope') === 'all' ? 'all' : 'eligible';
  const search = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const update = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  return { flags, scope, search, page, update };
}

/*
 * The student register's LMS sync view (GET /lms-sync/students): flag column, multi-flag filter with the summary's
 * counts, and, with imports.update, row selection with bulk "Push to LMS" and "Retry". A row opens the student,
 * whose detail carries the sync card.
 */
export function LmsSyncRegister({ feature, viewSwitch }: { feature: LmsSyncFeature; viewSwitch?: ReactNode }) {
  const navigate = useNavigate();
  const { flags, scope, search, page, update } = useSyncParams();
  const [searchInput, setSearchInput] = useState(search);
  const sel = useRowSelection();
  const list = useLmsSyncList({ page, limit: PAGE_SIZE, syncStatus: flags, scope, search: search || undefined });
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== search) update({ q: searchInput.trim() });
    }, 300);
    return () => clearTimeout(t);
    // update is recreated each render; only the typed text matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, search]);

  const rows: Row[] = (list.data?.items ?? []).map((r) => ({ ...r, id: r.studentId }));
  const counts = feature.summary?.byStatus;
  const toggleFlag = (f: SyncFlag) => update({ sync: (flags.includes(f) ? flags.filter((x) => x !== f) : [...flags, f]).join(',') });

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '#/dashboard' }, { l: 'Candidates', link: '#/candidates' }, { l: 'LMS sync' }]}
        title="Candidate Master"
        badge={
          <>
            <Badge tone="blue">LMS sync</Badge>
            {feature.summary?.tenantCode ? <span className="tag">tenant {feature.summary.tenantCode}</span> : null}
            {feature.summary ? <span className="tag">{fmt(feature.summary.eligible)} eligible</span> : null}
          </>
        }
        sub="Approved, active students are sent to the LMS; the flag shows where each one is. Counts cover eligible students."
      />

      {viewSwitch}

      {feature.paused ? (
        <div className="mb14">
          <Callout tone="warn" title="LMS sync is switched off. ">
            Push and Retry still queue students; they are sent once the server&apos;s sync is switched on.
          </Callout>
        </div>
      ) : null}

      <div className="pills mb14" role="group" aria-label="Sync flags">
        {SYNC_FLAGS.map((f) => (
          <button
            type="button"
            key={f}
            className={'chip' + (flags.includes(f) ? ' on' : '')}
            aria-pressed={flags.includes(f)}
            onClick={() => toggleFlag(f)}
          >
            {SYNC_FLAG_LABEL[f][0]} <b>{counts ? fmt(counts[f] ?? 0) : '…'}</b>
          </button>
        ))}
      </div>

      <div className="filterbar">
        <div className="fld">
          <label htmlFor="lms-scope">Students</label>
          <select id="lms-scope" className="inp" value={scope} onChange={(e) => update({ scope: e.target.value === 'all' ? 'all' : '' })}>
            <option value="eligible">Eligible (sent by the sync)</option>
            <option value="all">All students</option>
          </select>
        </div>
        <div className="fb-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setSearchInput('');
              update({ sync: '', scope: '', q: '' });
            }}
          >
            Reset
          </button>
          <input
            className="inp"
            placeholder="Student code or name"
            aria-label="Search students"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
      </div>

      {feature.canPush ? <BulkBar sel={sel} pageIds={rows.map((r) => r.id)} /> : null}

      {list.isError ? (
        <div className="mb14">
          <Callout tone="err" title="Could not load the LMS sync list. ">
            <button type="button" className="btn xs" onClick={() => void list.refetch()}>
              <Icon name="refresh" />
              Retry
            </button>
          </Callout>
        </div>
      ) : null}

      <div className="card">
        <ServerTable
          rows={rows}
          columns={feature.canPush ? [selectColumn(sel), ...COLUMNS] : COLUMNS}
          meta={list.data?.meta}
          page={page}
          onPage={(p) => update({ page: String(p) })}
          onRowClick={(r) => navigate('/candidates/' + r.id)}
          loading={list.isFetching}
          empty={list.isError ? 'The list could not be loaded.' : 'No students match the selected flags.'}
        />
      </div>
    </div>
  );
}

const skipText = (n: number) => (n ? `; ${fmt(n)} skipped (not eligible or not found).` : '.');

/* Bulk bar: select the page, clear, Push to LMS (confirmed first), Retry the selected failed students. */
function BulkBar({ sel, pageIds }: { sel: RowSelection; pageIds: string[] }) {
  const [confirm, setConfirm] = useState(false);
  const { push, retry } = useSyncActions();
  const n = sel.ids.size;
  const tooMany = n > BULK_PUSH_MAX;
  const busy = push.isPending || retry.isPending;
  const doPush = () =>
    push.mutate([...sel.ids], {
      onSuccess: (r) => {
        sel.clear();
        setConfirm(false);
        toastOk(`${fmt(r.queued.length)} student${r.queued.length === 1 ? '' : 's'} queued for the LMS` + skipText(r.skipped.length));
      },
      onError: toastError,
    });
  const doRetry = () =>
    retry.mutate([...sel.ids], {
      onSuccess: (r) => {
        sel.clear();
        toastOk(
          r.queued.length
            ? `${fmt(r.queued.length)} failed student${r.queued.length === 1 ? '' : 's'} queued again.`
            : 'None of the selected students had failed.',
        );
      },
      onError: toastError,
    });
  return (
    <div className="mb14">
      <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2" role="group" aria-label="LMS bulk actions">
        <span className="fs13">
          <b>{fmt(n)}</b> selected
        </span>
        <button type="button" className="btn xs" disabled={!pageIds.length} onClick={() => sel.addAll(pageIds)}>
          Select page
        </button>
        <button type="button" className="btn xs" disabled={!n} onClick={sel.clear}>
          Clear
        </button>
        <button type="button" className="btn xs" disabled={!n || tooMany || busy} onClick={doRetry}>
          Retry
        </button>
        <button type="button" className="btn xs primary" disabled={!n || tooMany || busy} onClick={() => setConfirm(true)}>
          Push to LMS
        </button>
      </div>
      {tooMany ? (
        <div className="mt6">
          <Callout tone="warn">Select at most {BULK_PUSH_MAX} students per action.</Callout>
        </div>
      ) : null}
      {confirm ? (
        <ConfirmModal
          title="Push to LMS"
          message={`Queue ${fmt(n)} selected student${n === 1 ? '' : 's'} for the LMS now, even if unchanged? Students that are not approved or not active are skipped.`}
          confirmLabel="Push to LMS"
          busy={push.isPending}
          onConfirm={doPush}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </div>
  );
}
