import { api } from '../services/mock/api';

export interface NavGroup {
  g: string;
}
export interface NavItem {
  k: string;
  l: string;
  i: string;
  r: string;
  count?: () => number;
  warn?: boolean;
}
export type NavEntry = NavGroup | NavItem;
export const isNavGroup = (n: NavEntry): n is NavGroup => 'g' in n;

export type RouteName =
  | 'dashboard'
  | 'executive'
  | 'today'
  | 'candidates'
  | 'candidateDetail'
  | 'lifecycle'
  | 'atRisk'
  | 'districts'
  | 'districtDetail'
  | 'talukaDetail'
  | 'mapPage'
  | 'centres'
  | 'centreDetail'
  | 'centreOnboarding'
  | 'batches'
  | 'batchDetail'
  | 'trainers'
  | 'trainerDetail'
  | 'tot'
  | 'live'
  | 'offlineMode'
  | 'onlineMode'
  | 'attendance'
  | 'progress'
  | 'assessments'
  | 'certification'
  | 'marketing'
  | 'campaignDetail'
  | 'mobilization'
  | 'communications'
  | 'reports'
  | 'reportDetail'
  | 'finance'
  | 'pmo'
  | 'qa'
  | 'tasks'
  | 'documents'
  | 'cmsContactView'
  | 'cmsFooterView'
  | 'cmsFooterEdit'
  | 'cmsModulesView'
  | 'cmsModulesEdit'
  | 'cmsContactEdit'
  | 'cmsStateList'
  | 'cmsStateCreate'
  | 'cmsStateEdit'
  | 'cmsStateView'
  | 'cmsDistrictList'
  | 'cmsDistrictCreate'
  | 'cmsDistrictEdit'
  | 'cmsDistrictView'
  | 'cmsTalukaList'
  | 'cmsTalukaCreate'
  | 'cmsTalukaEdit'
  | 'cmsTalukaView'
  | 'lms'
  | 'studentApp'
  | 'administration'
  | 'users'
  | 'masters'
  | 'registrations'
  | 'registrationNew'
  | 'registrationDetail'
  | 'registrationEdit'
  | 'masterList'
  | 'audit'
  | 'settings'
  | 'studentImport'
  | 'importBatch';

/* [path pattern, route name, sidebar key] */
export type AdminRoute = [path: string, name: RouteName, navKey: string];

