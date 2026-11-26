import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import BrandingView from '../pages/BrandingView';
import { brandingService } from '../services/brandingService';
import { configured, ensureToastRoot, languageOptions, stubObjectUrls, unset } from './fixtures';

const permissions = new Set<string>();
vi.mock('../../../../modules/auth', () => ({
  useCan: () => (action: string) => permissions.has(action),
  Can: ({ action, children }: { action: string; children: unknown }) => (permissions.has(action) ? children : null),
}));
vi.mock('../services/brandingService', () => ({
  brandingService: { get: vi.fn(), update: vi.fn(), uploadLogo: vi.fn(), removeLogo: vi.fn(), logoBlob: vi.fn(), languages: vi.fn(), entities: vi.fn() },
}));

const renderView = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/branding/:entityId" element={<BrandingView />} />
    </Routes>,
    { route: '/lms/branding/e1' },
  );

describe('<BrandingView>', () => {
  beforeEach(() => {
    ensureToastRoot();
    stubObjectUrls();
    permissions.clear();
    permissions.add('viewLmsBranding');
    vi.mocked(brandingService.get).mockReset().mockResolvedValue(configured());
    vi.mocked(brandingService.languages).mockReset().mockResolvedValue(languageOptions);
    vi.mocked(brandingService.logoBlob).mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  it('shows every setting with the value learners get, its source, and the logo read as a blob', async () => {
    renderView();
    const table = await screen.findByRole('table', { name: 'Settings' });
    const row = (label: string) => within(table).getByText(label).closest('tr') as HTMLTableRowElement;
    expect(row('Display name')).toHaveTextContent('Sarthi LMS');
    expect(row('Display name')).toHaveTextContent('Set');
    expect(row('Primary and accent colour')).toHaveTextContent('Primary #1F4E79');
    expect(row('Support email')).toHaveTextContent('help@amrut.org');
    expect(row('Support hours text')).toHaveTextContent('English (en): Mon–Sat, 10:00–18:00');
    expect(await within(table).findByText('English (en), Marathi (mr)')).toBeInTheDocument();
    expect(row('Logo')).toHaveTextContent('amk-logo.png · 512 × 128 px · 12.4 KB');

    expect(await screen.findByRole('img', { name: 'Logo of Sarthi' })).toHaveAttribute('src', 'blob:logo-preview');
    expect(brandingService.logoBlob).toHaveBeenCalledWith('e1', expect.anything());
    expect(screen.getByText('Sarthi', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.queryByText(/Required setting not set/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contrast warning/)).not.toBeInTheDocument();
  });

  it('flags the missing required setting, the defaults in use and an inactive entity', async () => {
    vi.mocked(brandingService.get).mockResolvedValue(unset({ isActive: false }));
    renderView();
    expect(await screen.findByText(/Required setting not set: Support email/)).toBeInTheDocument();
    expect(screen.getByText(/This entity is inactive/)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Settings' });
    expect(within(table).getByText('Missing · required')).toBeInTheDocument();
    expect(within(table).getByText('Default · entity name')).toBeInTheDocument();
    expect(within(table).getByText('Default · default language')).toBeInTheDocument();
    expect(screen.getByText(/the platform default logo is used/)).toBeInTheDocument();
    expect(brandingService.logoBlob).not.toHaveBeenCalled();
  });

  it('shows the contrast warning for a hard-to-read colour', async () => {
    const b = configured();
    vi.mocked(brandingService.get).mockResolvedValue({
      ...b,
      settings: b.settings.map((s) => (s.key === 'colours' ? { ...s, value: { primary: '#FFD700', accent: null }, effectiveValue: { primary: '#FFD700', accent: null } } : s)),
    });
    renderView();
    expect(await screen.findByText(/Primary colour #FFD700 has a contrast of/)).toBeInTheDocument();
  });

  it('asks the API for one group (tab) and for a setting key search', async () => {
    renderView();
    await screen.findByRole('table', { name: 'Settings' });
    const contactOnly = configured();
    vi.mocked(brandingService.get).mockResolvedValue({ ...contactOnly, settings: contactOnly.settings.filter((s) => s.group === 'contact') });
    await userEvent.click(screen.getByRole('tab', { name: 'Contact' }));
    await waitFor(() => expect(brandingService.get).toHaveBeenLastCalledWith('e1', { group: 'contact', search: undefined }));
    await waitFor(() => expect(within(screen.getByRole('table', { name: 'Settings' })).queryByText('Display name')).not.toBeInTheDocument());
    expect(within(screen.getByRole('table', { name: 'Settings' })).getByText('Support email')).toBeInTheDocument();

    vi.mocked(brandingService.get).mockResolvedValue({ ...contactOnly, settings: [] });
    await userEvent.type(screen.getByLabelText('Search setting key'), 'zzz');
    await waitFor(() => expect(brandingService.get).toHaveBeenLastCalledWith('e1', { group: 'contact', search: 'zzz' }));
    expect(await screen.findByText('No setting matches “zzz” in Contact.')).toBeInTheDocument();
  });

  it('shows Edit settings only to a user who may update branding', async () => {
    const { unmount } = renderView();
    await screen.findByRole('table', { name: 'Settings' });
    expect(screen.queryByRole('button', { name: 'Edit settings' })).not.toBeInTheDocument();
    unmount();

    permissions.add('editLmsBranding');
    renderView();
    expect(await screen.findByRole('button', { name: 'Edit settings' })).toBeInTheDocument();
  });

  it('shows an error with a working Retry', async () => {
    vi.mocked(brandingService.get).mockRejectedValueOnce(new ApiError('Entity not found', 404, 'NOT_FOUND'));
    renderView();
    expect(await screen.findByText(/Entity not found/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows a logo that cannot be read with a Retry', async () => {
    vi.mocked(brandingService.logoBlob).mockRejectedValueOnce(new ApiError('The logo file is missing', 404, 'NOT_FOUND'));
    renderView();
    expect(await screen.findByText(/The logo file is missing/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('img', { name: 'Logo of Sarthi' })).toBeInTheDocument();
  });
});
