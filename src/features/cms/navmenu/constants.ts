import { homePageTabPath } from '../homePage/homePageNav';
import type { Bilingual, NavMenuKey } from './types/navmenu.types';

/* The menu's tab of Home Page Management, which its former path (/cms/nav-menu) also opens. */
export const NAVMENU_TAB_PATH = homePageTabPath('nav-menu');

export interface NavMenuEntry {
  key: NavMenuKey;
  /** The item's text in the website's menu bar, in each language. */
  label: Bilingual;
  /** The website page the item opens; null for the Login / Register button, which opens the login portal. */
  path: string | null;
}

/* The items of the website's menu bar, in menu order, as the website labels them. */
export const NAV_MENU_ITEMS: readonly NavMenuEntry[] = [
  { key: 'home', label: { en: 'Home', mr: 'मुख्यपृष्ठ' }, path: '/' },
  { key: 'about', label: { en: 'About SARTHI', mr: 'सारथी विषयी' }, path: '/about' },
  { key: 'programme', label: { en: 'Sarthi', mr: 'सारथी' }, path: '/programme' },
  { key: 'advisory', label: { en: 'SARTHI Advisory Committee', mr: 'सारथी सल्लागार समिती' }, path: '/advisory-committee' },
  { key: 'modules', label: { en: 'Modules', mr: 'मॉड्यूल्स' }, path: '/modules' },
  { key: 'eligibility', label: { en: 'Eligibility', mr: 'पात्रता' }, path: '/eligibility' },
  { key: 'apply', label: { en: 'How to Apply', mr: 'अर्ज कसा करावा' }, path: '/apply' },
  { key: 'faq', label: { en: 'FAQs', mr: 'प्रश्नोत्तरे' }, path: '/faq' },
  { key: 'contact', label: { en: 'Contact', mr: 'संपर्क' }, path: '/contact' },
  { key: 'login', label: { en: 'Login / Register', mr: 'लॉगिन / नोंदणी करा' }, path: null },
];

/* An item's labels and page by its key; a key this panel does not know yet is named by the key itself. */
export const navMenuEntry = (key: string): Pick<NavMenuEntry, 'label' | 'path'> =>
  NAV_MENU_ITEMS.find((i) => i.key === key) ?? { label: { en: key, mr: '' }, path: null };

/* The name the website shows for an item now: its own name when one is set, else the default one above. */
export const navMenuName = (item: { key: string; label: Bilingual | null }): Bilingual => item.label ?? navMenuEntry(item.key).label;
