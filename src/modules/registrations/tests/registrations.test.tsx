import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../../tests/test-utils';
import RegistrationFormPage from '../pages/RegistrationFormPage';
import RegistrationsPage from '../pages/RegistrationsPage';
import { BARCODES, TEMPLATES } from '../constants';
import { basicSchema, editFormSchema, fileIssue, verhoeffValid } from '../schemas/registrationSchema';
import { registrationApi } from '../services/registrationApi';

const permissions = new Set<string>();
vi.mock('../../auth', () => ({ useAuth: () => ({ user: { id: 'me' }, permissions }) }));
vi.mock('../services/registrationApi', () => ({
  registrationApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    remove: vi.fn(),
    replaceDocuments: vi.fn(),
  },
}));
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

/* Opens a searchable dropdown by its field label, optionally types in its search box, and picks an option. */
async function choose(u: ReturnType<typeof userEvent.setup>, label: RegExp, option: string, search?: string) {
  await u.click(await screen.findByLabelText(label));
  if (search) await u.type(screen.getByRole('combobox', { name: /^Search/ }), search);
  await u.click(screen.getByRole('option', { name: option }));
}

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
          source: 'PUBLIC_REGISTRATION',
          isActive: true,
          registrationNumber: '1021123045127456',
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const { unmount } = renderWithProviders(<RegistrationsPage />);
    expect(await screen.findByRole('link', { name: 'Asha Patil' })).toHaveAttribute('href', '/student-registrations/s1');
    expect(screen.getByText('1021123045127456')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Registration form/ })).not.toBeInTheDocument();
    unmount();
    permissions.add('registrations.create');
    renderWithProviders(<RegistrationsPage />);
    expect(await screen.findByRole('link', { name: /Registration form/ })).toHaveAttribute('href', '/student-registrations/new');
  });
});

