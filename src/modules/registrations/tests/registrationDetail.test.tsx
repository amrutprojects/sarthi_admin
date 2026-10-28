import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import RegistrationDetailPage from '../pages/RegistrationDetailPage';
import { registrationApi, type RegistrationDetail } from '../services/registrationApi';

const permissions = new Set<string>(['registrations.view', 'registrations.update']);
vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: 'me' }, permissions }) }));
vi.mock('../services/registrationApi', () => ({
  registrationApi: { get: vi.fn(), fileBlob: vi.fn(), verifyDocument: vi.fn() },
}));

const file = (id: string, docType: string, verifiedAt: string | null = null) => ({
  id,
  docType,
  originalName: `${docType.toLowerCase()}.png`,
  mimeType: 'image/png',
  sizeBytes: 2048,
  uploadedAt: '2026-10-20T10:00:00Z',
  verifiedAt,
  verifiedBy: verifiedAt ? 'Reviewer' : null,
});

const detail: RegistrationDetail = {
  id: 'r1',
  code: 'REG-000001',
  name: 'Asha Patil',
  centreCode: 'PUN',
  centreName: 'Pune',
  trackCode: 'T03',
  trackName: 'Web Design & Development',
  status: 'REGISTRATION_PENDING',
  mobile: '+91XXXXXX3210',
  email: 'a***@example.invalid',
  aadhaar: 'XXXX-XXXX-2341',
  createdAt: '2026-10-20T10:00:00Z',
  source: 'PUBLIC_REGISTRATION',
  isActive: true,
  registrationNumber: '1021123045127456',
  regionId: 'r-pun',
  casteId: 'c-1',
  educationId: 'e-1',
  firstName: 'Asha',
  lastName: 'Patil',
  fatherName: 'Ramesh',
  motherName: 'Sunita',
  dateOfBirth: '2003-04-12',
  religion: 'हिंदू',
  caste: 'मराठी',
  educationQualification: 'B.Com',
  trackSourceValue: 'T03',
  declarationAccepted: true,
  documents: [
    { key: 'PHOTO', label: 'Photo', required: true, supplied: true, barcode: null },
    { key: 'AADHAAR_CARD', label: 'Aadhaar Card', required: true, supplied: true, barcode: null },
    { key: 'PAN_CARD', label: 'PAN Card', required: false, supplied: false, barcode: null },
  ],
  files: [file('f-photo', 'PHOTO'), file('f-aadhaar', 'AADHAAR_CARD', '2026-10-20T11:00:00Z')],
};

const render = () =>
  renderWithProviders(
    <Routes>
      <Route path="/student-registrations/:id" element={<RegistrationDetailPage />} />
    </Routes>,
    { route: '/student-registrations/r1' },
  );

