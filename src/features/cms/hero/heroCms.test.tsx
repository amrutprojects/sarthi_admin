import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { AppRoutes } from '../../../app/router';
import { ApiError } from '../../../services/api-client';
import { HeroGlanceTab, HeroSlidesTab } from './components/HeroTabs';
import HeroEdit from './pages/HeroEdit';
import HeroForm from './pages/HeroForm';
import { heroService } from './services/heroService';
import type { ApiHeroSlide, ApiHomeHero, Bilingual } from './types/hero.types';
import { toFormValues } from './validation/hero.validation';

/* Permissions are switched per test, to compare a view-only administrator with one who may update. */
const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/heroService', () => ({ heroService: { get: vi.fn(), update: vi.fn(), setPublished: vi.fn() } }));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));
/* The real routes, without the sidebar and top bar around them: the old /cms/home links are followed through the router. */
vi.mock('../../../layouts/AdminLayout', async () => {
  const { createElement } = await import('react');
  const { Outlet } = await import('react-router-dom');
  return { default: () => createElement(Outlet) };
});

const pair = (mr: string, en: string): Bilingual => ({ mr, en });

const slide = (n: number, ctaLink: string, isActive: boolean): ApiHeroSlide => ({
  id: `s${n}`,
  tag: pair(`टॅग ${n}`, `Tag ${n}`),
  title: pair(`शीर्षक ${n}`, `Heading ${n}`),
  description: pair(`वर्णन ${n}`, `Description ${n}`),
  ctaLabel: pair(`बटण ${n}`, `Button ${n}`),
  ctaLink,
  displayOrder: n - 1,
  isActive,
});

/*
 * Two visible slides and a hidden third, with the seeded labels for the two buttons on every slide,
 * and the glance figures the seeded Modules page sums to.
 */
const hero = (): ApiHomeHero => ({
  id: 'h1',
  readMoreLabel: pair('अधिक जाणून घ्या', 'Learn more'),
  checkStatusLabel: pair('अर्जाची स्थिती पहा', 'Check Application Status'),
  slides: [slide(1, '/apply', true), slide(2, '/programme', true), slide(3, '/verify', false)],
  isPublished: true,
  glance: { totalHours: 480, modules: 4, domains: 10, districtCount: 36, modulesLabel: '4 × 120 hours', hiddenModules: 0 },
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
});

const PAGE_NAMES = [
  'Home',
  'About',
  'Programme',
  'Modules',
  'Eligibility',
  'Apply',
  'FAQ',
  'Contact',
  'Track application',
  'Verify certificate',
];

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
const group = (n: number) => within(screen.getByRole('group', { name: `Slide ${n}` }));
const field = (n: number, label: string) => group(n).getByLabelText(new RegExp(`^${label}`));
const toasts = () => document.getElementById('toast-root')!;
const districts = () => screen.getByLabelText(/^Districts/);
const NOT_CONFIGURED = 'The programme content has not been configured yet. Run the database seed to create it.';

const renderForm = (initial = hero(), onSave = vi.fn()) =>
  renderWithProviders(
    <HeroForm initial={toFormValues(initial)} glance={initial.glance} backTo="/cms/home-page?tab=hero" onSave={onSave} />,
  );

/* Home Page Management, reduced to the tab it was opened on, so where the edit page returns to is observable. */
function HomePageStub() {
  const { search } = useLocation();
  return <p>{`Home page ${search}`}</p>;
}
const HERO_TAB = 'Home page ?tab=hero';

/* The edit page, with Home Page Management's route in place so the redirect after a save is observable. */
const renderEdit = (route = '/cms/hero/edit') =>
  renderWithProviders(
    <Routes>
      <Route path="/cms/hero/edit" element={<HeroEdit />} />
      <Route path="/cms/home-page" element={<HomePageStub />} />
    </Routes>,
    { route },
  );