describe('<RegistrationsPage> row actions', () => {
  const row = (over = {}) => ({
    id: 's1',
    code: 'STU-000001',
    name: 'Imported Student',
    centreCode: 'PUN',
    centreName: 'Pune',
    trackCode: 'T03',
    trackName: 'Web Design & Development',
    status: 'RECEIVED',
    mobile: '+91XXXXXX3210',
    email: 'i***@example.invalid',
    aadhaar: 'XXXX-XXXX-1234',
    createdAt: '2026-10-19T10:00:00Z',
    source: 'IMPORT' as const,
    isActive: true,
    registrationNumber: '1021123045127456',
    ...over,
  });
  beforeEach(() => {
    permissions.clear();
    ['registrations.update', 'registrations.delete'].forEach((p) => permissions.add(p));
    vi.mocked(registrationApi.list).mockResolvedValue({ items: [row()], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  });

  it('shows the source, filters by it, toggles active and deletes after confirmation', async () => {
    const u = userEvent.setup();
    renderWithProviders(<RegistrationsPage />);
    expect(await screen.findByText('Import')).toBeInTheDocument();

    await u.selectOptions(screen.getByLabelText('Filter by source'), 'IMPORT');
    await waitFor(() =>
      expect(registrationApi.list).toHaveBeenCalledWith(expect.objectContaining({ source: 'IMPORT', page: 1 }), expect.anything()),
    );

    vi.mocked(registrationApi.setStatus).mockResolvedValue({} as never);
    await u.click(screen.getByRole('switch', { name: 'Status of Imported Student' }));
    await waitFor(() => expect(registrationApi.setStatus).toHaveBeenCalledWith('s1', false));

    vi.mocked(registrationApi.remove).mockResolvedValue();
    await u.click(screen.getByRole('button', { name: 'Delete' }));
    expect(registrationApi.remove).not.toHaveBeenCalled();
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(registrationApi.remove).toHaveBeenCalledWith('s1'));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
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
    await choose(u, /Caste/, 'मराठी');
    await u.click(screen.getByRole('button', { name: 'Next' }));

    await choose(u, /Course Centre/, 'Pune');
    /* The search box filters the list as you type. */
    await u.click(screen.getByLabelText(/Technology/));
    await u.type(screen.getByRole('combobox', { name: /^Search Technology/ }), 'web');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Web Design & Development']);
    await u.clear(screen.getByRole('combobox', { name: /^Search Technology/ }));
    await u.type(screen.getByRole('combobox', { name: /^Search Technology/ }), 'zzz');
    expect(screen.getByText('Nothing matches “zzz”.')).toBeInTheDocument();
    await u.keyboard('{Escape}');
    await choose(u, /Technology/, 'Web Design & Development', 'design');
    await choose(u, /Education Qualification/, 'B.Com');
    await u.click(screen.getByRole('button', { name: 'Next' }));

    /* Step 3 offers the two blank forms to download. */
    expect(await screen.findByRole('link', { name: /Certificate of Medical Fitness/ })).toHaveAttribute(
      'href',
      '/templates/certificate-of-medical-fitness.pdf',
    );
    expect(screen.getByRole('link', { name: /Self-Declaration Form/ })).toHaveAttribute('href', '/templates/self-declaration-form.pdf');

    await u.click(await screen.findByRole('button', { name: 'Submit Application' }));
    expect(await screen.findByText('Photo is required')).toBeInTheDocument();
    expect(screen.getByText('The declaration must be accepted')).toBeInTheDocument();

    const pdf = (n: string) => new File(['%PDF-1.4'], n, { type: 'application/pdf' });
    await u.upload(screen.getByLabelText('Photo file'), pdf('photo.pdf'));
    await u.upload(screen.getByLabelText('Income Certificate / EWS file'), pdf('ews.pdf'));
    await u.click(screen.getByRole('checkbox'));
    await u.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(await screen.findByText('Income Certificate / EWS barcode is required')).toBeInTheDocument();

    vi.mocked(registrationApi.create).mockResolvedValue({
      id: 's1',
      registration_id: 'REG-000001',
      registration_number: '1021123045127456',
      status: 'REGISTRATION_PENDING',
    });
    /* Letters, symbols or the wrong length are refused; exactly 18 digits is accepted. */
    const barcode = screen.getByLabelText(/Income Certificate \/ EWS Barcode/);
    await u.type(barcode, 'EWS-1');
    await u.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(await screen.findByText('Barcode must be exactly 18 digits (numbers only, no spaces, letters or symbols)')).toBeInTheDocument();
    expect(registrationApi.create).not.toHaveBeenCalled();
    await u.clear(barcode);
    await u.type(barcode, '27123456789012345');
    await u.click(screen.getByRole('button', { name: 'Submit Application' }));
    expect(await screen.findByText('Barcode must be exactly 18 digits (numbers only, no spaces, letters or symbols)')).toBeInTheDocument();
    await u.clear(barcode);
    await u.type(barcode, '271234567890123456');

    /* Preview: date of birth as DD/MM/YYYY, and each uploaded document by name, openable. */
    await u.click(screen.getByRole('button', { name: 'Preview Application' }));
    const preview = await screen.findByRole('dialog');
    expect(within(preview).getByText('12/04/2003')).toBeInTheDocument();
    expect(within(preview).getByRole('link', { name: 'Photo' })).toHaveAttribute('target', '_blank');
    expect(within(preview).getByRole('link', { name: 'Income Certificate / EWS' })).toBeInTheDocument();

    /* Edit from the preview, go back and forward: the attached files are still shown, not empty file inputs. */
    await u.click(within(preview).getByRole('button', { name: 'Edit' }));
    await u.click(screen.getByRole('button', { name: 'Previous' }));
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('photo.pdf')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Photo file' })).toHaveAttribute('target', '_blank');
    expect(screen.queryByLabelText('Photo file')).not.toBeInTheDocument();
    expect(screen.getByLabelText('PAN Card file')).toBeInTheDocument();
    /* Delete brings the file input back. */
    await u.upload(screen.getByLabelText('PAN Card file'), pdf('pan.pdf'));
    await u.click(screen.getByRole('button', { name: 'Delete PAN Card file' }));
    expect(screen.getByLabelText('PAN Card file')).toBeInTheDocument();
    expect(screen.queryByText('pan.pdf')).not.toBeInTheDocument();

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
      barcodes: { INCOME_EWS: '271234567890123456' },
    });
    expect(Object.keys(files).sort()).toEqual(['INCOME_EWS', 'PHOTO']);
    /* Walks the whole form (three steps, preview, edit and back), so it needs more than the default 5 s. */
  }, 15_000);
});

