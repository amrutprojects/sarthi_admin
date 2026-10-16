/*
 * Domain model of the AMRUT × SUMAGO programme, as produced by the mock data
 * service (src/legacy/data.js). These are the shapes a real backend API would return.
 */

export type Mode = 'OFFLINE' | 'ONLINE';
export type Tone = 'green' | 'amber' | 'red' | 'grey' | 'blue' | 'info' | 'violet' | 'saffron';
export type Rag = 'GREEN' | 'AMBER' | 'RED' | 'GREY';
export type IsoDate = string;

export type CandidateStatus =
  | 'LEAD' | 'ENQUIRY' | 'APPLICATION_STARTED' | 'APPLICATION_SUBMITTED' | 'DOCUMENTS_PENDING' | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_VERIFICATION' | 'ELIGIBILITY_VERIFIED' | 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'APPROVED' | 'ENROLLED' | 'BATCH_ALLOCATED'
  | 'TRAINING_STARTED' | 'TRAINING_ACTIVE' | 'TRAINING_COMPLETED' | 'ASSESSMENT_PENDING' | 'ASSESSMENT_ATTEMPTED'
  | 'PASSED' | 'FAILED' | 'CERTIFICATE_GENERATED' | 'CERTIFIED' | 'DROPPED' | 'WITHDRAWN';

export type DistrictStatusKey = 'NOT_STARTED' | 'PLANNING' | 'CENTRE_SELECTION' | 'MOBILIZATION' | 'TRAINING_ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CRITICAL';

/* KPI rollup computed by AS.db.kpis() over a set of candidates. */
export interface Kpis {
  target: number; applications: number; eligible: number; notEligible: number; underVerification: number; docsPending: number;
  enrolled: number; trainingActive: number; completed: number; assessed: number; passed: number; failed: number; certified: number;
  certificatesGenerated: number; offline: number; online: number; offlineActive: number; onlineActive: number; atRisk: number;
  attendanceSum: number; attendanceN: number; progressSum: number; progressN: number;
  attendance: number; avgProgress: number; achievementPct: number; completionPct: number; certificationPct: number; passRate: number;
}

export interface StatusDef { k: CandidateStatus; l: string; tone: Tone; stage: number }
export interface Role { k: string; l: string; scope: string; perms: string[] }
export interface DistrictStatusDef { l: string; tone: Tone; rag: Rag; color: string }
export interface Risk { k: 'ATTENDANCE' | 'INACTIVE' | 'PROGRESS' | 'ASSESSMENT' | 'DOCS'; l: string; tone: Tone }

export interface District {
  id: string; code: string; name: string; col: number; row: number; region: string; talukas: string[];
  hasCentre: boolean; target: number; coordinatorId: string; status: DistrictStatusKey; lat: number; lng: number; _k: Kpis;
}

export interface CentreInfra { computers: number; classrooms: number; internet: string; power: string; biometric: boolean }
export interface Centre {
  id: string; name: string; districtId: string; taluka: string; mode: Mode; manager: string; managerPhone: string; email: string;
  address: string; capacity: number; approvedOn: IsoDate; score: number; status: string; scorecard: Record<string, number>;
  infra: CentreInfra; lat?: number; lng?: number; _k: Kpis; batches: Batch[]; activeBatches: number; students: number; attendance: number;
}

export interface Batch {
  id: string; mode: Mode; centreId: string; districtId: string | null; taluka: string | null; courseId: string; trainerId: string;
  seats: number; start: IsoDate; end: IsoDate; status: string; sessionsPlanned: number; candidateIds: string[]; _k: Kpis;
  students: number; attendance: number; progress: number; sessionsDone: number;
}

export interface Trainer {
  id: string; name: string; qualification: string; experience: number; specialization: string; mode: Mode; centreId: string;
  districtId: string; phone: string; email: string; totStatus: string; totDay1: boolean; totDay2: boolean; availability: string;
  sessionsDelivered: number; feedback: number; score: number; batchIds: string[]; batches: Batch[]; students: number; attendance: number;
}

