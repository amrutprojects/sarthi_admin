import { useCallback, useEffect, useState } from 'react';
import type { MasterQuery } from './components/MasterTable';

/*
 * Listing query state for a CMS master.
 *
 * Any change other than the page itself sends the listing back to page 1 — otherwise searching while
 * on page 7 of the old result set shows an empty page and looks like "no records".
 */
export function useMasterQuery<T extends MasterQuery>(initial: T) {
  const [query, setQuery] = useState<T>(initial);

  const patch = useCallback((p: Partial<T>) => {
    setQuery((q) => ({ ...q, ...p, page: p.page ?? 1 }));
  }, []);

  const reset = useCallback(() => setQuery(initial), [initial]);

  return { query, patch, reset };
}

/* Sets the browser tab title, as the other admin screens do. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} — AMRUT × SUMAGO Admin`;
  }, [title]);
}
