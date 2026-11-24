import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import Topbar from '../Topbar';

vi.mock('../../../modules/auth/auth-context', () => ({
  useAuth: () => ({
    portal: 'admin',
    user: { id: 'me', name: 'Test User', email: 'me@test.local', roles: [], permissions: [] },
    primaryRole: { id: 'r', name: 'Programme Viewer', code: 'VIEWER' },
    logout: vi.fn(),
  }),
}));

/* The top bar shows no sample alerts, no invented badge count and no search over the sample dataset. */
describe('<Topbar>', () => {
  it('has no search box over sample data', () => {
    const { container } = renderWithProviders(<Topbar onBurger={() => {}} />);
    expect(container.querySelector('#globalSearch, .tb-search')).toBeNull();
    expect(screen.queryByPlaceholderText(/Search/)).not.toBeInTheDocument();
  });

  it('the bell carries no count and opens a bilingual empty list', async () => {
    const { container } = renderWithProviders(<Topbar onBurger={() => {}} />);
    const bell = screen.getByTitle('Notifications');
    expect(bell.textContent).toBe('');
    expect(container.querySelector('.tb-btn .dot')).toBeNull();
    await userEvent.click(bell);
    const empty = screen.getByTestId('no-notifications');
    expect(empty).toHaveTextContent('No notifications yet · अद्याप कोणत्याही सूचना नाहीत');
    expect(document.body.querySelector('.alert-card')).toBeNull();
    expect(screen.queryByText(/View all tasks/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ new/)).not.toBeInTheDocument();
  });
});