/* Sidebar definition, unchanged from the original portal (assets/js/app.js). */
export const NAV: NavEntry[] = [
  { g: 'Command Centre' },
  { k: 'dashboard', l: 'Dashboard', i: 'dashboard', r: '/dashboard' },
  { k: 'exec', l: 'Executive Command', i: 'shield', r: '/executive' },
  { k: 'today', l: "Today's Operations", i: 'clock', r: '/today' },
  { g: 'Candidates' },
  { k: 'candidates', l: 'Candidates', i: 'users', r: '/candidates' },
  { k: 'lifecycle', l: 'Lifecycle & Funnel', i: 'layers', r: '/lifecycle' },
  { k: 'atrisk', l: 'At-Risk Engine', i: 'alert', r: '/at-risk' },
  { k: 'imports', l: 'Student Import', i: 'download', r: '/student-import' },
  { k: 'registrations', l: 'Student Registration', i: 'clipboard', r: '/student-registrations' },
  { g: 'Delivery Network' },
  { k: 'districts', l: 'Districts', i: 'map', r: '/districts' },
  { k: 'map', l: 'District Map', i: 'pin', r: '/map' },
  { k: 'centres', l: 'Training Centres', i: 'building', r: '/centres' },
  { k: 'onboarding', l: 'Centre Onboarding', i: 'clipboard', r: '/centre-onboarding' },
  { k: 'batches', l: 'Batches', i: 'layers', r: '/batches' },
  { k: 'trainers', l: 'Trainers', i: 'teacher', r: '/trainers' },
  { k: 'tot', l: 'Trainer ToT', i: 'award', r: '/tot' },
  { g: 'Training Operations' },
  { k: 'live', l: 'Live Training Monitor', i: 'play', r: '/live' },
  { k: 'offline', l: 'Offline Training', i: 'building', r: '/offline' },
  { k: 'online', l: 'Online Training', i: 'globe', r: '/online' },
  { k: 'attendance', l: 'Attendance', i: 'calendar', r: '/attendance' },
  { k: 'progress', l: 'Student Progress', i: 'chart', r: '/progress' },
  { g: 'Outcomes' },
  { k: 'assessments', l: 'Assessments', i: 'check', r: '/assessments' },
  { k: 'certification', l: 'Certification', i: 'award', r: '/certification' },
  { k: 'verify', l: 'Certificate Verification', i: 'qr', r: '/verify' },
  { g: 'Outreach' },
  { k: 'marketing', l: 'Marketing', i: 'megaphone', r: '/marketing' },
  { k: 'mobilization', l: 'Mobilization', i: 'users', r: '/mobilization' },
  { k: 'comms', l: 'Communications', i: 'mail', r: '/communications' },
  { g: 'Governance' },
  { k: 'reports', l: 'Reports & MIS', i: 'chart', r: '/reports' },
  { k: 'finance', l: 'Finance', i: 'rupee', r: '/finance' },
  { k: 'pmo', l: 'PMO Dashboard', i: 'shield', r: '/pmo' },
  { k: 'qa', l: 'Quality Assurance', i: 'check', r: '/qa' },
  { k: 'tasks', l: 'Tasks & Alerts', i: 'alert', r: '/tasks', count: () => api.openTaskCount(), warn: true },
  { k: 'documents', l: 'Documents', i: 'folder', r: '/documents' },
  { g: 'CMS' },
  { k: 'cms-contact', l: 'Contact Page Management', i: 'mail', r: '/cms/contact' },
  { k: 'cms-footer', l: 'Footer Management', i: 'doc', r: '/cms/footer' },
  { k: 'cms-modules', l: 'Modules Page Management', i: 'book', r: '/cms/modules' },
  { k: 'cms-states', l: 'State Master', i: 'globe', r: '/cms/states' },
  { k: 'cms-districts', l: 'District Master', i: 'map', r: '/cms/districts' },
  { k: 'cms-talukas', l: 'Taluka Master', i: 'pin', r: '/cms/talukas' },
  { g: 'Platform' },
  { k: 'lms', l: 'LMS Integration', i: 'plug', r: '/lms' },
  { k: 'app', l: 'Student App', i: 'phone', r: '/student-app' },
  { k: 'admin', l: 'Administration', i: 'settings', r: '/administration' },
  { k: 'users', l: 'Users & Roles', i: 'users', r: '/users' },
  { k: 'audit', l: 'Audit Log', i: 'doc', r: '/audit' },
  { k: 'settings', l: 'System Settings', i: 'settings', r: '/settings' },
  { g: 'Masters' },
  /* Keys equal the backend permission prefixes (regions.view, …). */
  { k: 'regions', l: 'Regions', i: 'map', r: '/masters/regions' },
  { k: 'castes', l: 'Castes', i: 'users', r: '/masters/castes' },
  { k: 'document-types', l: 'Document Types', i: 'doc', r: '/masters/document-types' },
  { k: 'education', l: 'Education', i: 'award', r: '/masters/education' },
  { g: 'Public Site' },
  { k: 'pubhome', l: 'AMRUT Public Site', i: 'globe', r: '/home' },
  { k: 'pubprog', l: 'AMRUT Kalash 2.0', i: 'award', r: '/programme' },
];

export const MOBILE_NAV: NavItem[] = [
  { k: 'dashboard', l: 'Home', i: 'home', r: '/dashboard' },
  { k: 'candidates', l: 'Candidates', i: 'users', r: '/candidates' },
  { k: 'districts', l: 'Districts', i: 'map', r: '/districts' },
  { k: 'live', l: 'Live', i: 'play', r: '/live' },
  { k: 'tasks', l: 'Alerts', i: 'alert', r: '/tasks' },
];

