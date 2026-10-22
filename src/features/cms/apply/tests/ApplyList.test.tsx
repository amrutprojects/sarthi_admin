import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import ApplyList from '../pages/ApplyList';
import { applyService } from '../services/applyService';
import type { ApiApplyItem, ApiApplySettings } from '../types/apply.types';

/* The screen's collaborators are replaced at their public boundaries: the auth module and the API service. */
const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/applyService', () => ({
  applyService: { list: vi.fn(), count: vi.fn(), getSettings: vi.fn(), publicDocuments: vi.fn() },
}));

const AT = '2026-10-22T10:00:00.000Z';

const settings: ApiApplySettings = {
  id: 's1',
  pageTitle: { mr: 'अर्ज कसा करावा', en: 'How to Apply' },
  pageSubtitle: { mr: 'नोंदणीपासून प्रवेशापर्यंतची संपूर्ण प्रक्रिया.', en: 'The complete process from registration to admission.' },
  noteTitle: { mr: 'महत्त्वाचे', en: 'Important' },
  noteBody: { mr: 'किमान 30 दिवस आधी अर्ज करावा.', en: 'Apply at least 30 days before.' },
  glanceHeading: { mr: 'लक्षात ठेवा', en: 'At a glance' },
  documentsHeading: { mr: 'आवश्यक कागदपत्रे', en: 'Documents to keep ready' },
  ctaText: { mr: 'अर्ज अधिकृत पोर्टलवर स्वीकारले जातात.', en: 'Applications are accepted on the portal.' },
  ctaLabel: { mr: 'Apply Now', en: 'Apply Now' },
  ctaUrl: 'https://app.mahaamrut.org.in/amrut-new/signup',
  ctaHint: { mr: 'ही लिंक नवीन टॅबमध्ये उघडेल', en: 'Opens in a new tab' },
  createdAt: AT,
  updatedAt: AT,
};

const item = (over: Partial<ApiApplyItem>): ApiApplyItem => ({
  id: 'i1',
  kind: 'STEP',
  label: { mr: 'ऑनलाइन अर्ज', en: 'Online application' },
  value: { mr: 'ऑनलाइन अर्ज करा.', en: 'Apply online.' },
  displayOrder: 1,
  isActive: true,
  createdAt: AT,
  updatedAt: AT,
  ...over,
});

const STEP = item({});
const FACT = item({
  id: 'i2',
  kind: 'FACT',
  label: { mr: 'अनामत रक्कम', en: 'Security deposit' },
  value: { mr: '₹2,000 (परतावा योग्य)', en: '₹2,000 (refundable)' },
});
const DOCUMENTS = [
  { mr: 'आधार कार्ड', en: 'Aadhaar card' },
  { mr: 'छायाचित्र व स्वाक्षरी', en: 'Photograph and signature' },
];

const page = (items: ApiApplyItem[]) => ({ items, meta: { page: 1, limit: 15, total: items.length, totalPages: 1 } });

/* Shows where the screen has navigated to, so tab and link targets can be asserted. */
function Location() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

const renderAt = (route = '/cms/apply') =>
  renderWithProviders(
    <>
      <ApplyList />
      <Location />
    </>,
    { route },
  );

const tab = (name: string) => screen.getByRole('tab', { name });

