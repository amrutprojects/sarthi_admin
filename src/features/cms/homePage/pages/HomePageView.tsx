import type { ComponentType } from 'react';
import { EmptyState, PageHead } from '../../../../components/ui';
import { HOME_PAGE_TABS, type HomePageTab } from '../../../../constants/navigation';
import { useCanOpen } from '../../../../modules/auth/components/Can';
import AboutTab from '../../about/components/AboutTab';
import BoardMembersTab from '../../board/components/BoardMembersTab';
import { SectionTabBar, SectionTabPanel } from '../../components/SectionTabs';
import EcosystemTab from '../../ecosystem/components/EcosystemTab';
import { HeroGlanceTab, HeroSlidesTab } from '../../hero/components/HeroTabs';
import HighlightTab from '../../highlight/components/HighlightTab';
import ImpactTab from '../../impact/components/ImpactTab';
import SchemesTab from '../../schemes/components/SchemesTab';
import { usePageTitle } from '../../useMasterQuery';
import { useSectionTab } from '../../useSectionTab';
import { HOME_PAGE_TITLE } from '../homePageNav';

/*
 * Each tab's content: its section's own screen without a page header, with its own buttons (Publish, Edit, Add,
 * Settings, reorder, delete) and its own data, loaded when the tab opens.
 */
const TAB_CONTENT: Record<HomePageTab, ComponentType> = {
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
 * Home Page Management — every section of the public home page on one page, one tab per section in the order
 * the home page shows them, with the same tab strip as Programme Page Management and the tab kept in the URL
 * (?tab=). The sections remain seven menus with permissions of their own: a tab is shown only to a user who
 * may open its menu (its view permission, Menu Visibility and the website portal, as in the sidebar), the
 * first such tab opens by default, and a link to a missing or forbidden tab opens that one instead.
 */
export default function HomePageView() {
  usePageTitle(HOME_PAGE_TITLE);
  const canOpen = useCanOpen();
  const tabs = HOME_PAGE_TABS.filter((t) => canOpen(t.menu));
  /* The route opens only when one of the menus does, so `tabs` is never empty there; the full list keeps the hook total. */
  const [tab, selectTab] = useSectionTab(tabs.length ? tabs : HOME_PAGE_TABS);

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
          <SectionTabBar tabs={tabs} active={tab} onChange={selectTab} idPrefix="home-page" label="Home page sections" />
          {tabs.map(({ k }) => {
            const Content = TAB_CONTENT[k];
            return (
              <SectionTabPanel key={k} tab={k} active={tab} idPrefix="home-page">
                <Content />
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
