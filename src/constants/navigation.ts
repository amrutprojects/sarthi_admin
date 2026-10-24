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
  | 'cmsContactSectionEdit'
  | 'cmsContactCoordinatorCreate'
  | 'cmsContactCoordinatorEdit'
  | 'cmsContactCoordinatorView'
  | 'cmsContactOfficeCreate'
  | 'cmsContactOfficeEdit'
  | 'cmsContactOfficeView'
  | 'cmsFooterView'
  | 'cmsFooterEdit'
  | 'cmsModulesView'
  | 'cmsModulesEdit'
  | 'cmsFaqList'
  | 'cmsFaqCreate'
  | 'cmsFaqEdit'
  | 'cmsFaqView'
  | 'cmsEligibilityList'
  | 'cmsEligibilityCreate'
  | 'cmsEligibilityPageEdit'
  | 'cmsEligibilityEdit'
  | 'cmsEligibilityView'
  | 'cmsApplyList'
  | 'cmsApplyCreate'
  | 'cmsApplyPageEdit'
  | 'cmsApplyEdit'
  | 'cmsApplyView'
  | 'cmsHomePage'
  | 'cmsTopBarCreate'
  | 'cmsTopBarEdit'
  | 'cmsTopBarSettings'
  | 'cmsTopBarView'
  | 'cmsAnnouncementsCreate'
  | 'cmsAnnouncementsEdit'
  | 'cmsAnnouncementsSettings'
  | 'cmsAnnouncementsView'
  | 'cmsHeroEdit'
  | 'cmsHighlightEdit'
  | 'cmsBoardCreate'
  | 'cmsBoardEdit'
  | 'cmsBoardSettings'
  | 'cmsBoardView'
  | 'cmsEcosystemCreate'
  | 'cmsEcosystemEdit'
  | 'cmsEcosystemSettings'
  | 'cmsEcosystemView'
  | 'cmsSchemesCreate'
  | 'cmsSchemesEdit'
  | 'cmsSchemesSettings'
  | 'cmsSchemesView'
  | 'cmsImpactCreate'
  | 'cmsImpactEdit'
  | 'cmsImpactSettings'
  | 'cmsImpactView'
  | 'cmsAboutFact'
  | 'cmsAboutCard'
  | 'cmsAboutFactView'
  | 'cmsAboutCardView'
  | 'cmsProgrammeView'
  | 'cmsProgrammeEdit'
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
  | 'cmsDepartmentList'
  | 'cmsDepartmentCreate'
  | 'cmsDepartmentEdit'
  | 'cmsDepartmentView'
  | 'cmsCollegeList'
  | 'cmsCollegeCreate'
  | 'cmsCollegeEdit'
  | 'cmsCollegeView'
  | 'cmsDocumentList'
  | 'cmsDocumentCreate'
  | 'cmsDocumentEdit'
  | 'cmsDocumentView'
  | 'cmsBatchList'
  | 'cmsBatchCreate'
  | 'cmsBatchEdit'
  | 'cmsBatchView'
  | 'cmsBatchAssignmentList'
  | 'cmsBatchAssignmentCreate'
  | 'cmsBatchAssignmentEdit'
  | 'cmsBatchAssignmentView'
  | 'cmsCentreTypeList'
  | 'cmsCentreTypeCreate'
  | 'cmsCentreTypeEdit'
  | 'cmsCentreTypeView'
  | 'cmsTrainingCentreList'
  | 'cmsTrainingCentreCreate'
  | 'cmsTrainingCentreEdit'
  | 'cmsTrainingCentreView'
  | 'cmsCentreLocationList'
  | 'cmsCentreLocationCreate'
  | 'cmsCentreLocationEdit'
  | 'cmsCentreLocationView'
  | 'cmsCentreInfrastructureList'
  | 'cmsCentreInfrastructureCreate'
  | 'cmsCentreInfrastructureEdit'
  | 'cmsCentreInfrastructureView'
  | 'lmsLmsEntityList'
  | 'lmsLmsEntityCreate'
  | 'lmsLmsEntityEdit'
  | 'lmsLmsEntityView'
  | 'lmsBrandingList'
  | 'lmsBrandingEdit'
  | 'lmsBrandingView'
  | 'lmsCalendarList'
  | 'lmsCalendarCreate'
  | 'lmsCalendarEdit'
  | 'lmsCalendarView'
  | 'lmsFormFieldList'
  | 'lmsFormFieldCreate'
  | 'lmsFormFieldEdit'
  | 'lmsFormFieldView'
  | 'lmsReferenceData'
  | 'lmsCourseList'
  | 'lmsCourseCreate'
  | 'lmsCourseEdit'
  | 'lmsCourseView'
  | 'lmsCourseModuleList'
  | 'lmsCourseModuleCreate'
  | 'lmsCourseModuleEdit'
  | 'lmsCourseModuleView'
  | 'lmsTrackVariantList'
  | 'lmsTrackVariantCreate'
  | 'lmsTrackVariantEdit'
  | 'lmsTrackVariantView'
  | 'lmsLearningConfig'
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

