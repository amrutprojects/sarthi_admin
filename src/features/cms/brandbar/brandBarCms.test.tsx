import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import BrandBarPreview from './components/BrandBarPreview';
import BrandBarTab from './components/BrandBarTab';
import BrandBarEdit from './pages/BrandBarEdit';
import { brandBarService } from './services/brandBarService';
import type { ApiBrandBar, Bilingual } from './types/brandbar.types';
import { brandBarPayload, brandBarToForm, validateBrandBarForm, type BrandBarFormValues } from './validation/brandbar.validation';

const auth = vi.hoisted(() => ({ permissions: new Set<string>() }));

vi.mock('./services/brandBarService', () => ({
  brandBarService: { get: vi.fn(), update: vi.fn() },
}));
vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({ permissions: auth.permissions, hiddenMenus: new Set() }),
}));

const pair = (mr: string, en: string): Bilingual => ({ mr, en });
const ALL = ['cms-brandbar.view', 'cms-brandbar.update'];
/* The seeded bar: what the website showed before it could be managed. */
const TITLE = 'AMRUT KALASH';
const FULL_NAME = pair(
  'अमृत - महाराष्ट्र संशोधन, उन्नती व प्रशिक्षण प्रबोधिनी',
  'Academy of Maharashtra Research, Upliftment and Training',
);
const PARTNER_LABEL = pair('अंमलबजावणी भागीदार', 'Implementation Partner');
const PARTNER = 'SUMAGO INFOTECH PVT LTD';

const brandBar = (extra: Partial<ApiBrandBar> = {}): ApiBrandBar => ({
  id: 'bb1',
  title: TITLE,
  fullName: FULL_NAME,
  partnerLabel: PARTNER_LABEL,
  partnerName: PARTNER,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-02T10:00:00.000Z',
  ...extra,
});

const toasts = () => document.getElementById('toast-root')!;

function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/cms/home-page" element={<BrandBarTab />} />
        <Route path="/cms/brand-bar/edit" element={<BrandBarEdit />} />
      </Routes>
      <Location />
    </>,
    { route },
  );

const TAB = '/cms/home-page?tab=brand-bar';
const EDIT = '/cms/brand-bar/edit';
const currentPath = () => screen.getByTestId('location').textContent;
const crumbs = () => [...document.querySelectorAll('.crumb > a, .crumb > span')].map((c) => c.textContent);
const bar = (lang: 'Marathi' | 'English') => screen.getByRole('figure', { name: `${lang} preview` });
const summary = () => screen.getByRole('heading', { name: 'Brand bar' }).closest('.card') as HTMLElement;

beforeEach(() => {
  auth.permissions = new Set(ALL);
  Element.prototype.scrollIntoView = vi.fn();
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.mocked(brandBarService.get).mockResolvedValue(brandBar());
});