describe('<ApplyList> tabs', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(applyService.getSettings).mockReset().mockResolvedValue(settings);
    vi.mocked(applyService.publicDocuments).mockReset().mockResolvedValue(DOCUMENTS);
    vi.mocked(applyService.count).mockReset().mockResolvedValue(3);
    vi.mocked(applyService.list)
      .mockReset()
      .mockImplementation(async (q) => page(q.kind === 'FACT' ? [FACT] : [STEP]));
  });

  it('shows one tab per section of the public page, opening on Page Text', async () => {
    renderAt();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    ['Page Text', 'Application Steps', 'At a Glance', 'Documents to Keep Ready'].forEach((name, i) =>
      expect(tabs[i]).toHaveAccessibleName(name),
    );
    expect(tab('Page Text')).toHaveAttribute('aria-selected', 'true');

    /* Each list tab carries its count (hidden from screen readers: the KPI tiles say it too). */
    await waitFor(() => expect(tab('Application Steps').querySelector('.cnt')).toHaveTextContent('3'));
    expect(tab('At a Glance').querySelector('.cnt')).toHaveTextContent('3');
    await waitFor(() => expect(tab('Documents to Keep Ready').querySelector('.cnt')).toHaveTextContent('2'));
    expect(tab('Page Text').querySelector('.cnt')).toBeNull();

    /* The page text, grouped by where each piece appears on the website. */
    for (const group of ['Page heading', 'Important note', 'Apply box', 'Card headings']) {
      expect(await screen.findByRole('heading', { name: new RegExp(group) })).toBeInTheDocument();
    }
    expect(screen.getByText('अर्ज कसा करावा')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: settings.ctaUrl })).toHaveAttribute('target', '_blank');

    /* No list on this tab. */
    expect(applyService.list).not.toHaveBeenCalled();
  });

  it('lists only the application steps on their tab, in website order, and keeps the tab in the URL', async () => {
    permissions.add('createApplyItem');
    renderAt();
    await userEvent.click(tab('Application Steps'));

    expect(tab('Application Steps')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Online application')).toBeInTheDocument();
    expect(screen.queryByText('Security deposit')).not.toBeInTheDocument();
    expect(applyService.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'STEP', sortBy: 'displayOrder', sortOrder: 'asc' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/apply?tab=steps');
    expect(document.querySelector('.sec-note')).toHaveTextContent(
      'The "Important" note shown under the steps is edited on the Page Text tab.',
    );

    /* The header action follows the tab. */
    expect(screen.getByRole('button', { name: /Add Step/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add At-a-glance Row/ })).not.toBeInTheDocument();
  });

  it('opens At a Glance from the URL, with its card heading and its own Add button', async () => {
    permissions.add('createApplyItem');
    renderAt('/cms/apply?tab=facts');

    expect(tab('At a Glance')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Security deposit')).toBeInTheDocument();
    expect(screen.queryByText('Online application')).not.toBeInTheDocument();
    expect(applyService.list).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'FACT' }));
    expect(await screen.findByText('लक्षात ठेवा')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Add At-a-glance Row/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/apply/create?kind=FACT');
  });

  it('shows the documents list as the website does, edited in Eligibility Page Management', async () => {
    permissions.add('viewEligibility');
    renderAt('/cms/apply?tab=documents');

    const items = await screen.findAllByRole('listitem');
    expect(items.map((li) => within(li).getByText(/./, { selector: '[lang="en"]' }).textContent)).toEqual([
      'Aadhaar card',
      'Photograph and signature',
    ]);
    expect(screen.getByText('आवश्यक कागदपत्रे')).toBeInTheDocument();
    expect(screen.getByText(/Edited in Eligibility Page Management/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Manage in Eligibility Page Management/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/eligibility');
  });

  it('opens a tab from its KPI tile', async () => {
    renderAt();
    await userEvent.click(await screen.findByText('At-a-glance rows'));

    expect(tab('At a Glance')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Security deposit')).toBeInTheDocument();
  });

  it('falls back to Page Text for an unknown tab', async () => {
    renderAt('/cms/apply?tab=nonsense');
    expect(tab('Page Text')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: /Page heading/ })).toBeInTheDocument();
  });

  it('offers no Edit or Add actions to a view-only user', async () => {
    renderAt();
    await screen.findByRole('heading', { name: /Page heading/ });
    expect(screen.queryByRole('button', { name: /Edit Page Text/ })).not.toBeInTheDocument();

    await userEvent.click(tab('Application Steps'));
    await screen.findByText('Online application');
    expect(screen.queryByRole('button', { name: /Add Step/ })).not.toBeInTheDocument();

    await userEvent.click(tab('Documents to Keep Ready'));
    await screen.findAllByRole('listitem');
    expect(screen.queryByRole('button', { name: /Manage in Eligibility/ })).not.toBeInTheDocument();
  });

  it('shows the Edit Page Text action to an editor on the Page Text tab', async () => {
    permissions.add('updateApplyPage');
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: /Edit Page Text/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/cms/apply/page/edit');
  });
});
