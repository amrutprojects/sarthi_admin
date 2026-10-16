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
export const MENU_ACTION_LABEL: Record<MenuAction, string> = { view: 'View', create: 'Add', update: 'Update', delete: 'Delete', approve: 'Approve' };

/* Sidebar key → the screen opens if the user holds ANY of these codes. Keys without an entry are open to every signed-in user. */
const MENU_KEYS = [
  'dashboard', 'exec', 'today', 'candidates', 'lifecycle', 'atrisk', 'districts', 'map', 'centres', 'onboarding',
  'batches', 'trainers', 'tot', 'live', 'offline', 'online', 'attendance', 'progress', 'assessments', 'certification',
  'marketing', 'mobilization', 'comms', 'reports', 'finance', 'pmo', 'qa', 'tasks', 'documents', 'lms', 'app',
  'admin', 'audit', 'settings',
];
export const SCREEN_ACCESS: Record<string, string[]> = {
  ...Object.fromEntries(MENU_KEYS.map((k) => [k, [`${k}.view`]])),
  users: ['users.view', 'roles.view', 'permissions.view'],
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
