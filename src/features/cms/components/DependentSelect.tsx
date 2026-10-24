import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../services/api-client';
import MasterField, { fieldAria } from './MasterField';
import { optionLabel, type GeoOption } from '../types';

/* Shown once a preselected value (a ?centreId= style deep link) turned out not to be in the list. */
const DROPPED_HINT = 'The preselected entry is inactive or no longer exists, so it was cleared. Choose one from the list.';

/*
 * True when a non-empty value is in neither the loaded rows nor the extra option. Such a value would sit
 * in the form unseen — a controlled <select> shows its first entry instead — and be submitted anyway.
 */
const isUnlisted = (value: string, rows: GeoOption[], extraOption?: GeoOption | null): boolean =>
  !!value && extraOption?.id !== value && !rows.some((o) => o.id === value);


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
 * - Clears a preselected value that the loaded list does not contain (an inactive or removed record
 *   from a deep link) and says so, since the select could not show it. The saved value of an edit form
 *   arrives as extraOption and is kept.
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
  const [dropped, setDropped] = useState(false);

  /* Kept in a ref so the clear-on-parent-change effect does not re-run when the parent re-renders. */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  /* Read when a load settles, so the check sees the value and extra option of that moment. */
  const valueRef = useRef(value);
  valueRef.current = value;
  const extraRef = useRef(extraOption);
  extraRef.current = extraOption;
  const previousParent = useRef(parentValue);

  useEffect(() => {
    if (previousParent.current === parentValue) return;
    previousParent.current = parentValue;
    setDropped(false);
    onChangeRef.current('');
    /*
     * The form re-renders with '' later; until then the ref would still hold the old child, and a load
     * that settles first would take it for a dropped preselection.
     */
    valueRef.current = '';
  }, [parentValue]);

  useEffect(() => {
    if (!parentValue) {
      setOptions([]);
      setFailure(null);
      setLoading(false);
      /* A preselected child without its parent (a hand-made ?districtId= link) cannot be shown either. */
      if (valueRef.current) onChangeRef.current('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    load(parentValue)
      .then((rows) => {
        if (cancelled) return;
        setOptions(rows);
        if (isUnlisted(valueRef.current, rows, extraRef.current)) {
          setDropped(true);
          onChangeRef.current('');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOptions([]);
        setFailure(err instanceof ApiError ? err.fullMessage : 'Could not load the list');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentValue, attempt]);

  /* The notice is about the dropped preselection only; any choice (or a new parent, above) retires it. */
  useEffect(() => {
    if (value) setDropped(false);
  }, [value]);

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
          : dropped && !value
            ? DROPPED_HINT
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
 * Same loading / empty / failure handling as DependentSelect, minus the parent: it loads once. The only
 * time it clears the value by itself is when the loaded list (plus extraOption) does not contain it — a
 * preselection from a deep link that names an inactive or removed record — so that a value the select
 * cannot show is never submitted.
 */
export function RootSelect({
  id, label, required, load, value, onChange, placeholder, emptyHint, hint, extraOption, error,
}: RootSelectProps) {
  const [options, setOptions] = useState<GeoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [dropped, setDropped] = useState(false);

  /* Read when the load settles; refs, so the load effect does not re-run on every parent render. */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;
  const extraRef = useRef(extraOption);
  extraRef.current = extraOption;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    load()
      .then((rows) => {
        if (cancelled) return;
        setOptions(rows);
        if (isUnlisted(valueRef.current, rows, extraRef.current)) {
          setDropped(true);
          onChangeRef.current('');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOptions([]);
        setFailure(err instanceof ApiError ? err.fullMessage : 'Could not load the list');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (value) setDropped(false);
  }, [value]);

  const shown = extraOption && !options.some((o) => o.id === extraOption.id) ? [extraOption, ...options] : options;
  const empty = !loading && !failure && shown.length === 0;

  return (
    <MasterField
      id={id}
      label={label}
      required={required}
      error={error}
      hint={loading ? 'Loading…' : empty ? emptyHint : failure ? undefined : dropped && !value ? DROPPED_HINT : hint}
    >
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
