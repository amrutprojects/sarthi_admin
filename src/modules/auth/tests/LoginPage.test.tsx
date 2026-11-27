import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AS from '../../../legacy';
import { ApiError } from '../../../services/api-client';
import LoginPage from '../pages/LoginPage';
import { WEBSITE_MENUS } from '../permissions';
import type { CurrentUser } from '../types/auth.types';

const login = vi.fn<(email: string, password: string) => Promise<CurrentUser>>();
vi.mock('../auth-context', () => ({
  useAuth: () => ({ status: 'anonymous', login, permissions: new Set(), hiddenMenus: new Set(), portal: 'admin' }),
}));

const account = (over: Partial<CurrentUser>): CurrentUser => ({
  id: 'u1',
  name: 'Meera Joshi',
  email: 'meera@example.org',
  isActive: true,
  lastLoginAt: null,
  createdAt: '',
  updatedAt: '',
  roles: [],
  permissions: [],
  hiddenMenus: [],
  ...over,
});
const websiteAdmin = account({
  roles: [{ id: 'r-web', code: 'WEBSITE_ADMIN', name: 'Website Admin' }],
  permissions: WEBSITE_MENUS.flatMap((m) => [`${m}.view`, `${m}.update`]),
  portal: 'website',
});

/* Signs in on /login, arriving from `from` (the page that asked for the sign-in), and returns where the app went. */
async function signIn(me: CurrentUser, from?: string) {
  login.mockResolvedValue(me);
  const { container } = render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state: from ? { from } : null }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
  /* The page opens in Marathi or English (remembered choice), so the fields are found by id. */
  await userEvent.type(container.querySelector<HTMLInputElement>('#lg-user')!, me.email);
  await userEvent.type(container.querySelector<HTMLInputElement>('#lg-pass')!, 'Secret-Password-1');
  await userEvent.click(container.querySelector<HTMLButtonElement>('button[type="submit"]')!);
  return (await screen.findByTestId('location')).textContent;
}
/* Where the app navigated to after the sign-in. */
function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
}

describe('<LoginPage> landing after sign-in', () => {
  beforeEach(() => {
    login.mockReset();
    /* The legacy toast needs the full app shell. */
    vi.spyOn(AS.ui, 'toast').mockImplementation(() => undefined);
  });

  it('takes a Website Admin to the CMS, not the Dashboard', async () => {
    expect(await signIn(websiteAdmin)).toBe('/cms/home-page');
  });

  it('ignores a requested page a Website Admin cannot open', async () => {
    expect(await signIn(websiteAdmin, '/dashboard')).toBe('/cms/home-page');
  });

  it('returns a Website Admin to the CMS page that asked for the sign-in', async () => {
    expect(await signIn(websiteAdmin, '/cms/faqs/42/edit')).toBe('/cms/faqs/42/edit');
  });

  it.each([
    [undefined, '/ipp-approvals'],
    ['/certification', '/ipp-approvals'],
    ['/ipp-approvals/batches', '/ipp-approvals/batches'],
  ])('takes an IPP officer asked for by %s to %s', async (from, to) => {
    const coep = account({
      roles: [{ id: 'r-coep', code: 'COEP', name: 'COEP' }],
      permissions: ['ipp-approvals.view', 'ipp-approvals.coep'],
      portal: 'ipp',
    });
    expect(await signIn(coep, from)).toBe(to);
  });

  it('keeps the Dashboard for programme roles', async () => {
    const viewer = account({ permissions: ['dashboard.view', 'candidates.view'], portal: 'admin' });
    expect(await signIn(viewer)).toBe('/dashboard');
  });

  it('returns a programme role to the page it asked for', async () => {
    const viewer = account({ permissions: ['dashboard.view', 'candidates.view'], portal: 'admin' });
    expect(await signIn(viewer, '/candidates')).toBe('/candidates');
  });
});

describe('<LoginPage> when the sign-in gets no answer', () => {
  beforeEach(() => {
    login.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /* Signs in on /login while the API client reports that the request got no answer. */
  async function signInWithoutAnswer() {
    login.mockRejectedValue(new ApiError('Cannot reach the server. Check your internet connection and try again.', 0, 'NETWORK_ERROR'));
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.type(container.querySelector<HTMLInputElement>('#lg-user')!, 'officer@example.org');
    await userEvent.type(container.querySelector<HTMLInputElement>('#lg-pass')!, 'Secret-Password-1');
    await userEvent.click(container.querySelector<HTMLButtonElement>('button[type="submit"]')!);
    return screen.findByRole('alert');
  }

  it('says the browser blocked it when the server answers its health check (Brave Shields, an ad blocker)', async () => {
    const probe = vi.fn().mockResolvedValue({ ok: true, status: 200, type: 'cors' });
    vi.stubGlobal('fetch', probe);
    const alert = await signInWithoutAnswer();
    expect(alert).toHaveTextContent('The server is up, but this browser blocked the request. In Brave, click the Shields (lion) icon');
    expect(alert).not.toHaveTextContent(/backend is running/);
    expect(probe).toHaveBeenCalledWith('/api/v1/health', expect.objectContaining({ credentials: 'omit' }));
  });

  it('says the server answered with an error page when only an opaque answer comes back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ type: 'opaque', status: 0 }),
    );
    expect(await signInWithoutAnswer()).toHaveTextContent(
      'The server answered with an error instead of signing you in (it may be restarting).',
    );
  });

  it('says the server cannot be reached when nothing answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await signInWithoutAnswer()).toHaveTextContent('Cannot reach the server. Check your internet connection and try again.');
  });
});
