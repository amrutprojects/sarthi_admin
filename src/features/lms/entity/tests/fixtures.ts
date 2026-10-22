import type { ApiLmsEntity, LmsEntityFormOptions } from '../types/entity.types';

/* Test data shaped exactly like the /api/v1/lms/entities responses. */
export const AT = '2026-10-01T10:00:00.000Z';

export const formOptions: LmsEntityFormOptions = {
  languages: [{ code: 'en', label: 'English' }, { code: 'mr', label: 'Marathi' }],
  languagesConfirmed: false,
  timeZones: ['Asia/Dubai', 'Asia/Kolkata', 'Europe/London'],
  defaultTimeZone: 'Asia/Kolkata',
};

export const entity = (over: Partial<ApiLmsEntity> = {}): ApiLmsEntity => ({
  id: 'e1',
  name: 'Amrut Kalash',
  code: 'AMK',
  description: 'Programme learning environment',
  defaultLanguage: 'mr',
  timeZone: 'Asia/Kolkata',
  enabledCentres: [
    { id: 'c1', name: 'Nashik Road Centre', code: 'TC0001', districtName: 'Nashik', isActive: true },
    { id: 'c2', name: 'Old Centre', code: 'TC0002', districtName: 'Nashik', isActive: false },
  ],
  enabledTracks: [{ id: 't1', code: 'T01', name: 'Data Analytics & Business Intelligence', isActive: true }],
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

export const page = <T,>(items: T[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

export const centreOptions = [
  { id: 'c1', name: 'Nashik Road Centre', code: 'TC0001', districtName: 'Nashik' },
  { id: 'c3', name: 'Pune Main Centre', code: 'TC0003', districtName: 'Pune' },
];

export const trackOptions = [
  { id: 't1', name: 'Data Analytics & Business Intelligence', code: 'T01' },
  { id: 't3', name: 'Web Design & Development', code: 'T03' },
];

/* The panel's toasts are written into #toast-root (index.html); a test page has to provide it. */
export const ensureToastRoot = () => {
  if (!document.getElementById('toast-root')) {
    const root = document.createElement('div');
    root.id = 'toast-root';
    document.body.appendChild(root);
  }
};
