import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ApiError } from '../../../services/api-client';
import Icon from '../../../components/ui/Icon';
import MasterField, { fieldAria } from './MasterField';

interface SearchSelectProps<T extends { id: string }> {
  id: string;
  label: string;
  required?: boolean;
  /* Loads the matches for a search term. Called once typing settles, only for terms of minChars or more. */
  search: (term: string) => Promise<T[]>;
  /* The chosen option, kept as an object so its label shows without another request. */
  value: T | null;
  onChange: (option: T | null) => void;
  /* Text put in the box once an option is chosen, e.g. "Asha Patil (STU0001)". */
  optionText: (option: T) => string;
  /* Content of one row of the list; defaults to optionText. */
  renderOption?: (option: T) => ReactNode;
  /* Why an option cannot be chosen (shown on its row, and the row is not selectable), or undefined. */
  disabledReason?: (option: T) => string | undefined;
  placeholder?: string;
  minChars?: number;
  /*
   * The most rows the search returns (the backend's cap). A result of that size is probably cut off, so
   * the list then says so instead of looking complete.
   */
  truncatedAt?: number;
  hint?: ReactNode;
  error?: string;
  onBlur?: () => void;
}

const DEBOUNCE_MS = 300;

/*
 * Type-to-search select for lists too large for a <select> (the student register runs into thousands).
 *
 * Behaviour, in the order it matters:
 * - Nothing is requested until the term has minChars characters; then one request per pause in typing,
 *   never one per keystroke, and a stale response never overwrites a newer one.
 * - Editing the text after choosing clears the choice, so the box never shows one record while another
 *   is submitted.
 * - Options can be disabled with a reason (already assigned, inactive…) that is shown on the row.
 * - A capped result (truncatedAt) says that only the first matches are shown, so a missing record reads
 *   as "type more", not as "not in the register".
 * - Keyboard: ArrowUp / ArrowDown move, Enter chooses (without submitting the form), Escape closes. They
 *   act only on rows that are on screen: while a new search is pending the old rows are gone, so Enter
 *   cannot pick a row of the previous term.
 * - A failed request reports the failure in the list with Retry; the rest of the form keeps working.
 *
 * Like the other dropdowns this is convenience only: the backend re-checks whatever id is submitted.
 */
