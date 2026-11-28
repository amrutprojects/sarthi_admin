import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import DashboardPage from '../pages/DashboardPage';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import type { DashboardFigures } from '../types/ippApprovals.types';
import { PUNE, SATARA, batch, counts, pageOf, readOnlySummary, summary } from './fixtures';
import Where from './Where';

let granted = new Set<string>();
let opens = (_menu: string) => true;
const portal = 'admin';
vi.mock('../../auth', () => ({
  useAuth: () => ({ portal }),
  useCanOpen: () => (menu: string) => opens(menu),
  useCan: () => (action: string) => granted.has(action),
}));
vi.mock('../services/ippApprovalsApi', () => ({ ippApprovalsApi: { summary: vi.fn(), batches: vi.fn(), dashboard: vi.fn() } }));
const api = vi.mocked(ippApprovalsApi);

const VIEWS = { TO_DECIDE: 12, SENT_ON: 23, SENT_BACK: 4, ALL: 35 };
const FIGURES: DashboardFigures = {
  districts: [PUNE, SATARA],
  pipeline: { received: 40, auditorApproved: 38, divisionApproved: 30, coepApproved: 25, finalApproved: 20 },
  batches: { total: 6, ongoing: 2, ended: 1 },
  inTraining: 12,
  courses: [
    { name: 'Cyber Security', applications: 15, enrolled: 9 },
    { name: 'Software Testing', applications: 10, enrolled: 3 },
  ],
};

function renderAt() {
  return renderWithProviders(
    <Routes>
      <Route path="/ipp-approvals/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: '/ipp-approvals/dashboard' },
  );
}
/* A figure of the dashboard (not the tab of the same name). */
const figure = (label: string) => {
  const found = screen.getAllByRole('link', { name: new RegExp(`^${label}`) }).filter((l) => l.classList.contains('kpi'));
  expect(found).toHaveLength(1);
  return found[0];
};
const value = (label: string) => figure(label).querySelector('.kpi-v')?.textContent;

beforeEach(() => {
  granted = new Set(['decideIppDivision']);
  opens = () => true;
  api.summary.mockResolvedValue(summary({ views: VIEWS }));
  api.batches.mockResolvedValue(pageOf([batch()], 1, 7));
  api.dashboard.mockResolvedValue(FIGURES);
});

