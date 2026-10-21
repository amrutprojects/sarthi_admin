/*
 * UI access rules, expressed in the backend's permission codes (backend/src/constants/permission.constants.ts).
 * Every menu has `<menu>.view|create|update|delete|approve`; the signed-in user's effective codes and
 * hidden menus come from GET /api/v1/auth/me.
 *
 * This only hides screens and buttons. The backend enforces the same permissions on every API call,
 * so a hidden button is never the only protection.
 */

export const MENU_ACTIONS = ['view', 'create', 'update', 'delete', 'approve'] as const;
export type MenuAction = (typeof MENU_ACTIONS)[number];
export const MENU_ACTION_LABEL: Record<MenuAction, string> = {
  view: 'View',
  create: 'Add',
  update: 'Update',
  delete: 'Delete',
  approve: 'Approve',
};

/* Sidebar key → the screen opens if the user holds ANY of these codes. Keys without an entry are open to every signed-in user. */
const MENU_KEYS = [
  'dashboard',
  'exec',
  'today',
  'candidates',
  'lifecycle',
  'atrisk',
  'imports',
  'registrations',
  'districts',
  'map',
  'centres',
  'onboarding',
  'batches',
  'trainers',
  'tot',
  'live',
  'offline',
  'online',
  'attendance',
  'progress',
  'assessments',
  'certification',
  'marketing',
  'mobilization',
  'comms',
  'reports',
  'finance',
  'pmo',
  'qa',
  'tasks',
  'documents',
  'lms',
  'app',
  'cms-contact',
  'cms-footer',
  'cms-modules',
  'cms-programme',
  'cms-states',
  'cms-districts',
  'cms-talukas',
  'admin',
  'audit',
  'settings',
];
export const SCREEN_ACCESS: Record<string, string[]> = {
  ...Object.fromEntries(MENU_KEYS.map((k) => [k, [`${k}.view`]])),
  users: ['users.view', 'roles.view', 'permissions.view'],
  /* Reference-data masters (Region, Caste, Document type, Education): opens with any one view code. */
  masters: ['regions.view', 'castes.view', 'document-types.view', 'education.view'],
  regions: ['regions.view'],
  castes: ['castes.view'],
  'document-types': ['document-types.view'],
  education: ['education.view'],
};

/* Named actions → the action is available if the user holds ANY of these codes. */
export const ACTION_ACCESS = {
  /* programme modules (mock data for now) */
  createTask: ['tasks.create'],
  updateTask: ['tasks.update'],
  createBatch: ['batches.create'],
  markAttendance: ['attendance.create', 'attendance.update'],
  closeSession: ['batches.update'],
  createCandidate: ['candidates.create'],
  updateCandidate: ['candidates.update'],
  messageCandidate: ['comms.create'],
  manageCentre: ['centres.create', 'centres.update', 'onboarding.approve'],
  manageTrainers: ['trainers.create', 'trainers.update'],
  inspect: ['qa.create', 'qa.update'],
  scheduleAssessment: ['assessments.create'],
  issueCertificates: ['certification.create', 'certification.approve'],
  manageCampaigns: ['marketing.create', 'marketing.update'],
  sendCommunication: ['comms.create'],
  syncLms: ['lms.update'],
  editSettings: ['settings.update'],
  manageDocuments: ['documents.create', 'documents.update'],
  /* student data import (live backend) */
  createImport: ['imports.create'],
  resolveImport: ['imports.update'],
  cancelImport: ['imports.delete'],
  finaliseImport: ['imports.approve'],
  /* identity & access (live backend) */
  viewUsers: ['users.view'],
  createUser: ['users.create'],
  updateUser: ['users.update'],
  deleteUser: ['users.delete'],
  assignRoles: ['users.assign-roles'],
  viewRoles: ['roles.view'],
  createRole: ['roles.create'],
  updateRole: ['roles.update'],
  deleteRole: ['roles.delete'],
  assignPermissions: ['permissions.assign'],
  viewPermissions: ['permissions.view'],
  updatePermission: ['permissions.update'],
  /* CMS content and geography masters (live backend). Seeded to Super Admin only; other roles need an explicit grant. */
  viewContactPage: ['cms-contact.view'],
  updateContactPage: ['cms-contact.update'],
  viewFooter: ['cms-footer.view'],
  updateFooter: ['cms-footer.update'],
  viewModulesPage: ['cms-modules.view'],
  updateModulesPage: ['cms-modules.update'],
  viewProgrammePage: ['cms-programme.view'],
  updateProgrammePage: ['cms-programme.update'],
  viewStates: ['cms-states.view'],
  createState: ['cms-states.create'],
  updateState: ['cms-states.update'],
  deleteState: ['cms-states.delete'],
  viewDistricts: ['cms-districts.view'],
  createDistrict: ['cms-districts.create'],
  updateDistrict: ['cms-districts.update'],
  deleteDistrict: ['cms-districts.delete'],
  viewTalukas: ['cms-talukas.view'],
  createTaluka: ['cms-talukas.create'],
  updateTaluka: ['cms-talukas.update'],
  deleteTaluka: ['cms-talukas.delete'],
} satisfies Record<string, string[]>;

export type Action = keyof typeof ACTION_ACCESS;

export function hasAny(permissions: Set<string>, required: readonly string[] | undefined): boolean {
  if (!required) return true;
  return required.some((p) => permissions.has(p));
}

/* A menu opens when the user holds its view permission and no Menu Visibility setting hides it. */
export const canOpen = (permissions: Set<string>, navKey: string, hidden?: Set<string>): boolean =>
  !hidden?.has(navKey) && hasAny(permissions, SCREEN_ACCESS[navKey]);
export const canDo = (permissions: Set<string>, action: Action): boolean => hasAny(permissions, ACTION_ACCESS[action]);