describe('Brand Bar tab', () => {
  it('shows every value, and the bar as the website draws it', async () => {
    renderAt(TAB);

    expect(await screen.findByRole('heading', { name: 'Brand bar' })).toBeInTheDocument();
    expect(within(summary()).getByText(TITLE)).toBeInTheDocument();
    expect(within(summary()).getByText(FULL_NAME.mr)).toBeInTheDocument();
    expect(within(summary()).getByText(FULL_NAME.en)).toBeInTheDocument();
    expect(within(summary()).getByText(PARTNER_LABEL.mr)).toBeInTheDocument();
    expect(within(summary()).getByText(PARTNER_LABEL.en)).toBeInTheDocument();
    expect(within(summary()).getByText(PARTNER)).toBeInTheDocument();
    /* Both full-name lines in either language; the partner label in the bar's own. */
    expect(bar('Marathi')).toHaveTextContent(`${TITLE}${FULL_NAME.mr}${FULL_NAME.en}${PARTNER_LABEL.mr}${PARTNER}`);
    expect(bar('English')).toHaveTextContent(`${TITLE}${FULL_NAME.mr}${FULL_NAME.en}${PARTNER_LABEL.en}${PARTNER}`);
  });

  it('says so for each blank value', async () => {
    vi.mocked(brandBarService.get).mockResolvedValue(
      brandBar({ fullName: pair('', FULL_NAME.en), partnerLabel: pair('', ''), partnerName: '' }),
    );
    renderAt(TAB);

    await screen.findByRole('heading', { name: 'Brand bar' });
    expect(within(summary()).getByText('None — the line is not shown')).toBeInTheDocument();
    expect(within(summary()).getByText('None — no label is shown')).toBeInTheDocument();
    expect(within(summary()).getByText('None — the partner is not shown')).toBeInTheDocument();
    expect(bar('English')).toHaveTextContent(`${TITLE}${FULL_NAME.en}`);
    expect(bar('English')).not.toHaveTextContent(PARTNER_LABEL.en);
  });

  it('opens the Edit page from Edit, and a retryable error when it cannot load', async () => {
    const { unmount } = renderAt(TAB);
    const head = document.querySelector('.cms-tab-head') as HTMLElement;
    const edit = within(head).getByRole('button', { name: /Edit/ });
    await waitFor(() => expect(edit).toBeEnabled());
    await userEvent.click(edit);
    expect(currentPath()).toBe(EDIT);
    unmount();

    vi.mocked(brandBarService.get)
      .mockRejectedValueOnce(
        new ApiError('The Brand Bar has not been configured yet. Run the database seed to create it.', 404, 'NOT_FOUND'),
      )
      .mockResolvedValueOnce(brandBar());
    renderAt(TAB);
    expect(await screen.findByText(/has not been configured yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Brand bar' })).toBeInTheDocument();
  });

  it('gives a view-only administrator no Edit', async () => {
    auth.permissions = new Set(['cms-brandbar.view']);
    renderAt(TAB);
    await screen.findByRole('heading', { name: 'Brand bar' });
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
  });
});

describe('Edit Brand Bar', () => {
  it('saves every field with the loaded version, and returns to the tab', async () => {
    vi.mocked(brandBarService.update).mockResolvedValue(brandBar());
    renderAt(EDIT);
    expect(await screen.findByRole('heading', { name: 'Edit Brand Bar' })).toBeInTheDocument();
    expect(crumbs()).toEqual(['Dashboard', 'CMS', 'Home Page Management', 'Brand Bar', 'Edit']);
    const title = await screen.findByLabelText('Title *');
    expect(title).toHaveValue(TITLE);
    expect(screen.getByLabelText('Full name (Marathi)')).toHaveValue(FULL_NAME.mr);
    expect(screen.getByLabelText('Partner name')).toHaveValue(PARTNER);

    await userEvent.clear(title);
    await userEvent.type(title, '  AMRUT   Kalash ');
    await userEvent.clear(screen.getByLabelText('Full name (English)'));
    await userEvent.clear(screen.getByLabelText('Partner name'));
    await userEvent.type(screen.getByLabelText('Partner name'), 'Partner Ltd');
    /* The preview follows what is typed. */
    expect(bar('English')).toHaveTextContent('AMRUT Kalash');
    expect(bar('English')).not.toHaveTextContent(FULL_NAME.en);
    expect(bar('English')).toHaveTextContent('Partner Ltd');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(brandBarService.update).toHaveBeenCalledWith({
        title: 'AMRUT Kalash',
        fullName: pair(FULL_NAME.mr, ''),
        partnerLabel: PARTNER_LABEL,
        partnerName: 'Partner Ltd',
        expectedUpdatedAt: brandBar().updatedAt,
      }),
    );
    await waitFor(() => expect(currentPath()).toBe(TAB));
    expect(toasts()).toHaveTextContent('Brand bar updated');
  });

  it('names each problem before sending anything', async () => {
    renderAt(EDIT);
    await userEvent.clear(await screen.findByLabelText('Title *'));
    await userEvent.clear(screen.getByLabelText('Partner label (English)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Partner label (English) is required when the Marathi text is filled in')).toBeInTheDocument();
    expect(brandBarService.update).not.toHaveBeenCalled();
  });

  it('stops each field at its limit', async () => {
    renderAt(EDIT);
    expect(await screen.findByLabelText('Title *')).toHaveAttribute('maxlength', '60');
    expect(screen.getByLabelText('Full name (Marathi)')).toHaveAttribute('maxlength', '160');
    expect(screen.getByLabelText('Full name (English)')).toHaveAttribute('maxlength', '160');
    expect(screen.getByLabelText('Partner label (Marathi)')).toHaveAttribute('maxlength', '60');
    expect(screen.getByLabelText('Partner name')).toHaveAttribute('maxlength', '100');
  });

  it('shows the server’s field message on the field', async () => {
    vi.mocked(brandBarService.update).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [
        { field: 'body.fullName.en', message: 'Full name (English) must be at most 160 characters' },
      ]),
    );
    renderAt(EDIT);
    await screen.findByLabelText('Title *');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Full name (English) must be at most 160 characters')).toBeInTheDocument();
    expect(currentPath()).toBe(EDIT);
  });

  it('stays on the form and says so when someone else saved meanwhile', async () => {
    vi.mocked(brandBarService.update).mockRejectedValueOnce(
      new ApiError('The Brand Bar was changed by someone else. Reload it and try again.', 409, 'CONFLICT'),
    );
    renderAt(EDIT);
    await screen.findByLabelText('Title *');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(toasts()).toHaveTextContent('The Brand Bar was changed by someone else'));
    expect(brandBarService.update).toHaveBeenCalledWith(expect.objectContaining({ expectedUpdatedAt: brandBar().updatedAt }));
    expect(currentPath()).toBe(EDIT);
  });

  it('gives a view-only administrator no form', async () => {
    auth.permissions = new Set(['cms-brandbar.view']);
    renderAt(EDIT);
    expect(await screen.findByText('You can view this section but not change it')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });
});

