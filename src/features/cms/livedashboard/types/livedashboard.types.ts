/* The home page's Programme Progress – Live Dashboard, as /api/v1/cms/live-dashboard returns and accepts it. */

/** A Marathi/English pair. Optional texts come back as { mr: '', en: '' } when blank. */
export interface Bilingual {
  mr: string;
  en: string;
}

/**
 * The section's one settings row: its texts, which of its parts the website shows, and the training-mode counts.
 * Whether the whole section is shown (`showSection`) is the tab's "Show on website" switch; the settings form
 * never sends it.
 */
export interface ApiLiveDashboardSettings {
  id: string;
  heading: Bilingual;
  subtitle: Bilingual;
  showSection: boolean;
  /** The demo-data note under the section; shown only while showDisclaimer is on and the text is filled in. */
  disclaimer: Bilingual;
  showDisclaimer: boolean;
  /** The district map card. */
  mapTitle: Bilingual;
  showMap: boolean;
  /** The training modes card: a donut of the two counts, with the side figures beside it. */
  modesTitle: Bilingual;
  showModes: boolean;
  offlineLabel: Bilingual;
  onlineLabel: Bilingual;
  offlineCount: number;
  onlineCount: number;
  /** The line under the donut's centre value (offline + online). */
  donutCenterLabel: Bilingual;
  createdAt: string;
  updatedAt: string;
}

/** The PUT body: every editable setting, and the version the form was opened at (409 when it changed since). */
export interface UpdateLiveDashboardSettingsInput {
  heading: Bilingual;
  subtitle: Bilingual;
  disclaimer: Bilingual;
  showDisclaimer: boolean;
  mapTitle: Bilingual;
  showMap: boolean;
  modesTitle: Bilingual;
  showModes: boolean;
  offlineLabel: Bilingual;
  onlineLabel: Bilingual;
  offlineCount: number;
  onlineCount: number;
  donutCenterLabel: Bilingual;
  expectedUpdatedAt: string;
}

/** A KPI card's accent: the website's `.pub-kpi` classes '' / 'b' / 'g' / 'v'. */
export type CardTone = 'default' | 'blue' | 'green' | 'violet';

/** One KPI card of the two rows at the top of the section ("Total target 2,000 students", …). */
export interface ApiLiveDashboardCard {
  id: string;
  label: Bilingual;
  /** The figure exactly as printed, e.g. "2,000" or "87%". Entered by hand, never counted. */
  value: string;
  /** The small line under the figure; a blank pair when the card has none. */
  detail: Bilingual;
  /** '' (the card is not a link) or a page of the public site, e.g. "/programme". */
  link: string;
  tone: CardTone;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** The create body; on update every key is optional and only the keys sent are changed. */
export interface LiveDashboardCardInput {
  label?: Bilingual;
  value?: string;
  detail?: Bilingual;
  link?: string;
  tone?: CardTone;
  displayOrder?: number;
  isActive?: boolean;
  /** Update only: the updatedAt the form was opened with; the server answers 409 if it changed since. */
  expectedUpdatedAt?: string;
}

/** One side figure of the training modes card ("Approved centres 10", …). */
export interface ApiLiveDashboardStat {
  id: string;
  label: Bilingual;
  /** The figure exactly as printed, e.g. "10" or "78%". */
  value: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveDashboardStatInput {
  label?: Bilingual;
  value?: string;
  displayOrder?: number;
  isActive?: boolean;
  expectedUpdatedAt?: string;
}

/** A district's programme stage: its tile colour on the map and the status in its tooltip. */
export type DistrictStatus =
  | 'NOT_STARTED'
  | 'PLANNING'
  | 'CENTRE_SELECTION'
  | 'MOBILIZATION'
  | 'TRAINING_ACTIVE'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CRITICAL';

/** One of the 36 districts of the map, by its fixed three-letter code (e.g. "PUN"). Never added or deleted. */
export interface ApiLiveDashboardDistrict {
  id: string;
  code: string;
  name: Bilingual;
  status: DistrictStatus;
  target: number;
  enrolled: number;
  trainingActive: number;
  completed: number;
  certified: number;
  /** 0–100. */
  attendancePct: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** The PATCH body: only the figures sent change, plus the version the dialog was opened at. */
export interface LiveDashboardDistrictInput {
  status?: DistrictStatus;
  target?: number;
  enrolled?: number;
  trainingActive?: number;
  completed?: number;
  certified?: number;
  attendancePct?: number;
  expectedUpdatedAt?: string;
}

/* Error keys are paths, because the texts are pairs — "label.mr". */
export type LiveDashboardField = string;
