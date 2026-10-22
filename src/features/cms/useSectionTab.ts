import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SectionTab } from './components/SectionTabs';

/*
 * The open tab of a sectioned CMS view page, kept in the URL (?tab=) as on Modules and Apply Page
 * Management, so a reload or a shared link keeps it. A missing or unknown value opens the first tab.
 * Switching replaces the history entry, so Back leaves the page instead of stepping through the tabs.
 */
export function useSectionTab<T extends string>(tabs: readonly SectionTab<T>[]): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab = tabs.find((t) => t.k === requested)?.k ?? tabs[0]!.k;
  const setTab = useCallback(
    (next: T) =>
      setParams(
        (current) => {
          const copy = new URLSearchParams(current);
          copy.set('tab', next);
          return copy;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [tab, setTab];
}
