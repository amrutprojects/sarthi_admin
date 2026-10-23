import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import Icon from '../../../components/ui/Icon';

export interface SectionTab<T extends string> {
  k: T;
  l: string;
}

/*
 * The tab strip of a sectioned CMS view page (Contact, Footer), the same as Modules Page Management's
 * ModulesTabBar: the panel's `.tabs` strip with the ARIA tabs pattern on top. A roving tabindex, so Tab
 * moves into the strip once and out again, and the arrow keys, Home and End move between tabs and open
 * the one they land on. `tabs-fit` lets the labels wrap on a phone. `idPrefix` keeps the element ids
 * unique per page, so each tab can name the panel it controls.
 */
export function SectionTabBar<T extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  label,
}: {
  tabs: readonly SectionTab<T>[];
  active: T;
  onChange: (next: T) => void;
  idPrefix: string;
  label: string;
}) {
  const buttons = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let to: number;
    if (e.key === 'ArrowRight') to = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') to = index === 0 ? last : index - 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    else return;
    e.preventDefault();
    const next = tabs[to]!.k;
    onChange(next);
    buttons.current[next]?.focus();
  };

  return (
    <div className="tabs tabs-fit" role="tablist" aria-label={label}>
      {tabs.map(({ k, l }, index) => {
        const on = k === active;
        return (
          <button
            type="button"
            role="tab"
            key={k}
            id={`${idPrefix}-tab-${k}`}
            ref={(el) => {
              buttons.current[k] = el;
            }}
            aria-selected={on}
            aria-controls={`${idPrefix}-panel-${k}`}
            tabIndex={on ? 0 : -1}
            className={on ? 'on' : ''}
            onClick={() => onChange(k)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

/*
 * One tab's panel. Every panel element is always in the page, so each tab's aria-controls names a real
 * element, but only the open one renders its content. It is a tab stop, so a keyboard user can move from
 * the strip into the read-only tables.
 */
export function SectionTabPanel<T extends string>({
  tab,
  active,
  idPrefix,
  children,
}: {
  tab: T;
  active: T;
  idPrefix: string;
  children: ReactNode;
}) {
  const on = tab === active;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tab}`}
      aria-labelledby={`${idPrefix}-tab-${tab}`}
      hidden={!on}
      tabIndex={on ? 0 : undefined}
    >
      {on ? children : null}
    </div>
  );
}

/*
 * The head of a tab that is a section of its own, with buttons of its own (Home Page Management, where each tab is
 * a separate part of the public page): a line saying what the tab shows, and the section's actions — Publish,
 * Edit, Add — which the page of a single section puts in its page header (.cms-sections .cms-tab-head).
 */
export function SectionTabHead({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="cms-tab-head">
      <p className="cms-tab-head-sub">{children}</p>
      {actions ? <div className="cms-tab-head-actions">{actions}</div> : null}
    </div>
  );
}

/* A short note at the top of a tab, about how its values are shown or where they are edited (.cms-sections .sec-note). */
export function SectionNote({ children }: { children: ReactNode }) {
  return (
    <div className="sec-note">
      <Icon name="help" />
      <div>{children}</div>
    </div>
  );
}
