import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { MODULES_TABS, modulesPanelId, modulesTabId, type ModulesTab } from './modulesTabs';

interface ModulesTabBarProps {
  active: ModulesTab;
  onChange: (next: ModulesTab) => void;
  /* Tabs to flag as holding a validation message (edit page only). */
  withErrors?: ReadonlySet<ModulesTab>;
}

/*
 * The tab strip for the Modules view and edit pages.
 *
 * Markup and styling are the panel's existing `.tabs` strip (as on Users & roles), with the ARIA
 * tabs pattern on top: a roving tabindex, so Tab moves into the strip once and out again, and the
 * arrow keys, Home and End move between tabs and open the one they land on. `tabs-fit` lets the
 * labels wrap on a phone, so all three tabs (and any error dot) stay on screen.
 */
export default function ModulesTabBar({ active, onChange, withErrors }: ModulesTabBarProps) {
  const buttons = useRef<Partial<Record<ModulesTab, HTMLButtonElement | null>>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = MODULES_TABS.length - 1;
    let to: number;
    if (e.key === 'ArrowRight') to = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') to = index === 0 ? last : index - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    else return;
    e.preventDefault();
    const next = MODULES_TABS[to]!.key;
    onChange(next);
    buttons.current[next]?.focus();
  };

  return (
    <div className="tabs tabs-fit" role="tablist" aria-label="Modules page sections">
      {MODULES_TABS.map(({ key, label }, index) => {
        const on = key === active;
        return (
          <button
            type="button"
            role="tab"
            key={key}
            id={modulesTabId(key)}
            ref={(el) => {
              buttons.current[key] = el;
            }}
            aria-selected={on}
            aria-controls={modulesPanelId(key)}
            tabIndex={on ? 0 : -1}
            className={on ? 'on' : ''}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {label}
            {withErrors?.has(key) ? <span className="tab-err" role="img" aria-label="has errors" title="Has errors" /> : null}
          </button>
        );
      })}
    </div>
  );
}

interface ModulesTabPanelProps {
  tab: ModulesTab;
  active: ModulesTab;
  /*
   * Make the panel itself a tab stop. Wanted when the panel opens on read-only content (the view
   * page's tables), so a keyboard user can move from the tab strip into it.
   */
  focusable?: boolean;
  children: ReactNode;
}

/*
 * One tab's panel. Every panel element is always in the page, so each tab's aria-controls names
 * a real element, but only the open one renders its content. On the edit page that is safe because
 * every typed value lives in the form's state, not in the inputs.
 */
export function ModulesTabPanel({ tab, active, focusable, children }: ModulesTabPanelProps) {
  const on = tab === active;
  return (
    <div
      role="tabpanel"
      id={modulesPanelId(tab)}
      aria-labelledby={modulesTabId(tab)}
      hidden={!on}
      tabIndex={on && focusable ? 0 : undefined}
    >
      {on ? children : null}
    </div>
  );
}
