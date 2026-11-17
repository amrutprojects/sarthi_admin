import type { ComponentType, ReactNode } from 'react';
import { EmptyState, PageHead } from '../../../../components/ui';
import { HOME_PAGE_TABS, type HomePageTab } from '../../../../constants/navigation';
import { useCanOpen } from '../../../../modules/auth/components/Can';
import AboutTab from '../../about/components/AboutTab';
import AnnouncementsTab from '../../announcements/components/AnnouncementsTab';
import BoardMembersTab from '../../board/components/BoardMembersTab';
import BrandBarTab from '../../brandbar/components/BrandBarTab';
import { SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import EcosystemTab from '../../ecosystem/components/EcosystemTab';
import { HeroGlanceTab, HeroSlidesTab } from '../../hero/components/HeroTabs';
import HighlightTab from '../../highlight/components/HighlightTab';
import ImpactTab from '../../impact/components/ImpactTab';
import NavMenuTab from '../../navmenu/components/NavMenuTab';
import SchemesTab from '../../schemes/components/SchemesTab';
import TopBarTab from '../../topbar/components/TopBarTab';
import { usePageTitle } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import SectionVisibilityBar, { HiddenTabMark } from '../../visibility/SectionVisibilityBar';
import { isVisibilitySection } from '../../visibility/constants';
import { useSectionVisibility } from '../../visibility/useSectionVisibility';
import type { SectionVisibility } from '../../visibility/visibility.types';
import { HOME_PAGE_TITLE } from '../homePageNav';

/*
 * Each tab's content: its section's own screen without a page header, with its own buttons (Edit, Add, Settings,
 * reorder, delete) and its own data, loaded when the tab opens. `switched` is the tab's "Show on website" switch's
 * last result, which only the tabs in KEEPS_DRAFTS read.
 */
const TAB_CONTENT: Record<HomePageTab, ComponentType<{ switched?: SectionVisibility }>> = {
  'top-bar': TopBarTab,
  'brand-bar': BrandBarTab,
  'nav-menu': NavMenuTab,
  announcements: AnnouncementsTab,
  hero: HeroSlidesTab,
  glance: HeroGlanceTab,
  diploma: HighlightTab,
  board: BoardMembersTab,
  impact: ImpactTab,
  ecosystem: EcosystemTab,
  schemes: SchemesTab,
  about: AboutTab,
};

/*
 * The tabs that edit inline (About AMRUT's section settings and description), whose unsaved edits a remount would
 * throw away: they stay mounted when their section is switched and merge the switch's result instead. Every other
 * tab edits on pages of its own, so it is simply remounted, and reloads what the switch changed.
 */
const KEEPS_DRAFTS: ReadonlySet<HomePageTab> = new Set<HomePageTab>(['about']);

/*
 * Home Page Management — every section of the public home page on one page, one tab per section in the order
 * the home page shows them, with the same tab strip as Programme Page Management and the tab kept in the URL
 * (?tab=). The sections remain eleven menus with permissions of their own: a tab is shown only to a user who
 * may open its menu (its view permission, Menu Visibility and the website portal, as in the sidebar), the
 * first such tab opens by default, and a link to a missing or forbidden tab opens that one instead.
 *
 * Above each tab's content is its section's one "Show on website" switch, and the strip marks the sections that
 * are hidden, so what is off the website shows at a glance from any tab. The Navigation Menu tab is not a section
 * and has no such switch: each of its items has a switch of its own, on the tab.
 */
export default function HomePageView() {
  usePageTitle(HOME_PAGE_TITLE);
  const canOpen = useCanOpen();
  const tabs = HOME_PAGE_TABS.filter((t) => canOpen(t.menu));
  /* The route opens only when one of the menus does, so `tabs` is never empty there; the full list keeps the hook total. */
  const [tab, selectTab] = useSectionTab(tabs.length ? tabs : HOME_PAGE_TABS);
  const visibility = useSectionVisibility();
  const marks: Partial<Record<HomePageTab, ReactNode>> = {};
  /* The glance card is off the website with a hidden banner too, though its own switch is on. */
  for (const item of visibility.items ?? [])
    if (!item.visible || visibility.hiddenWithBanner(item.key)) marks[item.key] = <HiddenTabMark />;

  return (
    <div className="page">
      <PageHead
        crumbs={[{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: HOME_PAGE_TITLE }]}
        title={HOME_PAGE_TITLE}
        sub="Every section of the public home page, in Marathi and English."
      />

      {/* Larger, higher-contrast table text than the panel defaults: see .cms-sections in cms-tables.css. */}
      {tabs.length ? (
        <div className="cms-sections">
          <SectionTabBar tabs={tabs} active={tab} onChange={selectTab} idPrefix="home-page" label="Home page sections" marks={marks} />
          {tabs.map(({ k, l }) => {
            const Content = TAB_CONTENT[k];
            return (
              <SectionTabPanel key={k} tab={k} active={tab} idPrefix="home-page">
                {isVisibilitySection(k) ? (
                  <>
                    <SectionVisibilityBar section={k} label={l} visibility={visibility} />
                    {KEEPS_DRAFTS.has(k) ? (
                      <Content switched={visibility.switched(k)} />
                    ) : (
                      /* Remounted after its section is switched, so it reloads what the switch changed. */
                      <Content key={visibility.revision(k)} />
                    )}
                  </>
                ) : (
                  /* Not a section (the Navigation Menu): no "Show on website" bar, nor its loading or error line. */
                  <Content />
                )}
              </SectionTabPanel>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No home page sections" msg="Your role cannot open any section of the home page." />
      )}
    </div>
  );
}
