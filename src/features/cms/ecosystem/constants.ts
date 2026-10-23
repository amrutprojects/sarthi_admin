/* Breadcrumb trail shared by The AMRUT Ecosystem pages. */
export const ECOSYSTEM_CRUMBS = [
  { l: 'Dashboard', link: '/dashboard' },
  { l: 'CMS' },
  { l: 'The AMRUT Ecosystem', link: '/cms/amrut-ecosystem' },
];

/*
 * The icons a programme card may use, with the name shown in the picker. The same identifiers the API
 * accepts (backend/src/cms/ecosystem/ecosystem.icons.ts) and the website renders; the glyphs are the
 * panel's copy of the same ui.js icon set. The first eight are the ones the original cards used.
 */
export const ECOSYSTEM_ICONS: { id: string; label: string }[] = [
  { id: 'teacher', label: 'Education' },
  { id: 'building', label: 'Building / market' },
  { id: 'map', label: 'Map / state' },
  { id: 'users', label: 'People' },
  { id: 'globe', label: 'Tourism / world' },
  { id: 'layers', label: 'Groups / layers' },
  { id: 'play', label: 'Media / drone' },
  { id: 'award', label: 'Award / skills' },
  { id: 'monitor', label: 'Digital' },
  { id: 'clipboard', label: 'Forms / survey' },
  { id: 'chart', label: 'Growth / data' },
  { id: 'shield', label: 'Safety' },
  { id: 'home', label: 'Home / housing' },
  { id: 'pin', label: 'Location' },
  { id: 'calendar', label: 'Events' },
  { id: 'megaphone', label: 'Announcements' },
  { id: 'phone', label: 'Phone / helpline' },
  { id: 'mail', label: 'Mail' },
  { id: 'rupee', label: 'Finance' },
  { id: 'doc', label: 'Document' },
  { id: 'check', label: 'Approval' },
  { id: 'folder', label: 'Records' },
  { id: 'plug', label: 'Integration' },
  { id: 'qr', label: 'Verification' },
  { id: 'settings', label: 'Services' },
];

export const iconLabel = (id: string) => ECOSYSTEM_ICONS.find((i) => i.id === id)?.label ?? id;

/* Shared with AMRUT Schemes; kept importable from here. */
export { SITE_PAGES } from '../destination';
