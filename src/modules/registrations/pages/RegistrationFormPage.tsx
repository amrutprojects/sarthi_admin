import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm, type FieldPath } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Callout, KvList, PageHead } from '../../../components/ui';
import Icon from '../../../components/ui/Icon';
import { Modal } from '../../../components/ui/Overlay';
import SearchableSelect, { type SelectOption } from '../../../components/ui/SearchableSelect';
import { ApiError, newIdempotencyKey } from '../../../services/api-client';
import { MASTERS, useMasterOptions, type MasterKey } from '../../masters';
import { BARCODES, DECLARATION, RELIGIONS, TRACKS } from '../constants';
import {
  ACCEPT,
  editFormSchema,
  fileIssue,
  registrationFormSchema,
  STEP_FIELDS,
  MAX_FILE_MB,
  type RegistrationFormValues,
} from '../schemas/registrationSchema';
import { registrationApi, type RegistrationData } from '../services/registrationApi';

const STEPS = ['Basic Details', 'Main Form', 'Upload Documents'] as const;
const label = 'tw-text-xs tw-font-semibold tw-text-ink-2';
const errorText = 'tw-text-xs tw-text-danger';
const master = (key: MasterKey) => MASTERS.find((m) => m.key === key)!;

/* YYYY-MM-DD (the form value) shown as DD/MM/YYYY. */
const ddmmyyyy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || '—';
};

/* A file chosen in this form, opened in a new tab from a temporary object URL (released when the link goes away). */
function FileLink({ file, children, className, label }: { file: File; children: ReactNode; className?: string; label?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={label}
      title={label ?? `Open ${file.name}`}
    >
      {children}
    </a>
  );
}

/*
 * A document already stored for the student (edit form), fetched with the session cookie and opened in a new tab.
 * The tab is opened before the request so pop-up blockers allow it.
 */
function StoredFileLink({ studentId, file }: { studentId: string; file: { id: string; originalName: string; mimeType: string } }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    const tab = window.open('', '_blank');
    setBusy(true);
    try {
      const blob = await registrationApi.fileBlob(studentId, file.id);
      const url = URL.createObjectURL(new Blob([blob], { type: file.mimeType }));
      if (tab) tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      className="tw-cursor-pointer tw-border-0 tw-bg-transparent tw-p-0 tw-text-left tw-text-brand-700 tw-underline"
      disabled={busy}
      title={`Open ${file.originalName}`}
      onClick={() => void open()}
    >
      {busy ? 'Opening…' : file.originalName}
    </button>
  );
}

