/* Breadcrumb trail shared by the Board Members Management pages. */
export const BOARD_CRUMBS = [
  { l: 'Dashboard', link: '/dashboard' },
  { l: 'CMS' },
  { l: 'Board Members Management', link: '/cms/board-members' },
];

/* How a member is named in messages: by name, or by office while the name is still to be supplied. */
export const memberLabel = (m: { name: string | null; designation: { en: string } }) => m.name ?? m.designation.en;
