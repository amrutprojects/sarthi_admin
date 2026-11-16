import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { summaryFixture } from '../../../../tests/fixtures/studentSummary';
import StudentImportPage from '../pages/StudentImportPage';
import { importApi, studentApi, type ImportReference, type StudentDetail, type StudentListItem } from '../services/importApi';

/* imports.view only: a register row opens the masked student panel (no registrations.view). */
vi.mock('../../auth', () => ({
  Can: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: { id: 'me' }, permissions: new Set(['imports.view']) }),
}));

const reference: ImportReference = {
  columns: [
    { field: 'source_record_id', label: 'Source Record ID', required: true, alternative: null, aliases: ['application id'] },
    {
      field: 'first_name',
      label: 'First Name',
      required: false,
      alternative: 'required unless Full Name is given',
      aliases: ['first name'],
    },
    { field: 'gender', label: 'Gender', required: false, alternative: null, aliases: ['gender'] },
  ],
  tracks: [],
  centres: [{ code: 'PUN', name: 'Pune' }],
  maxFileMb: 20,
  maxRows: 50000,
};

const listItem: StudentListItem = {
  id: 's1',
  code: 'STU-000001',
  sourceRecordId: 'APP-1001',
  name: 'Asha Patil',
  centreCode: 'PUN',
  centreName: 'Pune',
  trackCode: 'T07',
  trackName: 'Cyber Security',
  trackToBeConfirmed: false,
  status: 'REGISTRATION_PENDING',
  mobile: '******3210',
  email: 'a***@example.com',
  aadhaar: 'XXXX XXXX 1234',
  approvedAt: null,
  importBatchId: 'b1',
  createdAt: '2026-11-11T05:00:00.000Z',
  source: 'IMPORT',
  registrationNumber: null,
  enrolled: false,
  batch: null,
};
const detail: StudentDetail = {
  ...listItem,
  firstName: 'Asha',
  lastName: 'Patil',
  fatherName: 'Suresh',
  motherName: 'Lata',
  dateOfBirth: '2001-02-03',
  religion: 'हिंदू',
  caste: 'Maratha',
  educationQualification: 'Graduate',
  trackSourceValue: 'Cyber Security',
  externalStatus: 'PENDING',
  evidenceRef: null,
  declarationAccepted: null,
  documents: [],
  gender: 'Female',
  maritalStatus: 'Married',
  permanentAddress: 'Flat 4, Shivaji Nagar',
  districtName: 'Pune',
  talukaName: 'Haveli',
  pinCode: '411005',
  alternateEmail: 'b***@example.com',
  disabilityStatus: true,
  disabilityType: 'Low vision',
  qualificationName: 'B.Com',
  gradingType: 'PERCENTAGE',
  cgpaScale: null,
  score: '78.50',
  schemeName: 'EDP Scheme',
  sourceUpdatedAt: '2026-10-05T05:00:00.000Z',
  sourceExtra: { 'Ration Card Type': 'Yellow' },
};
const emptyPage = { items: [], meta: { page: 1, limit: 25, total: 0, totalPages: 0 } };
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/student-import" element={<StudentImportPage />} />
    </Routes>,
    { route: '/student-import' },
  );
const kvValue = (label: string) => (screen.getByText(label, { selector: '.kv > span' }).closest('.kv') as HTMLElement).querySelector('b');

beforeEach(() => {
  vi.spyOn(importApi, 'reference').mockResolvedValue(reference);
  vi.spyOn(importApi, 'list').mockResolvedValue(emptyPage);
  vi.spyOn(studentApi, 'summary').mockResolvedValue(summaryFixture());
});

describe('Student Import — Fields & rules', () => {
  it('shows when a column may be left out because another stands in for it, and the approver dashboard rules', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Fields & rules' }));
    const firstName = (await screen.findByText('first_name', { selector: 'td' })).closest('tr') as HTMLElement;
    expect(within(firstName).getByText('Required unless Full Name is given')).toBeInTheDocument();
    expect(within(firstName).queryByText('Optional')).not.toBeInTheDocument();
    expect(within(screen.getByText('gender', { selector: 'td' }).closest('tr') as HTMLElement).getByText('Optional')).toBeInTheDocument();
    expect(
      within(screen.getByText('source_record_id', { selector: 'td' }).closest('tr') as HTMLElement).getByText('Required'),
    ).toBeInTheDocument();
    expect(screen.getByText('Approver dashboard CSV')).toBeInTheDocument();
    expect(screen.getByText(/Full Name is split into first and last name, District gives the/)).toBeInTheDocument();
    expect(screen.getByText(/raises NOT_APPROVED, which a reviewer may accept/)).toBeInTheDocument();
    expect(screen.getByText(/REJECTED, CANCELLED and WITHDRAWN applications are never imported/)).toBeInTheDocument();
  });
});

describe('Student Import — Student register', () => {
  it('labels an imported student not yet approved as pending approval and shows its imported profile and source details', async () => {
    vi.spyOn(studentApi, 'list').mockResolvedValue({ items: [listItem], meta: { page: 1, limit: 25, total: 1, totalPages: 1 } });
    const get = vi.spyOn(studentApi, 'get').mockResolvedValue(detail);
    vi.spyOn(studentApi, 'documents').mockResolvedValue([]);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Student register' }));
    const tableRow = (await screen.findByText('Asha Patil')).closest('tr') as HTMLElement;
    expect(within(tableRow).getByText('Pending approval')).toBeInTheDocument();
    await userEvent.click(tableRow);
    expect(get).toHaveBeenCalledWith('s1');
    expect(await screen.findByText('First name')).toBeInTheDocument();
    expect(kvValue('Gender')).toHaveTextContent('Female');
    expect(kvValue('Marital status')).toHaveTextContent('Married');
    expect(kvValue('Disability')).toHaveTextContent('Yes');
    expect(kvValue('Disability type')).toHaveTextContent('Low vision');
    expect(kvValue('Alternate email')).toHaveTextContent('b***@example.com');
    expect(screen.getByRole('heading', { name: 'Address & location' })).toBeInTheDocument();
    expect(kvValue('Taluka')).toHaveTextContent('Haveli');
    expect(screen.getByRole('heading', { name: 'Qualification' })).toBeInTheDocument();
    expect(kvValue('Score')).toHaveTextContent('78.50%');
    expect(kvValue('Scheme')).toHaveTextContent('EDP Scheme');
    expect(kvValue('Last updated at the source')).not.toHaveTextContent('—');
    expect(screen.getByRole('heading', { name: 'Other source values' })).toBeInTheDocument();
    expect(kvValue('Ration Card Type')).toHaveTextContent('Yellow');
    expect(screen.queryByText('Landmark')).not.toBeInTheDocument();
    expect(screen.queryByText('Division')).not.toBeInTheDocument();
  });
});
