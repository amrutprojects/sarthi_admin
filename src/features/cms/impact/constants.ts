import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';
import type { ApiImpactStat } from './types/impact.types';

/* Breadcrumb trail shared by the SARTHI Impact Management pages: the section is a tab of Home Page Management. */
export const IMPACT_CRUMBS = homePageCrumbs('impact');

/* The section's tab of Home Page Management: where Back, Cancel and Save return to. */
export const IMPACT_TAB_PATH = homePageTabPath('impact');

/* A statistic's read-only View page (route /cms/impact/:id/view), opened by the eye button and by a click on its row. */
export const impactViewPath = (id: string): string => `/cms/impact/${encodeURIComponent(id)}/view`;

/* A statistic's Edit page (route /cms/impact/:id/edit). */
export const impactEditPath = (id: string): string => `/cms/impact/${encodeURIComponent(id)}/edit`;

/* How a confirmation names a card: its figure and both labels, e.g. "6+ — योजना सुरू / Schemes running". */
export const statLabel = (s: ApiImpactStat): string => `${s.value} — ${s.label.mr} / ${s.label.en}`;
