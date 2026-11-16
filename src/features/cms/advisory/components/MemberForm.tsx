import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Callout } from '../../../../components/ui';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { LoadState, toastError, useApiData } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { PROFILE_LIST_LABELS, groupOptionLabel } from '../constants';
import { advisoryService } from '../services/advisoryService';
import { PROFILE_LISTS, type AdvisoryField, type Bilingual } from '../types/advisory.types';
import { MAX, memberFormError, memberServerErrors, validateMemberForm, type MemberFormValues } from '../validation/advisory.validation';
import PhotoField, { type PhotoChoice } from './PhotoField';

const FORM_ID = 'cms-advisory-member-form';

/* The profile rule, under every profile field: unlike the name and position, one language is enough. */
const PROFILE_FALLBACK = "the website shows the visitor's language, or the other one when that is blank.";
const LIST_HINT = `One item per line. Fill either language or both — ${PROFILE_FALLBACK}`;
const EXPERIENCE_HINT = `Optional. One short paragraph (line breaks are joined). Fill either language or both — ${PROFILE_FALLBACK}`;

/*
 * One profile list ("Key Achievements" …): a Marathi and an English textarea, one item per line — an
 * administrator usually pastes a bulleted list, and the bullet markers are stripped on save. The hint sits
 * under the Marathi half, as on the other bilingual fields.
 */
function ListField({
  id,
  label,
  value,
  onChange,
  onBlur,
  errorMr,
  errorEn,
}: {
  id: string;
  label: string;
  value: Bilingual;
  onChange: (next: Bilingual) => void;
  onBlur: (half: 'mr' | 'en') => void;
  errorMr?: string;
  errorEn?: string;
}) {
  const area = (half: 'mr' | 'en', lang: string, error: string | undefined) => {
    const fieldId = `${id}-${half}`;
    return (
      <MasterField id={fieldId} label={`${label} (${lang})`} error={error} hint={half === 'mr' ? LIST_HINT : undefined}>
        <textarea
          className="inp"
          rows={5}
          {...fieldAria(fieldId, error)}
          value={value[half]}
          onChange={(e) => onChange({ ...value, [half]: e.target.value })}
          onBlur={() => onBlur(half)}
          /* Marathi is typed with an Indic keyboard; the browser's own spellcheck only gets in the way. */
          spellCheck={half === 'en'}
          lang={half}
        />
      </MasterField>
    );
  };
  return (
    <div className="grid g2">
      {area('mr', 'Marathi', errorMr)}
      {area('en', 'English', errorEn)}
    </div>
  );
}

/*
 * The group heading the trainer is listed under on the website: "No group" or one of the groups in website
 * order, hidden ones marked. The saved group keeps its own entry while the list loads (or if it has gone
 * meanwhile), so the select never shows "No group" for a trainer that has one.
 */
function GroupSelect({
  value,
  current,
  onChange,
  error,
}: {
  value: string;
  current: { id: string; name: Bilingual } | null;
  onChange: (groupId: string) => void;
  error?: string;
}) {
  const groups = useApiData(() => advisoryService.listGroups(), []);
  const list = groups.data ?? [];
  const missing = value !== '' && !list.some((g) => g.id === value);
  return (
    <MasterField
      id="advisory-group"
      label="Group"
      error={error}
      hint="Optional. The heading the trainer is listed under on the website; trainers with no group are listed first, without a heading. Groups are managed on the Advisory Committee list."
    >
      <select className="inp" {...fieldAria('advisory-group', error)} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">No group</option>
        {list.map((g) => (
          <option key={g.id} value={g.id}>
            {groupOptionLabel(g)}
          </option>
        ))}
        {missing ? <option value={value}>{current?.id === value ? current.name.en : 'Saved group'}</option> : null}
      </select>
      {groups.error ? <LoadState loading={false} error={groups.error} onRetry={() => void groups.reload()} /> : null}
    </MasterField>
  );
}

/*
 * The Add / Edit trainer form, on its own page like every other CMS form.
 *
 * - The photo is previewed locally and uploaded only when the form is saved, in the same request as
 *   the text, so a save either keeps everything or changes everything.
 * - The profile (Experience and the five lists) is what the website's "View Profile" window shows. Each
 *   part may be filled in one language only; the name and position follow the usual both-languages rules.
 * - Entered values survive a failed save; field messages the server returned are shown on the fields, and
 *   a refusal of the save as a whole (too large to accept) above the Save button.
 */
