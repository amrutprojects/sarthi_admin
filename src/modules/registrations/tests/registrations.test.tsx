import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import RegistrationFormPage from '../pages/RegistrationFormPage';
import RegistrationsPage from '../pages/RegistrationsPage';
import { basicSchema, fileIssue, verhoeffValid } from '../schemas/registrationSchema';
import { registrationApi } from '../services/registrationApi';

const permissions = new Set<string>();
vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: 'me' }, permissions }) }));
vi.mock('../services/registrationApi', () => ({ registrationApi: { list: vi.fn(), get: vi.fn(), create: vi.fn() } }));
vi.mock('../../masters', () => ({
  MASTERS: [{ key: 'region' }, { key: 'caste' }, { key: 'education' }, { key: 'documentType' }],
  useMasterOptions: (m: { key: string }) => ({
    isPending: false,
    data: {
      region: [{ id: 'r-pun', code: 'PUN', name: 'Pune' }],
      caste: [{ id: 'c-1', code: 'C01', name: 'मराठी' }],
      education: [{ id: 'e-1', code: 'BCOM', name: 'B.Com' }],
      documentType: [
        { id: 'd-photo', code: 'PHOTO', name: 'Photo', isMandatory: true },
        { id: 'd-ews', code: 'INCOME_EWS', name: 'Income Certificate / EWS', isMandatory: true },
        { id: 'd-pan', code: 'PAN_CARD', name: 'PAN Card', isMandatory: false },
      ],
    }[m.key],
  }),
}));

/* A valid Aadhaar for the tests (Verhoeff check digit appended). */
const AADHAAR = (() => {
  const base = '23456789012';
  for (let d = 0; d < 10; d++) if (verhoeffValid(base + d)) return base + d;
  return '';
})();

describe('<RegistrationsPage>', () => {
  beforeEach(() => {
    permissions.clear();
    vi.mocked(registrationApi.list).mockReset();
  });

  it('lists registrations and shows the form button only with registrations.create', async () => {
    vi.mocked(registrationApi.list).mockResolvedValue({
      items: [
        {
          id: 's1',
          code: 'REG-000001',
          name: 'Asha Patil',
          centreCode: 'PUN',
          centreName: 'Pune',
          trackCode: 'T03',
          trackName: 'Web Design & Development',
          status: 'REGISTRATION_PENDING',
          mobile: '+91XXXXXX3210',
          email: 'a***@example.invalid',
          aadhaar: 'XXXX-XXXX-1234',
          createdAt: '2026-10-19T10:00:00Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const { unmount } = renderWithProviders(<RegistrationsPage />);
    expect(await screen.findByText('Asha Patil')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Registration form/ })).not.toBeInTheDocument();
    unmount();
    permissions.add('registrations.create');
    renderWithProviders(<RegistrationsPage />);
    expect(await screen.findByRole('link', { name: /Registration form/ })).toHaveAttribute('href', '/student-registrations/new');
  });
});

describe('<RegistrationFormPage>', () => {
  beforeEach(() => vi.mocked(registrationApi.create).mockReset());

  it('validates each step, requires mandatory documents and barcode, then submits data and files', async () => {
    const u = userEvent.setup();
    renderWithProviders(<RegistrationFormPage />);
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();

    await u.type(screen.getByLabelText(/First Name/), 'Asha');
    await u.type(screen.getByLabelText(/Last Name/), 'Patil');
    await u.type(screen.getByLabelText(/Father Name/), 'Ramesh Patil');
    await u.type(screen.getByLabelText(/Mother Name/), 'Sunita Patil');
    await u.type(screen.getByLabelText(/^Email/), 'asha@example.invalid');
    await u.type(screen.getByLabelText(/Date of Birth/), '2003-04-12');
    await u.type(screen.getByLabelText(/Current Address/), 'Pune');
    await u.type(screen.getByLabelText(/Aadhaar Number/), AADHAAR);
    await u.type(screen.getByLabelText(/Mobile Number/), '9876543210');
    await u.selectOptions(screen.getByLabelText(/Caste/), 'c-1');
    await u.click(screen.getByRole('button', { name: 'Next' }));

    await u.selectOptions(await screen.findByLabelText(/Course Centre/), 'r-pun');
    await u.selectOptions(screen.getByLabelText(/Technology/), 'T03');
    await u.selectOptions(screen.getByLabelText(/Education Qualification/), 'e-1');
    await u.click(screen.getByRole('button', { name: 'Next' }));

    await u.click(await screen.findByRole('button', { name: 'Submit Application' }));
    expect(await screen.findByText('Photo is required')).toBeInTheDocument();
    expect(screen.getByText('The declaration must be accepted')).toBeInTheDocument();

    const pdf = (n: string) => new File(['%PDF-1.4'], n, { type: 'application/pdf' });
    await u.upload(screen.getByLabelText('Photo file'), pdf('photo.pdf'));
    await u.upload(screen.getByLabelText('Income Certificate / EWS file'), pdf('ews.pdf'));
    await u.click(screen.getByRole('checkbox'));
    await u.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(await screen.findByText('Income Certificate / EWS barcode is required')).toBeInTheDocument();

    vi.mocked(registrationApi.create).mockResolvedValue({ id: 's1', registration_id: 'REG-000001', status: 'REGISTRATION_PENDING' });
    await u.type(screen.getByLabelText(/Income Certificate \/ EWS Barcode/), 'EWS-1');
    await u.click(screen.getByRole('button', { name: 'Submit Application' }));
    await waitFor(() => expect(registrationApi.create).toHaveBeenCalled());
    const [data, files] = vi.mocked(registrationApi.create).mock.calls[0];
    expect(data).toMatchObject({
      first_name: 'Asha',
      caste_id: 'c-1',
      region_id: 'r-pun',
      education_id: 'e-1',
      technology: 'T03',
      religion: 'हिंदू',
      declaration_accepted: true,
      barcodes: { INCOME_EWS: 'EWS-1' },
    });
    expect(Object.keys(files).sort()).toEqual(['INCOME_EWS', 'PHOTO']);
  });
});

describe('registration schema', () => {
  it('mirrors the backend rules', () => {
    const r = basicSchema.safeParse({ aadhaar_number: '234567890123', mobile_number: '5876543210', date_of_birth: '2099-01-01' });
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs).toEqual(
      expect.arrayContaining([
        'Aadhaar number must be 12 digits with a valid checksum',
        'Mobile number must be a 10-digit Indian number starting 6–9',
        'Date of birth cannot be in the future',
      ]),
    );
    expect(fileIssue(new File(['x'], 'a.exe'))).toBe('Only PDF, JPG, JPEG or PNG files are accepted');
  });
});
