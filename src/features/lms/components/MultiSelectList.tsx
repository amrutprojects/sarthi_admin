import { useMemo, useState, type ReactNode } from 'react';

/*
 * Checkbox list for choosing several reference records (the centres and tracks an LMS entity delivers,
 * F-LMS-03-04 / -05), shared by the LMS masters.
 *
 * - A search box narrows the list (label, code line and group); "Select all" / "Select none" act on the
 *   rows on screen, so "search Nashik → Select all" enables exactly the Nashik centres.
 * - Options can be grouped (e.g. centres under their district).
 * - Loading, error (with Retry) and empty states, so an empty list never reads as "nothing exists" while it
 *   is still on its way or failed.
 * - Values already saved on the record that are no longer offered (deactivated or deleted at the source)
 *   stay visible as "(inactive)": still ticked, so nothing disappears silently, and they can be unticked;
 *   once unticked they cannot be ticked again (the backend refuses an inactive record too).
 *
 * The list is a convenience: the backend re-checks every id it receives.
 */
export interface MultiSelectOption {
  id: string;
  label: string;
  /* Second line, e.g. the code. Searched as well. */
  sub?: string | null;
  /* Group heading, e.g. the district. Options without a group are listed first. */
  group?: string | null;
  /* True for an inactive record: selectable only to untick it. */
  inactive?: boolean;
}

interface MultiSelectListProps {
  id: string;
  label: string;
  /* The records that may be chosen (active ones). */
  options: MultiSelectOption[];
  /* The record's saved values; any of them missing from `options` is shown as inactive. */
  saved?: MultiSelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  /* Message of a failed load; shown with Retry. */
  error?: string | null;
  onRetry?: () => void;
  emptyMsg: string;
  /* Noun for the counter and the search box, e.g. "centres". */
  noun: string;
  required?: boolean;
  hint?: ReactNode;
  fieldError?: string;
  disabled?: boolean;
}

const INACTIVE = ' (inactive)';

export default function MultiSelectList({
  id, label, options, saved = [], value, onChange, loading, error, onRetry, emptyMsg, noun, required, hint, fieldError, disabled,
}: MultiSelectListProps) {
  const [term, setTerm] = useState('');

  /* Offered options plus saved values that are no longer offered (shown inactive). */
  const all = useMemo(() => {
    const offered = new Map(options.map((o) => [o.id, o]));
    const extra = saved.filter((s) => !offered.has(s.id)).map((s) => ({ ...s, inactive: true }));
    return [...options, ...extra];
  }, [options, saved]);

  const needle = term.trim().toLowerCase();
  const visible = needle
    ? all.filter((o) => [o.label, o.sub ?? '', o.group ?? ''].some((t) => t.toLowerCase().includes(needle)))
    : all;

  const selected = new Set(value);
  const selectable = (o: MultiSelectOption) => !o.inactive || selected.has(o.id);

  const toggle = (o: MultiSelectOption) => {
    if (disabled || !selectable(o)) return;
    onChange(selected.has(o.id) ? value.filter((v) => v !== o.id) : [...value, o.id]);
  };
  const selectAll = () => {
    const add = visible.filter((o) => !o.inactive && !selected.has(o.id)).map((o) => o.id);
    onChange([...value, ...add]);
  };
  const selectNone = () => {
    const drop = new Set(visible.map((o) => o.id));
    onChange(value.filter((v) => !drop.has(v)));
  };

  /* Ungrouped first, then groups A to Z; order inside a group is the order received. */
  const byGroup = new Map<string, MultiSelectOption[]>();
  for (const o of visible) byGroup.set(o.group ?? '', [...(byGroup.get(o.group ?? '') ?? []), o]);
  const groups = [...byGroup.entries()].sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));

  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const activeCount = all.filter((o) => !o.inactive).length;

  let body: ReactNode;
  if (error) {
    body = (
      <div className="callout c-err" role="alert">
        <div>
          <b>Could not load the {noun}. </b>
          {error}{' '}
          {onRetry ? <button type="button" className="btn xs" onClick={onRetry}>Retry</button> : null}
        </div>
      </div>
    );
  } else if (loading) {
    body = <div className="muted fs12" aria-live="polite">Loading {noun}…</div>;
  } else if (!all.length) {
    body = <div className="muted fs12">{emptyMsg}</div>;
  } else if (!visible.length) {
    body = <div className="muted fs12">No {noun} match “{term.trim()}”.</div>;
  } else {
    body = groups.map(([group, rows]) => (
      <div key={group || '-'} style={{ marginBottom: 6 }}>
        {group ? <div className="fs12" style={{ fontWeight: 700, color: 'var(--text-2)', margin: '6px 0 2px' }}>{group}</div> : null}
        {rows.map((o) => {
          const checked = selected.has(o.id);
          const boxId = `${id}-${o.id}`;
          return (
            <label key={o.id} htmlFor={boxId} className="f ac gp8" style={{ padding: '3px 0', cursor: selectable(o) && !disabled ? 'pointer' : 'default' }}>
              <input id={boxId} type="checkbox" checked={checked} disabled={disabled || !selectable(o)} onChange={() => toggle(o)} />
              <span className="fs13" style={{ color: o.inactive ? 'var(--muted)' : undefined }}>
                {o.label}
                {o.inactive ? INACTIVE : ''}
                {o.sub ? <span className="muted mono fs12"> · {o.sub}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    ));
  }

  return (
    <div className="fld">
      <label id={labelId} htmlFor={`${id}-search`}>
        {label}
        {required ? <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span> : null}
      </label>
      <div className="f ac gp8 wrap" style={{ marginBottom: 6 }}>
        <input
          id={`${id}-search`}
          className="inp sm grow"
          style={{ minWidth: 160 }}
          placeholder={`Search ${noun}…`}
          value={term}
          disabled={disabled || loading || !!error || !all.length}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button type="button" className="btn xs" disabled={disabled || loading || !!error || !visible.some((o) => !o.inactive)} onClick={selectAll}>
          Select all
        </button>
        <button type="button" className="btn xs" disabled={disabled || loading || !!error || !visible.some((o) => selected.has(o.id))} onClick={selectNone}>
          Select none
        </button>
        <span className="muted fs12" aria-live="polite">
          {value.length} selected · {activeCount} available
        </span>
      </div>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={fieldError ? errorId : undefined}
        aria-busy={loading || undefined}
        style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 10px', maxHeight: 240, overflowY: 'auto', background: 'var(--surface)' }}
      >
        {body}
      </div>
      {fieldError ? (
        <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={errorId} role="alert">
          {fieldError}
        </div>
      ) : hint ? (
        <div className="hint">{hint}</div>
      ) : null}
    </div>
  );
}
