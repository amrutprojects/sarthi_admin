import type { Crumb } from '../../../components/ui';
import type { ProfileListKey } from './types/advisory.types';

/* Advisory Committee Management: its own sidebar entry and list page (not a Home Page Management tab). */
export const ADVISORY_TITLE = 'Advisory Committee Management';

/* The list page: where Back, Cancel, Save and Delete return to. */
export const ADVISORY_PATH = '/cms/advisory-committee';
export const ADVISORY_CREATE_PATH = `${ADVISORY_PATH}/create`;
export const ADVISORY_SETTINGS_PATH = `${ADVISORY_PATH}/settings`;

/* Breadcrumb trail shared by the Add, Edit, View and Settings pages, before each page's own crumb. */
export const ADVISORY_CRUMBS: Crumb[] = [{ l: 'Dashboard', link: '/dashboard' }, { l: 'CMS' }, { l: ADVISORY_TITLE, link: ADVISORY_PATH }];

/* An Advisory Committee member's read-only View page, opened by the eye button and by a click on its row in the list. */
export const advisoryMemberViewPath = (id: string): string => `${ADVISORY_PATH}/${encodeURIComponent(id)}/view`;

/* An Advisory Committee member's Edit page. */
export const advisoryMemberEditPath = (id: string): string => `${ADVISORY_PATH}/${encodeURIComponent(id)}/edit`;

/* The five bulleted lists of an Advisory Committee member's profile, as the form, the View page and messages name them. */
export const PROFILE_LIST_LABELS: Record<ProfileListKey, string> = {
  administrativeRoles: 'Administrative Roles',
  keyAchievements: 'Key Achievements',
  majorContributions: 'Major Contributions',
  researchLeadership: 'Research Leadership',
  education: 'Education',
};

/* How an Advisory Committee member is named in messages and button labels: by English name. */
export const memberLabel = (m: { name: { en: string } }): string => m.name.en;

/* A group in a select: its English name, marked when the website hides it (and the Advisory Committee members in it). */
export const groupOptionLabel = (g: { name: { en: string }; isActive: boolean }): string => g.name.en + (g.isActive ? '' : ' (hidden)');
