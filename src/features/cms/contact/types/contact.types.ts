/* Contact Page Management, as /api/v1/cms/contact returns and accepts it. */

/** A Marathi/English pair. The public site defaults to Marathi, so both halves are always required. */
export interface Bilingual {
  mr: string;
  en: string;
}

export type OrgType = 'AMRUT' | 'IMPLEMENTATION_PARTNER';

/*
 * One card on the Contact page. Which fields apply depends on orgType — the AMRUT card carries an
 * address, phone and website; the partner carries a role and helpdesk hours. Fields that do not
 * apply come back as null rather than missing, so the form can bind to a stable shape.
 */
export interface ApiContactOrganization {
  id: string;
  orgType: OrgType;
  name: Bilingual;
  role: Bilingual | null;
  address: Bilingual | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  helpdeskHours: Bilingual | null;
  displayOrder: number;
  isActive: boolean;
}

/* A district as the Contact sections reference it. */
export interface DistrictRef {
  id: string;
  name: string;
  code: string;
}

/* A division / cluster coordinator card and the districts it covers, in the order the website lists them. */
export interface ApiCoordinator {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  districts: DistrictRef[];
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/*
 * District Office Coordinator details for one district. Every field is optional. The coordinator's name is
 * still called collectorName in the API, and is a Marathi/English pair like the address and office hours.
 */
export interface ApiDistrictOffice {
  id: string;
  district: DistrictRef;
  collectorName: Bilingual | null;
  address: Bilingual | null;
  phone: string | null;
  email: string | null;
  officeHours: Bilingual | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiContactPage {
  id: string;
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  isPublished: boolean;
  /*
   * The "Show on website" switch of the Contact page's "District offices" section (the list of every district).
   * Changed only through contactService.setDistrictOfficesSection, never by saving the page's form.
   */
  showDistrictOffices: boolean;
  /* The "Show on website" switch of the District Office pages' "Approved training centres" card; changed only
     through trainingCentreService.setSection. Optional: an older backend does not send it (the card is shown). */
  showTrainingCentres?: boolean;
  /*
   * The website's floating WhatsApp button: digits with the country code ('' = the AMRUT card's phone), and the
   * message typed into the chat for the visitor (both halves '' = the website's default message). The Helpline
   * popup has no fields of its own: it reads the AMRUT and implementation partner cards.
   */
  whatsappNumber: string;
  whatsappMessage: Bilingual;
  createdAt: string;
  updatedAt: string;
  organizations: ApiContactOrganization[];
  coordinators: ApiCoordinator[];
  districtOffices: ApiDistrictOffice[];
}

/* One card as the PUT accepts it. */
export interface ContactOrganizationInput {
  orgType: OrgType;
  name: Bilingual;
  role?: Bilingual | null;
  address?: Bilingual | null;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  helpdeskHours?: Bilingual | null;
  displayOrder: number;
  isActive: boolean;
}

/*
 * The banner and both cards, saved by the backend in a single transaction. A card type left out is
 * retired, so every save sends both cards. The coordinators and district offices have their own
 * endpoints and are never sent here: the PUT leaves an omitted list unchanged.
 */
export interface UpdateContactPageInput {
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  isPublished: boolean;
  organizations: ContactOrganizationInput[];
  /* Optional: left out, the saved WhatsApp details stay as they are. Only the Helpline & WhatsApp page sends them. */
  whatsappNumber?: string;
  whatsappMessage?: Bilingual;
}

export interface CreateCoordinatorInput {
  name: string;
  phone: string;
  email: string | null;
  /* Replaces the coordinator's districts, in this order (lead district first). */
  districtIds: string[];
  /* Left out on create, the coordinator goes last. */
  displayOrder?: number;
  isActive?: boolean;
  /* Sent only after the administrator confirmed taking districts from the coordinator that covers them now. */
  moveDistricts?: boolean;
}

/* Any subset of the create fields; status has its own endpoint. */
export type UpdateCoordinatorInput = Partial<Omit<CreateCoordinatorInput, 'isActive'>>;

export interface CreateDistrictOfficeInput {
  districtId: string;
  /* Both halves or null: the API refuses a plain string or one language on its own. */
  collectorName: Bilingual | null;
  address: Bilingual | null;
  phone: string | null;
  email: string | null;
  officeHours: Bilingual | null;
  isActive?: boolean;
}

export type UpdateDistrictOfficeInput = Partial<Omit<CreateDistrictOfficeInput, 'isActive'>>;

export const ORG_LABEL: Record<OrgType, string> = {
  AMRUT: 'AMRUT',
  IMPLEMENTATION_PARTNER: 'Implementation partner',
};

/* Field names the form keys validation messages by. Card fields are prefixed with their type. */
export const CONTACT_FIELDS = [
  'pageTitle.mr', 'pageTitle.en', 'pageSubtitle.mr', 'pageSubtitle.en',
  'AMRUT.name.mr', 'AMRUT.name.en', 'AMRUT.address.mr', 'AMRUT.address.en',
  'AMRUT.email', 'AMRUT.phone', 'AMRUT.websiteUrl',
  'IMPLEMENTATION_PARTNER.name.mr', 'IMPLEMENTATION_PARTNER.name.en',
  'IMPLEMENTATION_PARTNER.role.mr', 'IMPLEMENTATION_PARTNER.role.en',
  'IMPLEMENTATION_PARTNER.email',
  'IMPLEMENTATION_PARTNER.helpdeskHours.mr', 'IMPLEMENTATION_PARTNER.helpdeskHours.en',
  'whatsappNumber', 'whatsappMessage.mr', 'whatsappMessage.en',
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

/* Field names of the coordinator form, as the API reports them ("body.name", or "districtIds" for the district rules). */
export const COORDINATOR_FIELDS = ['name', 'phone', 'email', 'districtIds', 'displayOrder'] as const;
export type CoordinatorField = (typeof COORDINATOR_FIELDS)[number];

/* Field names of the district office form, as the API reports them ("body.address.mr", "districtId"). */
export const OFFICE_FIELDS = [
  'districtId', 'collectorName.mr', 'collectorName.en', 'address.mr', 'address.en', 'phone', 'email', 'officeHours.mr', 'officeHours.en',
] as const;
export type OfficeField = (typeof OFFICE_FIELDS)[number];

/*
 * The tabs of Contact Page Management: one per section of the public Contact page, the Helpline & WhatsApp
 * details every page's floating buttons take from it, and the training centres listed on each district's page.
 * The active tab is kept in the URL (?tab=), as
 * on Modules Page Management.
 */
export const CONTACT_TABS = [
  { k: 'page', l: 'Page information' },
  { k: 'amrut', l: 'AMRUT contact details' },
  { k: 'partner', l: 'Implementation partner' },
  { k: 'helpline', l: 'Helpline & WhatsApp' },
  { k: 'coordinators', l: 'Division / cluster coordinators' },
  { k: 'offices', l: 'District offices' },
  { k: 'centres', l: 'Training centres' },
] as const;
export type ContactTab = (typeof CONTACT_TABS)[number]['k'];

/* The listing, opened on one tab: where Back, Cancel, Save and Delete return to. */
export const contactListPath = (tab: ContactTab): string => `/cms/contact?tab=${tab}`;

/*
 * The four sections saved with the whole-page PUT, each edited on its own page
 * (/cms/contact/<section>/edit). The coordinators and district offices are records with their own pages.
 */
export const CONTACT_SECTIONS = ['page', 'amrut', 'partner', 'helpline'] as const;
export type ContactSection = (typeof CONTACT_SECTIONS)[number];

/* The sections that edit one card, and the card each one edits. */
export type CardSection = 'amrut' | 'partner';
export const SECTION_ORG: Record<CardSection, OrgType> = { amrut: 'AMRUT', partner: 'IMPLEMENTATION_PARTNER' };

/* The longest pre-filled WhatsApp message, in each language (the column is varchar(500)). */
export const WHATSAPP_MESSAGE_MAX = 500;

/* The order the cards are sent in, which is also the order the website shows them. */
export const ORG_TYPES: readonly OrgType[] = ['AMRUT', 'IMPLEMENTATION_PARTNER'];

/* The rows each card shows on the view, in order. Email, phone and website are one value for both languages. */
export type CardFieldKey = 'name' | 'role' | 'address' | 'email' | 'phone' | 'websiteUrl' | 'helpdeskHours';
export const CARD_FIELDS: Record<OrgType, readonly { key: CardFieldKey; label: string }[]> = {
  AMRUT: [
    { key: 'name', label: 'Organisation name' },
    { key: 'address', label: 'Address' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'websiteUrl', label: 'Website' },
  ],
  IMPLEMENTATION_PARTNER: [
    { key: 'name', label: 'Organisation name' },
    { key: 'role', label: 'Role' },
    { key: 'email', label: 'Programme desk' },
    { key: 'helpdeskHours', label: 'Helpdesk hours' },
  ],
};
