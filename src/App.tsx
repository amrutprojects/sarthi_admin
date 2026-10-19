import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import RequireAccess from './routes/RequireAccess';
import LoginPage from './pages/LoginPage';
import { ADMIN_ROUTES, type RouteName } from './routes/navConfig';
import type { ComponentType } from 'react';
import useLegacyEvents from './hooks/useLegacyEvents';
import DashboardPage from './pages/dashboard/DashboardPage';
import ExecutivePage from './pages/dashboard/ExecutivePage';
import TodayPage from './pages/dashboard/TodayPage';
import CandidatesPage from './pages/candidates/CandidatesPage';
import CandidateDetailPage from './pages/candidates/CandidateDetailPage';
import LifecyclePage from './pages/candidates/LifecyclePage';
import AtRiskPage from './pages/candidates/AtRiskPage';
import DistrictsPage from './pages/network/DistrictsPage';
import DistrictDetailPage from './pages/network/DistrictDetailPage';
import TalukaDetailPage from './pages/network/TalukaDetailPage';
import MapPage from './pages/network/MapPage';
import CentresPage from './pages/network/CentresPage';
import CentreDetailPage from './pages/network/CentreDetailPage';
import CentreOnboardingPage from './pages/network/CentreOnboardingPage';
import BatchesPage from './pages/delivery/BatchesPage';
import BatchDetailPage from './pages/delivery/BatchDetailPage';
import TrainersPage from './pages/delivery/TrainersPage';
import TrainerDetailPage from './pages/delivery/TrainerDetailPage';
import TotPage from './pages/delivery/TotPage';
import LivePage from './pages/training/LivePage';
import OfflinePage from './pages/training/OfflinePage';
import OnlinePage from './pages/training/OnlinePage';
import AttendancePage from './pages/training/AttendancePage';
import ProgressPage from './pages/training/ProgressPage';
import AssessmentsPage from './pages/outcomes/AssessmentsPage';
import CertificationPage from './pages/outcomes/CertificationPage';
import MarketingPage from './pages/outreach/MarketingPage';
import CampaignDetailPage from './pages/outreach/CampaignDetailPage';
import MobilizationPage from './pages/outreach/MobilizationPage';
import CommunicationsPage from './pages/outreach/CommunicationsPage';
import TasksPage from './pages/governance/TasksPage';
import DocumentsPage from './pages/governance/DocumentsPage';
import ReportsPage from './pages/governance/ReportsPage';
import ReportDetailPage from './pages/governance/ReportDetailPage';
import FinancePage from './pages/governance/FinancePage';
import PmoPage from './pages/governance/PmoPage';
import QaPage from './pages/governance/QaPage';
import LmsPage from './pages/platform/LmsPage';
import StudentAppPage from './pages/platform/StudentAppPage';
import AdministrationPage from './pages/platform/AdministrationPage';
import UsersPage from './pages/platform/UsersPage';
import AuditPage from './pages/platform/AuditPage';
import SettingsPage from './pages/platform/SettingsPage';
import StateList from './features/cms/state/pages/StateList';
import StateCreate from './features/cms/state/pages/StateCreate';
import StateEdit from './features/cms/state/pages/StateEdit';
import StateView from './features/cms/state/pages/StateView';
import DistrictList from './features/cms/district/pages/DistrictList';
import DistrictCreate from './features/cms/district/pages/DistrictCreate';
import DistrictEdit from './features/cms/district/pages/DistrictEdit';
import DistrictView from './features/cms/district/pages/DistrictView';
import TalukaList from './features/cms/taluka/pages/TalukaList';
import TalukaCreate from './features/cms/taluka/pages/TalukaCreate';
import TalukaEdit from './features/cms/taluka/pages/TalukaEdit';
import TalukaView from './features/cms/taluka/pages/TalukaView';

/* Route name → React page component. */
const REACT_PAGES: Record<RouteName, ComponentType> = {
  dashboard: DashboardPage,
  executive: ExecutivePage,
  today: TodayPage,
  candidates: CandidatesPage,
  candidateDetail: CandidateDetailPage,
  lifecycle: LifecyclePage,
  atRisk: AtRiskPage,
  districts: DistrictsPage,
  districtDetail: DistrictDetailPage,
  talukaDetail: TalukaDetailPage,
  mapPage: MapPage,
  centres: CentresPage,
  centreDetail: CentreDetailPage,
  centreOnboarding: CentreOnboardingPage,
  batches: BatchesPage,
  batchDetail: BatchDetailPage,
  trainers: TrainersPage,
  trainerDetail: TrainerDetailPage,
  tot: TotPage,
  live: LivePage,
  offlineMode: OfflinePage,
  onlineMode: OnlinePage,
  attendance: AttendancePage,
  progress: ProgressPage,
  assessments: AssessmentsPage,
  certification: CertificationPage,
  marketing: MarketingPage,
  campaignDetail: CampaignDetailPage,
  mobilization: MobilizationPage,
  communications: CommunicationsPage,
  tasks: TasksPage,
  documents: DocumentsPage,
  reports: ReportsPage,
  reportDetail: ReportDetailPage,
  finance: FinancePage,
  pmo: PmoPage,
  qa: QaPage,
  cmsStateList: StateList,
  cmsStateCreate: StateCreate,
  cmsStateEdit: StateEdit,
  cmsStateView: StateView,
  cmsDistrictList: DistrictList,
  cmsDistrictCreate: DistrictCreate,
  cmsDistrictEdit: DistrictEdit,
  cmsDistrictView: DistrictView,
  cmsTalukaList: TalukaList,
  cmsTalukaCreate: TalukaCreate,
  cmsTalukaEdit: TalukaEdit,
  cmsTalukaView: TalukaView,
  lms: LmsPage,
  studentApp: StudentAppPage,
  administration: AdministrationPage,
  users: UsersPage,
  audit: AuditPage,
  settings: SettingsPage,
};

export default function App() {
  useLegacyEvents();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {ADMIN_ROUTES.map(([path, name, navKey]) => {
            const Page = REACT_PAGES[name];
            return <Route key={path} path={path} element={<RequireAccess navKey={navKey}><Page /></RequireAccess>} />;
          })}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="page">
      <div className="page-head"><h1>Page not found</h1></div>
      <a className="btn primary" href="#/dashboard">Go to Dashboard</a>
    </div>
  );
}