export default function SearchSelect<T extends { id: string }>({
  id, label, required, search, value, onChange, optionText, renderOption, disabledReason, placeholder, minChars = 2, truncatedAt, hint, error, onBlur,
}: SearchSelectProps<T>) {
  const [text, setText] = useState(value ? optionText(value) : '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  /* True once the user has typed: the text of a chosen value is not a search. */
  const [typed, setTyped] = useState(false);

  /* Kept in a ref so a new search function identity on re-render does not re-run the search. */
  const searchRef = useRef(search);
  searchRef.current = search;

  /* A value chosen (or reset) from outside shows its own label. */
  const valueId = value?.id ?? '';
  useEffect(() => {
    if (!value) return;
    setTyped(false);
    setText(optionText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId]);

  const term = text.trim();
  const searchable = typed && term.length >= minChars;

  useEffect(() => {
    if (!searchable) {
      setResults([]);
      setLoading(false);
      setFailure(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailure(null);
    /*
     * The rows of the previous term no longer match: drop them and the highlight now, not when the new
     * rows arrive, so nothing hidden behind "Searching…" can be chosen. The status hides the empty list,
     * so this causes no "Nothing matches" flash.
     */
    setResults([]);
    setActive(-1);
    const t = setTimeout(() => {
      searchRef.current(term)
        .then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setActive(-1);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setResults([]);
          setActive(-1);
          setFailure(err instanceof ApiError ? err.fullMessage : 'Could not search');
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, searchable, attempt]);

  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;
  const isDisabled = (o: T) => !!disabledReason?.(o);

  const choose = (o: T) => {
    if (isDisabled(o)) return;
    setTyped(false);
    setText(optionText(o));
    setOpen(false);
    onChange(o);
  };

  const clear = () => {
    setTyped(false);
    setText('');
    setResults([]);
    setOpen(false);
    onChange(null);
  };

  /* Next selectable row in a direction, wrapping around; -1 when none is selectable. */
  const step = (from: number, dir: 1 | -1): number => {
    for (let n = 1; n <= results.length; n++) {
      const i = (from + dir * n + results.length * 2) % results.length;
      if (!isDisabled(results[i])) return i;
    }
    return -1;
  };

  const showList = open && typed && term.length > 0;
  let status: ReactNode = null;
  if (term.length < minChars) status = `Type at least ${minChars} characters.`;
  else if (loading) status = 'Searching…';
  else if (failure) {
    status = (
      <span style={{ color: 'var(--red)', fontWeight: 600 }}>
        {failure}{' '}
        <button type="button" className="btn xs" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      </span>
    );
  } else if (!results.length) status = `Nothing matches “${term}”.`;
  /* The rows are on screen only when no status line stands in their place. */
  const listShown = showList && !status;
  /* The search for the current term has settled (results are emptied while one is pending). */
  const settled = searchable && !loading && !failure;
  const truncated = listShown && truncatedAt !== undefined && results.length >= truncatedAt;

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      /* From nothing highlighted, Down starts at the first row and Up at the last. */
      if (settled && results.length) setActive((a) => step(a >= 0 ? a : dir === 1 ? -1 : 0, dir));
    } else if (e.key === 'Enter') {
      /* Enter in a search box chooses a row; it must never submit the surrounding form. */
      e.preventDefault();
      if (listShown && active >= 0 && results[active]) choose(results[active]);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  }

  return (
    <MasterField id={id} label={label} required={required} error={error} hint={hint}>
      <div style={{ position: 'relative' }}>
        <input
          className="inp"
          {...fieldAria(id, error)}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listShown}
          aria-controls={listShown ? listId : undefined}
          aria-activedescendant={listShown && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          style={value ? { paddingRight: 36 } : undefined}
          onChange={(e) => {
            setTyped(true);
            setText(e.target.value);
            setOpen(true);
            /*
             * Drop the highlight with the keystroke itself: the search effect's reset renders a moment
             * later, and an Enter that comes in between (a fast typist, a barcode scanner) must not pick
             * a row of the previous term.
             */
            setActive(-1);
            if (value) onChange(null);
          }}
          onFocus={() => { if (typed) setOpen(true); }}
          onBlur={() => {
            setOpen(false);
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
        />
        {value ? (
          <button
            type="button"
            className="btn xs"
            title="Clear"
            aria-label={`Clear ${label}`}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
            onClick={clear}
          >
            <Icon name="x" />
          </button>
        ) : null}

        {showList ? (
          <div
            className="pop"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4 }}
            /*
             * Keep focus in the input for any press inside the popup — a row, Retry, or the list's own
             * scrollbar — so the input's blur does not close the list before the click or drag lands.
             */
            onMouseDown={(e) => e.preventDefault()}
          >
            {status ? <div className="hint" style={{ padding: '9px 14px', margin: 0 }} role="status">{status}</div> : null}
            {truncated ? (
              <div className="hint" style={{ padding: '9px 14px', margin: 0 }} role="status">
                Showing the first {results.length} matches — type more to narrow the search
              </div>
            ) : null}
            {!status ? (
              <div className="pop-b" id={listId} role="listbox" aria-label={label} style={{ maxHeight: 300 }}>
                {results.map((o, i) => {
                  const reason = disabledReason?.(o);
                  return (
                    <div
                      key={o.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={value?.id === o.id}
                      aria-disabled={reason ? true : undefined}
                      className="menu-item"
                      style={{
                        display: 'block',
                        cursor: reason ? 'not-allowed' : 'pointer',
                        opacity: reason ? 0.6 : 1,
                        background: i === active ? 'var(--brand-050)' : undefined,
                      }}
                      onMouseEnter={() => { if (!reason) setActive(i); }}
                      onClick={() => choose(o)}
                    >
                      {renderOption ? renderOption(o) : optionText(o)}
                      {reason ? <div className="hint" style={{ margin: 0 }}>{reason}</div> : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </MasterField>
  );
}
