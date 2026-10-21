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

export interface ApiContactPage {
  id: string;
  pageTitle: Bilingual;
  pageSubtitle: Bilingual;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  organizations: ApiContactOrganization[];
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
