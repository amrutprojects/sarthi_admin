import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import ImportBatchPage from '../pages/ImportBatchPage';
import { importApi, type ImportBatch, type ImportRowView } from '../services/importApi';

let allowed = true;
vi.mock('../../auth', () => ({
  useAuth: () => ({ user: { id: 'me' }, permissions: new Set<string>() }),
  useCan: () => () => allowed,
}));

const batch = (over: Partial<ImportBatch> = {}): ImportBatch => ({
  id: 'b1',
  code: 'IMP-2026-0007',
  status: 'VALIDATED_WITH_EXCEPTIONS',
  sourceChannel: 'FILE',
  fileName: 'approver-dashboard.csv',
  fileSize: 2048,
  sourceReference: null,
  counts: { total: 3, valid: 1, exceptions: 2, duplicates: 0, skipped: 0, rejected: 0, reconciled: 0 },
  columnMapping: {},
  ignoredColumns: ['PAN Number (identity number: not stored)', 'Caste Certificate No (kept as an other source value)'],
  failureReason: null,
  documentsReport: null,
  createdById: 'someone-else',
  finalisedById: null,
  finalisedAt: null,
  createdAt: '2026-11-10T05:00:00.000Z',
  ...over,
});

const row = (over: Partial<ImportRowView> = {}): ImportRowView => ({
  id: 'r1',
  rowNumber: 2,
  status: 'DATA_EXCEPTION',
  sourceRecordId: 'APP-1001',
  name: 'Asha Patil',
  fatherName: 'Suresh',
  motherName: 'Lata',
  email: 'a***@example.com',
  mobile: '******3210',
  aadhaar: 'XXXX XXXX 1234',
  dateOfBirth: '2001-02-03',
  religion: 'हिंदू',
  caste: 'Maratha',
  centreCode: 'PUN',
  trackCode: 'T07',
  trackSourceValue: 'Cyber Security',
  educationQualification: 'Graduate',
  approvalStatus: 'PENDING',
  approvedAt: null,
  evidenceRef: null,
  gender: 'Female',
  maritalStatus: 'Unmarried',
  permanentAddress: 'Flat 4, Shivaji Nagar',
  landmark: null,
  districtName: 'Pune',
  districtId: 'd-1',
  talukaName: 'Haveli',
  division: 'Pune Division',
  pinCode: '411005',
  alternateMobile: '******1111',
  alternateEmail: null,
  disabilityStatus: false,
  disabilityType: null,
  disabilityCertificateNumber: null,
  qualificationName: 'B.Sc',
  qualificationStream: 'Computer Science',
  qualificationBoard: 'SPPU',
  qualificationCompletedOn: '2023-06-01',
  gradingType: 'CGPA',
  cgpaScale: 10,
  score: '8.00',
  qualificationClass: 'First Class',
  schemeName: 'EDP Scheme',
  sourceSubmittedAt: '2026-09-01T05:00:00.000Z',
  sourceUpdatedAt: null,
  sourceRemarks: 'Documents checked',
  sourceExtra: { 'Caste Certificate No': 'CC-77' },
  centreFromDistrict: true,
  nameFrom: 'full_name',
  issues: [{ field: 'approval_status', code: 'NOT_APPROVED', message: 'Status at the source is PENDING, not APPROVED', status: 'OPEN' }],
  match: null,
  decision: null,
  decisionReason: null,
  rejectReason: null,
  studentId: null,
  ...over,
});

const page = (items: ImportRowView[]) => ({ items, meta: { page: 1, limit: 50, total: items.length, totalPages: 1 } });
const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/student-import/:id" element={<ImportBatchPage />} />
    </Routes>,
    { route: '/student-import/b1' },
  );
const toasts = () => document.getElementById('toast-root')!;
const kvValue = (label: string) => (screen.getByText(label, { selector: '.kv > span' }).closest('.kv') as HTMLElement).querySelector('b');

beforeEach(() => {
  allowed = true;
  if (!document.getElementById('toast-root')) document.body.insertAdjacentHTML('beforeend', '<div id="toast-root"></div>');
  toasts().innerHTML = '';
  vi.spyOn(importApi, 'rows').mockResolvedValue(page([row()]));
  vi.spyOn(importApi, 'rowDocuments').mockResolvedValue([]);
});