/*
 * Home Page Management (/cms/home-page): one sidebar entry and one page, whose tabs are the sections of the
 * public home page in the order it shows them, starting with the Top Bar (the strip at the very top of every
 * page) and the announcements ticker. Each tab belongs to one of nine menus (Home Hero Section has two tabs), and
 * those menus keep their own keys, so their permission codes, Menu Visibility rows and the Website Admin role are
 * unchanged; a tab is shown only to a user who can open its menu. Each menu's Add, Edit and Settings pages keep
 * their own paths, and their Back, Cancel and Save return to the menu's tab.
 * The same grouping decides access in modules/auth/permissions.ts (MENU_GROUPS).
 */
export const HOME_PAGE_MENU = 'cms-home-page';
export const HOME_PAGE_PATH = '/cms/home-page';
export const HOME_PAGE_TABS = [
  { k: 'top-bar', l: 'Top Bar', menu: 'cms-topbar' },
  { k: 'announcements', l: 'Announcements', menu: 'cms-announcements' },
  { k: 'hero', l: 'AMRUT Kalash – apply online', menu: 'cms-hero' },
  { k: 'glance', l: 'Programme at a glance', menu: 'cms-hero' },
  { k: 'diploma', l: 'Skill Development Diploma', menu: 'cms-highlight' },
  { k: 'board', l: 'Leadership & Governing Board', menu: 'cms-board' },
  { k: 'impact', l: "AMRUT's Impact", menu: 'cms-impact' },
  { k: 'ecosystem', l: 'The AMRUT Ecosystem', menu: 'cms-ecosystem' },
  { k: 'schemes', l: 'AMRUT Schemes', menu: 'cms-schemes' },
  { k: 'about', l: 'About AMRUT', menu: 'cms-about' },
] as const;
export type HomePageTab = (typeof HOME_PAGE_TABS)[number]['k'];

/* Home Page Management opened on one tab: where a section's Back, Cancel, Save and Delete return to. */
export const homePageTabPath = (tab: HomePageTab): string => `${HOME_PAGE_PATH}?tab=${tab}`;

/*
 * Each home page menu's former landing page → its tab. The router redirects them, so old links and bookmarks keep
 * working. Top Bar and Announcements never had a page of their own; their paths open the tab like the others, beside
 * their own pages.
 */
export const HOME_PAGE_REDIRECTS: readonly (readonly [path: string, tab: HomePageTab])[] = [
  ['/cms/top-bar', 'top-bar'],
  ['/cms/announcements', 'announcements'],
  ['/cms/hero', 'hero'],
  ['/cms/highlight', 'diploma'],
  ['/cms/board-members', 'board'],
  ['/cms/impact', 'impact'],
  ['/cms/amrut-ecosystem', 'ecosystem'],
  ['/cms/amrut-schemes', 'schemes'],
  ['/cms/about-amrut', 'about'],
];

/* The sidebar entry a menu is reached from: Home Page Management for the menus that are its tabs, else the menu itself. */
export const sidebarKey = (navKey: string): string => (HOME_PAGE_TABS.some((t) => t.menu === navKey) ? HOME_PAGE_MENU : navKey);

