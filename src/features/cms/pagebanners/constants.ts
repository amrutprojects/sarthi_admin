import type { Bilingual, PageBannerKey } from './types/pagebanners.types';

/* The Page Banners screen: a CMS sidebar entry of its own. */
export const PAGE_BANNERS_PATH = '/cms/page-banners';

export interface PageBannerEntry {
  key: PageBannerKey;
  /** The page as the panel names it, and its address on the website. */
  page: string;
  path: string;
  /** The banner title the website shows while the page has none of its own. */
  title: Bilingual;
  /**
   * The subtitle it shows then; null for About SARTHI, whose default subtitle is not fixed text but the opening of the
   * About SARTHI description (About SARTHI Management).
   */
  subtitle: Bilingual | null;
}

/* What the About page shows under its title by default, described rather than quoted (it follows the description). */
export const ABOUT_DEFAULT_SUBTITLE = 'The first 160 characters of the About SARTHI description';

/* The five pages, in list order, with the website's own banner text (content/strings.ts, content/kalash.ts, the pages). */
export const PAGE_BANNERS: readonly PageBannerEntry[] = [
  {
    key: 'about',
    page: 'About SARTHI',
    path: '/about',
    title: { en: 'About SARTHI', mr: 'सारथी विषयी माहिती' },
    subtitle: null,
  },
  {
    key: 'faq',
    page: 'FAQs',
    path: '/faq',
    title: { en: 'FAQs', mr: 'प्रश्नोत्तरे' },
    subtitle: { en: 'Frequently asked questions.', mr: 'वारंवार विचारले जाणारे प्रश्न.' },
  },
  {
    key: 'programme',
    page: 'Sarthi programme',
    path: '/programme',
    title: { en: 'SARTHI', mr: 'सारथी' },
    subtitle: {
      en: 'SARTHI - Knowledge Advancement and Learning Abilities through Skill Harmonization',
      mr: 'सारथी - कौशल्य सुसंवादाद्वारे ज्ञानवृद्धी व शिकण्याची क्षमता',
    },
  },
  {
    key: 'track',
    page: 'Check Application Status',
    path: '/track',
    title: { en: 'Check Application Status', mr: 'अर्जाची स्थिती पहा' },
    subtitle: {
      en: 'Enter your Application / Candidate ID or registered mobile number.',
      mr: 'अर्ज / उमेदवार क्रमांक किंवा नोंदणीकृत मोबाइल क्रमांक टाका.',
    },
  },
  {
    key: 'verify',
    page: 'Verify Certificate',
    path: '/verify',
    title: { en: 'Verify Certificate', mr: 'प्रमाणपत्र पडताळणी' },
    subtitle: {
      en: 'Check a certificate number against the programme register.',
      mr: 'प्रमाणपत्र क्रमांक टाकून त्याची सत्यता तपासा.',
    },
  },
];

/* A page by its key; a key this panel does not know yet is named by the key itself, with no default text. */
export const pageBannerEntry = (key: string): Omit<PageBannerEntry, 'key'> =>
  PAGE_BANNERS.find((p) => p.key === key) ?? { page: key, path: '', title: { en: key, mr: '' }, subtitle: null };
