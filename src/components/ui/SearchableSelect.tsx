import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Icon from './Icon';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  /* Id of the trigger button, so a <label htmlFor> focuses it. */
  id: string;
  /* Field name, read out for the search box and the list ("Search Caste"). */
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  searchPlaceholder?: string;
  invalid?: boolean;
  /* Receives the trigger button, e.g. react-hook-form's field.ref so a failed validation can focus it. */
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

/*
 * A dropdown for short, already-loaded lists (masters, the 12 tracks) with a search box at the top of the list.
 * It replaces a <select> where the list is long enough that scrolling for an entry is slow.
 *
 * - The trigger looks like the form's other inputs; opening it puts focus in the search box.
 * - Typing filters by any part of the label, case-insensitively (Devanagari included).
 * - Keyboard: Enter / Space / ArrowDown open; ArrowUp / ArrowDown move; Enter chooses (never submits the form);
 *   Escape closes and returns focus to the trigger. A press outside closes it.
 * For server-side search over very large lists use features/cms/components/SearchSelect instead.
 */
export default function SearchableSelect({
  id, label, options, value, onChange, onBlur, placeholder = 'Select', searchPlaceholder = 'Search…', invalid, buttonRef,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const matches = useMemo(() => {
    const t = term.trim().toLocaleLowerCase();
    return t ? options.filter((o) => o.label.toLocaleLowerCase().includes(t)) : options;
  }, [options, term]);

  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  const openList = () => {
    setTerm('');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
    onBlur?.();
  };
  const choose = (o: SelectOption) => {
    onChange(o.value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Keep the highlighted row in view while moving with the keyboard. */
  useEffect(() => {
    if (open) listRef.current?.querySelector(`#${CSS.escape(optionId(active))}`)?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, open]);

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openList();
    }
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!matches.length) return;
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + dir + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const o = matches[active];
      if (o) choose(o);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      close(false);
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        ref={(el) => {
          triggerRef.current = el;
          buttonRef?.(el);
        }}
        id={id}
        type="button"
        className="inp"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textAlign: 'left', cursor: 'pointer' }}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKey}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? undefined : 'var(--muted)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <span aria-hidden="true" style={{ display: 'inline-flex', transform: open ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .12s' }}>
          <Icon name="chevR" />
        </span>
      </button>

      {open ? (
        <div className="pop" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4 }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)', position: 'relative' }}>
            <span aria-hidden="true" style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', color: 'var(--muted)' }}>
              <Icon name="search" />
            </span>
            <input
              ref={searchRef}
              className="inp sm"
              role="combobox"
              aria-label={`Search ${label}`}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={matches[active] ? optionId(active) : undefined}
              autoComplete="off"
              placeholder={searchPlaceholder}
              value={term}
              style={{ paddingLeft: 30, width: '100%' }}
              onChange={(e) => {
                setTerm(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
            />
          </div>
          <div ref={listRef} className="pop-b" id={listId} role="listbox" aria-label={label} style={{ maxHeight: 260 }}>
            {matches.length ? (
              matches.map((o, i) => (
                <div
                  key={o.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={o.value === value}
                  className="menu-item"
                  style={{ display: 'block', cursor: 'pointer', background: i === active ? 'var(--brand-050)' : undefined }}
                  onMouseEnter={() => setActive(i)}
                  /* Keep focus in the search box so its blur does not close the list before the click lands. */
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                >
                  {o.label}
                </div>
              ))
            ) : (
              <div className="hint" style={{ padding: '9px 14px', margin: 0 }} role="status">
                Nothing matches “{term.trim()}”.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
