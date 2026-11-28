import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import DashboardPage from '../pages/DashboardPage';
import { ippApprovalsApi } from '../services/ippApprovalsApi';
import { batch, counts, pageOf, readOnlySummary, summary } from './fixtures';
import Where from './Where';

let granted = new Set<string>();
let opens = (_menu: string) => true;
vi.mock('../../auth', () => ({ useCanOpen: () => (menu: string) => opens(menu), useCan: () => (action: string) => granted.has(action) }));
vi.mock('../services/ippApprovalsApi', () => ({ ippApprovalsApi: { summary: vi.fn(), batches: vi.fn() } }));
const api = vi.mocked(ippApprovalsApi);

const VIEWS = { TO_DECIDE: 12, SENT_ON: 23, SENT_BACK: 4, ALL: 35 };

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
});

describe('IPP dashboard', () => {
  it('shows how many each list holds, the batches and where the applications are', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { name: 'IPP Dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/You decide as Divisional Officer for: Pune, Satara/)).toBeInTheDocument();
    expect(value('To decide')).toBe('12');
    expect(figure('To decide')).toHaveTextContent('2 sent back to you after a rejection');
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
    await screen.findByRole('heading', { name: 'IPP Dashboard' });
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
    await screen.findByRole('heading', { name: 'IPP Dashboard' });
    expect(value('To decide')).toBe('12');
    expect(value('Sent on')).toBe('—');
    expect(value('Sent back')).toBe('—');
    expect(value('All')).toBe('35');
  });

  it('leads back through IPP Approvals, and to the programme Dashboard only for those who may open it', async () => {
    renderAt();
    await screen.findByRole('heading', { name: 'IPP Dashboard' });
    const crumbs = document.querySelector('.crumb') as HTMLElement;
    expect(within(crumbs).getByText('Dashboard', { selector: 'a' })).toBeInTheDocument();
    expect(within(crumbs).getByText('IPP Approvals', { selector: 'a' })).toBeInTheDocument();
  });

  it('drops the programme Dashboard from the trail of an IPP officer', async () => {
    opens = (menu) => menu !== 'dashboard';
    renderAt();
    await screen.findByRole('heading', { name: 'IPP Dashboard' });
    const crumbs = document.querySelector('.crumb') as HTMLElement;
    expect(within(crumbs).queryByText('Dashboard', { selector: 'a' })).toBeNull();
    expect(within(crumbs).getByText('IPP Approvals', { selector: 'a' })).toBeInTheDocument();
  });

  it('says when the dashboard is not permitted', async () => {
    api.summary.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderAt();
    expect(await screen.findByText(/You do not have permission to see the IPP dashboard/)).toBeInTheDocument();
  });
});
