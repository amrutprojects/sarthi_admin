import type { ApiContactOrganization, ApiContactPage, ApiCoordinator, ApiDistrictOffice } from '../types/contact.types';

/* Shared data of the Contact Page Management tests. */

export const AT = '2026-10-22T10:00:00.000Z';

export const AMRUT: ApiContactOrganization = {
  id: 'o1',
  orgType: 'AMRUT',
  name: { mr: 'अमृत', en: 'AMRUT' },
  role: null,
  address: { mr: 'पुणे कार्यालय', en: 'Pune office' },
  email: 'info@example.org',
  phone: '+91 97301 51450',
  websiteUrl: null,
  helpdeskHours: null,
  displayOrder: 1,
  isActive: true,
};

export const PARTNER: ApiContactOrganization = {
  id: 'o2',
  orgType: 'IMPLEMENTATION_PARTNER',
  name: { mr: 'भागीदार संस्था', en: 'Partner Organisation' },
  role: { mr: 'कार्यक्रम अंमलबजावणी', en: 'Programme delivery' },
  address: null,
  email: 'desk@example.org',
  phone: null,
  websiteUrl: null,
  helpdeskHours: { mr: 'सोम ते शनि', en: 'Mon to Sat' },
  displayOrder: 2,
  isActive: true,
};

export const district = (id: string, name: string) => ({ id, name, code: id.toUpperCase() });

/* Two coordinator cards: the districts are deliberately not alphabetical, so the order shown is the order sent. */
export const COORDINATORS: ApiCoordinator[] = [
  {
    id: 'c1',
    name: 'Anita Patil',
    phone: '+91 98220 11111',
    email: 'anita@example.org',
    districts: [district('d3', 'Satara'), district('d1', 'Pune'), district('d2', 'Kolhapur')],
    displayOrder: 1,
    isActive: true,
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: 'c2',
    name: 'Ravi Shinde',
    phone: '+91 98XXX 22222',
    email: null,
    districts: [],
    displayOrder: 2,
    isActive: false,
    createdAt: AT,
    updatedAt: AT,
  },
];

/* One office filled in, one with every optional field blank. */
export const OFFICES: ApiDistrictOffice[] = [
  {
    id: 'f1',
    district: district('d1', 'Pune'),
    collectorName: 'Dr. S. Deshmukh',
    address: { mr: 'जिल्हाधिकारी कार्यालय, पुणे', en: 'Collectorate, Pune' },
    phone: '020 2612 3456',
    email: 'collector.pune@example.org',
    officeHours: { mr: 'सोम ते शुक्र', en: 'Mon to Fri' },
    isActive: true,
    createdAt: AT,
    updatedAt: AT,
  },
  {
    id: 'f2',
    district: district('d2', 'Kolhapur'),
    collectorName: null,
    address: null,
    phone: null,
    email: null,
    officeHours: null,
    isActive: false,
    createdAt: AT,
    updatedAt: AT,
  },
];

export const contactPage = (over: Partial<ApiContactPage> = {}): ApiContactPage => ({
  id: 'p1',
  pageTitle: { mr: 'संपर्क', en: 'Contact us' },
  pageSubtitle: { mr: 'आमच्याशी बोला', en: 'Talk to us' },
  isPublished: true,
  createdAt: AT,
  updatedAt: AT,
  organizations: [AMRUT, PARTNER],
  coordinators: [],
  districtOffices: [],
  ...over,
});

/* One page of a listing, as the service returns it. */
export const listPage = <T>(items: T[], meta: { page?: number; limit?: number; total?: number; totalPages?: number } = {}) => ({
  items,
  meta: { page: 1, limit: 15, total: items.length, totalPages: 1, ...meta },
});

/* The districts the pickers offer, from the public geography feed: one state, four districts. */
export const STATES = [{ id: 's1', name: 'Maharashtra', code: 'MH' }];
export const DISTRICTS = [district('d1', 'Pune'), district('d2', 'Kolhapur'), district('d3', 'Satara'), district('d4', 'Nashik')];

/* The panel shell's toast container, which the toasts are appended to. */
export const toasts = () => document.getElementById('toast-root') as HTMLElement;
export const resetToasts = () => {
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
};
