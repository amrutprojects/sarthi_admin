import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import type { BoardField } from '../types/board.types';
import { serverErrors, validateMemberForm, type MemberFormValues } from '../validation/board.validation';
import PhotoField, { type PhotoChoice } from './PhotoField';

const FORM_ID = 'cms-board-member-form';

/*
 * The Add / Edit member form, on its own page like every other CMS form.
 *
 * - The photo is previewed locally and uploaded only when the form is saved, in the same request as
 *   the text, so a save either keeps everything or changes everything.
 * - "Name not yet available" leaves the name off the website card for an office whose holder is still to
 *   be supplied from official records, rather than inventing a name.
 * - Entered values survive a failed save; field messages the server returned are shown on the fields.
 */
export default function MemberForm({
  initial,
  currentPhoto,
  submitLabel,
  backTo,
  isCreate,
  onSave,
}: {
  initial: MemberFormValues;
  /* The saved photo as a loadable URL (edit), or null. */
  currentPhoto: string | null;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  onSave: (values: MemberFormValues, photo: PhotoChoice) => Promise<void>;
}) {
  const [values, setValues] = useState<MemberFormValues>(initial);
  const [photo, setPhoto] = useState<PhotoChoice>({ kind: 'keep' });
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<BoardField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateMemberForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  const set = <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  const revealFirstError = () =>
    document
      .getElementById(FORM_ID)
      ?.querySelector('[aria-invalid="true"], [role="alert"]')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    flushSync(() => setSubmitted(true));
    if (!isValid(local) || photoError) {
      revealFirstError();
      return;
    }

    setBusy(true);
    setServer({});
    try {
      await onSave(values, photo);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(err.details);
        flushSync(() => {
          setServer(mapped);
          if (mapped.photo) setPhotoError(mapped.photo);
        });
        if (!isValid(mapped)) {
          revealFirstError();
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const nameError = values.namePending ? undefined : show('name');

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Photo</h3>
          </div>
          <div className="card-b">
            <PhotoField
              current={currentPhoto}
              choice={photo}
              onChange={(next) => {
                setPhoto(next);
                setDirty(true);
                setServer((s) => ({ ...s, photo: undefined }));
              }}
              error={photoError}
              onError={setPhotoError}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Member details</h3>
          </div>
          <div className="card-b">
            <MasterField
              id="board-name"
              label="Name"
              required={!values.namePending}
              error={nameError}
              hint="Printed as written — Marathi or English, e.g. Rajendra Sumago."
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                maxLength={120}
                {...fieldAria('board-name', nameError)}
                value={values.namePending ? '' : values.name}
                disabled={values.namePending}
                placeholder={values.namePending ? 'The website card shows no name' : undefined}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => touch('name')}
              />
            </MasterField>
            <label className="f ac gp8 fs13 mb10">
              <input type="checkbox" checked={values.namePending} onChange={(e) => set('namePending', e.target.checked)} />
              Name not yet available — the website card shows the office without a name
            </label>

            <BilingualField
              id="board-category"
              label="Category"
              maxLength={60}
              value={values.category}
              onChange={(v) => set('category', v)}
              onBlur={(half) => touch(`category.${half}`)}
              errorMr={show('category.mr')}
              errorEn={show('category.en')}
              hint="The small badge above the name, e.g. राज्य शासन / State Government."
            />
            <div className="mt10">
              <BilingualField
                id="board-designation"
                label="Designation"
                maxLength={250}
                value={values.designation}
                onChange={(v) => set('designation', v)}
                onBlur={(half) => touch(`designation.${half}`)}
                errorMr={show('designation.mr')}
                errorEn={show('designation.en')}
                hint="The office held, printed under the name."
              />
            </div>
            <div className="mt10">
              <BilingualField
                id="board-description"
                label="Description"
                maxLength={500}
                multiline
                required={false}
                value={values.description}
                onChange={(v) => set('description', v)}
                onBlur={(half) => touch(`description.${half}`)}
                errorMr={show('description.mr')}
                errorEn={show('description.en')}
                hint="Optional. The short italic line at the foot of the card — fill both languages or leave both blank."
              />
            </div>
            <div className="mt10">
              <BilingualField
                id="board-subtitle"
                label="Subtitle"
                maxLength={150}
                required={false}
                value={values.subtitle}
                onChange={(v) => set('subtitle', v)}
                onBlur={(half) => touch(`subtitle.${half}`)}
                errorMr={show('subtitle.mr')}
                errorEn={show('subtitle.en')}
                hint="Optional. An extra line directly under the name — fill both languages or leave both blank."
              />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Order and visibility</h3>
          </div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField
                id="board-order"
                label="Display order"
                error={show('displayOrder')}
                hint={isCreate ? 'Leave blank to add the member at the end of the list.' : 'Lower numbers are shown first.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('board-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={isCreate ? 'End of the list' : undefined}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField id="board-active" label="Status" hint="Inactive members stay here but are not shown on the website.">
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input id="board-active" type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                  Active — show on the website
                </label>
              </MasterField>
            </div>
          </div>
        </div>
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}
