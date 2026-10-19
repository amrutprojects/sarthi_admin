import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api-client';
import MasterField, { fieldAria } from './MasterField';
import { optionLabel, type GeoOption } from '../types';

interface DependentSelectProps {
  id: string;
  label: string;
  required?: boolean;
  /* The parent selection this list depends on. '' means nothing is chosen yet. */
  parentValue: string;
  /* Loads the options for one parent value. Called only when parentValue is non-empty. */
  load: (parentValue: string) => Promise<GeoOption[]>;
  value: string;
  onChange: (value: string) => void;
  /* "Select district" */
  placeholder: string;
  /* Shown while no parent is chosen: "Select a state first". */
  disabledHint: string;
  /* Shown when the parent has no usable children: "This state has no active districts yet." */
  emptyHint: string;
  /*
   * Kept in the list even when the loader does not return it. Used on edit screens so a record whose
   * parent was deactivated after it was created still shows its current parent instead of silently
   * losing it.
   */
  extraOption?: GeoOption | null;
  error?: string;
}

/*
 * The dependent half of a cascading dropdown (State -> District -> Taluka).
 *
 * Behaviour, in the order it matters:
 * - Disabled until the parent is chosen, with a hint saying so.
 * - Loads its options whenever the parent changes, showing a loading state while it does.
 * - Clears the current selection as soon as the parent changes, so a stale child can never be
 *   submitted. It does NOT clear on first render, so an edit form keeps the saved value.
 * - A failed request leaves the form usable: the field reports the failure and offers Retry, and the
 *   rest of the form keeps working.
 * - An empty result says so rather than looking like a dropdown that simply has not loaded.
 *
 * None of this is a security boundary. The backend re-checks that the chosen child really belongs to
 * the chosen parent on every write.
 */
export default function DependentSelect({
  id, label, required, parentValue, load, value, onChange, placeholder, disabledHint, emptyHint, extraOption, error,
}: DependentSelectProps) {
  const [options, setOptions] = useState<GeoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  /* Kept in a ref so the clear-on-parent-change effect does not re-run when the parent re-renders. */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const previousParent = useRef(parentValue);

  useEffect(() => {
    if (previousParent.current === parentValue) return;
    previousParent.current = parentValue;
    onChangeRef.current('');
  }, [parentValue]);

  useEffect(() => {
    if (!parentValue) {
      setOptions([]);
      setFailure(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    load(parentValue)
      .then((rows) => { if (!cancelled) setOptions(rows); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOptions([]);
        setFailure(err instanceof ApiError ? err.fullMessage : 'Could not load the list');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentValue, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /* The saved parent of an edit form may be missing from the active list; keep it selectable. */
  const shown = extraOption && !options.some((o) => o.id === extraOption.id) ? [extraOption, ...options] : options;
  const disabled = !parentValue || loading || !!failure;
  const empty = !!parentValue && !loading && !failure && shown.length === 0;

  const hint = !parentValue
    ? disabledHint
    : loading
      ? 'Loading…'
      : failure
        ? null
        : empty
          ? emptyHint
          : undefined;

  return (
    <MasterField id={id} label={label} required={required} error={error} hint={hint}>
      <select className="inp" {...fieldAria(id, error)} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{loading ? 'Loading…' : placeholder}</option>
        {shown.map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
      </select>
      {failure ? (
        <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }}>
          {failure}{' '}
          <button type="button" className="btn xs" onClick={retry}>Retry</button>
        </div>
      ) : null}
    </MasterField>
  );
}

interface RootSelectProps {
  id: string;
  label: string;
  required?: boolean;
  /* Loads the whole list once. */
  load: () => Promise<GeoOption[]>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyHint: string;
  hint?: string;
  extraOption?: GeoOption | null;
  error?: string;
}

/*
 * The first dropdown of a cascade (the State select), which depends on nothing.
 *
 * Same loading / empty / failure handling as DependentSelect, minus the parent: it loads once and
 * never clears the current value by itself.
 */
export function RootSelect({
  id, label, required, load, value, onChange, placeholder, emptyHint, hint, extraOption, error,
}: RootSelectProps) {
  const [options, setOptions] = useState<GeoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    load()
      .then((rows) => { if (!cancelled) setOptions(rows); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOptions([]);
        setFailure(err instanceof ApiError ? err.fullMessage : 'Could not load the list');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const shown = extraOption && !options.some((o) => o.id === extraOption.id) ? [extraOption, ...options] : options;
  const empty = !loading && !failure && shown.length === 0;

  return (
    <MasterField id={id} label={label} required={required} error={error} hint={loading ? 'Loading…' : empty ? emptyHint : failure ? undefined : hint}>
      <select className="inp" {...fieldAria(id, error)} disabled={loading || !!failure} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{loading ? 'Loading…' : placeholder}</option>
        {shown.map((o) => <option key={o.id} value={o.id}>{optionLabel(o)}</option>)}
      </select>
      {failure ? (
        <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }}>
          {failure}{' '}
          <button type="button" className="btn xs" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
        </div>
      ) : null}
    </MasterField>
  );
}