/*
 * Every menu, grouped as in the sidebar (assets/js/app.js). Roles & Permissions and Menu Visibility list their
 * rows from it; the sidebar itself shows SIDEBAR_NAV.
 */
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
  /*
   * The website's pages in the order of its own menu (Home, About, Programme, Modules, Eligibility, Apply, FAQ,
   * Contact; About is a tab of Home Page Management), then the footer every page shares, then the geography masters.
   */
  { g: 'CMS' },
  { k: HOME_PAGE_MENU, l: 'Home Page Management', i: 'home', r: HOME_PAGE_PATH },
  /*
   * The nine menus behind Home Page Management's tabs, in home page order. Not sidebar entries of their own
   * (SIDEBAR_NAV leaves them out), but still menus with permissions and Menu Visibility rows of their own.
   */
  { k: 'cms-topbar', l: 'Top Bar', i: 'globe', r: homePageTabPath('top-bar') },
  { k: 'cms-announcements', l: 'Announcements', i: 'megaphone', r: homePageTabPath('announcements') },
  { k: 'cms-hero', l: 'Home Hero Section', i: 'home', r: homePageTabPath('hero') },
  { k: 'cms-highlight', l: 'Home Programme Section', i: 'doc', r: homePageTabPath('diploma') },
  { k: 'cms-board', l: 'Board Members Management', i: 'users', r: homePageTabPath('board') },
  { k: 'cms-impact', l: 'AMRUT Impact Management', i: 'chart', r: homePageTabPath('impact') },
  { k: 'cms-ecosystem', l: 'The AMRUT Ecosystem', i: 'layers', r: homePageTabPath('ecosystem') },
  { k: 'cms-schemes', l: 'AMRUT Schemes Management', i: 'clipboard', r: homePageTabPath('schemes') },
  { k: 'cms-about', l: 'About AMRUT Management', i: 'building', r: homePageTabPath('about') },
  { k: 'cms-programme', l: 'Programme Page Management', i: 'award', r: '/cms/programme' },
  { k: 'cms-modules', l: 'Modules Page Management', i: 'book', r: '/cms/modules' },
  { k: 'cms-eligibility', l: 'Eligibility Page Management', i: 'check', r: '/cms/eligibility' },
  { k: 'cms-apply', l: 'Apply Page Management', i: 'clipboard', r: '/cms/apply' },
  { k: 'cms-faqs', l: 'FAQ Management', i: 'help', r: '/cms/faqs' },
  { k: 'cms-contact', l: 'Contact Page Management', i: 'mail', r: '/cms/contact' },
  { k: 'cms-footer', l: 'Footer Management', i: 'doc', r: '/cms/footer' },
  { k: 'cms-states', l: 'State Master', i: 'globe', r: '/cms/states' },
  { k: 'cms-districts', l: 'District Master', i: 'map', r: '/cms/districts' },
  { k: 'cms-talukas', l: 'Taluka Master', i: 'pin', r: '/cms/talukas' },
  { g: 'Masters' },
  { k: 'cms-departments', l: 'Department Master', i: 'layers', r: '/cms/departments' },
  { k: 'cms-colleges', l: 'College Master', i: 'building', r: '/cms/colleges' },
  { k: 'cms-documents', l: 'Document Master', i: 'doc', r: '/cms/documents' },
  { k: 'cms-batches', l: 'Batch Master', i: 'calendar', r: '/cms/batches' },
  { k: 'cms-batch-assignments', l: 'Assign Batch', i: 'users', r: '/cms/batch-assignments' },
  { k: 'cms-centre-types', l: 'Training Centre Type Master', i: 'clipboard', r: '/cms/centre-types' },
  { k: 'cms-training-centres', l: 'Training Centre Master', i: 'home', r: '/cms/training-centres' },
  { k: 'cms-centre-locations', l: 'Location Information', i: 'pin', r: '/cms/centre-locations' },
  { k: 'cms-centre-infrastructure', l: 'Capacity & Infrastructure', i: 'monitor', r: '/cms/centre-infrastructure' },
  /*
   * Reference-data masters. One "Masters" heading for both sets: group titles are React keys in the
   * sidebar and the permission/menu-visibility tables. Keys equal the backend permission prefixes (regions.view, …).
   */
  { k: 'regions', l: 'Regions', i: 'map', r: '/masters/regions' },
  { k: 'castes', l: 'Castes', i: 'users', r: '/masters/castes' },
  { k: 'document-types', l: 'Document Types', i: 'doc', r: '/masters/document-types' },
  { k: 'education', l: 'Education', i: 'award', r: '/masters/education' },
  { g: 'LMS Admin' },
  { k: 'lms-entities', l: 'Entity Master', i: 'building', r: '/lms/entities' },
  { k: 'lms-branding', l: 'Branding & Settings', i: 'settings', r: '/lms/branding' },
  { k: 'lms-calendars', l: 'Academic Calendar', i: 'calendar', r: '/lms/calendars' },
  { k: 'lms-learning-config', l: 'Learning Configuration', i: 'clock', r: '/lms/learning-config' },
  { k: 'lms-form-fields', l: 'Form Field Configuration', i: 'clipboard', r: '/lms/form-fields' },
  { k: 'lms-reference', l: 'Reference Data', i: 'layers', r: '/lms/reference-data' },
  { k: 'lms-courses', l: 'Course Master', i: 'award', r: '/lms/courses' },
  { k: 'lms-course-modules', l: 'Module Master', i: 'doc', r: '/lms/modules' },
  { k: 'lms-track-variants', l: 'Track Variant Master', i: 'chart', r: '/lms/track-variants' },
  { g: 'Platform' },
  { k: 'lms', l: 'LMS Integration', i: 'plug', r: '/lms' },
  { k: 'app', l: 'Student App', i: 'phone', r: '/student-app' },
  { k: 'admin', l: 'Administration', i: 'settings', r: '/administration' },
  { k: 'users', l: 'Users & Roles', i: 'users', r: '/users' },
  { k: 'audit', l: 'Audit Log', i: 'doc', r: '/audit' },
  { k: 'settings', l: 'System Settings', i: 'settings', r: '/settings' },
  { g: 'Public Site' },
  { k: 'pubhome', l: 'AMRUT Public Site', i: 'globe', r: '/home' },
  { k: 'pubprog', l: 'AMRUT Kalash 2.0', i: 'award', r: '/programme' },
];

