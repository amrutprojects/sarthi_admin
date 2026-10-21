import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/*
 * The three sections of the Modules page, shared by the view page (/cms/modules) and the edit page
 * (/cms/modules/edit) so both show the same tabs in the same order.
 *
 * The open tab lives in the URL (?tab=modules|domains|heading) rather than in component state, so
 * "Edit content" can open the editor on the section being read, Cancel can come back to it, and a
 * reload or a shared link keeps it.
 */
export const MODULES_TABS = [
  { key: 'modules', label: 'Modules' },
  { key: 'domains', label: 'Employment domains' },
  { key: 'heading', label: 'Page heading & learning path' },
] as const;

export type ModulesTab = (typeof MODULES_TABS)[number]['key'];

const TAB_KEYS: readonly string[] = MODULES_TABS.map((t) => t.key);

/** Reads ?tab=; a missing or unknown value opens the first tab. */
export const parseModulesTab = (raw: string | null): ModulesTab =>
  raw !== null && TAB_KEYS.includes(raw) ? (raw as ModulesTab) : 'modules';

/* Element ids, so each tab can name the panel it controls and each panel the tab that labels it. */
export const modulesTabId = (tab: ModulesTab) => `modules-tab-${tab}`;
export const modulesPanelId = (tab: ModulesTab) => `modules-panel-${tab}`;

/**
 * The open tab and a setter. Switching replaces the history entry, so Back leaves the page instead
 * of stepping through every tab that was clicked.
 */
export function useModulesTab(): [ModulesTab, (next: ModulesTab) => void] {
  const [params, setParams] = useSearchParams();
  const tab = parseModulesTab(params.get('tab'));
  const setTab = useCallback(
    (next: ModulesTab) =>
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

/**
 * Which tab shows the input an error key belongs to.
 *
 * Error keys are paths ("modules.2.electives.0.certificate"), so the tab follows from the path:
 * a module's domains are edited on the Employment domains tab, everything else about a module
 * (and the list-level "modules" message) on the Modules tab, and the heading and learning path
 * on the third. Anything unrecognised belongs to no tab.
 */
export function tabOfField(key: string): ModulesTab | null {
  if (key === 'modules') return 'modules';
  if (/^modules\.\d+\.electives(\.|$)/.test(key)) return 'domains';
  if (/^modules\.\d+(\.|$)/.test(key)) return 'modules';
  if (/^(pageTitle|pageSubtitle|learningPath)(\.|$)/.test(key)) return 'heading';
  return null;
}

/** The tabs holding at least one of these error keys. */
export function tabsWithErrors(keys: Iterable<string>): Set<ModulesTab> {
  const found = new Set<ModulesTab>();
  for (const key of keys) {
    const tab = tabOfField(key);
    if (tab) found.add(tab);
  }
  return found;
}

/** The first tab, in tab order, holding one of these error keys. */
export function firstTabWithErrors(keys: Iterable<string>): ModulesTab | null {
  const found = tabsWithErrors(keys);
  return MODULES_TABS.find((t) => found.has(t.key))?.key ?? null;
}