function Field({ id, title, error, children, wide }: { id: string; title: string; error?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`tw-flex tw-flex-col tw-gap-1 ${wide ? 'sm:tw-col-span-2' : ''}`}>
      <label htmlFor={id} className={label}>
        {title} <span className="tw-text-danger">*</span>
      </label>
      {children}
      {error ? (
        <span className={errorText} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/*
 * Registration form (Student Registration menu), in three steps as the programme's form: basic details, main form,
 * documents. Each step is validated before moving on; the server validates everything again on submit and its field
 * errors are shown on the step they belong to. At /student-registrations/:id/edit the same form edits an existing
 * student: steps 1 and 2 only, prefilled, saved with PATCH.
 */
export default function RegistrationFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id: editId } = useParams();
  const editing = !!editId;
  const steps = STEPS;
  const lastStep = steps.length - 1;
  const existing = useQuery({
    queryKey: ['registrations', 'detail', editId],
    queryFn: () => registrationApi.get(editId!),
    enabled: editing,
  });
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const key = useRef(newIdempotencyKey());
  const regions = useMasterOptions(master('region'));
  const castes = useMasterOptions(master('caste'));
  const educations = useMasterOptions(master('education'));
  const docTypes = useMasterOptions(master('documentType'));
  useEffect(() => {
    document.title = 'Registration form — AMRUT × SUMAGO Admin';
  }, []);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    getValues,
    setError,
    reset,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(editing ? (editFormSchema as unknown as typeof registrationFormSchema) : registrationFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      father_name: '',
      mother_name: '',
      email: '',
      date_of_birth: '',
      current_address: '',
      aadhaar_number: '',
      mobile_number: '',
      religion: RELIGIONS.length === 1 ? RELIGIONS[0] : '',
      caste_id: '',
      region_id: '',
      technology: '',
      education_id: '',
      barcodes: {},
    },
  });
  /*
   * Edit mode: fill the form with the student's current (unmasked) details once they AND the dropdown options have
   * loaded. Filling earlier leaves a select empty (its option does not exist yet), and Next then fails on that field.
   * Done once per student: a later refetch of the student or the options must not wipe what the user has typed.
   */
  const prefilledId = useRef<string | null>(null);
  useEffect(() => {
    const r = existing.data;
    if (!r || !regions.data || !castes.data || !educations.data) return;
    if (prefilledId.current === r.id) return;
    prefilledId.current = r.id;
    reset({
      first_name: r.firstName,
      last_name: r.lastName,
      father_name: r.fatherName,
      mother_name: r.motherName,
      email: r.unmasked?.email ?? '',
      date_of_birth: r.dateOfBirth ?? '',
      current_address: r.unmasked?.currentAddress ?? '',
      aadhaar_number: (r.unmasked?.aadhaar ?? '').replace(/\s/g, ''),
      mobile_number: (r.unmasked?.mobile ?? '').replace(/^\+91/, ''),
      religion: r.religion,
      caste_id: r.casteId ?? '',
      region_id: r.regionId ?? '',
      technology: r.trackCode ?? '',
      education_id: r.educationId ?? '',
      barcodes: Object.fromEntries(r.documents.filter((d) => d.barcode).map((d) => [d.key, d.barcode as string])),
    });
  }, [existing.data, regions.data, castes.data, educations.data, reset]);

  const err = (k: string) => (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  /* A dropdown with a search box, for the master lists and the tracks. */
  const pick = (name: 'caste_id' | 'region_id' | 'technology' | 'education_id', id: string, title: string, options: SelectOption[]) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SearchableSelect
          id={id}
          label={title}
          options={options}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          buttonRef={field.ref}
          invalid={!!err(name)}
        />
      )}
    />
  );
  const asOptions = (rows: { id: string; name: string }[] | undefined): SelectOption[] =>
    (rows ?? []).map((r) => ({ value: r.id, label: r.name }));
  const barcodeErr = (code: string) => (errors.barcodes as Record<string, { message?: string }> | undefined)?.[code]?.message;

  const submit = useMutation({
    mutationFn: (v: { data: RegistrationData; files: Record<string, File> }) => registrationApi.create(v.data, v.files, key.current),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['registrations'] });
      toastOk(`Registration submitted — registration no. ${r.registration_number}`);
      navigate(`/student-registrations/${r.id}`);
    },
    onError: (e) => {
      setPreview(false);
      if (!(e instanceof ApiError) || !e.details.length) return toastError(e);
      /* Map server field errors onto the form and go back to the first step that has one. */
      const fe: Record<string, string> = {};
      let first = 2;
      for (const d of e.details) {
        const f = (d.field ?? '').replace(/^body\./, '');
        if (f.startsWith('files.')) fe[f.slice(6)] = d.message;
        else {
          setError(f as FieldPath<RegistrationFormValues>, { message: d.message });
          const s = STEP_FIELDS.findIndex((fields) => (fields as readonly string[]).includes(f));
          if (s >= 0) first = Math.min(first, s);
        }
      }
      setFileErrors(fe);
      setStep(first);
      toastError(e);
    },
  });

  /* Documents: mandatory types need a file; barcode where the type requires it. */
  const checkDocuments = (): boolean => {
    const fe: Record<string, string> = {};
    let ok = true;
    for (const t of docTypes.data ?? []) {
      const f = files[t.code];
      /* When editing, a file already on record counts; a new file replaces it. */
      const existingFile = existing.data?.files.some((x) => x.docType === t.code);
      if (f) {
        const issue = fileIssue(f);
        if (issue) fe[t.code] = issue;
      } else if (t.isMandatory && !existingFile) fe[t.code] = `${t.name} is required`;
      if ((f || existingFile) && BARCODES[t.code] === 'required' && !getValues(`barcodes.${t.code}`)?.trim()) {
        setError(`barcodes.${t.code}`, { message: `${t.name} barcode is required` });
        ok = false;
      }
    }
    setFileErrors(fe);
    return ok && !Object.keys(fe).length;
  };

  const next = async () => {
    /* shouldFocus scrolls to the first invalid field, so a problem further down the step is never missed. */
    if (await trigger(STEP_FIELDS[step] as unknown as FieldPath<RegistrationFormValues>[], { shouldFocus: true })) setStep(step + 1);
  };

  /* Edit: save the details, then (if anything changed in step 3) the documents and barcodes. */
  const save = useMutation({
    mutationFn: async ({
      data,
      barcodes,
      newFiles,
    }: {
      data: Omit<RegistrationData, 'declaration_accepted' | 'barcodes'>;
      barcodes: Record<string, string>;
      newFiles: Record<string, File>;
    }) => {
      await registrationApi.update(editId!, data);
      const before = Object.fromEntries((existing.data?.documents ?? []).map((d) => [d.key, d.barcode ?? '']));
      const changed = Object.fromEntries(Object.entries(barcodes).filter(([c, b]) => (before[c] ?? '') !== b.trim()));
      if (Object.keys(newFiles).length || Object.keys(changed).length) await registrationApi.replaceDocuments(editId!, changed, newFiles);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['registrations'] });
      navigate(`/student-registrations/${editId}`);
      toastOk('Student details updated');
    },
    onError: (e) => {
      if (!(e instanceof ApiError) || !e.details.length) return toastError(e);
      let first = 2;
      const fe: Record<string, string> = {};
      for (const d of e.details) {
        const f = (d.field ?? '').replace(/^body\./, '');
        if (f.startsWith('files.')) {
          fe[f.slice(6)] = d.message;
          continue;
        }
        setError(f as FieldPath<RegistrationFormValues>, { message: d.message });
        const s = STEP_FIELDS.findIndex((fields) => (fields as readonly string[]).includes(f));
        if (s >= 0) first = Math.min(first, s);
      }
      setFileErrors(fe);
      setStep(first);
      toastError(e);
    },
  });

  const onValid = (v: RegistrationFormValues) => {
    if (editing) {
      if (!checkDocuments()) return;
      const { barcodes, declaration_accepted: _d, ...rest } = v;
      save.mutate({ data: rest, barcodes: (barcodes ?? {}) as Record<string, string>, newFiles: files });
      return;
    }
    if (!checkDocuments()) return;
    const barcodes = Object.fromEntries(Object.entries(v.barcodes).filter(([c, b]) => files[c] && b.trim()));
    const { barcodes: _b, declaration_accepted: _d, ...rest } = v;
    submit.mutate({ data: { ...rest, declaration_accepted: true, barcodes }, files });
  };

  /* Document checks run even when a field is invalid, so every problem on the step shows at once. */
  const onInvalid = () => void checkDocuments();
  const openPreview = handleSubmit(() => {
    if (checkDocuments()) setPreview(true);
  }, onInvalid);

  const name = (list: { id: string; name: string }[] | undefined, id: string) => list?.find((o) => o.id === id)?.name ?? '—';
  const loadingMasters =
    regions.isPending || castes.isPending || educations.isPending || docTypes.isPending || (editing && existing.isPending);

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '#/dashboard' },
          { l: 'Student Registration', link: '#/student-registrations' },
          { l: editing ? 'Edit student' : 'Registration form' },
        ]}
        title={editing ? `Edit — ${existing.data?.name ?? ''}` : 'Registration Form — AMRUT KALASH'}
        sub={
          editing
            ? 'Change the details in steps 1–2; in step 3 replace or add documents and update barcodes, then save.'
            : 'Please fill in all required fields marked with *.'
        }
      />

      <ol className="tw-mb-4 tw-flex tw-list-none tw-flex-wrap tw-gap-2 tw-p-0" aria-label="Steps">
        {steps.map((s, i) => (
          <li key={s}>
            <span
              className={`tw-inline-block tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold ${
                i === step
                  ? 'tw-bg-brand-600 tw-text-white'
                  : i < step
                    ? 'tw-bg-brand-50 tw-text-brand-700'
                    : 'tw-bg-white tw-text-ink-muted'
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              Step {i + 1} of {steps.length} – {s}
            </span>
          </li>
        ))}
      </ol>

      {loadingMasters ? <div className="skel" style={{ height: 160 }} aria-busy="true" aria-label="Loading form" /> : null}

      <form
        noValidate
        onSubmit={handleSubmit(onValid, onInvalid)}
        className={loadingMasters ? 'tw-hidden' : ''}
        aria-label="Registration form"
      >
        <div className="card">
          <div className="card-h">
            <h3>{STEPS[step]}</h3>
          </div>
          <div className="card-b">
            {step === 0 ? (
              <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
                <Field id="rf-first" title="First Name" error={err('first_name')}>
                  <input id="rf-first" className="inp" {...register('first_name')} />
                </Field>
                <Field id="rf-last" title="Last Name" error={err('last_name')}>
                  <input id="rf-last" className="inp" {...register('last_name')} />
                </Field>
                <Field id="rf-father" title="Father Name" error={err('father_name')}>
                  <input id="rf-father" className="inp" {...register('father_name')} />
                </Field>
                <Field id="rf-mother" title="Mother Name" error={err('mother_name')}>
                  <input id="rf-mother" className="inp" {...register('mother_name')} />
                </Field>
                <Field id="rf-email" title="Email" error={err('email')}>
                  <input id="rf-email" type="email" className="inp" {...register('email')} />
                </Field>
                <Field id="rf-dob" title="Date of Birth" error={err('date_of_birth')}>
                  <input
                    id="rf-dob"
                    type="date"
                    className="inp"
                    max={new Date().toISOString().slice(0, 10)}
                    {...register('date_of_birth')}
                  />
                </Field>
                <Field id="rf-address" title="Current Address" error={err('current_address')} wide>
                  <textarea id="rf-address" className="inp" rows={3} {...register('current_address')} />
                </Field>
                <Field id="rf-aadhaar" title="Aadhaar Number" error={err('aadhaar_number')}>
                  <input
                    id="rf-aadhaar"
                    className="inp mono"
                    inputMode="numeric"
                    maxLength={14}
                    autoComplete="off"
                    {...register('aadhaar_number')}
                  />
                </Field>
                <Field id="rf-mobile" title="Mobile Number" error={err('mobile_number')}>
                  <input id="rf-mobile" className="inp mono" inputMode="tel" maxLength={14} {...register('mobile_number')} />
                </Field>
                <Field id="rf-religion" title="Religion" error={err('religion')}>
                  <select id="rf-religion" className="inp" {...register('religion')}>
                    <option value="">Select</option>
                    {RELIGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="rf-caste" title="Caste" error={err('caste_id')}>
                  {pick('caste_id', 'rf-caste', 'Caste', asOptions(castes.data))}
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
                <Field id="rf-centre" title="Course Centre" error={err('region_id')}>
                  {pick('region_id', 'rf-centre', 'Course Centre', asOptions(regions.data))}
                </Field>
                <Field id="rf-track" title="Technology / 3rd module selection" error={err('technology')}>
                  {pick(
                    'technology',
                    'rf-track',
                    'Technology / 3rd module selection',
                    TRACKS.map((t) => ({ value: t.code, label: t.name })),
                  )}
                </Field>
                <Field id="rf-edu" title="Education Qualification" error={err('education_id')}>
                  {pick('education_id', 'rf-edu', 'Education Qualification', asOptions(educations.data))}
                  {educations.data && !educations.data.length ? (
                    <span className="tw-text-xs tw-text-ink-muted">
                      No education qualifications yet: add them under Masters → Education.
                    </span>
                  ) : null}
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <>
                <Callout tone="info" title="File upload guidelines. ">
                  Accepted formats: PDF, JPG, JPEG, PNG. Maximum file size: {MAX_FILE_MB} MB.
                </Callout>
                <div className="tbl-wrap mt14">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th scope="col">Sr. No.</th>
                        <th scope="col">Document</th>
                        <th scope="col">Required</th>
                        {editing ? <th scope="col">Current file</th> : null}
                        <th scope="col">{editing ? 'Replace / upload' : 'File'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docTypes.data?.map((t, i) => (
                        <tr key={t.id}>
                          <td>{i + 1}</td>
                          <td>
                            {t.name}
                            {BARCODES[t.code] ? (
                              <div className="tw-mt-2 tw-flex tw-flex-col tw-gap-1">
                                <label htmlFor={`rf-bc-${t.code}`} className={label}>
                                  {t.name} Barcode {BARCODES[t.code] === 'required' ? <span className="tw-text-danger">*</span> : null}
                                </label>
                                <input
                                  id={`rf-bc-${t.code}`}
                                  className="inp sm mono"
                                  inputMode="numeric"
                                  maxLength={18}
                                  placeholder="18-digit barcode number"
                                  autoComplete="off"
                                  {...register(`barcodes.${t.code}`)}
                                />
                                {barcodeErr(t.code) ? (
                                  <span className={errorText} role="alert">
                                    {barcodeErr(t.code)}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                          <td>{t.isMandatory ? <span className="tw-text-danger">*</span> : '—'}</td>
                          {editing ? (
                            <td className="tw-break-all">
                              {(() => {
                                const cur = existing.data?.files.find((x) => x.docType === t.code);
                                if (!cur) return <span className="tw-text-ink-muted">Not uploaded</span>;
                                return (
                                  <>
                                    <StoredFileLink studentId={editId!} file={cur} />
                                    <div className="tw-text-xs tw-text-ink-muted">
                                      {cur.verifiedAt ? 'Verified — a replacement must be verified again' : 'Not verified yet'}
                                    </div>
                                  </>
                                );
                              })()}
                            </td>
                          ) : null}
                          <td>
                            {files[t.code] ? (
                              /*
                               * A file input cannot be refilled when this step is shown again (after Previous or the
                               * preview's Edit), so a chosen file is shown by name, openable, with Remove to pick another.
                               */
                              <div className="tw-flex tw-items-center tw-gap-2">
                                <span
                                  className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm"
                                  style={{ maxWidth: 240 }}
                                  title={files[t.code].name}
                                >
                                  {files[t.code].name}
                                </span>
                                <FileLink file={files[t.code]} className="btn xs" label={`View ${t.name} file`}>
                                  <Icon name="eye" />
                                </FileLink>
                                <button
                                  type="button"
                                  className="btn xs"
                                  aria-label={`Delete ${t.name} file`}
                                  title={`Delete ${t.name} file`}
                                  style={{ color: 'var(--red)' }}
                                  onClick={() => {
                                    setFiles((s) => {
                                      const n = { ...s };
                                      delete n[t.code];
                                      return n;
                                    });
                                    setFileErrors((s) => {
                                      const n = { ...s };
                                      delete n[t.code];
                                      return n;
                                    });
                                  }}
                                >
                                  <Icon name="trash" />
                                </button>
                              </div>
                            ) : (
                              <input
                                type="file"
                                accept={ACCEPT}
                                aria-label={`${t.name} file`}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  setFiles((s) => {
                                    const n = { ...s };
                                    if (f) n[t.code] = f;
                                    else delete n[t.code];
                                    return n;
                                  });
                                  setFileErrors((s) => {
                                    const n = { ...s };
                                    const issue = f ? fileIssue(f) : null;
                                    if (issue) n[t.code] = issue;
                                    else delete n[t.code];
                                    return n;
                                  });
                                }}
                              />
                            )}
                            {fileErrors[t.code] ? (
                              <div className={errorText} role="alert">
                                {fileErrors[t.code]}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {editing ? null : (
                  <>
                    <label className="tw-mt-4 tw-flex tw-cursor-pointer tw-items-start tw-gap-2 tw-text-sm">
                      <input type="checkbox" className="tw-mt-1 tw-accent-brand-600" {...register('declaration_accepted')} />
                      <span>{DECLARATION}</span>
                    </label>
                    {err('declaration_accepted') ? (
                      <span className={errorText} role="alert">
                        {err('declaration_accepted')}
                      </span>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>

        <div className="tw-mt-4 tw-flex tw-flex-wrap tw-justify-between tw-gap-2">
          <button
            type="button"
            className="btn"
            onClick={() =>
              step === 0 ? navigate(editing ? `/student-registrations/${editId}` : '/student-registrations') : setStep(step - 1)
            }
          >
            {step === 0 ? 'Cancel' : 'Previous'}
          </button>
          {step < lastStep ? (
            /*
             * Next turns the page into the last step before the browser finishes handling this click. Without
             * preventDefault (and separate keys, so React does not reuse this element as the Save button), that
             * click then lands on "Save changes" and submits the edit form, skipping the documents step.
             */
            <button
              key="next"
              type="button"
              className="btn primary"
              onClick={(e) => {
                e.preventDefault();
                void next();
              }}
            >
              Next
            </button>
          ) : editing ? (
            <button key="save" type="submit" className="btn primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
          ) : (
            <div key="submit" className="tw-flex tw-gap-2">
              <button type="button" className="btn" onClick={() => void openPreview()}>
                Preview Application
              </button>
              <button type="submit" className="btn primary" disabled={submit.isPending}>
                {submit.isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          )}
        </div>
      </form>

      {preview ? (
        <Modal
          title="Preview application"
          size="wide"
          onClose={() => setPreview(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setPreview(false)}>
                Edit
              </button>
              <button type="button" className="btn primary" disabled={submit.isPending} onClick={() => void handleSubmit(onValid)()}>
                {submit.isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </>
          }
        >
          <KvList
            pairs={[
              ['Name', `${getValues('first_name')} ${getValues('last_name')}`],
              ['Father / Mother', `${getValues('father_name')} / ${getValues('mother_name')}`],
              ['Email', getValues('email')],
              ['Date of birth', ddmmyyyy(getValues('date_of_birth'))],
              ['Address', getValues('current_address')],
              ['Aadhaar', `XXXX-XXXX-${getValues('aadhaar_number').replace(/\D/g, '').slice(-4)}`],
              ['Mobile', getValues('mobile_number')],
              ['Religion', getValues('religion')],
              ['Caste', name(castes.data, getValues('caste_id'))],
              ['Course centre', name(regions.data, getValues('region_id'))],
              ['Technology', TRACKS.find((t) => t.code === getValues('technology'))?.name ?? '—'],
              ['Education', name(educations.data, getValues('education_id'))],
              [
                `Documents (${Object.keys(files).length})`,
                Object.keys(files).length ? (
                  <span className="tw-flex tw-flex-col tw-gap-1">
                    {(docTypes.data ?? [])
                      .filter((t) => files[t.code])
                      .map((t) => (
                        <span key={t.code}>
                          <FileLink file={files[t.code]}>{t.name}</FileLink>{' '}
                          <span className="tw-text-xs tw-font-normal tw-text-ink-muted">({files[t.code].name})</span>
                        </span>
                      ))}
                  </span>
                ) : (
                  '—'
                ),
              ],
            ]}
          />
        </Modal>
      ) : null}
    </div>
  );
}
