import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import RegistrationFormPage from '../pages/RegistrationFormPage';
import { registrationApi } from '../services/registrationApi';

/* Dropdown options that arrive after the student's details (the order that left Caste empty). */
const state = { loaded: false };
const OPTIONS: Record<string, { id: string; code: string; name: string }[]> = {
  region: [{ id: 'r', code: 'KOL', name: 'Kolhapur' }],
  caste: [{ id: 'c', code: 'C11', name: 'कानबी' }],
  education: [{ id: 'e', code: 'BCOM', name: 'B.Com' }],
  documentType: [],
};
vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: 'me' }, permissions: new Set() }) }));
vi.mock('../services/registrationApi', () => ({ registrationApi: { get: vi.fn(), update: vi.fn(), replaceDocuments: vi.fn() } }));
vi.mock('../../masters', () => ({
  MASTERS: [{ key: 'region' }, { key: 'caste' }, { key: 'education' }, { key: 'documentType' }],
  useMasterOptions: (m: { key: string }) =>
    state.loaded ? { isPending: false, data: OPTIONS[m.key] } : { isPending: true, data: undefined },
}));

describe('edit form prefill', () => {
  it('fills the dropdowns even when their options load after the student, and Next moves on', async () => {
    vi.mocked(registrationApi.get).mockResolvedValue({
      id: 's1',
      name: 'Priya Jadhav',
      firstName: 'Priya',
      lastName: 'Jadhav',
      fatherName: 'Ramesh Jadhav',
      motherName: 'Kavita Jadhav',
      dateOfBirth: '2001-08-30',
      religion: 'हिंदू',
      casteId: 'c',
      regionId: 'r',
      educationId: 'e',
      trackCode: 'T10',
      documents: [],
      files: [],
      unmasked: {
        email: 'priya.jadhav@example.invalid',
        mobile: '+919812345604',
        aadhaar: '7567 8901 2349',
        currentAddress: 'Rajarampuri, Kolhapur',
      },
    } as never);
    const view = renderWithProviders(
      <Routes>
        <Route path="/x/:id/edit" element={<RegistrationFormPage />} />
      </Routes>,
      { route: '/x/s1/edit' },
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    state.loaded = true;
    view.rerender(
      <Routes>
        <Route path="/x/:id/edit" element={<RegistrationFormPage />} />
      </Routes>,
    );
    expect(await screen.findByDisplayValue('Priya')).toBeInTheDocument();
    expect(screen.getByLabelText(/Caste/)).toHaveTextContent('कानबी');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByLabelText(/Course District/)).toHaveTextContent('Kolhapur');
    expect(screen.getByLabelText(/Technology/)).toHaveTextContent('Social Media Marketing / Digital Marketing');
    expect(screen.getByLabelText(/Education Qualification/)).toHaveTextContent('B.Com');
  });
});