describe('Import batch — accept waivable issues', () => {
  it('accepts the chosen issue type on every exception row with one reason, then reloads the batch', async () => {
    const get = vi.spyOn(importApi, 'get').mockResolvedValue(batch());
    const acceptAll = vi.spyOn(importApi, 'acceptAll').mockResolvedValue({
      data: { batch: batch({ status: 'READY_TO_FINALISE' }), accepted: 2, skipped: 0 },
      message: 'Issues accepted on 2 rows',
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Accept waivable issues' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Aadhaar, identity or approval-evidence issue are skipped/)).toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText('Issue type'), 'NOT_APPROVED');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Source confirmed these are under review');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Accept issues' }));
    await waitFor(() => expect(acceptAll).toHaveBeenCalledWith('b1', 'Source confirmed these are under review', 'NOT_APPROVED'));
    await waitFor(() => expect(toasts()).toHaveTextContent('Issues accepted on 2 rows'));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('accepts every waivable issue when no issue type is chosen', async () => {
    vi.spyOn(importApi, 'get').mockResolvedValue(batch());
    const acceptAll = vi.spyOn(importApi, 'acceptAll').mockResolvedValue({
      data: { batch: batch(), accepted: 1, skipped: 1 },
      message: 'Issues accepted on 1 rows; 1 rows have issues that cannot be waived',
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Accept waivable issues' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Issue type')).toHaveValue('');
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Bulk review');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Accept issues' }));
    await waitFor(() => expect(acceptAll).toHaveBeenCalledWith('b1', 'Bulk review', undefined));
  });

  it('is not offered without exceptions, without the permission, or once the batch is finalised', async () => {
    vi.spyOn(importApi, 'get').mockResolvedValue(batch({ counts: { ...batch().counts, exceptions: 0 } }));
    const { unmount } = renderPage();
    expect(await screen.findByRole('heading', { name: /IMP-2026-0007/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept waivable issues' })).not.toBeInTheDocument();
    unmount();

    allowed = false;
    vi.spyOn(importApi, 'get').mockResolvedValue(batch());
    const second = renderPage();
    expect(await screen.findByRole('heading', { name: /IMP-2026-0007/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept waivable issues' })).not.toBeInTheDocument();
    second.unmount();

    allowed = true;
    vi.spyOn(importApi, 'get').mockResolvedValue(batch({ status: 'FINALISED', finalisedAt: '2026-11-11T05:00:00.000Z' }));
    renderPage();
    expect(await screen.findByRole('heading', { name: /IMP-2026-0007/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept waivable issues' })).not.toBeInTheDocument();
  });
});

describe('Import batch — callouts', () => {
  it('says how many created students are pending approval once finalised', async () => {
    vi.spyOn(importApi, 'get').mockResolvedValue(
      batch({
        status: 'FINALISED',
        finalisedAt: '2026-11-11T05:00:00.000Z',
        counts: { ...batch().counts, exceptions: 0, reconciled: 3, created: 3, linked: 0, pendingApproval: 1 },
      }),
    );
    renderPage();
    expect(await screen.findByText(/3 students created \(1 of them pending approval\) and 0 linked/)).toBeInTheDocument();
  });

  it('leaves the pending note out when no student is pending approval', async () => {
    vi.spyOn(importApi, 'get').mockResolvedValue(
      batch({ status: 'FINALISED', finalisedAt: '2026-11-11T05:00:00.000Z', counts: { ...batch().counts, created: 3, linked: 0 } }),
    );
    renderPage();
    expect(await screen.findByText(/3 students created and 0 linked/)).toBeInTheDocument();
    expect(screen.queryByText(/pending approval/)).not.toBeInTheDocument();
  });

  it('lists the other columns with what happened to each', async () => {
    vi.spyOn(importApi, 'get').mockResolvedValue(batch());
    renderPage();
    expect(await screen.findByText('Other columns:')).toBeInTheDocument();
    expect(
      screen.getByText(/PAN Number \(identity number: not stored\), Caste Certificate No \(kept as an other source value\)/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Columns ignored/)).not.toBeInTheDocument();
  });
});

describe('Import batch — row values received', () => {
  it('shows the profile, address, qualification and source values, the name split and the centre from the district', async () => {
    vi.spyOn(importApi, 'get').mockResolvedValue(batch());
    renderPage();
    await userEvent.click(await screen.findByText('Asha Patil'));
    expect(await screen.findByText('(split from Full Name)')).toBeInTheDocument();
    expect(kvValue('Course centre')).toHaveTextContent('PUN (from district)');
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(kvValue('Gender')).toHaveTextContent('Female');
    expect(kvValue('Disability')).toHaveTextContent('No');
    expect(kvValue('Alternate mobile')).toHaveTextContent('******1111');
    expect(screen.getByRole('heading', { name: 'Address & location' })).toBeInTheDocument();
    expect(kvValue('Taluka')).toHaveTextContent('Haveli');
    expect(kvValue('Division')).toHaveTextContent('Pune Division');
    expect(kvValue('PIN code')).toHaveTextContent('411005');
    expect(screen.getByRole('heading', { name: 'Qualification' })).toBeInTheDocument();
    expect(kvValue('Score')).toHaveTextContent('8.00 / 10 CGPA');
    expect(kvValue('Completed on')).toHaveTextContent('2023-06-01');
    expect(screen.getByRole('heading', { name: 'Source record' })).toBeInTheDocument();
    expect(kvValue('Scheme')).toHaveTextContent('EDP Scheme');
    expect(kvValue('Source remarks')).toHaveTextContent('Documents checked');
    expect(screen.getByRole('heading', { name: /Other source values/ })).toBeInTheDocument();
    expect(kvValue('Caste Certificate No')).toHaveTextContent('CC-77');
    /* Values the row does not have are left out. */
    expect(screen.queryByText('Landmark')).not.toBeInTheDocument();
    expect(screen.queryByText('Alternate email')).not.toBeInTheDocument();
    expect(screen.queryByText('Last updated at the source')).not.toBeInTheDocument();
  });

  it('shows only the original values for a row validated before the profile fields existed', async () => {
    vi.spyOn(importApi, 'get').mockResolvedValue(batch());
    const old = row();
    for (const k of [
      'gender',
      'maritalStatus',
      'permanentAddress',
      'districtName',
      'districtId',
      'talukaName',
      'division',
      'pinCode',
      'alternateMobile',
      'disabilityStatus',
      'qualificationName',
      'qualificationStream',
      'qualificationBoard',
      'qualificationCompletedOn',
      'gradingType',
      'cgpaScale',
      'score',
      'qualificationClass',
      'schemeName',
      'sourceSubmittedAt',
      'sourceRemarks',
      'sourceExtra',
      'centreFromDistrict',
      'nameFrom',
    ] as const)
      delete old[k];
    vi.spyOn(importApi, 'rows').mockResolvedValue(page([old]));
    renderPage();
    await userEvent.click(await screen.findByText('Asha Patil'));
    expect(await screen.findByText(/Values received/)).toBeInTheDocument();
    expect(kvValue('Course centre')).toHaveTextContent(/^PUN$/);
    expect(screen.queryByText(/split from/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Qualification' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Other source values/ })).not.toBeInTheDocument();
  });
});