describe('<RegistrationDetailPage>', () => {
  beforeEach(() => {
    vi.mocked(registrationApi.get).mockResolvedValue(detail);
    vi.mocked(registrationApi.fileBlob).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    vi.mocked(registrationApi.verifyDocument).mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
  });

  it('enables Verify only after Preview, then verifies that document', async () => {
    const u = userEvent.setup();
    render();
    const verify = await screen.findByRole('button', { name: 'Verify' });
    expect(verify).toBeDisabled();
    expect(screen.getByText('1 of 2 uploaded verified')).toBeInTheDocument();

    await u.click(screen.getAllByRole('button', { name: 'Preview' })[0]);
    expect(await screen.findByAltText('photo.png')).toBeInTheDocument();
    vi.mocked(registrationApi.verifyDocument).mockResolvedValue(file('f-photo', 'PHOTO', '2026-10-20T12:00:00Z'));
    await u.click(screen.getByRole('button', { name: 'Verify document' }));
    expect(registrationApi.verifyDocument).not.toHaveBeenCalled();
    expect(await screen.findByText(/You confirm that you checked it/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Yes, verify' }));
    await waitFor(() => expect(registrationApi.verifyDocument).toHaveBeenCalledWith('r1', 'f-photo'));
  });

  it('goes back to the Student Registration list with Back', async () => {
    const u = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/student-registrations" element={<div>registration list</div>} />
        <Route path="/student-registrations/:id" element={<RegistrationDetailPage />} />
      </Routes>,
      { route: '/student-registrations/r1' },
    );
    await u.click(await screen.findByRole('button', { name: 'Back' }));
    expect(await screen.findByText('registration list')).toBeInTheDocument();
  });

  it('shows full email, mobile and Aadhaar when the API returns them', async () => {
    vi.mocked(registrationApi.get).mockResolvedValue({
      ...detail,
      unmasked: { email: 'asha@example.invalid', mobile: '+919876543210', aadhaar: '2345 6789 0124' },
    });
    render();
    expect(await screen.findByText('2345 6789 0124')).toBeInTheDocument();
    expect(screen.getByText('asha@example.invalid')).toBeInTheDocument();
    expect(screen.getByText('+919876543210')).toBeInTheDocument();
    expect(screen.queryByText('XXXX-XXXX-2341')).not.toBeInTheDocument();
  });

  it('steps through uploaded documents with Previous / Next', async () => {
    const u = userEvent.setup();
    render();
    await u.click((await screen.findAllByRole('button', { name: 'Preview' }))[0]);
    expect(await screen.findByText('Photo — 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous document' })).toBeDisabled();
    await u.click(screen.getByRole('button', { name: 'Next document' }));
    expect(await screen.findByText('Aadhaar Card — 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next document' })).toBeDisabled();
    await u.keyboard('{ArrowLeft}');
    expect(await screen.findByText('Photo — 1 of 2')).toBeInTheDocument();
  });

  it('verifies the Aadhaar card from the hover card', async () => {
    const u = userEvent.setup();
    vi.mocked(registrationApi.get).mockResolvedValue({
      ...detail,
      files: [file('f-photo', 'PHOTO'), file('f-aadhaar', 'AADHAAR_CARD')],
    });
    vi.mocked(registrationApi.verifyDocument).mockResolvedValue(file('f-aadhaar', 'AADHAAR_CARD', '2026-10-21T10:00:00Z'));
    render();
    await u.hover(await screen.findByText('XXXX-XXXX-2341'));
    const card = await screen.findByRole('dialog', { name: 'Aadhaar card' });
    await screen.findByAltText('aadhaar_card.png');
    await u.hover(card);
    await u.click(within(card).getByRole('button', { name: 'Verify' }));
    await u.click(await screen.findByRole('button', { name: 'Yes, verify' }));
    await waitFor(() => expect(registrationApi.verifyDocument).toHaveBeenCalledWith('r1', 'f-aadhaar'));
  });

  it('shows the Aadhaar card when hovering the Aadhaar number', async () => {
    const u = userEvent.setup();
    render();
    await u.hover(await screen.findByText('XXXX-XXXX-2341'));
    expect(await screen.findByAltText('aadhaar_card.png')).toBeInTheDocument();
    expect(registrationApi.fileBlob).toHaveBeenCalledWith('r1', 'f-aadhaar');
  });

  it('shows the EDP profile card, and hides it when every profile value is null', async () => {
    const empty = {
      gender: null, maritalStatus: null, permanentAddress: null, landmark: null, districtName: null, talukaName: null,
      pinCode: null, alternateMobile: null, alternateEmail: null, disabilityStatus: null, disabilityType: null,
      disabilityCertificateNumber: null, centreName: null, centreCode: null,
      qualificationName: null, qualificationStream: null, qualificationBoard: null,
      qualificationCompletedOn: null, gradingType: null, cgpaScale: null, score: null, qualificationClass: null,
    };
    vi.mocked(registrationApi.get).mockResolvedValue({ ...detail, profile: empty });
    const first = render();
    expect(await screen.findByText('Basic details')).toBeInTheDocument();
    expect(screen.queryByText('Additional details (EDP)')).not.toBeInTheDocument();
    first.unmount();

    vi.mocked(registrationApi.get).mockResolvedValue({
      ...detail,
      profile: {
        ...empty, gender: 'Female', disabilityStatus: false, centreName: 'Pune Centre', centreCode: 'PUN-01',
        gradingType: 'CGPA', cgpaScale: 10, score: 8.5,
      },
    });
    render();
    expect(await screen.findByText('Additional details (EDP)')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Pune Centre (PUN-01)')).toBeInTheDocument();
    expect(screen.getByText('8.5 / 10')).toBeInTheDocument();
    expect(screen.getByText('Disability').nextSibling?.textContent).toBe('No');
    /* Null values are left out rather than shown as dashes. */
    expect(screen.queryByText('Landmark')).not.toBeInTheDocument();
  });

  it('shows the full EDP values from unmasked instead of the masked profile copies', async () => {
    vi.mocked(registrationApi.get).mockResolvedValue({
      ...detail,
      profile: {
        gender: 'Male', maritalStatus: null, permanentAddress: 'On file', landmark: null, districtName: null, talukaName: null,
        pinCode: null, alternateMobile: '+91XXXXXX1111', alternateEmail: 'b***@example.invalid', disabilityStatus: true,
        disabilityType: 'Low vision', disabilityCertificateNumber: '••••7788', centreName: null,
        centreCode: null, qualificationName: null, qualificationStream: null,
        qualificationBoard: null, qualificationCompletedOn: null, gradingType: 'PERCENTAGE', cgpaScale: null, score: 72.5,
        qualificationClass: null,
      },
      unmasked: {
        email: null, mobile: null, permanentAddress: '12 MG Road, Pune', alternateMobile: '+919811111111',
        alternateEmail: 'b@example.invalid', disabilityCertificateNumber: 'DC-11447788',
      },
    });
    render();
    expect(await screen.findByText('12 MG Road, Pune')).toBeInTheDocument();
    expect(screen.getByText('+919811111111')).toBeInTheDocument();
    expect(screen.getByText('b@example.invalid')).toBeInTheDocument();
    expect(screen.getByText('DC-11447788')).toBeInTheDocument();
    expect(screen.getByText('72.5%')).toBeInTheDocument();
    expect(screen.queryByText('On file')).not.toBeInTheDocument();
    expect(screen.queryByText('••••7788')).not.toBeInTheDocument();
  });
});
