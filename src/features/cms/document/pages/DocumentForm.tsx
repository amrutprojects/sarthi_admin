import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../../../../services/api-client';
import DependentSelect, { RootSelect } from '../../components/DependentSelect';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { masterOptions } from '../../options';
import { ConfirmModal, toastError } from '../../shared';
import type { GeoOption } from '../../types';
import { isValid, serverFieldErrors, type FieldErrors } from '../../validation';
import {
  CATEGORY_LABEL, DOCUMENT_CATEGORIES, DOCUMENT_FIELDS, DOCUMENT_FILE_ACCEPT, DOCUMENT_MAX_FILE_MB, fileSizeLabel, type DocumentCategory,
  type DocumentField,
} from '../types/document.types';
import {
  emptyDocumentForm, normalizeDocumentForm, validateDocumentForm, type DocumentFormValues, type DocumentPayload,
} from '../validation/document.validation';

interface DocumentFormProps {
  initial?: DocumentFormValues;
  submitLabel: string;
  /* Resolves when the record was saved. The caller navigates; this component only reports. */
  onSave: (values: DocumentPayload) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Edit: the file currently stored. The file input becomes optional ("leave empty to keep it"). */
  currentFileName?: string;
  /* Saved links of a record being edited, kept selectable even if they were since deactivated. */
  currentState?: GeoOption | null;
  currentDistrict?: GeoOption | null;
  currentCentre?: GeoOption | null;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'cms-document-form';

/*
 * The Document create / edit form, on its own page, in three sections: details, what the document is
 * linked to, and the file.
 *
 * Both links are optional. The District dropdown cascades from a State dropdown that only narrows the
 * list (the state itself is not stored). The file is checked here for extension and size so the person
 * hears about a wrong file before uploading it; the server checks the real type from the content.
 */
export default function DocumentForm({
  initial, submitLabel, onSave, backTo, confirmMessage, currentFileName, currentState, currentDistrict, currentCentre, statusSlot,
}: DocumentFormProps) {
  const editing = currentFileName !== undefined;
  const [values, setValues] = useState<DocumentFormValues>(initial ?? emptyDocumentForm());
  const [touched, setTouched] = useState<Partial<Record<DocumentField, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<DocumentField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const local = validateDocumentForm(values, { fileRequired: !editing });
  const show = (f: DocumentField) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: DocumentField) => () => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof DocumentFormValues>(key: K, value: DocumentFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    if (key in serverErrors) setServerErrors((e) => ({ ...e, [key as DocumentField]: undefined }));
  };

  const pickFile = (file: File | null) => {
    set('file', file);
    setTouched((t) => ({ ...t, file: true }));
  };

  const clearFile = () => {
    if (fileInput.current) fileInput.current.value = '';
    pickFile(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy) return;
    if (!isValid(local)) return;
    if (confirmMessage) {
      setConfirming(true);
      return;
    }
    await save();
  }

  async function save() {
    setConfirming(false);
    setBusy(true);
    setServerErrors({});
    try {
      await onSave(normalizeDocumentForm(values));
      setDirty(false);
    } catch (err) {
      /* 422 (shape) and 400 (file type, unusable district / centre) carry per-field messages; show them on the fields. */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped = serverFieldErrors(err.details, DOCUMENT_FIELDS);
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const fileHint = editing
    ? `Leave empty to keep the current file: ${currentFileName}. A new file sets the verification back to Pending.`
    : `PDF, JPG or PNG, at most ${DOCUMENT_MAX_FILE_MB} MB. The type is checked from the file content.`;

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h"><h3>Document details</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="doc-title" label="Title" required error={show('title')} hint="For example MoU with Pune Centre 2026–27. 3 to 150 characters.">
                <input
                  className="inp"
                  {...fieldAria('doc-title', show('title'))}
                  value={values.title}
                  maxLength={150}
                  autoComplete="off"
                  onChange={(e) => set('title', e.target.value)}
                  onBlur={touch('title')}
                />
              </MasterField>

              <MasterField id="doc-category" label="Category" required error={show('category')}>
                <select
                  className="inp"
                  {...fieldAria('doc-category', show('category'))}
                  value={values.category}
                  onChange={(e) => { set('category', e.target.value as '' | DocumentCategory); setTouched((t) => ({ ...t, category: true })); }}
                >
                  <option value="">Select category</option>
                  {DOCUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
              </MasterField>

              <MasterField id="doc-description" label="Description" error={show('description')} hint="Optional. Up to 500 characters.">
                <textarea
                  className="inp"
                  {...fieldAria('doc-description', show('description'))}
                  rows={3}
                  value={values.description}
                  maxLength={500}
                  onChange={(e) => set('description', e.target.value)}
                  onBlur={touch('description')}
                />
              </MasterField>

              {statusSlot ?? (
                <MasterField id="doc-status" label="Status" hint="A new document is active. Only an active document can be verified.">
                  <select
                    className="inp"
                    id="doc-status"
                    value={values.isActive ? 'true' : 'false'}
                    onChange={(e) => set('isActive', e.target.value === 'true')}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </MasterField>
              )}
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h"><h3>Linked to <span className="sub">optional</span></h3></div>
          <div className="card-b">
            <div className="grid g2">
              <RootSelect
                id="doc-state"
                label="State"
                load={masterOptions.states}
                value={values.stateId}
                onChange={(v) => set('stateId', v)}
                placeholder="Select state"
                emptyHint="No active states yet."
                hint="Only narrows the District list; it is not stored."
                extraOption={currentState ?? undefined}
                error={show('stateId')}
              />

              <DependentSelect
                id="doc-district"
                label="District"
                parentValue={values.stateId}
                load={masterOptions.districtsOfState}
                value={values.districtId}
                onChange={(v) => set('districtId', v)}
                placeholder="No district"
                disabledHint="Select a state first to link a district."
                emptyHint="This state has no active districts yet."
                /* The saved district belongs to the saved state; offering it under another state would mismatch the pair. */
                extraOption={currentDistrict && values.stateId === currentState?.id ? currentDistrict : undefined}
                error={show('districtId')}
              />

              <RootSelect
                id="doc-centre"
                label="Training centre"
                load={masterOptions.trainingCentres}
                value={values.centreId}
                onChange={(v) => set('centreId', v)}
                placeholder="No training centre"
                emptyHint="No active training centres yet."
                hint="The centre this document belongs to, if any."
                extraOption={currentCentre ?? undefined}
                error={show('centreId')}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>File</h3></div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField id="doc-file" label={editing ? 'Replace file' : 'File'} required={!editing} error={show('file')} hint={fileHint}>
                <input
                  ref={fileInput}
                  type="file"
                  className="inp"
                  accept={DOCUMENT_FILE_ACCEPT}
                  {...fieldAria('doc-file', show('file'))}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                {values.file ? (
                  <div className="f ac gp8 mt10 fs12">
                    <span>
                      Selected: <b>{values.file.name}</b> <span className="muted">· {fileSizeLabel(values.file.size)}</span>
                    </span>
                    <button type="button" className="btn xs" onClick={clearFile}>{editing ? 'Keep current file' : 'Remove'}</button>
                  </div>
                ) : null}
              </MasterField>
            </div>
          </div>
          <div className="card-f">
            <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
          </div>
        </div>
      </form>
      {confirming ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message={confirmMessage ?? ''}
          onClose={() => setConfirming(false)}
          onConfirm={() => void save()}
        />
      ) : null}
    </>
  );
}