describe('<BrandBarPreview>', () => {
  it('leaves out a blank full-name line, the label in the bar’s language, and the partner block without a name', () => {
    renderWithProviders(<BrandBarPreview title={TITLE} fullName={pair(FULL_NAME.mr, '')} partnerLabel={PARTNER_LABEL} partnerName="" />);
    expect(bar('Marathi')).toHaveTextContent(`${TITLE}${FULL_NAME.mr}`);
    expect(bar('Marathi')).not.toHaveTextContent(PARTNER_LABEL.mr);
    expect(bar('English')).not.toHaveTextContent(FULL_NAME.en);
  });
});

describe('brand bar validation', () => {
  const ok: BrandBarFormValues = brandBarToForm(brandBar());
  const problems = (v: BrandBarFormValues) => Object.values(validateBrandBarForm(v)).filter(Boolean);

  it('accepts the seeded bar, and one with every optional text blank', () => {
    expect(problems(ok)).toEqual([]);
    expect(problems({ title: TITLE, fullName: pair('', ''), partnerLabel: pair('', ''), partnerName: '' })).toEqual([]);
  });

  it('requires a title of at most 60 characters', () => {
    expect(validateBrandBarForm({ ...ok, title: '  ' }).title).toBe('Title is required');
    expect(validateBrandBarForm({ ...ok, title: 'A'.repeat(60) }).title).toBeUndefined();
    expect(validateBrandBarForm({ ...ok, title: 'A'.repeat(61) }).title).toBe('Title must be at most 60 characters');
  });

  it('takes each full-name line on its own, at most 160 characters', () => {
    expect(problems({ ...ok, fullName: pair(FULL_NAME.mr, '') })).toEqual([]);
    expect(problems({ ...ok, fullName: pair('', FULL_NAME.en) })).toEqual([]);
    const long = validateBrandBarForm({ ...ok, fullName: pair('अ'.repeat(161), 'A'.repeat(161)) });
    expect(long['fullName.mr']).toBe('Full name (Marathi) must be at most 160 characters');
    expect(long['fullName.en']).toBe('Full name (English) must be at most 160 characters');
  });

  it('takes a partner label in both languages or in neither, at most 60 characters each', () => {
    expect(validateBrandBarForm({ ...ok, partnerLabel: pair(PARTNER_LABEL.mr, '') })['partnerLabel.en']).toBe(
      'Partner label (English) is required when the Marathi text is filled in',
    );
    expect(validateBrandBarForm({ ...ok, partnerLabel: pair('', PARTNER_LABEL.en) })['partnerLabel.mr']).toBe(
      'Partner label (Marathi) is required when the English text is filled in',
    );
    expect(validateBrandBarForm({ ...ok, partnerLabel: pair('अ'.repeat(61), 'A'.repeat(61)) })['partnerLabel.en']).toBe(
      'Partner label (English) must be at most 60 characters',
    );
  });

  it('holds the partner name to 100 characters', () => {
    expect(validateBrandBarForm({ ...ok, partnerName: 'A'.repeat(101) }).partnerName).toBe('Partner name must be at most 100 characters');
  });

  it('sends every key, whitespace normalised like the server, with the version', () => {
    expect(
      brandBarPayload(
        { title: ' AMRUT  KALASH ', fullName: pair(' अमृत ', '  '), partnerLabel: pair('', ''), partnerName: ' SUMAGO ' },
        'v1',
      ),
    ).toEqual({ title: TITLE, fullName: pair('अमृत', ''), partnerLabel: pair('', ''), partnerName: 'SUMAGO', expectedUpdatedAt: 'v1' });
  });
});
