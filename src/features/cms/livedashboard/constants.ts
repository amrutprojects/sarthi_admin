import { homePageCrumbs, homePageTabPath } from '../homePage/homePageNav';
import type { Bilingual, CardTone, DistrictStatus } from './types/livedashboard.types';

const enc = encodeURIComponent;

/* Breadcrumb trail shared by the Live Dashboard pages: the section is a tab of Home Page Management. */
export const LIVE_DASHBOARD_CRUMBS = homePageCrumbs('live-dashboard');

/* The section's tab of Home Page Management: where Back, Cancel and Save return to. */
export const LIVE_DASHBOARD_TAB_PATH = homePageTabPath('live-dashboard');

export const LIVE_DASHBOARD_SETTINGS_PATH = '/cms/live-dashboard/settings';

/* The KPI cards' pages: Add, and each card's read-only View page and Edit page, by its id. */
export const CARD_CREATE_PATH = '/cms/live-dashboard/cards/create';
export const cardViewPath = (id: string): string => `/cms/live-dashboard/cards/${enc(id)}/view`;
export const cardEditPath = (id: string): string => `/cms/live-dashboard/cards/${enc(id)}/edit`;

/* The side figures' pages (the list beside the training modes donut). */
export const STAT_CREATE_PATH = '/cms/live-dashboard/stats/create';
export const statViewPath = (id: string): string => `/cms/live-dashboard/stats/${enc(id)}/view`;
export const statEditPath = (id: string): string => `/cms/live-dashboard/stats/${enc(id)}/edit`;

/* How a confirmation names a card or a figure: its value and both labels, e.g. "2,000 — एकूण लक्ष्य / Total target". */
export const itemName = (i: { value: string; label: Bilingual }): string => `${i.value} — ${i.label.mr} / ${i.label.en}`;

/*
 * A KPI card's accent, as the website draws it (`.pub-kpi` plus '' / 'b' / 'g' / 'v'): the edge colour and the
 * figure's colour. The API keys are fixed; 'blue' is the website's "b" class, which draws in the brand's deep orange.
 */
export const CARD_TONES: { id: CardTone; label: string; edge: string; figure: string }[] = [
  { id: 'default', label: 'Saffron (default)', edge: 'var(--saffron)', figure: 'var(--maroon)' },
  { id: 'blue', label: 'Deep orange', edge: 'var(--brand-600)', figure: 'var(--brand-600)' },
  { id: 'green', label: 'Green', edge: 'var(--green)', figure: 'var(--green)' },
  { id: 'violet', label: 'Violet', edge: 'var(--violet)', figure: 'var(--violet)' },
];
export const cardTone = (id: string) => CARD_TONES.find((t) => t.id === id) ?? CARD_TONES[0]!;

/*
 * A district's programme stages, in programme order: the website's status table (the map's tile colour, its legend
 * and tooltip), with the Marathi names the map shows. `tone` is the panel badge closest to the tile colour.
 */
export const DISTRICT_STATUSES: { id: DistrictStatus; en: string; mr: string; tone: 'grey' | 'amber' | 'green' | 'red' }[] = [
  { id: 'NOT_STARTED', en: 'Not Started', mr: 'सुरू नाही', tone: 'grey' },
  { id: 'PLANNING', en: 'Planning', mr: 'नियोजन', tone: 'grey' },
  { id: 'CENTRE_SELECTION', en: 'Centre Selection', mr: 'केंद्र निवड', tone: 'amber' },
  { id: 'MOBILIZATION', en: 'Mobilization', mr: 'जनजागृती', tone: 'amber' },
  { id: 'TRAINING_ACTIVE', en: 'Training Active', mr: 'प्रशिक्षण सुरू', tone: 'green' },
  { id: 'COMPLETED', en: 'Completed', mr: 'पूर्ण', tone: 'green' },
  { id: 'ON_HOLD', en: 'On Hold', mr: 'स्थगित', tone: 'grey' },
  { id: 'CRITICAL', en: 'Critical', mr: 'गंभीर', tone: 'red' },
];
/* An unknown status reads as Not Started, as the website draws it. */
export const districtStatus = (id: string) => DISTRICT_STATUSES.find((s) => s.id === id) ?? DISTRICT_STATUSES[0]!;
