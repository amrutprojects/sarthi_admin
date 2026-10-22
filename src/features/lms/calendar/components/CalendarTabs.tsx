import { useGo } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth';

const TABS = [
  { k: 'calendars', l: 'Calendars', to: '/lms/calendars', action: 'viewLmsCalendars' },
  { k: 'learning', l: 'Learning configuration', to: '/lms/learning-config', action: 'viewLmsLearningConfig' },
] as const;

/*
 * L-05 screen tabs: the calendars and the learning-configuration tab (UI-313). They are two routes with their own
 * menus and permissions (lms-calendars.view / lms-learning-config.view), so the tab bar navigates rather than
 * switching in place, and shows only the tabs the user may open (the active one always stays visible).
 */
export default function CalendarTabs({ active, entityId }: { active: (typeof TABS)[number]['k']; entityId?: string }) {
  const go = useGo();
  const can = useCan();
  const tabs = TABS.filter((t) => t.k === active || can(t.action));
  if (tabs.length < 2) return null;
  return (
    <div className="tabs" role="tablist" aria-label="Academic calendar">
      {tabs.map((t) => (
        <button
          type="button"
          role="tab"
          key={t.k}
          aria-selected={active === t.k}
          className={active === t.k ? 'on' : ''}
          onClick={() => (active === t.k ? undefined : go(entityId ? `${t.to}?entityId=${encodeURIComponent(entityId)}` : t.to))}
        >
          {t.l}
        </button>
      ))}
    </div>
  );
}