describe('<RegistrationFormPage> edit mode', () => {
  /* Photo and Income Certificate / EWS already have files; PAN Card has none. */
  const student = {
    id: 's1',
    name: 'Asha Patil',
    firstName: 'Asha',
    lastName: 'Patil',
    fatherName: 'Ramesh Patil',
    motherName: 'Sunita Patil',
    dateOfBirth: '2003-04-12',
    religion: 'हिंदू',
    casteId: 'c-1',
    regionId: 'r-pun',
    educationId: 'e-1',
    trackCode: 'T03',
    documents: [
      { key: 'PHOTO', label: 'Photo', required: true, supplied: true, barcode: null },
      { key: 'INCOME_EWS', label: 'Income Certificate / EWS', required: true, supplied: true, barcode: '271234567890123456' },
    ],
    files: [
      {
        id: 'f1',
        docType: 'PHOTO',
        originalName: 'photo.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        uploadedAt: '',
        verifiedAt: '2026-10-21T00:00:00Z',
        verifiedBy: 'R',
      },
      {
        id: 'f2',
        docType: 'INCOME_EWS',
        originalName: 'ews.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 10,
        uploadedAt: '',
        verifiedAt: null,
        verifiedBy: null,
      },
    ],
    unmasked: {
      email: 'asha@example.invalid',
      mobile: '+919876543210',
      aadhaar: AADHAAR.replace(/(\d{4})(?=\d)/g, '$1 '),
      currentAddress: 'Pune',
    },
  };
  const pdf = (n: string) => new File(['%PDF-1.4'], n, { type: 'application/pdf' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(registrationApi.get).mockResolvedValue(student as never);
    vi.mocked(registrationApi.update).mockResolvedValue({} as never);
    vi.mocked(registrationApi.replaceDocuments).mockResolvedValue({} as never);
  });

  /* Opens the edit form and goes through steps 1 and 2 to step 3 (documents). */
  const openDocumentsStep = async (u: ReturnType<typeof userEvent.setup>, firstName?: string) => {
    renderWithProviders(
      <Routes>
        <Route path="/student-registrations/:id/edit" element={<RegistrationFormPage />} />
        <Route path="/student-registrations/:id" element={<div>detail page</div>} />
      </Routes>,
      { route: '/student-registrations/s1/edit' },
    );
    expect(await screen.findByDisplayValue('Asha')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3 – Basic Details')).toBeInTheDocument();
    if (firstName) {
      await u.clear(screen.getByLabelText(/First Name/));
      await u.type(screen.getByLabelText(/First Name/), firstName);
    }
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Step 2 of 3 – Main Form')).toHaveAttribute('aria-current', 'step');
    await u.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Step 3 of 3 – Upload Documents')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { name: 'Upload Documents' })).toBeInTheDocument();
  };

  it('prefills the student, edits in three steps and, after confirming, deletes the old document and saves the new one', async () => {
    const u = userEvent.setup();
    await openDocumentsStep(u, 'Kavita');
    /* Step 3: current files shown, mandatory ones already satisfied, no declaration asked again. */
    expect(await screen.findByText('photo.pdf')).toBeInTheDocument();
    expect(screen.getByText('ews.pdf')).toBeInTheDocument();
    /* The second Next opens the documents step; it must not save the edit on its own. */
    expect(registrationApi.update).not.toHaveBeenCalled();
    expect(screen.getByText('Verified — a replacement must be verified again')).toBeInTheDocument();
    expect(screen.getByText(/the old file is permanently deleted when you save the changes/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await u.upload(screen.getByLabelText('Photo file'), pdf('new-photo.pdf'));
    expect(screen.getByText('Will delete photo.pdf and replace it with new-photo.pdf on save.')).toBeInTheDocument();

    /* Save asks first; Cancel sends nothing and stays on step 3. */
    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Replace documents?' })).toBeInTheDocument();
    expect(within(dialog).getByRole('listitem')).toHaveTextContent('Photo: photo.pdf (replaced by new-photo.pdf)');
    await u.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Step 3 of 3 – Upload Documents')).toHaveAttribute('aria-current', 'step');
    expect(registrationApi.update).not.toHaveBeenCalled();
    expect(registrationApi.replaceDocuments).not.toHaveBeenCalled();

    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete old and replace' }));
    await waitFor(() =>
      expect(registrationApi.update).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ first_name: 'Kavita', mobile_number: '9876543210', aadhaar_number: AADHAAR, region_id: 'r-pun' }),
      ),
    );
    await waitFor(() => expect(registrationApi.replaceDocuments).toHaveBeenCalledTimes(1));
    const [id, barcodes, files] = vi.mocked(registrationApi.replaceDocuments).mock.calls[0];
    expect([id, barcodes, Object.keys(files)]).toEqual(['s1', {}, ['PHOTO']]);
    expect(files.PHOTO.name).toBe('new-photo.pdf');
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('removes the replacement warning when the chosen file is cleared, and then saves without asking', async () => {
    const u = userEvent.setup();
    await openDocumentsStep(u);
    await u.upload(screen.getByLabelText('Income Certificate / EWS file'), pdf('ews-2026.pdf'));
    expect(screen.getByText('Will delete ews.pdf and replace it with ews-2026.pdf on save.')).toBeInTheDocument();
    /* A chosen file is shown by name with View / Delete instead of the input; Delete clears it and brings the input back. */
    await u.click(screen.getByRole('button', { name: 'Delete Income Certificate / EWS file' }));
    expect(screen.queryByText(/Will delete ews\.pdf/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Income Certificate / EWS file')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(registrationApi.update).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrationApi.replaceDocuments).not.toHaveBeenCalled();
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('keeps a pending replacement across Previous / Next and undoes it with "Keep current file"', async () => {
    const u = userEvent.setup();
    await openDocumentsStep(u);
    await u.upload(screen.getByLabelText('Photo file'), pdf('new-photo.pdf'));
    await u.upload(screen.getByLabelText('Income Certificate / EWS file'), pdf('ews-2026.pdf'));

    /* Back to step 2 and on again: the inputs are new and empty, the chosen files are still pending and still shown. */
    await u.click(screen.getByRole('button', { name: 'Previous' }));
    await u.click(await screen.findByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Will delete photo.pdf and replace it with new-photo.pdf on save.')).toBeInTheDocument();
    expect(screen.getByText('Will delete ews.pdf and replace it with ews-2026.pdf on save.')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Keep current file for Photo' }));
    expect(screen.queryByText(/Will delete photo\.pdf/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep current file for Photo' })).not.toBeInTheDocument();

    /* Only the Income Certificate replacement is left to confirm and send. */
    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('listitem')).toHaveTextContent('Income Certificate / EWS: ews.pdf (replaced by ews-2026.pdf)');
    await u.click(within(dialog).getByRole('button', { name: 'Delete old and replace' }));
    await waitFor(() => expect(registrationApi.replaceDocuments).toHaveBeenCalledTimes(1));
    const [, , files] = vi.mocked(registrationApi.replaceDocuments).mock.calls[0];
    expect(Object.keys(files)).toEqual(['INCOME_EWS']);
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('clears the file input when the replacement is undone', async () => {
    const u = userEvent.setup();
    await openDocumentsStep(u);
    const input = screen.getByLabelText('Photo file') as HTMLInputElement;
    await u.upload(input, pdf('new-photo.pdf'));
    expect(input.files).toHaveLength(1);
    await u.click(screen.getByRole('button', { name: 'Keep current file for Photo' }));
    /* The chosen file was shown by name in place of the input; undoing brings back a new, empty input. */
    expect((screen.getByLabelText('Photo file') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText(/Will delete/)).not.toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(registrationApi.update).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrationApi.replaceDocuments).not.toHaveBeenCalled();
  });

  it('keeps the confirm dialog open while the confirmed save runs, and sends it once', async () => {
    const u = userEvent.setup();
    let finish!: () => void;
    vi.mocked(registrationApi.replaceDocuments).mockImplementation(() => new Promise((resolve) => (finish = () => resolve({} as never))));
    await openDocumentsStep(u);
    await u.upload(screen.getByLabelText('Photo file'), pdf('new-photo.pdf'));
    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    const dialog = await screen.findByRole('dialog');
    await u.click(within(dialog).getByRole('button', { name: 'Delete old and replace' }));
    await waitFor(() => expect(registrationApi.replaceDocuments).toHaveBeenCalledTimes(1));
    expect(within(dialog).getByRole('button', { name: 'Delete old and replace' })).toBeDisabled();

    /* The old file is already being deleted: Cancel and Escape do not pretend to call it back. */
    await u.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await u.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    finish();
    expect(await screen.findByText('detail page')).toBeInTheDocument();
    expect(registrationApi.update).toHaveBeenCalledTimes(1);
    expect(registrationApi.replaceDocuments).toHaveBeenCalledTimes(1);
  });

  it('uploads a document that had no file, and changes a barcode, without the replace confirmation', async () => {
    const u = userEvent.setup();
    await openDocumentsStep(u);
    expect(screen.getByText('Not uploaded')).toBeInTheDocument();
    await u.upload(screen.getByLabelText('PAN Card file'), pdf('pan.pdf'));
    expect(screen.queryByText(/Will delete/)).not.toBeInTheDocument();
    await u.clear(screen.getByLabelText(/Income Certificate \/ EWS Barcode/));
    await u.type(screen.getByLabelText(/Income Certificate \/ EWS Barcode/), '272222222222222222');

    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(registrationApi.replaceDocuments).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrationApi.update).toHaveBeenCalledTimes(1);
    const [, barcodes, files] = vi.mocked(registrationApi.replaceDocuments).mock.calls[0];
    expect(barcodes).toEqual({ INCOME_EWS: '272222222222222222' });
    expect(Object.keys(files)).toEqual(['PAN_CARD']);
    expect(await screen.findByText('detail page')).toBeInTheDocument();
  });

  it('still blocks on validation errors before asking to replace', async () => {
    const u = userEvent.setup();
    await openDocumentsStep(u);
    await u.upload(screen.getByLabelText('Photo file'), pdf('new-photo.pdf'));
    await u.clear(screen.getByLabelText(/Income Certificate \/ EWS Barcode/));
    await u.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Income Certificate / EWS barcode is required')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(registrationApi.update).not.toHaveBeenCalled();
    expect(registrationApi.replaceDocuments).not.toHaveBeenCalled();
  });
});

describe('download templates', () => {
  it('ship with the app for every link in step 3', () => {
    const shipped = Object.keys(import.meta.glob('/public/templates/*.pdf'));
    for (const t of TEMPLATES) expect(shipped).toContain(`/public${t.href}`);
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

  it('accepts only 18-digit certificate barcodes, and requires both Income / EWS and Domicile barcodes', () => {
    const ok = (v: string) => editFormSchema.shape.barcodes.safeParse({ DOMICILE: v }).success;
    expect(ok('281234567890123456')).toBe(true);
    expect(ok('')).toBe(true); /* empty = not given; required-ness is checked with the uploaded files */
    for (const bad of ['28123456789012345', '2812345678901234567', '2812 3456 7890 1234', 'DOM123456789012345', '28123456789012345-']) {
      expect(ok(bad)).toBe(false);
    }
    expect(BARCODES).toEqual({ INCOME_EWS: 'required', DOMICILE: 'required' });
  });

  it('allows only letters, spaces and . \' - in the parent names, as in the first and last name', () => {
    const issue = (field: 'father_name' | 'mother_name', value: string) => {
      const r = basicSchema.safeParse({ [field]: value });
      return r.success ? undefined : r.error.issues.find((i) => i.path[0] === field)?.message;
    };
    expect(issue('father_name', 'Ramesh 2')).toBe("Father name may contain only letters, spaces and . ' -");
    expect(issue('mother_name', 'Sunita@Patil')).toBe("Mother name may contain only letters, spaces and . ' -");
    expect(issue('father_name', 'रमेश पाटील')).toBeUndefined();
    expect(issue('mother_name', "R. K. D'Souza-Patil")).toBeUndefined();
  });
});