/* The sidebar: every menu that is an entry of its own, i.e. NAV without the menus shown as tabs of another entry's page. */
export const SIDEBAR_NAV: NavEntry[] = NAV.filter((n) => isNavGroup(n) || sidebarKey(n.k) === n.k);

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
  /*
   * The Contact page: a tabbed view, one Edit page per singleton section (page information and the two
   * cards), and Add / Edit / View pages for each coordinator and district office. Static paths before
   * the :id patterns, and /:id/edit before /:id.
   */
  ['/cms/contact', 'cmsContactView', 'cms-contact'],
  ['/cms/contact/page/edit', 'cmsContactSectionEdit', 'cms-contact'],
  ['/cms/contact/amrut/edit', 'cmsContactSectionEdit', 'cms-contact'],
  ['/cms/contact/partner/edit', 'cmsContactSectionEdit', 'cms-contact'],
  ['/cms/contact/coordinators/create', 'cmsContactCoordinatorCreate', 'cms-contact'],
  ['/cms/contact/coordinators/:id/edit', 'cmsContactCoordinatorEdit', 'cms-contact'],
  ['/cms/contact/coordinators/:id', 'cmsContactCoordinatorView', 'cms-contact'],
  ['/cms/contact/offices/create', 'cmsContactOfficeCreate', 'cms-contact'],
  ['/cms/contact/offices/:id/edit', 'cmsContactOfficeEdit', 'cms-contact'],
  ['/cms/contact/offices/:id', 'cmsContactOfficeView', 'cms-contact'],
  ['/cms/footer', 'cmsFooterView', 'cms-footer'],
  ['/cms/footer/edit', 'cmsFooterEdit', 'cms-footer'],
  ['/cms/modules', 'cmsModulesView', 'cms-modules'],
  ['/cms/modules/edit', 'cmsModulesEdit', 'cms-modules'],
  ['/cms/faqs', 'cmsFaqList', 'cms-faqs'],
  ['/cms/faqs/create', 'cmsFaqCreate', 'cms-faqs'],
  ['/cms/faqs/:id/edit', 'cmsFaqEdit', 'cms-faqs'],
  ['/cms/faqs/:id', 'cmsFaqView', 'cms-faqs'],
  ['/cms/eligibility', 'cmsEligibilityList', 'cms-eligibility'],
  ['/cms/eligibility/create', 'cmsEligibilityCreate', 'cms-eligibility'],
  ['/cms/eligibility/page/edit', 'cmsEligibilityPageEdit', 'cms-eligibility'],
  ['/cms/eligibility/:id/edit', 'cmsEligibilityEdit', 'cms-eligibility'],
  ['/cms/eligibility/:id', 'cmsEligibilityView', 'cms-eligibility'],
  ['/cms/apply', 'cmsApplyList', 'cms-apply'],
  ['/cms/apply/create', 'cmsApplyCreate', 'cms-apply'],
  ['/cms/apply/page/edit', 'cmsApplyPageEdit', 'cms-apply'],
  ['/cms/apply/:id/edit', 'cmsApplyEdit', 'cms-apply'],
  ['/cms/apply/:id', 'cmsApplyView', 'cms-apply'],
  /*
   * Home Page Management: one tabbed page for the nine home page menus (HOME_PAGE_TABS above). Each menu's
   * own pages stay under its key, so their permission checks still apply; its former landing page redirects
   * to its tab (HOME_PAGE_REDIRECTS, router.tsx).
   */
  [HOME_PAGE_PATH, 'cmsHomePage', HOME_PAGE_MENU],
  /* Top Bar (the strip at the very top of the site): static paths (create, settings) before the :id patterns. */
  ['/cms/top-bar/create', 'cmsTopBarCreate', 'cms-topbar'],
  ['/cms/top-bar/settings', 'cmsTopBarSettings', 'cms-topbar'],
  ['/cms/top-bar/:id/edit', 'cmsTopBarEdit', 'cms-topbar'],
  ['/cms/top-bar/:id/view', 'cmsTopBarView', 'cms-topbar'],
  /* Announcements (the ticker at the top of the site): static paths (create, settings) before the :id patterns. */
  ['/cms/announcements/create', 'cmsAnnouncementsCreate', 'cms-announcements'],
  ['/cms/announcements/settings', 'cmsAnnouncementsSettings', 'cms-announcements'],
  ['/cms/announcements/:id/edit', 'cmsAnnouncementsEdit', 'cms-announcements'],
  ['/cms/announcements/:id/view', 'cmsAnnouncementsView', 'cms-announcements'],
  ['/cms/hero/edit', 'cmsHeroEdit', 'cms-hero'],
  ['/cms/highlight/edit', 'cmsHighlightEdit', 'cms-highlight'],
  /*
   * Board members, programmes, schemes and statistics: static paths (create, settings) before the :id patterns,
   * as for the masters below. Each row has an Edit page and a read-only View page (/:id/view, the eye button).
   */
  ['/cms/board-members/create', 'cmsBoardCreate', 'cms-board'],
  ['/cms/board-members/settings', 'cmsBoardSettings', 'cms-board'],
  ['/cms/board-members/:id/edit', 'cmsBoardEdit', 'cms-board'],
  ['/cms/board-members/:id/view', 'cmsBoardView', 'cms-board'],
  ['/cms/amrut-ecosystem/create', 'cmsEcosystemCreate', 'cms-ecosystem'],
  ['/cms/amrut-ecosystem/settings', 'cmsEcosystemSettings', 'cms-ecosystem'],
  ['/cms/amrut-ecosystem/:id/edit', 'cmsEcosystemEdit', 'cms-ecosystem'],
  ['/cms/amrut-ecosystem/:id/view', 'cmsEcosystemView', 'cms-ecosystem'],
  ['/cms/amrut-schemes/create', 'cmsSchemesCreate', 'cms-schemes'],
  ['/cms/amrut-schemes/settings', 'cmsSchemesSettings', 'cms-schemes'],
  ['/cms/amrut-schemes/:id/edit', 'cmsSchemesEdit', 'cms-schemes'],
  ['/cms/amrut-schemes/:id/view', 'cmsSchemesView', 'cms-schemes'],
  ['/cms/impact/create', 'cmsImpactCreate', 'cms-impact'],
  ['/cms/impact/settings', 'cmsImpactSettings', 'cms-impact'],
  ['/cms/impact/:id/edit', 'cmsImpactEdit', 'cms-impact'],
  ['/cms/impact/:id/view', 'cmsImpactView', 'cms-impact'],
  /* About AMRUT: static `create` paths before the :id patterns. */
  ['/cms/about-amrut/facts/create', 'cmsAboutFact', 'cms-about'],
  ['/cms/about-amrut/facts/:id/edit', 'cmsAboutFact', 'cms-about'],
  ['/cms/about-amrut/facts/:id/view', 'cmsAboutFactView', 'cms-about'],
  ['/cms/about-amrut/cards/create', 'cmsAboutCard', 'cms-about'],
  ['/cms/about-amrut/cards/:id/edit', 'cmsAboutCard', 'cms-about'],
  ['/cms/about-amrut/cards/:id/view', 'cmsAboutCardView', 'cms-about'],
  ['/cms/programme', 'cmsProgrammeView', 'cms-programme'],
  ['/cms/programme/edit', 'cmsProgrammeEdit', 'cms-programme'],
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
  ['/cms/departments', 'cmsDepartmentList', 'cms-departments'],
  ['/cms/departments/create', 'cmsDepartmentCreate', 'cms-departments'],
  ['/cms/departments/:id/edit', 'cmsDepartmentEdit', 'cms-departments'],
  ['/cms/departments/:id', 'cmsDepartmentView', 'cms-departments'],
  ['/cms/colleges', 'cmsCollegeList', 'cms-colleges'],
  ['/cms/colleges/create', 'cmsCollegeCreate', 'cms-colleges'],
  ['/cms/colleges/:id/edit', 'cmsCollegeEdit', 'cms-colleges'],
  ['/cms/colleges/:id', 'cmsCollegeView', 'cms-colleges'],
  ['/cms/documents', 'cmsDocumentList', 'cms-documents'],
  ['/cms/documents/create', 'cmsDocumentCreate', 'cms-documents'],
  ['/cms/documents/:id/edit', 'cmsDocumentEdit', 'cms-documents'],
  ['/cms/documents/:id', 'cmsDocumentView', 'cms-documents'],
  ['/cms/batches', 'cmsBatchList', 'cms-batches'],
  ['/cms/batches/create', 'cmsBatchCreate', 'cms-batches'],
  ['/cms/batches/:id/edit', 'cmsBatchEdit', 'cms-batches'],
  ['/cms/batches/:id', 'cmsBatchView', 'cms-batches'],
  ['/cms/batch-assignments', 'cmsBatchAssignmentList', 'cms-batch-assignments'],
  ['/cms/batch-assignments/create', 'cmsBatchAssignmentCreate', 'cms-batch-assignments'],
  ['/cms/batch-assignments/:id/edit', 'cmsBatchAssignmentEdit', 'cms-batch-assignments'],
  ['/cms/batch-assignments/:id', 'cmsBatchAssignmentView', 'cms-batch-assignments'],
  ['/cms/centre-types', 'cmsCentreTypeList', 'cms-centre-types'],
  ['/cms/centre-types/create', 'cmsCentreTypeCreate', 'cms-centre-types'],
  ['/cms/centre-types/:id/edit', 'cmsCentreTypeEdit', 'cms-centre-types'],
  ['/cms/centre-types/:id', 'cmsCentreTypeView', 'cms-centre-types'],
  ['/cms/training-centres', 'cmsTrainingCentreList', 'cms-training-centres'],
  ['/cms/training-centres/create', 'cmsTrainingCentreCreate', 'cms-training-centres'],
  ['/cms/training-centres/:id/edit', 'cmsTrainingCentreEdit', 'cms-training-centres'],
  ['/cms/training-centres/:id', 'cmsTrainingCentreView', 'cms-training-centres'],
  ['/cms/centre-locations', 'cmsCentreLocationList', 'cms-centre-locations'],
  ['/cms/centre-locations/create', 'cmsCentreLocationCreate', 'cms-centre-locations'],
  ['/cms/centre-locations/:id/edit', 'cmsCentreLocationEdit', 'cms-centre-locations'],
  ['/cms/centre-locations/:id', 'cmsCentreLocationView', 'cms-centre-locations'],
  ['/cms/centre-infrastructure', 'cmsCentreInfrastructureList', 'cms-centre-infrastructure'],
  ['/cms/centre-infrastructure/create', 'cmsCentreInfrastructureCreate', 'cms-centre-infrastructure'],
  ['/cms/centre-infrastructure/:id/edit', 'cmsCentreInfrastructureEdit', 'cms-centre-infrastructure'],
  ['/cms/centre-infrastructure/:id', 'cmsCentreInfrastructureView', 'cms-centre-infrastructure'],
  /* LMS Admin masters. Static paths (create) before :id patterns. */
  ['/lms/entities', 'lmsLmsEntityList', 'lms-entities'],
  ['/lms/entities/create', 'lmsLmsEntityCreate', 'lms-entities'],
  ['/lms/entities/:id/edit', 'lmsLmsEntityEdit', 'lms-entities'],
  ['/lms/entities/:id', 'lmsLmsEntityView', 'lms-entities'],
  ['/lms/branding', 'lmsBrandingList', 'lms-branding'],
  ['/lms/branding/:entityId/edit', 'lmsBrandingEdit', 'lms-branding'],
  ['/lms/branding/:entityId', 'lmsBrandingView', 'lms-branding'],
  ['/lms/calendars', 'lmsCalendarList', 'lms-calendars'],
  ['/lms/calendars/create', 'lmsCalendarCreate', 'lms-calendars'],
  ['/lms/calendars/:id/edit', 'lmsCalendarEdit', 'lms-calendars'],
  ['/lms/calendars/:id', 'lmsCalendarView', 'lms-calendars'],
  ['/lms/form-fields', 'lmsFormFieldList', 'lms-form-fields'],
  ['/lms/form-fields/create', 'lmsFormFieldCreate', 'lms-form-fields'],
  ['/lms/form-fields/:id/edit', 'lmsFormFieldEdit', 'lms-form-fields'],
  ['/lms/form-fields/:id', 'lmsFormFieldView', 'lms-form-fields'],
  ['/lms/reference-data', 'lmsReferenceData', 'lms-reference'],
  ['/lms/courses', 'lmsCourseList', 'lms-courses'],
  ['/lms/courses/create', 'lmsCourseCreate', 'lms-courses'],
  ['/lms/courses/:id/edit', 'lmsCourseEdit', 'lms-courses'],
  ['/lms/courses/:id', 'lmsCourseView', 'lms-courses'],
  ['/lms/modules', 'lmsCourseModuleList', 'lms-course-modules'],
  ['/lms/modules/create', 'lmsCourseModuleCreate', 'lms-course-modules'],
  ['/lms/modules/:id/edit', 'lmsCourseModuleEdit', 'lms-course-modules'],
  ['/lms/modules/:id', 'lmsCourseModuleView', 'lms-course-modules'],
  ['/lms/track-variants', 'lmsTrackVariantList', 'lms-track-variants'],
  ['/lms/track-variants/create', 'lmsTrackVariantCreate', 'lms-track-variants'],
  ['/lms/track-variants/:id/edit', 'lmsTrackVariantEdit', 'lms-track-variants'],
  ['/lms/track-variants/:id', 'lmsTrackVariantView', 'lms-track-variants'],
  ['/lms/learning-config', 'lmsLearningConfig', 'lms-learning-config'],
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