export default function MemberForm({
  initial,
  currentPhoto,
  currentGroup = null,
  submitLabel,
  backTo,
  onSave,
}: {
  initial: MemberFormValues;
  /* The saved photo as a loadable URL (edit), or null. */
  currentPhoto: string | null;
  /* The saved group (edit), named while the groups load. */
  currentGroup?: { id: string; name: Bilingual } | null;
  submitLabel: string;
  backTo: string;
  onSave: (values: MemberFormValues, photo: PhotoChoice) => Promise<void>;
}) {
  const [values, setValues] = useState<MemberFormValues>(initial);
  const [photo, setPhoto] = useState<PhotoChoice>({ kind: 'keep' });
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<AdvisoryField>>({});
  const [formError, setFormError] = useState<string | undefined>();
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
    setFormError(undefined);
    try {
      await onSave(values, photo);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped = err.status === 422 ? memberServerErrors(err.details, values) : {};
        const whole = memberFormError(err.status, err.message, err.details);
        if (!isValid(mapped) || whole) {
          flushSync(() => {
            setServer(mapped);
            if (mapped.photo) setPhotoError(mapped.photo);
            setFormError(whole);
          });
          revealFirstError();
          return;
        }
      }
      /* Anything else — a 409 "changed after you opened it", a duplicate name — is shown as the server worded it. */
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

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
                /* Any explicit photo choice (Clear, Keep, Remove, Undo) settles an earlier photo error. */
                setPhotoError(undefined);
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
            <h3>Trainer details</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="advisory-name"
              label="Name"
              maxLength={MAX.name}
              value={values.name}
              onChange={(v) => set('name', v)}
              onBlur={(half) => touch(`name.${half}`)}
              /* A server message on the name as a whole ("body.name") is shown on its Marathi half. */
              errorMr={show('name.mr') ?? show('name')}
              errorEn={show('name.en')}
              hint="Printed on the website as written, in both languages."
            />
            <div className="mt10">
              <BilingualField
                id="advisory-designation"
                label="Position"
                maxLength={MAX.designation}
                required={false}
                value={values.designation}
                onChange={(v) => set('designation', v)}
                onBlur={(half) => touch(`designation.${half}`)}
                errorMr={show('designation.mr') ?? show('designation')}
                errorEn={show('designation.en')}
                hint="Optional. Printed under the name on the website: the role and the institution, e.g. Vice Chancellor, COEP Technological University, Pune — fill both languages or leave both blank."
              />
            </div>
            <div className="mt10">
              <GroupSelect value={values.groupId} current={currentGroup} onChange={(v) => set('groupId', v)} error={server.groupId} />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>
              Profile <span className="sub">shown when a visitor opens View Profile on the website; every part is optional</span>
            </h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="advisory-experience"
              label="Experience"
              multiline
              maxLength={MAX.experience}
              required={false}
              value={values.experience}
              onChange={(v) => set('experience', v)}
              onBlur={(half) => touch(`experience.${half}`)}
              errorMr={show('experience.mr') ?? show('experience')}
              errorEn={show('experience.en')}
              hint={EXPERIENCE_HINT}
            />
            {PROFILE_LISTS.map((key) => (
              <div className="mt10" key={key}>
                <ListField
                  id={`advisory-${key}`}
                  label={PROFILE_LIST_LABELS[key]}
                  value={values[key]}
                  onChange={(v) => set(key, v)}
                  onBlur={(half) => touch(`${key}.${half}`)}
                  errorMr={show(`${key}.mr`) ?? show(key)}
                  errorEn={show(`${key}.en`)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Visibility</h3>
          </div>
          <div className="card-b">
            <MasterField
              id="advisory-active"
              label="Status"
              hint="Hidden trainers stay in this list but are not shown on the website's Advisory Committee page. The order is changed with the arrows on the list."
            >
              <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                <input id="advisory-active" type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                Shown on the website
              </label>
            </MasterField>
          </div>
        </div>

        {/* Next to the Save button it is about; role="alert" also makes revealFirstError scroll to it. */}
        {formError ? (
          <div role="alert" className="mb14">
            <Callout tone="err">{formError}</Callout>
          </div>
        ) : null}
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}