describe('IPP dashboard', () => {
  it('shows how many each list holds, the batches and where the applications are', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { name: /Dashboard$/ })).toBeInTheDocument();
    expect(screen.getByText(/You decide as Divisional Officer for: Pune, Satara/)).toBeInTheDocument();
    expect(value('To decide')).toBe('12');
    expect(figure('To decide')).toHaveTextContent('2 sent back to you');
    expect(figure('Sent on')).toHaveAttribute('title', 'Gone on above your level, final approvals included');
    expect(value('Sent on')).toBe('23');
    expect(value('Sent back')).toBe('4');
    expect(value('All')).toBe('35');
    await waitFor(() => expect(value('Batches')).toBe('7'));
    expect(api.batches).toHaveBeenCalledWith({ page: 1, limit: 1 }, expect.anything());
    expect(value('With Divisional Officer')).toBe('12');
    expect(value('With COEP')).toBe('20');
    expect(value('With Head Office')).toBe('0');
    expect(value('Final approved')).toBe('3');
    expect(value('With IPP Auditor')).toBe('0');
    /* Head Office approval is on: the Super Admin gives no approval and holds none. */
    expect(screen.queryByRole('link', { name: /^With Super Admin/ })).not.toBeInTheDocument();
  });

  it.each([
    ['To decide', '/ipp-approvals?view=TO_DECIDE'],
    ['Sent on', '/ipp-approvals?view=SENT_ON'],
    ['Sent back', '/ipp-approvals?view=SENT_BACK'],
    ['All', '/ipp-approvals?view=ALL'],
    ['Batches', '/ipp-approvals/batches'],
    ['With COEP', '/ipp-approvals?view=ALL&stage=COEP'],
    ['Final approved', '/ipp-approvals?view=ALL&stage=APPROVED'],
  ])('the figure %s opens %s', async (label, path) => {
    renderAt();
    await screen.findByRole('heading', { name: /Dashboard$/ });
    await userEvent.click(figure(label));
    expect(screen.getByTestId('where')).toHaveTextContent(path);
  });

  it('shows the Super Admin while Head Office approval is off, and the Head Office only while it holds some', async () => {
    api.summary.mockResolvedValue(
      summary({ headOfficeEnabled: false, views: VIEWS, counts: counts({ COEP: 2, HEAD_OFFICE: 1, SUPER_ADMIN: 5 }) }),
    );
    renderAt();
    expect(await screen.findByRole('link', { name: /^With Super Admin/ })).toBeInTheDocument();
    expect(value('With Super Admin')).toBe('5');
    expect(value('With Head Office')).toBe('1');
  });

  it('hides a Head Office without applications while its approval is off', async () => {
    api.summary.mockResolvedValue(summary({ headOfficeEnabled: false, views: VIEWS, counts: counts({ SUPER_ADMIN: 5 }) }));
    renderAt();
    expect(await screen.findByRole('link', { name: /^With Super Admin/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^With Head Office/ })).not.toBeInTheDocument();
  });

  it('shows a user who decides nothing the whole count only, with the read-only note', async () => {
    granted = new Set();
    api.summary.mockResolvedValue(readOnlySummary({ views: { TO_DECIDE: 0, SENT_ON: 0, SENT_BACK: 0, ALL: 35 } }));
    renderAt();
    expect(await screen.findByText(/Read only/)).toBeInTheDocument();
    expect(value('All applications')).toBe('35');
    for (const label of ['To decide', 'Sent on', 'Sent back'])
      expect(screen.queryByRole('link', { name: new RegExp(`^${label}`) })).toBeNull();
  });

  it('counts To decide and All from an API that does not count each list yet', async () => {
    api.summary.mockResolvedValue(summary());
    renderAt();
    await screen.findByRole('heading', { name: /Dashboard$/ });
    expect(value('To decide')).toBe('12');
    expect(value('Sent on')).toBe('—');
    expect(value('Sent back')).toBe('—');
    expect(value('All')).toBe('35');
  });

  it('leads back through IPP Approvals, and to the programme Dashboard only for those who may open it', async () => {
    renderAt();
    await screen.findByRole('heading', { name: /Dashboard$/ });
    const crumbs = document.querySelector('.crumb') as HTMLElement;
    expect(within(crumbs).getByText('Dashboard', { selector: 'a' })).toBeInTheDocument();
    expect(within(crumbs).getByText('IPP Approvals', { selector: 'a' })).toBeInTheDocument();
  });

  it('drops the programme Dashboard from the trail of an IPP officer', async () => {
    opens = (menu) => menu !== 'dashboard';
    renderAt();
    await screen.findByRole('heading', { name: /Dashboard$/ });
    const crumbs = document.querySelector('.crumb') as HTMLElement;
    expect(within(crumbs).queryByText('Dashboard', { selector: 'a' })).toBeNull();
    expect(within(crumbs).getByText('IPP Approvals', { selector: 'a' })).toBeInTheDocument();
  });

  it('says when the lists or the figures are not permitted', async () => {
    api.summary.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    api.dashboard.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderAt();
    expect(await screen.findByText(/You do not have permission to see the IPP applications/)).toBeInTheDocument();
    expect(await screen.findByText(/You do not have permission to see the dashboard figures/)).toBeInTheDocument();
  });
});

/* A figure of the dashboard's own row (Applications, Certified, ...): its value. */
const tile = (label: string) =>
  [...document.querySelectorAll('.dash-kpis .kpi')].find((k) => k.querySelector('.kpi-t')?.textContent === label)?.querySelector('.kpi-v')
    ?.textContent;
const rowsOf = (chart: string) =>
  within(screen.getByRole('list', { name: chart }))
    .getAllByRole('listitem')
    .map((r) => r.getAttribute('title'));