/* One of the section's two tabs, with the address shown so the Edit button's target is observable. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}
const renderTab = (tab: 'slides' | 'glance') =>
  renderWithProviders(
    <>
      {tab === 'slides' ? <HeroSlidesTab /> : <HeroGlanceTab />}
      <Location />
    </>,
    { route: `/cms/home-page?tab=${tab === 'slides' ? 'hero' : 'glance'}` },
  );

describe('Home Hero Section CMS', () => {
  beforeEach(() => {
    auth.permissions = new Set(['cms-hero.view', 'cms-hero.update']);
    /* jsdom has no scrolling; the form scrolls to the first error. */
    Element.prototype.scrollIntoView = vi.fn();
    /* The panel shell's toast container, emptied so each test only sees its own toasts. */
    if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
    toasts().innerHTML = '';
  });

  /* The section's two tabs of Home Page Management: the slides, and the "Programme at a glance" card. */
  describe('view tabs', () => {
    it('shows the saved texts, and Publish and Edit to an administrator who may update', async () => {
      vi.mocked(heroService.get).mockResolvedValue({ ...hero(), isPublished: false });
      vi.mocked(heroService.setPublished).mockResolvedValue(hero());
      renderTab('slides');

      expect(await screen.findByRole('heading', { name: 'Buttons on every slide' })).toBeInTheDocument();
      expect(screen.getByText('अधिक जाणून घ्या')).toBeInTheDocument();
      expect(screen.getByText('Learn more')).toBeInTheDocument();
      expect(screen.getByText('Check Application Status')).toBeInTheDocument();
      for (const n of [1, 2, 3]) {
        expect(screen.getByRole('heading', { name: `Slide ${n}` })).toBeInTheDocument();
        expect(screen.getByText(`Tag ${n}`)).toBeInTheDocument();
        expect(screen.getByText(`Heading ${n}`)).toBeInTheDocument();
        expect(screen.getByText(`शीर्षक ${n}`)).toBeInTheDocument();
        expect(screen.getByText(`Description ${n}`)).toBeInTheDocument();
        expect(screen.getByText(`Button ${n}`)).toBeInTheDocument();
      }
      /* The button link is shown as the page name, with the stored path underneath. */
      expect(screen.getByText('Apply')).toBeInTheDocument();
      expect(screen.getByText('/apply')).toBeInTheDocument();
      expect(screen.getByText('Verify certificate')).toBeInTheDocument();
      expect(screen.getAllByText('Visible')).toHaveLength(2);
      expect(screen.getByText('Hidden')).toBeInTheDocument();
      expect(screen.getByText('This content is not published')).toBeInTheDocument();
      /* The glance card has a tab of its own. */
      expect(screen.queryByRole('heading', { name: 'Programme at a glance' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
      await waitFor(() => expect(heroService.setPublished).toHaveBeenCalledWith(true));
      await waitFor(() => expect(toasts()).toHaveTextContent('Section published'));

      await userEvent.click(screen.getByRole('button', { name: 'Edit content' }));
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/cms\/hero\/edit$/);
    });

    it('shows the texts without Publish or Edit to a view-only administrator', async () => {
      auth.permissions = new Set(['cms-hero.view']);
      vi.mocked(heroService.get).mockResolvedValue(hero());
      renderTab('slides');

      expect(await screen.findByText('Heading 1')).toBeInTheDocument();
      expect(screen.getByText('Check Application Status')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit content' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Unpublish' })).not.toBeInTheDocument();
    });

    it('shows the "Programme at a glance" figures on their own tab, and says which ones are worked out', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      renderTab('glance');

      expect(await screen.findByRole('heading', { name: 'Programme at a glance' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Slide 1' })).not.toBeInTheDocument();
      expect(screen.getByText('Three of these four are worked out, not entered')).toBeInTheDocument();
      expect(screen.getByText('480 (summed from the modules)')).toBeInTheDocument();
      expect(screen.getByText('4 × 120 hours')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('36 (entered)')).toBeInTheDocument();
      /* Every module is active here, so there is nothing left out to mention. */
      expect(screen.queryByText(/hidden, so/)).not.toBeInTheDocument();
    });

    it('has the same Publish and Edit on the glance tab, and its Edit returns there', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      vi.mocked(heroService.setPublished).mockResolvedValue({ ...hero(), isPublished: false });
      renderTab('glance');

      await screen.findByRole('heading', { name: 'Programme at a glance' });
      await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));
      await waitFor(() => expect(heroService.setPublished).toHaveBeenCalledWith(false));
      await waitFor(() => expect(toasts()).toHaveTextContent('Section unpublished'));

      await userEvent.click(screen.getByRole('button', { name: 'Edit content' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/cms/hero/edit?tab=glance');
    });

    it('says when hidden modules are left out of the figures', async () => {
      vi.mocked(heroService.get).mockResolvedValue({ ...hero(), glance: { ...hero().glance!, hiddenModules: 2 } });
      const { unmount } = renderTab('glance');
      expect(
        await screen.findByText('2 modules are hidden, so they are left out of these figures and out of the website.'),
      ).toBeInTheDocument();
      unmount();

      vi.mocked(heroService.get).mockResolvedValue({ ...hero(), glance: { ...hero().glance!, hiddenModules: 1 } });
      renderTab('glance');
      expect(await screen.findByText('1 module is hidden, so it is left out of these figures and out of the website.')).toBeInTheDocument();
    });

    it('says the figures are not configured when the Modules page content is missing', async () => {
      vi.mocked(heroService.get).mockResolvedValue({ ...hero(), glance: null });
      const { unmount } = renderTab('glance');

      expect(await screen.findByText(NOT_CONFIGURED)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Programme at a glance' })).toBeInTheDocument();
      expect(screen.queryByText('Total hours')).not.toBeInTheDocument();
      expect(screen.queryByText('Three of these four are worked out, not entered')).not.toBeInTheDocument();
      unmount();

      /* The slides are still there to read and edit. */
      renderTab('slides');
      expect(await screen.findByText('Heading 1')).toBeInTheDocument();
    });
  });

  describe('form', () => {
    it('is prefilled with every field', () => {
      renderForm();
      expect(screen.getByLabelText(/^Learn more button \(Marathi\)/)).toHaveValue('अधिक जाणून घ्या');
      expect(screen.getByLabelText(/^Learn more button \(English\)/)).toHaveValue('Learn more');
      expect(screen.getByLabelText(/^Check status button \(Marathi\)/)).toHaveValue('अर्जाची स्थिती पहा');
      expect(screen.getByLabelText(/^Check status button \(English\)/)).toHaveValue('Check Application Status');

      const links = ['/apply', '/programme', '/verify'];
      for (const n of [1, 2, 3]) {
        expect(field(n, 'Tag \\(Marathi\\)')).toHaveValue(`टॅग ${n}`);
        expect(field(n, 'Tag \\(English\\)')).toHaveValue(`Tag ${n}`);
        expect(field(n, 'Heading \\(Marathi\\)')).toHaveValue(`शीर्षक ${n}`);
        expect(field(n, 'Heading \\(English\\)')).toHaveValue(`Heading ${n}`);
        expect(field(n, 'Description \\(Marathi\\)')).toHaveValue(`वर्णन ${n}`);
        expect(field(n, 'Description \\(English\\)')).toHaveValue(`Description ${n}`);
        expect(field(n, 'Button label \\(Marathi\\)')).toHaveValue(`बटण ${n}`);
        expect(field(n, 'Button label \\(English\\)')).toHaveValue(`Button ${n}`);
        expect(field(n, 'Button link')).toHaveValue(links[n - 1]);
      }
      expect(group(1).getByRole('checkbox')).toBeChecked();
      expect(group(2).getByRole('checkbox')).toBeChecked();
      expect(group(3).getByRole('checkbox')).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Publish this section on the public website' })).toBeChecked();
    });

    it('names blank fields and blocks the save', async () => {
      const onSave = vi.fn();
      renderForm(hero(), onSave);
      await userEvent.clear(screen.getByLabelText(/^Learn more button \(Marathi\)/));
      /* Spaces alone are blank too: the server trims before checking. */
      await userEvent.clear(field(1, 'Heading \\(English\\)'));
      await userEvent.type(field(1, 'Heading \\(English\\)'), '   ');
      await userEvent.clear(field(2, 'Button label \\(Marathi\\)'));
      await save();

      expect(await screen.findByText('Learn more button (Marathi) is required')).toBeInTheDocument();
      expect(screen.getByText('Heading (English) is required')).toBeInTheDocument();
      expect(screen.getByText('Button label (Marathi) is required')).toBeInTheDocument();
      expect(field(1, 'Heading \\(English\\)')).toHaveAttribute('aria-invalid', 'true');
      expect(field(1, 'Heading \\(English\\)')).toHaveAccessibleDescription('Heading (English) is required');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('names text over the server limits and a link that leaves the site', async () => {
      const onSave = vi.fn();
      const long = hero();
      long.checkStatusLabel = pair('स्थिती', 'c'.repeat(61));
      long.slides[0] = {
        ...long.slides[0]!,
        tag: pair('ट'.repeat(61), 'Tag'),
        title: pair('शीर्षक', 't'.repeat(201)),
        description: pair('व'.repeat(401), 'Description'),
        ctaLabel: pair('बटण', 'b'.repeat(61)),
      };
      long.slides[1] = { ...long.slides[1]!, ctaLink: '//elsewhere.example/apply' };
      renderForm(long, onSave);
      await save();

      expect(await screen.findByText('Check status button (English) must be at most 60 characters')).toBeInTheDocument();
      expect(screen.getByText('Tag (Marathi) must be at most 60 characters')).toBeInTheDocument();
      expect(screen.getByText('Heading (English) must be at most 200 characters')).toBeInTheDocument();
      expect(screen.getByText('Description (Marathi) must be at most 400 characters')).toBeInTheDocument();
      expect(screen.getByText('Button label (English) must be at most 60 characters')).toBeInTheDocument();
      expect(field(2, 'Button link')).toHaveAccessibleDescription('Button link must be a page on this site, starting with /');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('requires at least one visible slide, and at least one slide', async () => {
      const onSave = vi.fn();
      renderForm(hero(), onSave);
      await userEvent.click(group(1).getByRole('checkbox'));
      await userEvent.click(group(2).getByRole('checkbox'));
      await save();
      expect(await screen.findByText('At least one slide must be visible')).toBeInTheDocument();

      for (let n = 3; n >= 1; n -= 1) await userEvent.click(group(n).getByRole('button', { name: 'Remove' }));
      expect(screen.queryByRole('group', { name: /^Slide/ })).not.toBeInTheDocument();
      expect(await screen.findByText('At least one slide is required')).toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it('asks for every text and a page on a newly added slide', async () => {
      const onSave = vi.fn();
      renderForm(hero(), onSave);
      await userEvent.click(screen.getByRole('button', { name: 'Add a slide' }));
      expect(field(4, 'Button link')).toHaveValue('');
      await save();
      expect(await screen.findByText('Tag (Marathi) is required')).toBeInTheDocument();
      expect(screen.getByText('Heading (English) is required')).toBeInTheDocument();
      expect(screen.getByText('Description (Marathi) is required')).toBeInTheDocument();
      expect(screen.getByText('Button label (English) is required')).toBeInTheDocument();
      expect(field(4, 'Button link')).toHaveAccessibleDescription('Button link is required');
      expect(onSave).not.toHaveBeenCalled();
    });

    it('offers the site pages as the button link, and keeps a saved path that is not one of them', () => {
      const custom = hero();
      custom.slides[2] = { ...custom.slides[2]!, ctaLink: '/news?id=7' };
      renderForm(custom);

      const options = (n: number) =>
        within(field(n, 'Button link'))
          .getAllByRole('option')
          .map((o) => o.textContent);
      expect(options(1)).toEqual(PAGE_NAMES);
      expect(field(1, 'Button link')).toHaveDisplayValue('Apply');
      expect(options(3)).toEqual(['/news?id=7', ...PAGE_NAMES]);
      expect(field(3, 'Button link')).toHaveValue('/news?id=7');
    });

    it("puts the server's slides.* message on the matching field", async () => {
      const onSave = vi
        .fn()
        .mockRejectedValue(
          new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
            { field: 'body.slides.1.title.en', message: 'Heading (English) must be at most 200 characters' },
          ]),
        );
      renderForm(hero(), onSave);
      await save();
      await waitFor(() => expect(field(2, 'Heading \\(English\\)')).toHaveAttribute('aria-invalid', 'true'));
      expect(field(2, 'Heading \\(English\\)')).toHaveAccessibleDescription('Heading (English) must be at most 200 characters');
      expect(field(1, 'Heading \\(English\\)')).not.toHaveAttribute('aria-invalid');
    });

    it('asks before Cancel throws away unsaved edits', async () => {
      renderForm();
      await userEvent.type(field(1, 'Tag \\(English\\)'), '!');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
    });

    it('shows the worked-out glance figures disabled, and the district count to edit', () => {
      renderForm();
      expect(screen.getByText('Three of these four are worked out, not entered')).toBeInTheDocument();
      expect(screen.getByLabelText('Total hours')).toHaveValue('480');
      expect(screen.getByLabelText('Total hours')).toBeDisabled();
      expect(screen.getByLabelText('Modules')).toHaveValue('4 × 120 hours');
      expect(screen.getByLabelText('Modules')).toBeDisabled();
      expect(screen.getByLabelText('Employment domains')).toHaveValue('10');
      expect(screen.getByLabelText('Employment domains')).toBeDisabled();
      expect(districts()).toHaveValue('36');
      expect(districts()).toBeEnabled();
      expect(districts()).toHaveAttribute('inputmode', 'numeric');
      /* After the slides, before Visibility. */
      const card = screen.getByRole('heading', { name: 'Programme at a glance' });
      expect(screen.getByRole('group', { name: 'Slide 3' }).compareDocumentPosition(card)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(card.compareDocumentPosition(screen.getByRole('heading', { name: 'Visibility' }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('notes hidden modules under the figures', () => {
      renderForm({ ...hero(), glance: { ...hero().glance!, hiddenModules: 1 } });
      expect(screen.getByText('1 module is hidden, so it is left out of the figures above and out of the website.')).toBeInTheDocument();
    });

    it('names a district count the server would refuse, and blocks the save', async () => {
      const onSave = vi.fn();
      renderForm(hero(), onSave);
      const cases: [string, string][] = [
        ['', 'District count is required'],
        ['abc', 'District count must be a number'],
        ['1.5', 'District count must be a whole number'],
        ['-1', 'District count cannot be negative'],
        ['10000', 'District count is too large'],
      ];
      for (const [typed, message] of cases) {
        await userEvent.clear(districts());
        if (typed) await userEvent.type(districts(), typed);
        await save();
        expect(districts()).toHaveAttribute('aria-invalid', 'true');
        expect(districts()).toHaveAccessibleDescription(message);
      }
      expect(onSave).not.toHaveBeenCalled();
    });

    it('asks before Cancel throws away an edited district count', async () => {
      renderForm();
      await userEvent.type(districts(), '0');
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
    });

    it("puts the server's districtCount message on the Districts input", async () => {
      const onSave = vi
        .fn()
        .mockRejectedValue(
          new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
            { field: 'body.districtCount', message: 'District count is too large' },
          ]),
        );
      renderForm(hero(), onSave);
      await save();
      await waitFor(() => expect(districts()).toHaveAttribute('aria-invalid', 'true'));
      expect(districts()).toHaveAccessibleDescription('District count is too large');
      expect(toasts()).not.toHaveTextContent('Validation failed');
    });

    it('shows no district input when the Modules page content is missing', () => {
      renderForm({ ...hero(), glance: null });
      expect(screen.getByText(NOT_CONFIGURED)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^Districts/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Total hours')).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('sends exactly the PUT keys, trimmed, in order, with the version it was opened with', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      vi.mocked(heroService.update).mockResolvedValue(hero());
      renderEdit();

      const readMore = await screen.findByLabelText(/^Learn more button \(English\)/);
      await userEvent.clear(readMore);
      await userEvent.type(readMore, '  Read more  ');
      await userEvent.type(field(1, 'Heading \\(Marathi\\)'), '  ');
      await save();

      await waitFor(() => expect(heroService.update).toHaveBeenCalledTimes(1));
      const body = vi.mocked(heroService.update).mock.calls[0]![0];
      /* The PUT body is .strict() on the server: the section's own fields, nothing read-only such as id. */
      expect(Object.keys(body).sort()).toEqual([
        'checkStatusLabel',
        'districtCount',
        'expectedUpdatedAt',
        'isPublished',
        'readMoreLabel',
        'slides',
      ]);
      expect(body.expectedUpdatedAt).toBe('2026-10-01T10:00:00.000Z');
      /* A number, as the server stores it — not the text of the input. */
      expect(body.districtCount).toBe(36);
      expect(body.readMoreLabel).toEqual({ mr: 'अधिक जाणून घ्या', en: 'Read more' });
      expect(body.checkStatusLabel).toEqual({ mr: 'अर्जाची स्थिती पहा', en: 'Check Application Status' });
      expect(body.isPublished).toBe(true);
      expect(Object.keys(body.slides[0]!).sort()).toEqual([
        'ctaLabel',
        'ctaLink',
        'description',
        'displayOrder',
        'isActive',
        'tag',
        'title',
      ]);
      expect(body.slides).toEqual([
        {
          tag: pair('टॅग 1', 'Tag 1'),
          title: pair('शीर्षक 1', 'Heading 1'),
          description: pair('वर्णन 1', 'Description 1'),
          ctaLabel: pair('बटण 1', 'Button 1'),
          ctaLink: '/apply',
          displayOrder: 0,
          isActive: true,
        },
        {
          tag: pair('टॅग 2', 'Tag 2'),
          title: pair('शीर्षक 2', 'Heading 2'),
          description: pair('वर्णन 2', 'Description 2'),
          ctaLabel: pair('बटण 2', 'Button 2'),
          ctaLink: '/programme',
          displayOrder: 1,
          isActive: true,
        },
        {
          tag: pair('टॅग 3', 'Tag 3'),
          title: pair('शीर्षक 3', 'Heading 3'),
          description: pair('वर्णन 3', 'Description 3'),
          ctaLabel: pair('बटण 3', 'Button 3'),
          ctaLink: '/verify',
          displayOrder: 2,
          isActive: false,
        },
      ]);
    });

    it('adds, removes, moves and hides slides, numbering them from 0 in their new order', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      vi.mocked(heroService.update).mockResolvedValue(hero());
      renderEdit();

      await screen.findByRole('group', { name: 'Slide 3' });
      await userEvent.click(group(3).getByRole('button', { name: 'Remove' }));
      await userEvent.click(group(1).getByRole('button', { name: 'Move down' }));
      expect(field(1, 'Heading \\(English\\)')).toHaveValue('Heading 2');
      expect(field(2, 'Heading \\(English\\)')).toHaveValue('Heading 1');
      await userEvent.click(group(2).getByRole('checkbox'));
      expect(group(2).getByText('Hidden')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Add a slide' }));
      await userEvent.type(field(3, 'Tag \\(Marathi\\)'), 'नवीन');
      await userEvent.type(field(3, 'Tag \\(English\\)'), 'New');
      await userEvent.type(field(3, 'Heading \\(Marathi\\)'), 'प्रश्न');
      await userEvent.type(field(3, 'Heading \\(English\\)'), 'Questions');
      await userEvent.type(field(3, 'Description \\(Marathi\\)'), 'उत्तरे');
      await userEvent.type(field(3, 'Description \\(English\\)'), 'Answers');
      await userEvent.type(field(3, 'Button label \\(Marathi\\)'), 'पहा');
      await userEvent.type(field(3, 'Button label \\(English\\)'), 'See FAQ');
      await userEvent.selectOptions(field(3, 'Button link'), 'FAQ');
      await userEvent.click(group(3).getByRole('button', { name: 'Move up' }));
      await save();

      await waitFor(() => expect(heroService.update).toHaveBeenCalledTimes(1));
      const { slides } = vi.mocked(heroService.update).mock.calls[0]![0];
      expect(slides.map((s) => [s.title.en, s.ctaLink, s.displayOrder, s.isActive])).toEqual([
        ['Heading 2', '/programme', 0, true],
        ['Questions', '/faq', 1, true],
        ['Heading 1', '/apply', 2, false],
      ]);
      expect(slides[1]).toEqual({
        tag: pair('नवीन', 'New'),
        title: pair('प्रश्न', 'Questions'),
        description: pair('उत्तरे', 'Answers'),
        ctaLabel: pair('पहा', 'See FAQ'),
        ctaLink: '/faq',
        displayOrder: 1,
        isActive: true,
      });
    });

    it('confirms the save only after the PUT resolves, then returns to the slides tab', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      let resolve!: (value: ApiHomeHero) => void;
      vi.mocked(heroService.update).mockReturnValue(new Promise<ApiHomeHero>((r) => (resolve = r)));
      renderEdit();

      await userEvent.type(await screen.findByLabelText(/^Learn more button \(English\)/), '!');
      await save();
      await waitFor(() => expect(heroService.update).toHaveBeenCalledTimes(1));
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
      expect(toasts()).not.toHaveTextContent('Home hero section updated');
      expect(screen.queryByText(HERO_TAB)).not.toBeInTheDocument();

      resolve(hero());
      await waitFor(() => expect(toasts()).toHaveTextContent('Home hero section updated'));
      expect(await screen.findByText(HERO_TAB)).toBeInTheDocument();
    });

    it('keeps the edits and shows the error when the save fails', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      vi.mocked(heroService.update).mockRejectedValue(new ApiError('Internal server error', 500, 'INTERNAL_ERROR'));
      renderEdit();

      const readMore = await screen.findByLabelText(/^Learn more button \(English\)/);
      await userEvent.clear(readMore);
      await userEvent.type(readMore, 'Read more');
      await save();

      await waitFor(() => expect(toasts()).toHaveTextContent('Internal server error'));
      expect(toasts()).not.toHaveTextContent('Home hero section updated');
      expect(screen.getByLabelText(/^Learn more button \(English\)/)).toHaveValue('Read more');
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
      expect(screen.queryByText(HERO_TAB)).not.toBeInTheDocument();
    });

    it("shows the server's message when someone else saved first (409)", async () => {
      const message =
        'The home hero section was changed after you opened it. Reload to see the latest version, then make your changes again.';
      vi.mocked(heroService.get).mockResolvedValue(hero());
      vi.mocked(heroService.update).mockRejectedValue(new ApiError(message, 409, 'CONFLICT'));
      renderEdit();

      await userEvent.type(await screen.findByLabelText(/^Check status button \(English\)/), '!');
      await save();

      await waitFor(() => expect(toasts()).toHaveTextContent(message));
      expect(toasts()).not.toHaveTextContent('Home hero section updated');
      expect(screen.getByLabelText(/^Check status button \(English\)/)).toHaveValue('Check Application Status!');
    });

    it('sends an edited district count as a number, trimmed', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      vi.mocked(heroService.update).mockResolvedValue(hero());
      renderEdit();

      await screen.findByLabelText(/^Districts/);
      await userEvent.clear(districts());
      await userEvent.type(districts(), ' 40 ');
      await save();

      await waitFor(() => expect(heroService.update).toHaveBeenCalledTimes(1));
      expect(vi.mocked(heroService.update).mock.calls[0]![0].districtCount).toBe(40);
    });

    it('leaves the district count out of the PUT when the Modules page content is missing', async () => {
      vi.mocked(heroService.get).mockResolvedValue({ ...hero(), glance: null });
      vi.mocked(heroService.update).mockResolvedValue({ ...hero(), glance: null });
      renderEdit();

      await userEvent.type(await screen.findByLabelText(/^Learn more button \(English\)/), '!');
      expect(screen.getByText(NOT_CONFIGURED)).toBeInTheDocument();
      await save();

      await waitFor(() => expect(heroService.update).toHaveBeenCalledTimes(1));
      const body = vi.mocked(heroService.update).mock.calls[0]![0];
      expect(Object.keys(body).sort()).toEqual(['checkStatusLabel', 'expectedUpdatedAt', 'isPublished', 'readMoreLabel', 'slides']);
      expect(await screen.findByText(HERO_TAB)).toBeInTheDocument();
    });
  });

  /* The edit page belongs to two tabs of Home Page Management, and returns to the one it was opened from. */
  describe('returning to Home Page Management', () => {
    const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);

    it('names the slides tab in the breadcrumb, and Back returns to it', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      renderEdit();

      expect(await screen.findByRole('heading', { name: 'Edit Home Hero Section' })).toBeInTheDocument();
      expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'AMRUT Kalash – apply online', 'Edit']);
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(await screen.findByText(HERO_TAB)).toBeInTheDocument();
    });

    it('opened from the glance tab, names it in the breadcrumb, and Cancel and Save return to it', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      vi.mocked(heroService.update).mockResolvedValue(hero());
      const { unmount } = renderEdit('/cms/hero/edit?tab=glance');

      await screen.findByLabelText(/^Districts/);
      expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Programme at a glance', 'Edit']);
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(await screen.findByText('Home page ?tab=glance')).toBeInTheDocument();
      unmount();

      renderEdit('/cms/hero/edit?tab=glance');
      await userEvent.clear(await screen.findByLabelText(/^Districts/));
      await userEvent.type(districts(), '37');
      await save();
      expect(await screen.findByText('Home page ?tab=glance')).toBeInTheDocument();
    });
  });

  /* Home Page Figures was merged into this section; its old addresses still work through the real routes. */
  describe('old links', () => {
    it('/cms/home opens the glance figures on Home Page Management', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      renderWithProviders(<AppRoutes />, { route: '/cms/home' });

      /* The router loads the page lazily; under a full parallel run that can take longer than findBy's default second. */
      expect(await screen.findByRole('heading', { name: 'Home Page Management' }, { timeout: 5000 })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Programme at a glance' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByText('36 (entered)')).toBeInTheDocument();
    });

    it('/cms/hero, the section’s former page, opens its slides tab', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      renderWithProviders(<AppRoutes />, { route: '/cms/hero' });

      expect(await screen.findByRole('tab', { name: 'AMRUT Kalash – apply online' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByText('Heading 1')).toBeInTheDocument();
    });

    it('/cms/home/edit opens the Home Hero Section edit page, returning to the glance tab', async () => {
      vi.mocked(heroService.get).mockResolvedValue(hero());
      renderWithProviders(<AppRoutes />, { route: '/cms/home/edit' });

      expect(await screen.findByRole('heading', { name: 'Edit Home Hero Section' })).toBeInTheDocument();
      expect(await screen.findByLabelText(/^Districts/)).toHaveValue('36');
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(await screen.findByRole('tab', { name: 'Programme at a glance' })).toHaveAttribute('aria-selected', 'true');
    });

    it('still needs a home page menu: the redirect opens nothing the menus would not', async () => {
      auth.permissions = new Set(['cms-faqs.view']);
      vi.mocked(heroService.get).mockResolvedValue(hero());
      renderWithProviders(<AppRoutes />, { route: '/cms/home' });

      expect(await screen.findByText("You don't have access to this screen")).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Home Page Management' })).not.toBeInTheDocument();
      expect(heroService.get).not.toHaveBeenCalled();
    });
  });
});
