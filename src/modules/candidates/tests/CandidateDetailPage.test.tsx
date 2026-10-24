import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../../../tests/test-utils';
import { ApiError } from '../../../services/api-client';
import { studentApi, type StudentDetail, type StudentDocument } from '../../students';
import CandidateDetailPage from '../pages/CandidateDetailPage';

let permissions = new Set<string>();
vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: 'me' }, permissions }) }));

const detail = (over: Partial<StudentDetail> = {}): StudentDetail => ({
  id: 's1',
  code: 'STU-000001',
  sourceRecordId: 'MA-0001',
  name: 'Asha Patil',
  centreCode: 'PUN',
  centreName: 'Pune',
  trackCode: 'T07',
  trackName: 'Data Analytics',
  trackToBeConfirmed: false,
  status: 'RECEIVED',
  mobile: '******3210',
  email: 'a***@example.com',
  aadhaar: 'XXXX XXXX 1234',
  approvedAt: '2026-10-01T05:00:00.000Z',
  importBatchId: 'b1',
  createdAt: '2026-10-20T05:00:00.000Z',
  source: 'IMPORT',
  registrationNumber: null,
  firstName: 'Asha',
  lastName: 'Patil',
  fatherName: 'Suresh',
  motherName: 'Lata',
  dateOfBirth: '2001-02-03',
  religion: 'Hindu',
  caste: 'Maratha',
  educationQualification: 'Graduate',
  trackSourceValue: 'Data Analytics',
  externalStatus: 'APPROVED',
  evidenceRef: 'EV-1',
  declarationAccepted: true,
  batch: { id: 'bt', code: 'BAT-01', name: 'Pune 1' },
  documents: [
    { key: 'PHOTO', label: 'Photo', required: true, supplied: true, barcode: null },
    { key: 'CASTE_CERT', label: 'Caste certificate', required: true, supplied: false, barcode: null },
  ],
  ...over,
});
const photo: StudentDocument = {
  id: 'd1',
  docType: 'PHOTO',
  label: 'Photo',
  originalName: 'photo.jpg',
  sourcePath: 'MA-0001/photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 2048,
  uploadedAt: '2026-10-20T05:00:00.000Z',
  verifiedAt: '2026-10-21T05:00:00.000Z',
};
const renderAt = (id = 's1') =>
  renderWithProviders(
    <Routes>
      <Route path="/candidates/:id" element={<CandidateDetailPage />} />
    </Routes>,
    { route: '/candidates/' + id },
  );

beforeEach(() => {
  permissions = new Set(['candidates.view']);
});

describe('CandidateDetailPage — real masked student', () => {
  it('shows the profile, masked contact, programme with batch and the lifecycle', async () => {
    vi.spyOn(studentApi, 'get').mockResolvedValue(detail());
    vi.spyOn(studentApi, 'documents').mockResolvedValue([photo]);
    renderAt();
    expect(await screen.findByRole('heading', { name: /Asha Patil/ })).toBeInTheDocument();
    expect(studentApi.get).toHaveBeenCalledWith('s1');
    expect(screen.getByText('Suresh')).toBeInTheDocument();
    expect(screen.getByText('******3210')).toBeInTheDocument();
    expect(screen.getByText('XXXX XXXX 1234')).toBeInTheDocument();
    expect(screen.getByText('Pune (PUN)')).toBeInTheDocument();
    expect(screen.getByText('BAT-01 · Pune 1')).toBeInTheDocument();
    expect(screen.getByText('Batch allocated')).toBeInTheDocument();
    expect(screen.queryByText(/Attendance/)).not.toBeInTheDocument();
  });

  it('lists declared documents with supplied and verified state; downloads need imports.view', async () => {
    vi.spyOn(studentApi, 'get').mockResolvedValue(detail());
    vi.spyOn(studentApi, 'documents').mockResolvedValue([photo]);
    renderAt();
    const photoRow = (await screen.findByText('photo.jpg')).closest('tr') as HTMLElement;
    expect(within(photoRow).getByText('Supplied')).toBeInTheDocument();
    expect(within(photoRow).getByText(/^Verified/)).toBeInTheDocument();
    const casteRow = screen.getByText('Caste certificate').closest('tr') as HTMLElement;
    expect(within(casteRow).getByText('Not supplied')).toBeInTheDocument();
    expect(within(casteRow).getByText('No file')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
  });

  it('offers the file download to users with imports.view', async () => {
    permissions = new Set(['candidates.view', 'imports.view']);
    vi.spyOn(studentApi, 'get').mockResolvedValue(detail());
    vi.spyOn(studentApi, 'documents').mockResolvedValue([{ ...photo, verifiedAt: null }]);
    const download = vi.spyOn(studentApi, 'downloadDocument').mockResolvedValue();
    renderAt();
    expect(await screen.findByText('Not verified')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Download Photo' }));
    expect(download).toHaveBeenCalledWith('s1', expect.objectContaining({ id: 'd1' }));
  });

  it('says when an eligible student is still awaiting a batch', async () => {
    vi.spyOn(studentApi, 'get').mockResolvedValue(detail({ batch: null }));
    vi.spyOn(studentApi, 'documents').mockResolvedValue([]);
    renderAt();
    expect(await screen.findByText('Awaiting batch')).toBeInTheDocument();
  });

  it('shows "not found" for an unknown student', async () => {
    vi.spyOn(studentApi, 'get').mockRejectedValue(new ApiError('Student not found', 404, 'NOT_FOUND'));
    vi.spyOn(studentApi, 'documents').mockRejectedValue(new ApiError('Student not found', 404, 'NOT_FOUND'));
    renderAt('nope');
    expect(await screen.findByText('Student not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to candidate master' })).toBeInTheDocument();
  });
});
