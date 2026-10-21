import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ADMIN_ROUTES, type RouteName } from '../constants/navigation';
import AdminLayout from '../layouts/AdminLayout';
import LoginPage from '../modules/auth/pages/LoginPage';
import ProtectedRoute from './routing/ProtectedRoute';
import RequireAccess from './routing/RequireAccess';

/*
 * Route name → page component. Pages are lazy-loaded so each screen is its own bundle chunk and the
 * first load only fetches the shell. Paths and sidebar keys live in constants/navigation.ts.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load);
const PAGES: Record<RouteName, LazyExoticComponent<ComponentType>> = {
  dashboard: page(() => import('../modules/dashboard/pages/DashboardPage')),
  executive: page(() => import('../modules/dashboard/pages/ExecutivePage')),
  today: page(() => import('../modules/dashboard/pages/TodayPage')),
  candidates: page(() => import('../modules/candidates/pages/CandidatesPage')),
  candidateDetail: page(() => import('../modules/candidates/pages/CandidateDetailPage')),
  lifecycle: page(() => import('../modules/candidates/pages/LifecyclePage')),
  atRisk: page(() => import('../modules/candidates/pages/AtRiskPage')),
  studentImport: page(() => import('../modules/students/pages/StudentImportPage')),
  importBatch: page(() => import('../modules/students/pages/ImportBatchPage')),
  registrations: page(() => import('../modules/registrations/pages/RegistrationsPage')),
  registrationNew: page(() => import('../modules/registrations/pages/RegistrationFormPage')),
  registrationDetail: page(() => import('../modules/registrations/pages/RegistrationDetailPage')),
  registrationEdit: page(() => import('../modules/registrations/pages/RegistrationFormPage')),
  districts: page(() => import('../modules/network/pages/DistrictsPage')),
  districtDetail: page(() => import('../modules/network/pages/DistrictDetailPage')),
  talukaDetail: page(() => import('../modules/network/pages/TalukaDetailPage')),
  mapPage: page(() => import('../modules/network/pages/MapPage')),
  centres: page(() => import('../modules/network/pages/CentresPage')),
  centreDetail: page(() => import('../modules/network/pages/CentreDetailPage')),
  centreOnboarding: page(() => import('../modules/network/pages/CentreOnboardingPage')),
  batches: page(() => import('../modules/delivery/pages/BatchesPage')),
  batchDetail: page(() => import('../modules/delivery/pages/BatchDetailPage')),
  trainers: page(() => import('../modules/delivery/pages/TrainersPage')),
  trainerDetail: page(() => import('../modules/delivery/pages/TrainerDetailPage')),
  tot: page(() => import('../modules/delivery/pages/TotPage')),
  live: page(() => import('../modules/training/pages/LivePage')),
  offlineMode: page(() => import('../modules/training/pages/OfflinePage')),
  onlineMode: page(() => import('../modules/training/pages/OnlinePage')),
  attendance: page(() => import('../modules/training/pages/AttendancePage')),
  progress: page(() => import('../modules/training/pages/ProgressPage')),
  assessments: page(() => import('../modules/outcomes/pages/AssessmentsPage')),
  certification: page(() => import('../modules/outcomes/pages/CertificationPage')),
  marketing: page(() => import('../modules/outreach/pages/MarketingPage')),
  campaignDetail: page(() => import('../modules/outreach/pages/CampaignDetailPage')),
  mobilization: page(() => import('../modules/outreach/pages/MobilizationPage')),
  communications: page(() => import('../modules/outreach/pages/CommunicationsPage')),
  tasks: page(() => import('../modules/governance/pages/TasksPage')),
  documents: page(() => import('../modules/governance/pages/DocumentsPage')),
  reports: page(() => import('../modules/governance/pages/ReportsPage')),
  reportDetail: page(() => import('../modules/governance/pages/ReportDetailPage')),
  finance: page(() => import('../modules/governance/pages/FinancePage')),
  pmo: page(() => import('../modules/governance/pages/PmoPage')),
  qa: page(() => import('../modules/governance/pages/QaPage')),
  cmsContactView: page(() => import('../features/cms/contact/pages/ContactView')),
  cmsContactEdit: page(() => import('../features/cms/contact/pages/ContactEdit')),
  cmsFooterView: page(() => import('../features/cms/footer/pages/FooterView')),
  cmsFooterEdit: page(() => import('../features/cms/footer/pages/FooterEdit')),
  cmsModulesView: page(() => import('../features/cms/modules/pages/ModulesView')),
  cmsModulesEdit: page(() => import('../features/cms/modules/pages/ModulesEdit')),
  cmsHomeView: page(() => import('../features/cms/home/pages/HomeGlanceView')),
  cmsHomeEdit: page(() => import('../features/cms/home/pages/HomeGlanceEdit')),
  cmsHighlightView: page(() => import('../features/cms/highlight/pages/HighlightView')),
  cmsHighlightEdit: page(() => import('../features/cms/highlight/pages/HighlightEdit')),
  cmsProgrammeView: page(() => import('../features/cms/programme/pages/ProgrammeView')),
  cmsProgrammeEdit: page(() => import('../features/cms/programme/pages/ProgrammeEdit')),
  cmsStateList: page(() => import('../features/cms/state/pages/StateList')),
  cmsStateCreate: page(() => import('../features/cms/state/pages/StateCreate')),
  cmsStateEdit: page(() => import('../features/cms/state/pages/StateEdit')),
  cmsStateView: page(() => import('../features/cms/state/pages/StateView')),
  cmsDistrictList: page(() => import('../features/cms/district/pages/DistrictList')),
  cmsDistrictCreate: page(() => import('../features/cms/district/pages/DistrictCreate')),
  cmsDistrictEdit: page(() => import('../features/cms/district/pages/DistrictEdit')),
  cmsDistrictView: page(() => import('../features/cms/district/pages/DistrictView')),
  cmsTalukaList: page(() => import('../features/cms/taluka/pages/TalukaList')),
  cmsTalukaCreate: page(() => import('../features/cms/taluka/pages/TalukaCreate')),
  cmsTalukaEdit: page(() => import('../features/cms/taluka/pages/TalukaEdit')),
  cmsTalukaView: page(() => import('../features/cms/taluka/pages/TalukaView')),
  lms: page(() => import('../modules/platform/pages/LmsPage')),
  studentApp: page(() => import('../modules/platform/pages/StudentAppPage')),
  administration: page(() => import('../modules/platform/pages/AdministrationPage')),
  users: page(() => import('../modules/users/pages/UsersPage')),
  masters: page(() => import('../modules/masters/pages/MastersPage')),
  masterList: page(() => import('../modules/masters/pages/MasterListPage')),
  audit: page(() => import('../modules/platform/pages/AuditPage')),
  settings: page(() => import('../modules/platform/pages/SettingsPage')),
};

function PageLoading() {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      <div className="skel" style={{ height: 28, width: 260, marginBottom: 16 }} />
      <div className="skel" style={{ height: 140 }} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Page not found</h1>
      </div>
      <a className="btn primary" href="/dashboard">
        Go to Dashboard
      </a>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {ADMIN_ROUTES.map(([path, name, navKey]) => {
            const Page = PAGES[name];
            return (
              <Route
                key={path}
                path={path}
                element={
                  <RequireAccess navKey={navKey}>
                    <Suspense fallback={<PageLoading />}>
                      <Page />
                    </Suspense>
                  </RequireAccess>
                }
              />
            );
          })}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