export interface CandidateDocs { aadhaar: boolean; photo: boolean; education: boolean; income: boolean; bank: boolean }
export interface Candidate {
  id: string; name: string; gender: string; age: number; phone: string; email: string; districtId: string; taluka: string; mode: Mode;
  centreId: string | null; batchId: string | null; courseId: string | null; status: CandidateStatus; source: string;
  appliedOn: IsoDate; enrolledOn: IsoDate | null; attendance: number; progress: number; qualification: string; docs: CandidateDocs;
  score: number | null; certificateNo: string | null; lastActivity: IsoDate; risks: Risk[]; rejectReason?: string;
}

export interface Course { id: string; name: string; hours: number; mode: string }
export interface Coordinator { id: string; name: string; phone: string; email: string; districts: string[] }
export interface PmoMember { role: string; name: string; email: string; tasks: number; focus: string }
export interface User { id: string; name: string; email: string; role: string; scopeLabel: string; status: string }

export interface Campaign {
  id: string; name: string; platform: string; status: string; spend: number; reach: number; clicks: number; leads: number; reg: number;
  start: IsoDate; end: IsoDate; conversion: number; cpl: number;
}
export interface LeadSource { s: string; leads: number; reg: number; enr: number }
export interface Mobilization {
  awareness: number; reach: number; engagement: number; websiteVisits: number; enquiries: number; leads: number;
  registrations: number; documents: number; verified: number; eligible: number; enrolled: number;
}

export interface Task {
  id: string; title: string; type: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; owner: string; ownerName: string; due: IsoDate;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'; ref: string; district: string | null; desc: string;
}
export interface Notification { id: string; t: string; s: string; when: string; tone: 'red' | 'amber' | 'green' | 'blue'; link: string }
export interface DocumentRecord {
  id: string; name: string; category: string; type: string; owner: string; districtId: string | null; size: string;
  uploaded: IsoDate; status: string; by: string;
}
export interface AuditEntry {
  id: string; user: string; role: string; action: string; module: string; oldValue: string; newValue: string;
  date: IsoDate; time: string; ip: string; device: string;
}
export interface Inspection {
  id: string; centreId: string; centreName: string; districtId: string; level: string; type: string; scheduled: IsoDate;
  inspector: string; status: string; score: number | null;
}
export interface Payment {
  id: string; centreId: string; centreName: string; districtId: string; enrolled: number; completed: number; certified: number;
  m1: number; m2: number; m3: number; committed: number; paid: number; status: string;
}
export interface MonthlyPoint { m: string; applications: number; enrolled: number; completed: number; certified: number; attendance: number }
export interface AttendancePoint { d: IsoDate; v: number; dow: number }
export interface LiveSession {
  id: string; batchId: string; mode: Mode; centreId: string; districtId: string | null; trainerId: string; topic: string;
  start: string; expected: number; present: number; status: string;
}
export interface Communication {
  id: string; name: string; channel: string; audience: string; recipients: number; sent: number; delivered: number;
  read: number; status: string; when: string;
}
export interface LmsLog { t: string; s: string; m: string }
export interface Lms {
  status: string; endpoint: string; lastSync: string; nextSync: string; studentsSynced: number; coursesSynced: number; modules: number;
  assignmentsSubmitted: number; mcqsCompleted: number; assessmentsSynced: number; activeUsers7d: number; avgSessionMin: number; logs: LmsLog[];
}
export interface StudentApp {
  registered: number; active30d: number; dau: number; materialViews: number; mcqCompletion: number; notificationsSent: number;
  assignmentsSubmitted: number; androidVersion: string; iosVersion: string; crashFree: number; todayMaterial: string; todayMcq: string; upcoming: string;
}
export interface ProgrammeConfig {
  projectName: string; shortName: string; implementingAgency: string; state: string; target: number; batchSize: number;
  plannedBatches: number; plannedCentres: number; trainerPool: number; coordinators: number; perStudentValue: number;
  coepChargePercent: number; trainingWeeks: number; sessionsPerBatch: number; minAttendancePct: number; passMarkPct: number;
  projectStart: IsoDate; projectEnd: IsoDate; asOf: IsoDate; mapProvider: string; lmsName: string; appName: string; demoMode: boolean;
}
export interface HealthScore { score: number; factors: { k: string; v: number; w: number }[]; status: string }
export interface SearchResult { type: string; id: string; title: string; sub: string; link: string }
export interface TalukaRollup { taluka: string; districtId: string; rows: Candidate[]; k: Kpis }