describe('IPP dashboard - the dashboard of each level', () => {
  it('a Divisional Officer: the figures of their districts, the pipeline and certified vs placed by district', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { name: 'Divisional Officer Dashboard' })).toBeInTheDocument();
    await waitFor(() => expect(tile('Applications')).toBe('40'));
    expect(tile('Approved')).toBe('20');
    expect(tile('Batches')).toBe('6');
    expect(screen.getByText('2 ongoing · 1 ended')).toBeInTheDocument();
    /* Not recorded in SARTHI: 0, and the note says so. */
    expect(tile('Avg. attendance')).toBe('0%');
    expect(tile('Certified')).toBe('0');
    expect(tile('Placed')).toBe('0');
    expect(screen.getByText(/not recorded in SARTHI yet: they show 0/)).toBeInTheDocument();
    expect(rowsOf('Approval pipeline')).toEqual([
      'Applications: 40',
      'Auditor approved: 38',
      'Division approved: 30',
      'COEP approved: 25',
      'SARTHI HO approved: 20',
    ]);
    expect(screen.getByRole('heading', { name: 'District-wise: certified vs placed' })).toBeInTheDocument();
    expect(rowsOf('District-wise: certified vs placed')).toEqual(['Pune: Certified 0, Placed 0', 'Satara: Certified 0, Placed 0']);
    expect(screen.getByRole('meter', { name: '0% placed, target 80%' })).toBeInTheDocument();
    expect(screen.getByText('0 placed of 0 certified')).toBeInTheDocument();
    expect(screen.getByText('Below target')).toBeInTheDocument();
    /* One level: nothing to switch. */
    expect(screen.queryByRole('group', { name: 'Dashboard of' })).toBeNull();
  });

  it('the COEP: ongoing batches, candidates in training, courses, attendance and certification', async () => {
    granted = new Set(['decideIppCoep']);
    renderAt();
    expect(await screen.findByRole('heading', { name: 'COEP Dashboard' })).toBeInTheDocument();
    await waitFor(() => expect(tile('Batches ongoing')).toBe('2'));
    expect(tile('Candidates in training')).toBe('12');
    expect(tile('Assessments done')).toBe('0');
    expect(tile('Avg. score')).toBe('0%');
    expect(tile('Certified')).toBe('0');
    expect(tile('Pending')).toBe('12');
    expect(rowsOf('Course-wise: enrolled vs certified')).toEqual([
      'Cyber Security: Enrolled 9, Certified 0',
      'Software Testing: Enrolled 3, Certified 0',
    ]);
    expect(screen.getByRole('img', { name: 'Attendance by month: Month 1 0%, Month 2 0%, Month 3 0%' })).toBeInTheDocument();
    expect(rowsOf('Certification status')).toEqual(['Certified: 0', 'In final assessment: 0', 'Pending: 12']);
  });

  it('the COEP without courses yet', async () => {
    granted = new Set(['decideIppCoep']);
    api.dashboard.mockResolvedValue({ ...FIGURES, courses: [] });
    renderAt();
    expect(await screen.findByText(/No course yet/)).toBeInTheDocument();
  });

  it('the Head Office: statewide, certified vs placed by division', async () => {
    granted = new Set(['decideIppHeadOffice']);
    api.dashboard.mockResolvedValue({ ...FIGURES, districts: null });
    renderAt();
    expect(await screen.findByRole('heading', { name: 'Head Office Dashboard' })).toBeInTheDocument();
    await waitFor(() => expect(tile('Applications')).toBe('40'));
    expect(rowsOf('Division-wise: certified vs placed').map((t) => t?.split(':')[0])).toEqual([
      'Pune',
      'Chhatrapati Sambhajinagar',
      'Nashik',
      'Konkan',
      'Nagpur',
      'Amravati',
    ]);
  });

  it('a user who decides at no level reads the Head Office dashboard', async () => {
    granted = new Set();
    api.summary.mockResolvedValue(readOnlySummary({ views: VIEWS }));
    renderAt();
    expect(await screen.findByRole('heading', { name: 'Head Office Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Dashboard of' })).toBeNull();
  });

  it('a user of several levels switches between their dashboards', async () => {
    granted = new Set(['decideIppHeadOffice', 'decideIppCoep', 'decideIppDivision']);
    renderAt();
    expect(await screen.findByRole('heading', { name: 'Head Office Dashboard' })).toBeInTheDocument();
    const of = screen.getByRole('group', { name: 'Dashboard of' });
    expect(
      within(of)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Head Office', 'COEP', 'Divisional Officer']);
    await userEvent.click(within(of).getByRole('button', { name: 'COEP' }));
    expect(await screen.findByRole('heading', { name: 'COEP Dashboard' })).toBeInTheDocument();
    expect(within(of).getByRole('button', { name: 'COEP' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(of).getByRole('button', { name: 'Divisional Officer' }));
    expect(await screen.findByRole('heading', { name: 'Divisional Officer Dashboard' })).toBeInTheDocument();
  });
});
