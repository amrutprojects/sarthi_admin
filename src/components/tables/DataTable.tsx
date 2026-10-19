import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import AS from '../../legacy';
import Icon from '../ui/Icon';
import { EmptyState, fmt, useGo } from '../ui/index';

/* One table column. `k` names a row field (or a virtual key when sortVal/render are given). */
export interface Column<T> {
  k: string;
  l: string;
  w?: string;
  align?: 'right';
  sortable?: boolean;
  sortVal?: (row: T) => unknown;
  render?: (row: T) => ReactNode;
  exportVal?: (row: T) => unknown;
}

export type SearchKey<T> = Extract<keyof T, string> | ((row: T) => unknown);

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  pageSize?: number;
  search?: SearchKey<T>[];
  searchLabel?: string;
  rowLink?: (row: T) => string | null;
  exportName?: string;
  emptyMsg?: string;
  defaultSort?: string | null;
  defaultDir?: 'asc' | 'desc';
}

const field = <T,>(row: T, k: string): unknown => (row as Record<string, unknown>)[k];

/*
 * React version of the original data table (U.table): search, sort, pagination,
 * column chooser and CSV / Excel / PDF export, with the same markup and classes.
 */
export default function DataTable<T>({
  rows, columns, pageSize: initialSize = 12, search, searchLabel, rowLink, exportName = 'export', emptyMsg, defaultSort = null, defaultDir = 'asc',
}: DataTableProps<T>) {
  const go = useGo();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<string | null>(defaultSort);
  const [dir, setDir] = useState<'asc' | 'desc'>(defaultDir);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const [cols, setCols] = useState<string[]>(() => columns.map((c) => c.k));
  const [chooser, setChooser] = useState(false);

  const filtered = useMemo(() => {
    let out = rows.slice();
    if (q && search) {
      const qq = q.toLowerCase();
      out = out.filter((r) => search.some((k) => {
        const v = typeof k === 'function' ? k(r) : field(r, k);
        return String(v == null ? '' : v).toLowerCase().includes(qq);
      }));
    }
    const col = sort ? columns.find((c) => c.k === sort) : undefined;
    if (col) {
      const valueOf = (r: T) => (col.sortVal ? col.sortVal(r) : field(r, col.k));
      out.sort((a, b) => {
        const va = valueOf(a), vb = valueOf(b);
        if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
        const sa = String(va == null ? '' : va).toLowerCase(), sb = String(vb == null ? '' : vb).toLowerCase();
        const c = sa < sb ? -1 : sa > sb ? 1 : 0;
        return dir === 'asc' ? c : -c;
      });
    }
    return out;
  }, [rows, q, search, sort, dir, columns]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * pageSize, cur * pageSize);
  const visCols = columns.filter((c) => cols.includes(c.k));

  let from = Math.max(1, cur - 2);
  const to = Math.min(pages, from + 4);
  from = Math.max(1, to - 4);
  const pageBtns: number[] = [];
  for (let p = from; p <= to; p++) pageBtns.push(p);

  function toggleSort(k: string) {
    if (sort === k) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSort(k); setDir('asc'); }
  }

  function doExport(fmtType: 'csv' | 'xls' | 'pdf') {
    const exportCols = columns.map((c) => ({
      l: c.l,
      exportVal: c.exportVal || ((r: T) => (c.sortVal ? c.sortVal(r) : field(r, c.k))),
    }));
    AS.ui.exportRows(exportName, exportCols, filtered, fmtType);
  }

  return (
    <div>
      <div className="tbl-top">
        {search
          ? <div className="grow"><input className="inp sm" placeholder={'Search ' + (searchLabel || 'records') + '...'} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
          : <div className="grow" />}
        <button type="button" className="btn sm" onClick={() => setChooser(true)}><Icon name="filter" /><span className="hide-s">Columns</span></button>
        <button type="button" className="btn sm" onClick={() => doExport('csv')}><Icon name="download" />CSV</button>
        <button type="button" className="btn sm" onClick={() => doExport('xls')}>Excel</button>
        <button type="button" className="btn sm" onClick={() => doExport('pdf')}>PDF</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {visCols.map((c) => {
                const sortable = c.sortable !== false;
                const on = sort === c.k;
                return (
                  <th key={c.k} className={(sortable ? 'sortable' : '') + (on ? ' on' : '')} style={c.w ? { width: c.w } : undefined} onClick={sortable ? () => toggleSort(c.k) : undefined}>
                    {c.l}{sortable ? <span className="arw">{on ? (dir === 'asc' ? '▲' : '▼') : '⇅'}</span> : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slice.length ? slice.map((r, i) => {
              const link = rowLink ? rowLink(r) : null;
              const id = field(r, 'id');
              return (
                <tr key={typeof id === 'string' ? id : i} className={link ? undefined : 'norow'} onClick={link ? () => go(link) : undefined}>
                  {visCols.map((c) => <td key={c.k} className={c.align === 'right' ? 'num' : ''}>{c.render ? c.render(r) : (field(r, c.k) as ReactNode)}</td>)}
                </tr>
              );
            }) : (
              <tr className="norow"><td colSpan={visCols.length}><EmptyState title="No records found" msg={emptyMsg || 'Adjust your filters or search terms to see results.'} /></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="tbl-bot">
        <div className="info">Showing <b>{total ? (cur - 1) * pageSize + 1 : 0}-{Math.min(total, cur * pageSize)}</b> of <b>{fmt(total)}</b> records</div>
        <select className="inp sm" style={{ width: 'auto' }} value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}>
          {[10, 12, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <div className="pager">
          <button type="button" disabled={cur === 1} onClick={() => setPage(1)}>«</button>
          <button type="button" disabled={cur === 1} onClick={() => setPage(cur - 1)}>‹</button>
          {pageBtns.map((p) => <button type="button" key={p} className={p === cur ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>)}
          <button type="button" disabled={cur === pages} onClick={() => setPage(cur + 1)}>›</button>
          <button type="button" disabled={cur === pages} onClick={() => setPage(pages)}>»</button>
        </div>
      </div>
      {chooser && <ColumnChooser columns={columns} selected={cols} onClose={() => setChooser(false)} onApply={(sel) => { setCols(sel); setChooser(false); }} />}
    </div>
  );
}

interface ColumnChooserProps<T> { columns: Column<T>[]; selected: string[]; onClose: () => void; onApply: (keys: string[]) => void }

function ColumnChooser<T>({ columns, selected, onClose, onApply }: ColumnChooserProps<T>) {
  const [sel, setSel] = useState(selected);
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  return createPortal(
    <div className="ov" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-h"><h3>Choose visible columns</h3><button type="button" className="x-btn" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <div className="grid g2">
            {columns.map((c) => (
              <label key={c.k} className="f ac gp8" style={{ padding: '6px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={sel.includes(c.k)} onChange={() => toggle(c.k)} /> <span className="fs13">{c.l || c.k}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={() => {
            if (!sel.length) { AS.ui.toast('Select at least one column.', 'warn'); return; }
            onApply(columns.map((c) => c.k).filter((k) => sel.includes(k)));
          }}>Apply</button>
        </div>
      </div>
    </div>,
    document.getElementById('react-modal-root') ?? document.body,
  );
}
