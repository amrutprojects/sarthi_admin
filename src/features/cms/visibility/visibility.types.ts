/* Section visibility ("Show on website"), as /api/v1/cms/section-visibility returns and accepts it. */
import type { HomePageTab } from '../../../constants/navigation';

/**
 * A home page section, named by its Home Page Management tab key ('top-bar', 'hero', 'glance', …). The API
 * uses exactly these keys, so a tab and its section's switch never need a lookup table between them.
 * Every tab is a section except the Navigation Menu ('nav-menu'), whose items each have a switch of their own
 * (features/cms/navmenu), so it has no "Show on website" switch and no row in this API.
 */
export type SectionVisibilityKey = Exclude<HomePageTab, 'nav-menu'>;

export interface SectionVisibility {
  key: SectionVisibilityKey;
  /** The menu that owns the section, e.g. 'cms-topbar'; its update permission is needed to switch it. */
  menu: string;
  /** Whether the public website shows the section. True while the section is not configured. */
  visible: boolean;
  /** False while the section's settings row does not exist yet: there is nothing to show or hide. */
  configured: boolean;
  /** The section row's last change, null while it is not configured. */
  updatedAt: string | null;
}

/** The PUT body: strict, so nothing else may be sent. */
export interface UpdateSectionVisibilityInput {
  visible: boolean;
}
