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
  cmsFaqList: page(() => import('../features/cms/faq/pages/FaqList')),
  cmsFaqCreate: page(() => import('../features/cms/faq/pages/FaqCreate')),
  cmsFaqEdit: page(() => import('../features/cms/faq/pages/FaqEdit')),
  cmsFaqView: page(() => import('../features/cms/faq/pages/FaqView')),
  cmsEligibilityList: page(() => import('../features/cms/eligibility/pages/EligibilityList')),
  cmsEligibilityCreate: page(() => import('../features/cms/eligibility/pages/EligibilityCreate')),
  cmsEligibilityPageEdit: page(() => import('../features/cms/eligibility/pages/EligibilityPageEdit')),
  cmsEligibilityEdit: page(() => import('../features/cms/eligibility/pages/EligibilityEdit')),
  cmsEligibilityView: page(() => import('../features/cms/eligibility/pages/EligibilityView')),
  cmsApplyList: page(() => import('../features/cms/apply/pages/ApplyList')),
  cmsApplyCreate: page(() => import('../features/cms/apply/pages/ApplyCreate')),
  cmsApplyPageEdit: page(() => import('../features/cms/apply/pages/ApplyPageEdit')),
  cmsApplyEdit: page(() => import('../features/cms/apply/pages/ApplyEdit')),
  cmsApplyView: page(() => import('../features/cms/apply/pages/ApplyView')),
  cmsHeroView: page(() => import('../features/cms/hero/pages/HeroView')),
  cmsHeroEdit: page(() => import('../features/cms/hero/pages/HeroEdit')),
  cmsHighlightView: page(() => import('../features/cms/highlight/pages/HighlightView')),
  cmsHighlightEdit: page(() => import('../features/cms/highlight/pages/HighlightEdit')),
  cmsImpactList: page(() => import('../features/cms/impact/pages/ImpactPage')),
  cmsImpactCreate: page(() => import('../features/cms/impact/pages/ImpactStatCreate')),
  cmsImpactEdit: page(() => import('../features/cms/impact/pages/ImpactStatEdit')),
  cmsImpactSettings: page(() => import('../features/cms/impact/pages/ImpactSettingsEdit')),
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
  cmsDepartmentList: page(() => import('../features/cms/department/pages/DepartmentList')),
  cmsDepartmentCreate: page(() => import('../features/cms/department/pages/DepartmentCreate')),
  cmsDepartmentEdit: page(() => import('../features/cms/department/pages/DepartmentEdit')),
  cmsDepartmentView: page(() => import('../features/cms/department/pages/DepartmentView')),
  cmsCollegeList: page(() => import('../features/cms/college/pages/CollegeList')),
  cmsCollegeCreate: page(() => import('../features/cms/college/pages/CollegeCreate')),
  cmsCollegeEdit: page(() => import('../features/cms/college/pages/CollegeEdit')),
  cmsCollegeView: page(() => import('../features/cms/college/pages/CollegeView')),
  cmsDocumentList: page(() => import('../features/cms/document/pages/DocumentList')),
  cmsDocumentCreate: page(() => import('../features/cms/document/pages/DocumentCreate')),
  cmsDocumentEdit: page(() => import('../features/cms/document/pages/DocumentEdit')),
  cmsDocumentView: page(() => import('../features/cms/document/pages/DocumentView')),
  cmsBatchList: page(() => import('../features/cms/batch/pages/BatchList')),
  cmsBatchCreate: page(() => import('../features/cms/batch/pages/BatchCreate')),
  cmsBatchEdit: page(() => import('../features/cms/batch/pages/BatchEdit')),
  cmsBatchView: page(() => import('../features/cms/batch/pages/BatchView')),
  cmsBatchAssignmentList: page(() => import('../features/cms/batchAssignment/pages/BatchAssignmentList')),
  cmsBatchAssignmentCreate: page(() => import('../features/cms/batchAssignment/pages/BatchAssignmentCreate')),
  cmsBatchAssignmentEdit: page(() => import('../features/cms/batchAssignment/pages/BatchAssignmentEdit')),
  cmsBatchAssignmentView: page(() => import('../features/cms/batchAssignment/pages/BatchAssignmentView')),
  cmsCentreTypeList: page(() => import('../features/cms/centreType/pages/CentreTypeList')),
  cmsCentreTypeCreate: page(() => import('../features/cms/centreType/pages/CentreTypeCreate')),
  cmsCentreTypeEdit: page(() => import('../features/cms/centreType/pages/CentreTypeEdit')),
  cmsCentreTypeView: page(() => import('../features/cms/centreType/pages/CentreTypeView')),
  cmsTrainingCentreList: page(() => import('../features/cms/trainingCentre/pages/TrainingCentreList')),
  cmsTrainingCentreCreate: page(() => import('../features/cms/trainingCentre/pages/TrainingCentreCreate')),
  cmsTrainingCentreEdit: page(() => import('../features/cms/trainingCentre/pages/TrainingCentreEdit')),
  cmsTrainingCentreView: page(() => import('../features/cms/trainingCentre/pages/TrainingCentreView')),
  cmsCentreLocationList: page(() => import('../features/cms/centreLocation/pages/CentreLocationList')),
  cmsCentreLocationCreate: page(() => import('../features/cms/centreLocation/pages/CentreLocationCreate')),
  cmsCentreLocationEdit: page(() => import('../features/cms/centreLocation/pages/CentreLocationEdit')),
  cmsCentreLocationView: page(() => import('../features/cms/centreLocation/pages/CentreLocationView')),
  cmsCentreInfrastructureList: page(() => import('../features/cms/centreInfrastructure/pages/CentreInfrastructureList')),
  cmsCentreInfrastructureCreate: page(() => import('../features/cms/centreInfrastructure/pages/CentreInfrastructureCreate')),
  cmsCentreInfrastructureEdit: page(() => import('../features/cms/centreInfrastructure/pages/CentreInfrastructureEdit')),
  cmsCentreInfrastructureView: page(() => import('../features/cms/centreInfrastructure/pages/CentreInfrastructureView')),
  lmsLmsEntityList: page(() => import('../features/lms/entity/pages/LmsEntityList')),
  lmsLmsEntityCreate: page(() => import('../features/lms/entity/pages/LmsEntityCreate')),
  lmsLmsEntityEdit: page(() => import('../features/lms/entity/pages/LmsEntityEdit')),
  lmsLmsEntityView: page(() => import('../features/lms/entity/pages/LmsEntityView')),
  lmsBrandingList: page(() => import('../features/lms/branding/pages/BrandingList')),
  lmsBrandingEdit: page(() => import('../features/lms/branding/pages/BrandingEdit')),
  lmsBrandingView: page(() => import('../features/lms/branding/pages/BrandingView')),
  lmsCalendarList: page(() => import('../features/lms/calendar/pages/CalendarList')),
  lmsCalendarCreate: page(() => import('../features/lms/calendar/pages/CalendarCreate')),
  lmsCalendarEdit: page(() => import('../features/lms/calendar/pages/CalendarEdit')),
  lmsCalendarView: page(() => import('../features/lms/calendar/pages/CalendarView')),
  lmsFormFieldList: page(() => import('../features/lms/formField/pages/FormFieldList')),
  lmsFormFieldCreate: page(() => import('../features/lms/formField/pages/FormFieldCreate')),
  lmsFormFieldEdit: page(() => import('../features/lms/formField/pages/FormFieldEdit')),
  lmsFormFieldView: page(() => import('../features/lms/formField/pages/FormFieldView')),
  lmsReferenceData: page(() => import('../features/lms/reference/pages/ReferenceData')),
  lmsCourseList: page(() => import('../features/lms/course/pages/CourseList')),
  lmsCourseCreate: page(() => import('../features/lms/course/pages/CourseCreate')),
  lmsCourseEdit: page(() => import('../features/lms/course/pages/CourseEdit')),
  lmsCourseView: page(() => import('../features/lms/course/pages/CourseView')),
  lmsCourseModuleList: page(() => import('../features/lms/courseModule/pages/CourseModuleList')),
  lmsCourseModuleCreate: page(() => import('../features/lms/courseModule/pages/CourseModuleCreate')),
  lmsCourseModuleEdit: page(() => import('../features/lms/courseModule/pages/CourseModuleEdit')),
  lmsCourseModuleView: page(() => import('../features/lms/courseModule/pages/CourseModuleView')),
  lmsTrackVariantList: page(() => import('../features/lms/trackVariant/pages/TrackVariantList')),
  lmsTrackVariantCreate: page(() => import('../features/lms/trackVariant/pages/TrackVariantCreate')),
  lmsTrackVariantEdit: page(() => import('../features/lms/trackVariant/pages/TrackVariantEdit')),
  lmsTrackVariantView: page(() => import('../features/lms/trackVariant/pages/TrackVariantView')),
  lmsLearningConfig: page(() => import('../features/lms/calendar/pages/LearningConfig')),
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
          {/* Home Page Figures was merged into Home Hero Section: old links land there, and its own route applies the access rules. */}
          <Route path="/cms/home" element={<Navigate to="/cms/hero" replace />} />
          <Route path="/cms/home/edit" element={<Navigate to="/cms/hero/edit" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
