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

/* A district / cluster coordinator card and the districts it covers. */
export interface ApiCoordinator {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  districts: DistrictRef[];
  displayOrder: number;
  isActive: boolean;
}

/* Collectorate / District Office details for one district. Every field is optional. */
export interface ApiDistrictOffice {
  id: string;
  district: DistrictRef;
  collectorName: string | null;
  address: Bilingual | null;
  phone: string | null;
  email: string | null;
  officeHours: Bilingual | null;
  isActive: boolean;
}

export interface ApiContactPage {
  id: string;
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  organizations: ApiContactOrganization[];
  coordinators: ApiCoordinator[];
  districtOffices: ApiDistrictOffice[];
}

/* The whole page is submitted at once; the backend saves it in a single transaction. */
export interface UpdateContactPageInput {
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  isPublished: boolean;
  organizations: {
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
  }[];
  coordinators: {
    name: string;
    phone: string;
    email: string | null;
    districtIds: string[];
    displayOrder: number;
    isActive: boolean;
  }[];
  districtOffices: {
    districtId: string;
    collectorName: string | null;
    address: Bilingual | null;
    phone: string | null;
    email: string | null;
    officeHours: Bilingual | null;
    isActive: boolean;
  }[];
}

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
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
