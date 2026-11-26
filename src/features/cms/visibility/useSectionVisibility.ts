import { useCallback, useEffect, useState } from 'react';
import { useApiData } from '../shared';
import type { SectionVisibility, SectionVisibilityKey } from './visibility.types';
import { visibilityService } from './visibilityService';

/*
 * Home Page Management's view of which sections the website shows, loaded once for the page. A switch's result
 * replaces its section's row, so the bar and the tab strip follow without reloading the list. The section's own
 * tab then has to catch up with what the switch changed (a badge, and the updatedAt its own Save sends, which
 * would otherwise be refused as changed since it was opened), in one of two ways:
 * - `revision` moves on, and HomePageView remounts the tab from it, so it reloads;
 * - `switched` is the switch's last result, for a tab with inline editors (About SARTHI), which a remount would
 *   empty of unsaved edits: it merges the result into the section it saves against instead.
 */
export function useSectionVisibility() {
  const list = useApiData(() => visibilityService.list(), []);
  const [items, setItems] = useState<SectionVisibility[] | null>(null);
  const [revisions, setRevisions] = useState<Partial<Record<SectionVisibilityKey, number>>>({});
  const [switched, setSwitched] = useState<Partial<Record<SectionVisibilityKey, SectionVisibility>>>({});
  useEffect(() => {
    if (list.data) setItems(list.data);
  }, [list.data]);

  const saved = useCallback((item: SectionVisibility) => {
    setItems((current) => current?.map((i) => (i.key === item.key ? item : i)) ?? current);
    setRevisions((current) => ({ ...current, [item.key]: (current[item.key] ?? 0) + 1 }));
    setSwitched((current) => ({ ...current, [item.key]: item }));
  }, []);

  const find = (key: SectionVisibilityKey) => items?.find((i) => i.key === key);

  return {
    items,
    loading: list.loading,
    error: list.error,
    reload: list.reload,
    saved,
    find,
    revision: (key: SectionVisibilityKey) => revisions[key] ?? 0,
    /* The switch's last result for the section; undefined until it is used on this page. */
    switched: (key: SectionVisibilityKey): SectionVisibility | undefined => switched[key],
    /*
     * Whether the section is switched on but still off the website: the glance card sits inside the hero banner,
     * so a hidden banner takes it along whatever the card's own switch says.
     */
    hiddenWithBanner: (key: SectionVisibilityKey) =>
      key === 'glance' && find('glance')?.visible === true && find('hero')?.visible === false,
  };
}

export type SectionVisibilityState = ReturnType<typeof useSectionVisibility>;
