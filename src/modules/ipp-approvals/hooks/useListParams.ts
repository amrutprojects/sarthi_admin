import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*
 * The filters, sorting and page of a list, kept in the URL (shareable, and Back returns to the same list). A value the
 * API would refuse reads as "not set". Any change except paging goes back to page 1.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();
  const text = (key: string) => params.get(key)?.trim() ?? '';
  const id = (key: string) => (UUID.test(text(key)) ? text(key) : '');
  const oneOf = <T extends string>(key: string, allowed: readonly T[]): T | undefined => allowed.find((v) => v === params.get(key));
  const page = Math.max(1, Math.trunc(Number(params.get('page'))) || 1);
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
  return { text, id, oneOf, page, update };
}

/* The newest version of a function that each render makes anew, for effects that must not run because of it. */
function useLatest<A extends unknown[]>(fn: (...args: A) => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return ref;
}

/* A search box committed after a pause in typing; it follows the URL (Back, Reset). */
export function useDebouncedSearch(committed: string, commit: (value: string) => void) {
  const [input, setInput] = useState(committed);
  const latest = useLatest(commit);
  useEffect(() => setInput(committed), [committed]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim() !== committed) latest.current(input.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [input, committed, latest]);
  return [input, setInput] as const;
}

/* After a decision the last page may no longer exist: go to the one that does. */
export function useExistingPage(page: number, totalPages: number | undefined, goTo: (page: number) => void) {
  const latest = useLatest(goTo);
  useEffect(() => {
    if (totalPages !== undefined && page > Math.max(1, totalPages)) latest.current(Math.max(1, totalPages));
  }, [page, totalPages, latest]);
}
