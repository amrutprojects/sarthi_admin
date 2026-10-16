/*
 * Types for the shared modules kept from the original portal (src/legacy/*.js),
 * which register themselves on window.AS.
 */
import type {
  AttendancePoint, AuditEntry, Batch, Campaign, Candidate, CandidateStatus, Centre, Communication, Coordinator, Course,
  District, DistrictStatusDef, DistrictStatusKey, DocumentRecord, HealthScore, Inspection, Kpis, LeadSource, LiveSession, Lms,
  Mobilization, MonthlyPoint, Notification, Payment, PmoMember, ProgrammeConfig, Role, SearchResult, StatusDef, StudentApp,
  TalukaRollup, Task, Trainer, User,
} from './domain';

export interface Option { v: string; l: string }
export type Bilingual = { mr: string; en: string };

/* Mock data service: AS.db */
export interface LegacyDb {
  config: ProgrammeConfig;
  STATUS: StatusDef[];
  STATUS_MAP: Record<CandidateStatus, StatusDef>;
  ROLES: Role[];
  DISTRICT_STATUS: Record<DistrictStatusKey, DistrictStatusDef>;
  ENROLLED_STATUSES: CandidateStatus[];
  ACTIVE_STATUSES: CandidateStatus[];
  COMPLETED_STATUSES: CandidateStatus[];
  ASSESSED_STATUSES: CandidateStatus[];
  PASSED_STATUSES: CandidateStatus[];
  CERTIFIED_STATUSES: CandidateStatus[];
  districts: District[]; districtBy: Record<string, District>;
  centres: Centre[]; onlineUnit: Centre; allCentres: Centre[]; centreBy: Record<string, Centre>;
  trainers: Trainer[]; trainerBy: Record<string, Trainer>;
  batches: Batch[]; batchBy: Record<string, Batch>;
  candidates: Candidate[]; candidateBy: Record<string, Candidate>;
  courses: Course[]; coordinators: Coordinator[];
  campaigns: Campaign[]; leadSources: LeadSource[]; mobilization: Mobilization;
  tasks: Task[]; notifications: Notification[]; documents: DocumentRecord[];
  auditLog: AuditEntry[]; inspections: Inspection[]; payments: Payment[];
  monthly: MonthlyPoint[]; months: string[]; attendanceTrend: AttendancePoint[];
  liveSessions: LiveSession[]; pmoTeam: PmoMember[]; users: User[]; demoLogins: string[];
  communications: Communication[]; lms: Lms; studentApp: StudentApp;
  stateKpis: Kpis; sources: string[];
  kpis(rows: Candidate[], target: number): Kpis;
  byDistrict(code: string): Candidate[];
  byCentre(id: string): Candidate[];
  byBatch(id: string): Candidate[];
  byTaluka(code: string, taluka: string): Candidate[];
  healthScore(): HealthScore;
  addDays(iso: string, n: number): string;
  daysBetween(a: string, b: string): number;
  inSet(set: CandidateStatus[], status: CandidateStatus): boolean;
  atRiskCandidates(): Candidate[];
  talukaRollup(code: string): TalukaRollup[];
  search(q: string): SearchResult[];
}

/* Item shapes accepted by the SVG chart generators (AS.charts). */
export interface ChartItem { l: string; v: number; c?: string; link?: string; display?: string; sub?: string }
export interface ChartSeries { l: string; v: number[]; c?: string }
export interface CalendarDay { d: number; v: number; full: string }
export interface ChartOpts { [key: string]: unknown }

export interface LegacyCharts {
  palette: string[];
  donut(items: ChartItem[], opts?: ChartOpts): string;
  hbar(items: ChartItem[], opts?: ChartOpts): string;
  vbar(items: ChartItem[], opts?: ChartOpts): string;
  stacked(labels: string[], series: ChartSeries[], opts?: ChartOpts): string;
  line(series: ChartSeries[], labels: string[], opts?: ChartOpts): string;
  funnel(stages: ChartItem[]): string;
  heatmap(cells: ChartItem[], opts?: ChartOpts): string;
  ring(value: number, opts?: ChartOpts): string;
  calendar(days: CalendarDay[]): string;
}

export interface MapMarker { districtId: string; title: string; sub?: string; badge?: string; link?: string; color?: string; live?: boolean }
export interface MapRenderOpts { metric?: string; colorMode?: string; height?: number; statusFilter?: string; filterMode?: string }
export interface LegacyMap {
  provider: string;
  render(opts: MapRenderOpts): string;
  mount(root: HTMLElement | Document): void;
  markers(list: MapMarker[], opts?: { height?: number; legend?: { c: string; l: string }[] }): string;
}

export interface ModalOptions { title: string; body: string; footer?: string; size?: string; headExtra?: string; onMount?: (root: HTMLElement) => void }
export interface ExportColumn<T> { l: string; exportVal: (row: T) => unknown }

/* Formatters and DOM helpers: AS.ui */
export interface LegacyUi {
  esc(s: unknown): string;
  fmt(n: number | null | undefined): string;
  money(n: number): string;
  dateFmt(iso: string | null | undefined): string;
  titleCase(s: string): string;
  icon(name: string, cls?: string): string;
  badge(label: string, tone?: string, nodot?: boolean): string;
  avatar(name: string, cls?: string): string;
  callout(tone: string, title: string, msg: string): string;
  empty(title: string, msg: string, action?: string): string;
  kvList(pairs: [string, string][]): string;
  statPanel(opts: Record<string, unknown>): string;
  exportRows<T>(name: string, columns: ExportColumn<T>[], rows: T[], fmt: string | null): void;
  modal(o: ModalOptions): void;
  closeModal(): void;
  drawer(o: ModalOptions): void;
  closeDrawer(): void;
  toast(msg: string, kind?: string, ms?: number): void;
  districtOptions(all?: string): Option[];
  centreOptions(): Option[];
  batchOptions(): Option[];
  modeOptions(): Option[];
  statusOptions(): Option[];
}

export interface LearnerStats {
  title: Bilingual; sub: Bilingual; overall: Bilingual; hours: Bilingual; topics: Bilingual; attendance: Bilingual;
  assignments: Bilingual; mcqs: Bilingual; assessments: Bilingual; foot: Bilingual;
  words: { mr: Record<string, string>; en: Record<string, string> };
}

/* Bilingual strings and programme content: AS.content */
export interface LegacyContent {
  t(key: string): string;
  bi(pair: Bilingual | string): string;
  setLang(l: 'mr' | 'en'): void;
  getLang(): 'mr' | 'en';
  STR: Record<string, Bilingual>;
  kalash: { totalHours: number; moduleHours: number; modules: unknown[] };
  learnerStats: LearnerStats;
}

export interface Session { userId: string; role: string; at: number }
export type LegacyAction = (arg?: string | null, el?: Element, e?: Event) => void;

export interface LegacyAuth {
  login(userId: string): User;
  logout(): void;
  currentUser(): User | null | undefined;
  roleDef(): Role | null | undefined;
}

export interface LegacyGlobal {
  db: LegacyDb;
  ui: LegacyUi;
  charts: LegacyCharts;
  map: LegacyMap;
  content: LegacyContent;
  actions: Record<string, LegacyAction>;
  state: Record<string, unknown>;
  session?: Session | null;
  auth?: LegacyAuth;
  render?: () => void;
  nav?: (href: string) => void;
}

declare global {
  interface Window { AS: LegacyGlobal }
}