export const ADMIN_ROUTES: AdminRoute[] = [
  ['/dashboard', 'dashboard', 'dashboard'],
  ['/executive', 'executive', 'exec'],
  ['/today', 'today', 'today'],
  ['/candidates', 'candidates', 'candidates'],
  ['/candidates/:id', 'candidateDetail', 'candidates'],
  ['/lifecycle', 'lifecycle', 'lifecycle'],
  ['/at-risk', 'atRisk', 'atrisk'],
  ['/student-import', 'studentImport', 'imports'],
  ['/student-import/:id', 'importBatch', 'imports'],
  ['/student-registrations', 'registrations', 'registrations'],
  ['/student-registrations/new', 'registrationNew', 'registrations'],
  ['/student-registrations/:id', 'registrationDetail', 'registrations'],
  ['/student-registrations/:id/edit', 'registrationEdit', 'registrations'],
  ['/districts', 'districts', 'districts'],
  ['/districts/:id', 'districtDetail', 'districts'],
  ['/districts/:id/talukas/:t', 'talukaDetail', 'districts'],
  ['/map', 'mapPage', 'map'],
  ['/centres', 'centres', 'centres'],
  ['/centres/:id', 'centreDetail', 'centres'],
  ['/centre-onboarding', 'centreOnboarding', 'onboarding'],
  ['/batches', 'batches', 'batches'],
  ['/batches/:id', 'batchDetail', 'batches'],
  ['/trainers', 'trainers', 'trainers'],
  ['/trainers/:id', 'trainerDetail', 'trainers'],
  ['/tot', 'tot', 'tot'],
  ['/live', 'live', 'live'],
  ['/offline', 'offlineMode', 'offline'],
  ['/online', 'onlineMode', 'online'],
  ['/attendance', 'attendance', 'attendance'],
  ['/progress', 'progress', 'progress'],
  ['/assessments', 'assessments', 'assessments'],
  ['/certification', 'certification', 'certification'],
  ['/marketing', 'marketing', 'marketing'],
  ['/marketing/:id', 'campaignDetail', 'marketing'],
  ['/mobilization', 'mobilization', 'mobilization'],
  ['/communications', 'communications', 'comms'],
  ['/reports', 'reports', 'reports'],
  ['/reports/:id', 'reportDetail', 'reports'],
  ['/finance', 'finance', 'finance'],
  ['/pmo', 'pmo', 'pmo'],
  ['/qa', 'qa', 'qa'],
  ['/tasks', 'tasks', 'tasks'],
  ['/documents', 'documents', 'documents'],
  /*
   * CMS master data. The static `create` path is listed before the `:id` pattern so the first match in
   * activeKey() (AdminLayout) is the intended one; React Router itself ranks static segments higher.
   */
  /* The Contact page is a singleton: a read-only settings view plus its edit form, no list. */
  ['/cms/contact', 'cmsContactView', 'cms-contact'],
  ['/cms/contact/edit', 'cmsContactEdit', 'cms-contact'],
  ['/cms/footer', 'cmsFooterView', 'cms-footer'],
  ['/cms/footer/edit', 'cmsFooterEdit', 'cms-footer'],
  ['/cms/modules', 'cmsModulesView', 'cms-modules'],
  ['/cms/modules/edit', 'cmsModulesEdit', 'cms-modules'],
  ['/cms/states', 'cmsStateList', 'cms-states'],
  ['/cms/states/create', 'cmsStateCreate', 'cms-states'],
  ['/cms/states/:id/edit', 'cmsStateEdit', 'cms-states'],
  ['/cms/states/:id', 'cmsStateView', 'cms-states'],
  ['/cms/districts', 'cmsDistrictList', 'cms-districts'],
  ['/cms/districts/create', 'cmsDistrictCreate', 'cms-districts'],
  ['/cms/districts/:id/edit', 'cmsDistrictEdit', 'cms-districts'],
  ['/cms/districts/:id', 'cmsDistrictView', 'cms-districts'],
  ['/cms/talukas', 'cmsTalukaList', 'cms-talukas'],
  ['/cms/talukas/create', 'cmsTalukaCreate', 'cms-talukas'],
  ['/cms/talukas/:id/edit', 'cmsTalukaEdit', 'cms-talukas'],
  ['/cms/talukas/:id', 'cmsTalukaView', 'cms-talukas'],
  ['/lms', 'lms', 'lms'],
  ['/student-app', 'studentApp', 'app'],
  ['/administration', 'administration', 'admin'],
  ['/users', 'users', 'users'],
  ['/masters', 'masters', 'masters'],
  ['/masters/regions', 'masterList', 'regions'],
  ['/masters/castes', 'masterList', 'castes'],
  ['/masters/document-types', 'masterList', 'document-types'],
  ['/masters/education', 'masterList', 'education'],
  ['/audit', 'audit', 'audit'],
  ['/settings', 'settings', 'settings'],
];
