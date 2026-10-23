import type { HomePageTab } from '../homePage/homePageNav';

/* Home Hero Section's two tabs of Home Page Management: the slides with their buttons, and the glance card. */
export type HeroTab = Extract<HomePageTab, 'hero' | 'glance'>;

/* Which tab the Edit page was opened from (?tab=glance; the slides otherwise): where its Back, Cancel and Save return. */
export const heroTabOf = (param: string | null): HeroTab => (param === 'glance' ? 'glance' : 'hero');

/* The Edit page, opened from one of the two tabs. One page edits both, since they are saved and published together. */
export const heroEditPath = (tab: HeroTab): string => (tab === 'glance' ? '/cms/hero/edit?tab=glance' : '/cms/hero/edit');
