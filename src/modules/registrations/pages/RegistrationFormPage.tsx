import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toastError, toastOk } from '../../../components/feedback/apiFeedback';
import { Callout, KvList, PageHead } from '../../../components/ui';
import { Modal } from '../../../components/ui/Overlay';
import { ApiError, newIdempotencyKey } from '../../../services/api-client';
import { MASTERS, useMasterOptions, type MasterKey } from '../../masters';
import { BARCODES, DECLARATION, RELIGIONS, TRACKS } from '../constants';
import {
  ACCEPT,
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
 * errors are shown on the step they belong to.
 */
export default function RegistrationFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
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
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
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
  const err = (k: string) => (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const barcodeErr = (code: string) => (errors.barcodes as Record<string, { message?: string }> | undefined)?.[code]?.message;

  const submit = useMutation({
    mutationFn: (v: { data: RegistrationData; files: Record<string, File> }) => registrationApi.create(v.data, v.files, key.current),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['registrations'] });
      toastOk(`Registration ${r.registration_id} submitted`);
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
      if (f) {
        const issue = fileIssue(f);
        if (issue) fe[t.code] = issue;
      } else if (t.isMandatory) fe[t.code] = `${t.name} is required`;
      if (f && BARCODES[t.code] === 'required' && !getValues(`barcodes.${t.code}`)?.trim()) {
        setError(`barcodes.${t.code}`, { message: `${t.name} barcode is required` });
        ok = false;
      }
    }
    setFileErrors(fe);
    return ok && !Object.keys(fe).length;
  };

  const next = async () => {
    if (await trigger(STEP_FIELDS[step] as unknown as FieldPath<RegistrationFormValues>[])) setStep(step + 1);
  };

  const onValid = (v: RegistrationFormValues) => {
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
  const loadingMasters = regions.isPending || castes.isPending || educations.isPending || docTypes.isPending;

  return (
    <div className="page">
      <PageHead
        crumbs={[
          { l: 'Dashboard', link: '#/dashboard' },
          { l: 'Student Registration', link: '#/student-registrations' },
          { l: 'Registration form' },
        ]}
        title="Registration Form — AMRUT KALASH"
        sub="Please fill in all required fields marked with *."
      />

      <ol className="tw-mb-4 tw-flex tw-list-none tw-flex-wrap tw-gap-2 tw-p-0" aria-label="Steps">
        {STEPS.map((s, i) => (
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
              Step {i + 1} of 3 – {s}
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
                  <select id="rf-caste" className="inp" {...register('caste_id')}>
                    <option value="">Select</option>
                    {castes.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
                <Field id="rf-centre" title="Course Centre" error={err('region_id')}>
                  <select id="rf-centre" className="inp" {...register('region_id')}>
                    <option value="">Select</option>
                    {regions.data?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="rf-track" title="Technology / 3rd module selection" error={err('technology')}>
                  <select id="rf-track" className="inp" {...register('technology')}>
                    <option value="">Select</option>
                    {TRACKS.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="rf-edu" title="Education Qualification" error={err('education_id')}>
                  <select id="rf-edu" className="inp" {...register('education_id')}>
                    <option value="">Select</option>
                    {educations.data?.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
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
                        <th scope="col">File</th>
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
                                <input id={`rf-bc-${t.code}`} className="inp sm mono" {...register(`barcodes.${t.code}`)} />
                                {barcodeErr(t.code) ? (
                                  <span className={errorText} role="alert">
                                    {barcodeErr(t.code)}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                          <td>{t.isMandatory ? <span className="tw-text-danger">*</span> : '—'}</td>
                          <td>
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
            ) : null}
          </div>
        </div>

        <div className="tw-mt-4 tw-flex tw-flex-wrap tw-justify-between tw-gap-2">
          <button type="button" className="btn" onClick={() => (step === 0 ? navigate('/student-registrations') : setStep(step - 1))}>
            {step === 0 ? 'Cancel' : 'Previous'}
          </button>
          {step < 2 ? (
            <button type="button" className="btn primary" onClick={() => void next()}>
              Next
            </button>
          ) : (
            <div className="tw-flex tw-gap-2">
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
              ['Date of birth', getValues('date_of_birth')],
              ['Address', getValues('current_address')],
              ['Aadhaar', `XXXX-XXXX-${getValues('aadhaar_number').replace(/\D/g, '').slice(-4)}`],
              ['Mobile', getValues('mobile_number')],
              ['Religion', getValues('religion')],
              ['Caste', name(castes.data, getValues('caste_id'))],
              ['Course centre', name(regions.data, getValues('region_id'))],
              ['Technology', TRACKS.find((t) => t.code === getValues('technology'))?.name ?? '—'],
              ['Education', name(educations.data, getValues('education_id'))],
              ['Documents', `${Object.keys(files).length} file(s): ${Object.keys(files).join(', ') || '—'}`],
            ]}
          />
        </Modal>
      ) : null}
    </div>
  );
}
