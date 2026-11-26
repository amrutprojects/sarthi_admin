import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../../tests/test-utils';
import { ApiError } from '../../../../services/api-client';
import BrandingEdit from '../pages/BrandingEdit';
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

const renderEdit = () =>
  renderWithProviders(
    <Routes>
      <Route path="/lms/branding/:entityId/edit" element={<BrandingEdit />} />
      <Route path="/lms/branding/:entityId" element={<div>view page</div>} />
    </Routes>,
    { route: '/lms/branding/e1/edit' },
  );

/* Save, then accept the "Save changes" confirmation. */
const saveAndConfirm = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Yes, save' }));
};

describe('Branding & Settings edit form', () => {
  beforeEach(() => {
    ensureToastRoot();
    stubObjectUrls();
    permissions.clear();
    permissions.add('viewLmsBranding');
    permissions.add('editLmsBranding');
    permissions.add('updateLmsBranding');
    permissions.add('updateLmsBrandingSettings');
    vi.mocked(brandingService.get).mockReset().mockResolvedValue(unset());
    vi.mocked(brandingService.languages).mockReset().mockResolvedValue(languageOptions);
    vi.mocked(brandingService.update).mockReset();
    vi.mocked(brandingService.uploadLogo).mockReset();
    vi.mocked(brandingService.removeLogo).mockReset();
    vi.mocked(brandingService.logoBlob).mockReset().mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  it('builds the fields from the catalogue and keeps the default language locked on', async () => {
    renderEdit();
    expect(await screen.findByLabelText('Display name')).toHaveAttribute('placeholder', 'Sarthi');
    expect(screen.getByRole('heading', { name: 'Branding' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Support email/)).toBeInTheDocument();
    expect(screen.getByLabelText('Support hours text — Marathi (mr)')).toBeInTheDocument();
    expect(screen.getByText(/Not set yet: learners see no support contact/)).toBeInTheDocument();
    const marathi = screen.getByLabelText(/^Marathi \(mr\)/);
    expect(marathi).toBeChecked();
    expect(marathi).toBeDisabled();
    expect(screen.getByLabelText('English (en)')).not.toBeChecked();
    expect(screen.getByText(/To Be Confirmed \(OQ-023\)/)).toBeInTheDocument();
  });

  it('shows the field messages and sends nothing while invalid', async () => {
    renderEdit();
    await userEvent.type(await screen.findByLabelText('Display name'), 'ab');
    await userEvent.tab();
    expect(await screen.findByText('Enter a display name of at least 3 characters.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Support phone'), '98765');
    await userEvent.type(screen.getByLabelText('Primary colour'), '12');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter a valid phone number.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid colour.')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary colour')).toHaveAttribute('aria-invalid', 'true');
    expect(brandingService.update).not.toHaveBeenCalled();
  });

  it('saves only the changed settings, normalised, then opens the view page', async () => {
    vi.mocked(brandingService.update).mockResolvedValue(configured());
    renderEdit();
    await userEvent.type(await screen.findByLabelText('Display name'), '  Amrut   Portal ');
    await userEvent.type(screen.getByLabelText(/^Support email/), 'Help@Amrut.org');
    await userEvent.type(screen.getByLabelText('Primary colour'), '1f4e79');
    await userEvent.click(screen.getByLabelText('English (en)'));
    await saveAndConfirm();
    await waitFor(() =>
      expect(brandingService.update).toHaveBeenCalledWith('e1', {
        display_name: 'Amrut Portal',
        colours: { primary: '#1F4E79', accent: null },
        support_email: 'help@amrut.org',
        languages: ['en', 'mr'],
      }),
    );
    expect(await screen.findByText('view page')).toBeInTheDocument();
  });

  it('shows the server field answers (400 default language, 422 colour) next to the controls', async () => {
    vi.mocked(brandingService.update).mockRejectedValueOnce(
      new ApiError('Keep at least the default language.', 400, 'BAD_REQUEST', [
        { field: 'languages', message: "Marathi is the entity's default language and cannot be removed." },
      ]),
    );
    renderEdit();
    await userEvent.click(await screen.findByLabelText('English (en)'));
    await saveAndConfirm();
    expect(await screen.findByText("Marathi is the entity's default language and cannot be removed.")).toBeInTheDocument();

    vi.mocked(brandingService.update).mockRejectedValueOnce(
      new ApiError('Validation failed', 422, 'VALIDATION_ERROR', [{ field: 'body.colours.primary', message: 'Enter a valid colour.' }]),
    );
    await userEvent.type(screen.getByLabelText('Primary colour'), 'abcdef');
    await saveAndConfirm();
    expect(await screen.findByText('Enter a valid colour.')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary colour')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('view page')).not.toBeInTheDocument();
  });

  it('shows a 409 field answer next to its control and toasts one that names no field', async () => {
    vi.mocked(brandingService.update).mockRejectedValueOnce(
      new ApiError('Conflict', 409, 'CONFLICT', [{ field: 'body.support_email', message: 'This mailbox is already in use.' }]),
    );
    renderEdit();
    await userEvent.type(await screen.findByLabelText(/^Support email/), 'help@amrut.org');
    await saveAndConfirm();
    expect(await screen.findByText('This mailbox is already in use.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Support email/)).toHaveAttribute('aria-invalid', 'true');

    vi.mocked(brandingService.update).mockRejectedValueOnce(new ApiError('The entity is being changed by another request', 409, 'CONFLICT'));
    await saveAndConfirm();
    expect(await screen.findByText(/The entity is being changed by another request/)).toBeInTheDocument();
    expect(screen.queryByText('view page')).not.toBeInTheDocument();
  });

  it('keeps the default language when other languages are ticked and unticked', async () => {
    vi.mocked(brandingService.update).mockResolvedValue(configured());
    vi.mocked(brandingService.get).mockResolvedValue(configured());
    renderEdit();
    const english = await screen.findByLabelText('English (en)');
    expect(english).toBeChecked();
    await userEvent.click(english);
    expect(english).not.toBeChecked();
    expect(screen.getByLabelText(/^Marathi \(mr\)/)).toBeChecked();
    await saveAndConfirm();
    await waitFor(() => expect(brandingService.update).toHaveBeenCalledWith('e1', { languages: ['mr'] }));
  });

  it('warns about low colour contrast without blocking the save', async () => {
    vi.mocked(brandingService.update).mockResolvedValue(configured());
    renderEdit();
    await userEvent.type(await screen.findByLabelText('Primary colour'), 'FFD700');
    expect(screen.getByText(/Primary colour #FFD700 has a contrast of 1\.\d\d:1 against white/)).toBeInTheDocument();
    await saveAndConfirm();
    await waitFor(() => expect(brandingService.update).toHaveBeenCalledWith('e1', { colours: { primary: '#FFD700', accent: null } }));
  });

  it('refuses a non-PNG logo in the browser and uploads a PNG in the "file" field', async () => {
    const user = userEvent.setup({ applyAccept: false });
    vi.mocked(brandingService.uploadLogo).mockResolvedValue(configured());
    renderEdit();
    const input = await screen.findByLabelText('Logo');
    expect(screen.getByText(/the platform default logo is used/)).toBeInTheDocument();

    await user.upload(input, new File(['jpg'], 'logo.jpg', { type: 'image/jpeg' }));
    expect(screen.getByText('Upload a PNG image within the size limit (at most 5 MB).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload logo' })).toBeDisabled();

    const png = new File(['png'], 'logo.png', { type: 'image/png' });
    await user.upload(input, png);
    await user.click(screen.getByRole('button', { name: 'Upload logo' }));
    await waitFor(() => expect(brandingService.uploadLogo).toHaveBeenCalledWith('e1', png));
    /* The new logo is read through the authenticated endpoint and shown from a blob URL. */
    expect(await screen.findByRole('img', { name: 'Logo of Sarthi' })).toHaveAttribute('src', 'blob:logo-preview');
    expect(brandingService.logoBlob).toHaveBeenCalledWith('e1', expect.anything());
  });

  it('shows a server answer about the logo file next to the file input', async () => {
    vi.mocked(brandingService.uploadLogo).mockRejectedValue(
      new ApiError('Upload a PNG image within the size limit (at most 5 MB).', 400, 'BAD_REQUEST', [
        { field: 'file', message: 'Upload a PNG image within the size limit (at most 5 MB).' },
      ]),
    );
    renderEdit();
    await userEvent.upload(await screen.findByLabelText('Logo'), new File(['fake'], 'fake.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: 'Upload logo' }));
    expect(await screen.findByText('Upload a PNG image within the size limit (at most 5 MB).')).toBeInTheDocument();
    expect(screen.getByLabelText('Logo')).toHaveAttribute('aria-invalid', 'true');
  });

  /*
   * Configured dimension limits: jsdom decodes no images, so Image is a stand-in that "loads" each picked file
   * (object URL blob:<file name>) with the pixel size listed here.
   */
  describe('logo dimension limits', () => {
    const sizes: Record<string, [number, number]> = { 'blob:big.png': [201, 50], 'blob:exact.png': [200, 100] };
    let imagesLoaded = 0;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      set src(url: string) {
        imagesLoaded += 1;
        queueMicrotask(() => {
          const size = sizes[url];
          if (!size) return this.onerror?.();
          [this.naturalWidth, this.naturalHeight] = size;
          this.onload?.();
        });
      }
    }
    const limited = () => ({ ...unset(), logoRules: { maxWidthPx: 200, maxHeightPx: 100, maxFileMb: 5, types: ['image/png'] } });

    beforeEach(() => {
      imagesLoaded = 0;
      vi.stubGlobal('Image', FakeImage);
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: (b: Blob) => (b instanceof File ? `blob:${b.name}` : 'blob:logo-preview'),
      });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('shows the configured limits in the hint', async () => {
      vi.mocked(brandingService.get).mockResolvedValue(limited());
      renderEdit();
      await screen.findByLabelText('Logo');
      expect(screen.getByText(/Accepted: PNG, at most 5 MB, at most 200 × 100 pixels\./)).toBeInTheDocument();
    });

    it('refuses a larger logo in the browser with the server message and uploads one at the limit', async () => {
      vi.mocked(brandingService.get).mockResolvedValue(limited());
      vi.mocked(brandingService.uploadLogo).mockResolvedValue(configured());
      renderEdit();
      const input = await screen.findByLabelText('Logo');

      await userEvent.upload(input, new File(['png'], 'big.png', { type: 'image/png' }));
      expect(await screen.findByText('Upload a PNG image of at most 200 × 100 pixels; this one is 201 × 50 pixels.')).toBeInTheDocument();
      expect(screen.getByLabelText('Logo')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('button', { name: 'Upload logo' })).toBeDisabled();

      const exact = new File(['png'], 'exact.png', { type: 'image/png' });
      await userEvent.upload(input, exact);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Upload logo' })).toBeEnabled());
      expect(screen.queryByText(/this one is/)).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Upload logo' }));
      await waitFor(() => expect(brandingService.uploadLogo).toHaveBeenCalledWith('e1', exact));
      expect(brandingService.uploadLogo).toHaveBeenCalledTimes(1);
    });

    it('reads no image size while no dimension limit is configured', async () => {
      vi.mocked(brandingService.uploadLogo).mockResolvedValue(configured());
      renderEdit();
      const input = await screen.findByLabelText('Logo');
      expect(screen.getByText(/Accepted: PNG, at most 5 MB, any dimensions\./)).toBeInTheDocument();
      const big = new File(['png'], 'big.png', { type: 'image/png' });
      await userEvent.upload(input, big);
      await userEvent.click(screen.getByRole('button', { name: 'Upload logo' }));
      await waitFor(() => expect(brandingService.uploadLogo).toHaveBeenCalledWith('e1', big));
      expect(imagesLoaded).toBe(0);
    });
  });

  it('asks for confirmation before removing the logo', async () => {
    vi.mocked(brandingService.get).mockResolvedValue(configured());
    vi.mocked(brandingService.removeLogo).mockResolvedValue(unset());
    renderEdit();
    expect(await screen.findByRole('img', { name: 'Logo of Sarthi' })).toHaveAttribute('src', 'blob:logo-preview');
    await userEvent.click(screen.getByRole('button', { name: 'Remove logo' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Remove the logo of Sarthi\?/)).toBeInTheDocument();
    expect(brandingService.removeLogo).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove logo' }));
    await waitFor(() => expect(brandingService.removeLogo).toHaveBeenCalledWith('e1'));
    expect(await screen.findByText(/the platform default logo is used/)).toBeInTheDocument();
  });

  it('asks before leaving with unsaved changes', async () => {
    renderEdit();
    await userEvent.type(await screen.findByLabelText('Display name'), 'Amrut Portal');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('This form has unsaved changes. Leaving now discards them.')).toBeInTheDocument();
  });

  it('lets a user with only the settings right change contact and settings, with branding read-only (L-04)', async () => {
    permissions.delete('updateLmsBranding');
    vi.mocked(brandingService.update).mockResolvedValue(configured());
    renderEdit();
    await userEvent.type(await screen.findByLabelText(/^Support email/), 'desk@amrut.org');
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Branding · read only for your role/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
    await saveAndConfirm();
    await waitFor(() => expect(brandingService.update).toHaveBeenCalledWith('e1', { support_email: 'desk@amrut.org' }));
  });

  it('keeps contact and settings read-only for a user with only the branding right (L-04)', async () => {
    permissions.delete('updateLmsBrandingSettings');
    renderEdit();
    expect(await screen.findByLabelText('Display name')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Support email/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Marathi \(mr\)/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Contact · read only for your role/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Settings · read only for your role/ })).toBeInTheDocument();
  });

  it('shows no form to a user who may only view branding', async () => {
    permissions.delete('editLmsBranding');
    permissions.delete('updateLmsBranding');
    permissions.delete('updateLmsBrandingSettings');
    renderEdit();
    expect(await screen.findByText('You can view these settings but not change them')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
  });

  it('shows a load error with a working Retry', async () => {
    vi.mocked(brandingService.get).mockRejectedValueOnce(new ApiError('Entity not found', 404, 'NOT_FOUND'));
    renderEdit();
    expect(await screen.findByText(/Entity not found/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('Display name')).toBeInTheDocument();
  });
});
