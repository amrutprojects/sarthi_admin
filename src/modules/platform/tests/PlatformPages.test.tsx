import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import AuditPage from '../pages/AuditPage';
import LmsPage from '../pages/LmsPage';
import StudentAppPage from '../pages/StudentAppPage';
import AdministrationPage from '../pages/AdministrationPage';
import SettingsPage from '../pages/SettingsPage';

let granted = new Set<string>();
vi.mock('../../auth', () => ({
  Can: ({ action, children }: { action: string; children: ReactNode }) => (granted.has(action) ? children : null),
  useCan: () => (a: string) => granted.has(a),
}));
/* The live G-2 card has its own behaviour; here it only has to stay on the settings screen. */
vi.mock('../../lms-live', () => ({ LiveDataSettingCard: () => <div data-testid="live-data-setting" /> }));

beforeEach(() => {
  granted = new Set();
});

/* Values the old sample dataset showed on these screens; none may appear any more. */
const INVENTED = [/760/, /1,000 learners/, /486 learners/, /Nightly 06:00/, /AMRUT\/SUM\/YYYY/, /7 years/, /Last 20 days/, /Indicative/i];
function expectNothingInvented(container: HTMLElement) {
  const text = container.textContent ?? '';
  INVENTED.forEach((re) => expect(text).not.toMatch(re));
  expect(container.querySelector('table')).toBeNull();
}

describe('platform screens without a live source', () => {
  it.each([
    ['Audit log', AuditPage, 'System Activity / Audit Log'],
    ['Student app', StudentAppPage, 'Student App Management'],
    ['Administration', AdministrationPage, 'Administration — Master Configuration'],
  ])('%s shows its title and an honest empty state', (_n, Page, title) => {
    const { container } = renderWithProviders(<Page />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toHaveTextContent('No data yet');
    expect(screen.getByTestId('no-data')).toHaveTextContent('अद्याप माहिती नाही');
    expectNothingInvented(container);
  });

  it('Audit log has no export or other action pretending to work', () => {
    renderWithProviders(<AuditPage />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('LMS integration keeps the live API keys link for users who may see it, and no mock sync', () => {
    granted = new Set(['viewLmsApiKeys', 'syncLms']);
    const { container } = renderWithProviders(<LmsPage />);
    expect(screen.getByRole('heading', { name: 'LMS Integration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /API keys/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sync now/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /view logs/i })).toBeNull();
    expect(screen.getByTestId('no-data')).toBeInTheDocument();
    expectNothingInvented(container);
  });

  it('LMS integration hides the API keys link without the permission', () => {
    renderWithProviders(<LmsPage />);
    expect(screen.queryByRole('button', { name: /API keys/ })).toBeNull();
  });
});

describe('System settings', () => {
  it('keeps the live LMS data card and shows no invented configuration', () => {
    granted = new Set(['editSettings']);
    const { container } = renderWithProviders(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'System Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('live-data-setting')).toBeInTheDocument();
    expect(screen.getByTestId('no-data')).toHaveTextContent('not stored on the server yet');
    expect(screen.getByTestId('no-data')).toHaveTextContent('सर्व्हरवर साठवले जात नाहीत');
    /* No fake save, fake toggles or session-only parameter fields. */
    expect(screen.queryByRole('button', { name: /save settings/i })).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(container.querySelector('.switch')).toBeNull();
    expectNothingInvented(container);
  });
});
