import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import MasterFormActions from '../../../cms/components/MasterFormActions';
import { ConfirmModal, toastError } from '../../../cms/shared';
import FieldPreview from '../components/FieldPreview';
import { ruleSummary } from '../components/fieldFormat';
import OptionsEditor from '../components/OptionsEditor';
import RuleEditor from '../components/RuleEditor';
import { useFormSections } from '../components/useFormSections';
import {
  HELP_TEXT_MAX, LABEL_MAX, LOCK_MESSAGES, dataTypeLabel, isChoiceType, sectionChoiceLabel, sensitivityLabel, stageLabel,
  type ApiFormField, type FormFieldFormOptions, type SectionChoice,
} from '../types/formField.types';
import {
  formFieldSchema, formFieldServerErrors, optionsPayload, rulesPayload, suggestFieldCode, translationsPayload, type FormFieldFormValues,
} from '../validation/formField.validation';

interface FormFieldFormProps {
  mode: 'create' | 'edit';
  initial: FormFieldFormValues;
  /* Forms and sections, data types, stages, sensitivities, languages: GET /lms/form-fields/form-options. */
  formOptions: FormFieldFormOptions;
  /*
   * Sections of the form the field starts on (initial.formCode), read by the page from
   * GET /lms/form-fields/forms/:formCode/sections: standard ones, then the custom sections in use.
   */
  sections: SectionChoice[];
  /* Edit: the saved field — what it locks (standard, system-locked, values stored) comes from it. */
  field?: ApiFormField;
  submitLabel: string;
  /* Resolves when the field was saved. The caller builds the payload and navigates; this component only reports. */
  onSave: (values: FormFieldFormValues) => Promise<void>;
  backTo: string;
  /* When set (Edit), the user must confirm this message before the form is saved. */
  confirmMessage?: string;
  /* Create shows the Status select; Edit injects its own status row (status has its own endpoint). */
  statusSlot?: ReactNode;
}

const FORM_ID = 'lms-form-field-form';
const CUSTOM_SECTION = '__custom__';

const errorLine = (id: string, message: string | undefined) =>
  message ? (
    <div className="hint" style={{ color: 'var(--red)', fontWeight: 600 }} id={id} role="alert">
      {message}
    </div>
  ) : null;

const collapse = (s: string) => s.trim().replace(/\s+/g, ' ');

/*
 * The Form Field Configuration create / edit form (F-LMS-FFC, Table 40), on its own page. React Hook Form + Zod
 * with the backend's rules: validates on submit and once a field is touched, blocks double submits, keeps the
 * entered values after a failed save, and puts the server's field answers (409 duplicate key / label per
 * language, FIELD_* locks, 422 rules) on the matching control. What the backend refuses for this field is
 * disabled up front with the backend's own reason.
 */
export default function FormFieldForm({
  mode, initial, formOptions, sections: initialSections, field, submitLabel, onSave, backTo, confirmMessage, statusSlot,
}: FormFieldFormProps) {
  const isCustom = mode === 'create' || !!field?.isCustom;
  const systemLocked = !!field?.isSystemLocked;
  const typeLocked = !!field?.typeLocked;
  const schema = useMemo(
    () => formFieldSchema({ mode, isCustom, requiredStages: formOptions.requiredStages, sensitivities: formOptions.sensitivities }),
    [mode, isCustom, formOptions.requiredStages, formOptions.sensitivities],
  );
  const form = useForm<FormFieldFormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: 'onTouched' });
  const {
    control, register, handleSubmit, setValue, setError, trigger, getValues, getFieldState, watch,
    formState: { errors, isDirty, isSubmitted },
  } = form;
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<FormFieldFormValues | null>(null);
  const [serverSummary, setServerSummary] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState('');
  /* The key follows the label until it is typed by hand (create only). */
  const keyEdited = useRef(mode === 'edit' || initial.fieldCode !== '');

  const values = watch();
  const languages = formOptions.languages;
  /* Another form chosen here (create) reads its own sections. */
  const otherForm = useFormSections(values.formCode !== initial.formCode ? values.formCode : '', formOptions);
  const sections = values.formCode === initial.formCode ? initialSections : otherForm.sections;
  const choice = isChoiceType(values.dataType);
  const typeCodes = isCustom ? formOptions.customDataTypes.map((t) => t.code) : [];
  const typeOptions = typeCodes.includes(values.dataType) || !values.dataType ? typeCodes : [...typeCodes, values.dataType];

  const submit = handleSubmit((v) => {
    if (busy) return;
    if (confirmMessage) {
      setConfirming(v);
      return;
    }
    return save(v);
  });

  async function save(v: FormFieldFormValues) {
    setConfirming(null);
    setBusy(true);
    setServerSummary(null);
    try {
      await onSave(v);
    } catch (err) {
      /* Field-level answers (422 validation, 409 duplicate key / label, FIELD_* locks) go next to the field. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        const mapped = formFieldServerErrors(err.details, languages.map((l) => l.code));
        if (mapped.length) {
          mapped.forEach(({ path, message }) => setError(path, { type: 'server', message }));
          setServerSummary(err.message);
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const sectionError = errors.sectionCode?.message;
  const valuesNote = field?.storedValues ? ` ${field.storedValues} ${field.storedValues === 1 ? 'record holds' : 'records hold'} a value.` : '';

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={submit} noValidate>
          {serverSummary ? (
            <div className="callout c-err mb14" role="alert">
              <div>
                <b>Not saved. </b>
                {serverSummary}
              </div>
            </div>
          ) : null}

          {mode === 'create' ? (
            <div className="callout c-info mb14">
              <div>
                Only custom fields are added here. Standard fields come from the application's field catalogue; configure them from the list.
              </div>
            </div>
          ) : null}
          {systemLocked ? (
            <div className="callout c-info mb14" role="note">
              <div>
                <b>System-locked field. </b>
                {LOCK_MESSAGES.FIELD_SYSTEM_LOCKED} It stays visible and compulsory on every save; its label, help text, section and order can change.
              </div>
            </div>
          ) : null}
          {field && !field.isCustom ? (
            <div className="callout c-info mb14" role="note">
              <div>
                <b>Standard field. </b>
                {LOCK_MESSAGES.FIELD_STANDARD}
              </div>
            </div>
          ) : null}
          {typeLocked ? (
            <div className="callout c-warn mb14" role="note">
              <div>
                <b>Type locked. </b>
                {LOCK_MESSAGES.FIELD_TYPE_LOCKED}
                {valuesNote}
              </div>
            </div>
          ) : null}

          <h3 className="fs13" style={{ margin: '0 0 10px' }}>Field</h3>
          <div className="grid g2">
            {mode === 'create' ? (
              <MasterField id="ff-form" label="Form" required error={errors.formCode?.message} hint="The configurable form the field belongs to.">
                <Controller
                  control={control}
                  name="formCode"
                  render={({ field: f }) => (
                    <select
                      className="inp"
                      {...fieldAria('ff-form', errors.formCode?.message)}
                      ref={f.ref}
                      name={f.name}
                      value={f.value}
                      onBlur={f.onBlur}
                      onChange={(e) => {
                        f.onChange(e.target.value);
                        /* Sections belong to the form. */
                        setValue('customSection', false, { shouldDirty: true });
                        setValue('sectionCode', '', { shouldDirty: true });
                      }}
                    >
                      <option value="">Select a form</option>
                      {formOptions.forms.map((fo) => (
                        <option key={fo.code} value={fo.code}>{fo.label} ({fo.specRef})</option>
                      ))}
                    </select>
                  )}
                />
              </MasterField>
            ) : (
              <MasterField id="ff-form" label="Form" hint="The form and the field key are the identity of stored values and never change.">
                <select className="inp" id="ff-form" value={initial.formCode} disabled>
                  <option value={initial.formCode}>{field?.formLabel ?? initial.formCode}</option>
                </select>
              </MasterField>
            )}

            {mode === 'create' ? (
              <MasterField
                id="ff-key"
                label="Field Key"
                required
                error={errors.fieldCode?.message}
                hint="The key the value is stored under: 2 to 60 lower-case letters, digits and underscores, starting with a letter. Suggested from the label; it cannot change later."
              >
                <input
                  className="inp mono"
                  {...fieldAria('ff-key', errors.fieldCode?.message)}
                  maxLength={60}
                  autoComplete="off"
                  spellCheck={false}
                  {...register('fieldCode', {
                    onChange: (e: { target: { value: string } }) => {
                      keyEdited.current = e.target.value !== '';
                    },
                  })}
                />
              </MasterField>
            ) : (
              <MasterField id="ff-key" label="Field Key" hint="The key the value is stored under. It never changes.">
                <input className="inp mono" id="ff-key" value={initial.fieldCode} disabled readOnly />
              </MasterField>
            )}

            <MasterField
              id="ff-label"
              label="Label"
              required
              error={errors.label?.message}
              hint={`Shown on the form, up to ${LABEL_MAX} characters. Unique within the form (capitals ignored), in every language.`}
            >
              <input
                className="inp"
                {...fieldAria('ff-label', errors.label?.message)}
                maxLength={LABEL_MAX + 20}
                autoComplete="off"
                {...register('label', {
                  onChange: (e: { target: { value: string } }) => {
                    if (mode !== 'create' || keyEdited.current) return;
                    setValue('fieldCode', suggestFieldCode(e.target.value), {
                      shouldDirty: true,
                      shouldValidate: isSubmitted || getFieldState('fieldCode').isTouched,
                    });
                  },
                })}
              />
            </MasterField>

            <MasterField id="ff-help" label="Help Text" error={errors.helpText?.message} hint={`Optional guidance under the field, up to ${HELP_TEXT_MAX} characters.`}>
              <textarea className="inp" {...fieldAria('ff-help', errors.helpText?.message)} rows={2} maxLength={HELP_TEXT_MAX + 20} {...register('helpText')} />
            </MasterField>

            <MasterField
              id="ff-section"
              label="Section"
              required
              error={values.customSection ? undefined : sectionError}
              hint={
                values.formCode
                  ? 'A section of the form, a custom section already in use (hidden and archived fields counted), or a new custom section.'
                  : 'Select a form first.'
              }
            >
              <select
                className="inp"
                {...fieldAria('ff-section', values.customSection ? undefined : sectionError)}
                value={values.customSection ? CUSTOM_SECTION : values.sectionCode}
                disabled={!values.formCode}
                onBlur={() => {
                  if (!values.customSection) void trigger('sectionCode');
                }}
                onChange={(e) => {
                  const custom = e.target.value === CUSTOM_SECTION;
                  setValue('customSection', custom, { shouldDirty: true });
                  setValue('sectionCode', custom ? '' : e.target.value, { shouldDirty: true, shouldTouch: true, shouldValidate: !custom || isSubmitted });
                }}
              >
                <option value="">Select a section</option>
                {sections.map((s) => (
                  <option key={s.code} value={s.code}>
                    {sectionChoiceLabel(s)}
                    {s.fieldCount === null ? '' : ` (${s.fieldCount} ${s.fieldCount === 1 ? 'field' : 'fields'})`}
                  </option>
                ))}
                <option value={CUSTOM_SECTION}>New custom section…</option>
              </select>
            </MasterField>

            {values.customSection ? (
              <MasterField
                id="ff-custom-section"
                label="Custom Section Code"
                required
                error={sectionError}
                hint="1 to 40 capital letters, digits and underscores, starting with a letter. For example OTHER_DETAILS. Custom sections follow the form's own sections."
              >
                <Controller
                  control={control}
                  name="sectionCode"
                  render={({ field: f }) => (
                    <input
                      className="inp mono"
                      {...fieldAria('ff-custom-section', sectionError)}
                      ref={f.ref}
                      name={f.name}
                      value={f.value}
                      maxLength={40}
                      autoComplete="off"
                      spellCheck={false}
                      onBlur={f.onBlur}
                      onChange={(e) => f.onChange(e.target.value.toUpperCase())}
                    />
                  )}
                />
              </MasterField>
            ) : null}

            <MasterField
              id="ff-order"
              label="Order"
              error={errors.sortOrder?.message}
              hint={
                mode === 'create'
                  ? 'Position within the section (lower first), 0 to 100000. Leave empty to add the field at the end of the section.'
                  : 'Position within the section (lower first), 0 to 100000. Leave empty to keep the current position.'
              }
            >
              <input type="number" className="inp" {...fieldAria('ff-order', errors.sortOrder?.message)} inputMode="numeric" step={1} min={0} max={100000} {...register('sortOrder')} />
            </MasterField>
          </div>

          <h3 className="fs13" style={{ margin: '14px 0 4px' }} id="ff-translations-label">Labels per language</h3>
          <p className="muted fs12" style={{ margin: '0 0 10px' }}>
            Leave a language empty to show the default label and help text in it. A label must not be the label another field of the form shows
            in the same language.
            {formOptions.languagesConfirmed ? '' : ' The platform language list is To Be Confirmed (OQ-023).'}
          </p>
          <div className="tbl-wrap">
            <table className="tbl" aria-labelledby="ff-translations-label">
              <thead>
                <tr>
                  <th style={{ width: 170 }}>Language</th>
                  <th>Label</th>
                  <th>Help Text</th>
                </tr>
              </thead>
              <tbody>
                {languages.map((l) => {
                  const labelErr = errors.translations?.[l.code]?.label?.message;
                  const helpErr = errors.translations?.[l.code]?.helpText?.message;
                  return (
                    <tr key={l.code} className="norow">
                      <td className="fs13">
                        {l.label} <span className="muted mono fs12">({l.code})</span>
                      </td>
                      <td>
                        <input
                          className="inp sm"
                          aria-label={`Label in ${l.label}`}
                          aria-invalid={labelErr ? true : undefined}
                          aria-describedby={labelErr ? `ff-tr-${l.code}-label-error` : undefined}
                          maxLength={LABEL_MAX + 20}
                          autoComplete="off"
                          placeholder={collapse(values.label) || 'Default label'}
                          {...register(`translations.${l.code}.label`)}
                        />
                        {errorLine(`ff-tr-${l.code}-label-error`, labelErr)}
                      </td>
                      <td>
                        <input
                          className="inp sm"
                          aria-label={`Help text in ${l.label}`}
                          aria-invalid={helpErr ? true : undefined}
                          aria-describedby={helpErr ? `ff-tr-${l.code}-help-error` : undefined}
                          maxLength={HELP_TEXT_MAX + 20}
                          autoComplete="off"
                          placeholder={values.helpText.trim() || 'Default help text'}
                          {...register(`translations.${l.code}.helpText`)}
                        />
                        {errorLine(`ff-tr-${l.code}-help-error`, helpErr)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 className="fs13" style={{ margin: '14px 0 10px' }}>Data type and rules</h3>
          <div className="grid g2">
            <MasterField
              id="ff-type"
              label="Data Type"
              required
              error={errors.dataType?.message}
              hint={
                !isCustom
                  ? LOCK_MESSAGES.FIELD_STANDARD
                  : typeLocked
                    ? `${LOCK_MESSAGES.FIELD_TYPE_LOCKED}${valuesNote}`
                    : 'Only the rules of the chosen type are saved. A choice field needs its options.'
              }
            >
              <Controller
                control={control}
                name="dataType"
                render={({ field: f }) => (
                  <select
                    className="inp"
                    {...fieldAria('ff-type', errors.dataType?.message)}
                    ref={f.ref}
                    name={f.name}
                    value={f.value}
                    disabled={!isCustom || typeLocked}
                    onBlur={f.onBlur}
                    onChange={(e) => {
                      f.onChange(e.target.value);
                      if (isSubmitted) void trigger(['options', 'rules']);
                    }}
                  >
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>{dataTypeLabel(t)}</option>
                    ))}
                  </select>
                )}
              />
            </MasterField>
          </div>

          {isCustom ? (
            <>
              {choice ? <OptionsEditor form={form} /> : null}
              <RuleEditor form={form} dataType={values.dataType} fileConstraints={formOptions.fileConstraints} />
            </>
          ) : (
            <div className="fld">
              <label>Rules</label>
              <div className="fs13">
                {(() => {
                  const r = ruleSummary(field?.dataType ?? '', field?.rules ?? {}, formOptions.fileConstraints);
                  return r.length ? r.join(' · ') : 'Set by the application.';
                })()}
                {field?.options?.length ? <div className="muted fs12">Options: {field.options.join(', ')}</div> : null}
              </div>
              <div className="hint">{LOCK_MESSAGES.FIELD_STANDARD}</div>
            </div>
          )}

          <h3 className="fs13" style={{ margin: '14px 0 10px' }}>Behaviour</h3>
          <div className="grid g2">
            <MasterField
              id="ff-visible"
              label="Visible"
              error={errors.isVisible?.message}
              hint={systemLocked ? LOCK_MESSAGES.FIELD_SYSTEM_LOCKED : 'Shown on the form. A hidden field keeps its stored values.'}
            >
              <Controller
                control={control}
                name="isVisible"
                render={({ field: f }) => (
                  <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                    <input
                      type="checkbox"
                      {...fieldAria('ff-visible', errors.isVisible?.message)}
                      ref={f.ref}
                      checked={f.value}
                      disabled={systemLocked}
                      onBlur={f.onBlur}
                      onChange={(e) => {
                        f.onChange(e.target.checked);
                        if (getValues('isRequired')) void trigger('isRequired');
                      }}
                    />
                    Show this field on the form
                  </label>
                )}
              />
            </MasterField>

            <MasterField
              id="ff-required"
              label="Compulsory"
              error={errors.isRequired?.message}
              hint={systemLocked ? LOCK_MESSAGES.FIELD_SYSTEM_LOCKED : 'Must be filled in. A hidden field cannot be compulsory.'}
            >
              <Controller
                control={control}
                name="isRequired"
                render={({ field: f }) => (
                  <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                    <input
                      type="checkbox"
                      {...fieldAria('ff-required', errors.isRequired?.message)}
                      ref={f.ref}
                      checked={f.value}
                      disabled={systemLocked}
                      onBlur={f.onBlur}
                      onChange={(e) => {
                        f.onChange(e.target.checked);
                        void trigger('isRequired');
                      }}
                    />
                    The field must be filled in
                  </label>
                )}
              />
            </MasterField>

            <MasterField
              id="ff-stage"
              label="Compulsory From"
              error={errors.requiredStage?.message}
              hint={
                systemLocked
                  ? LOCK_MESSAGES.FIELD_SYSTEM_LOCKED
                  : 'When the compulsory rule applies: on every save, or only when the profile is submitted for verification (drafts can always be saved).'
              }
            >
              <Controller
                control={control}
                name="requiredStage"
                render={({ field: f }) => (
                  <select
                    className="inp"
                    {...fieldAria('ff-stage', errors.requiredStage?.message)}
                    ref={f.ref}
                    name={f.name}
                    value={f.value}
                    disabled={systemLocked}
                    onBlur={f.onBlur}
                    onChange={(e) => f.onChange(e.target.value)}
                  >
                    {formOptions.requiredStages.map((s) => (
                      <option key={s} value={s}>{stageLabel(s)}</option>
                    ))}
                  </select>
                )}
              />
            </MasterField>

            <MasterField
              id="ff-sensitivity"
              label="Sensitivity"
              error={errors.sensitivity?.message}
              hint={isCustom ? 'Internal, Personal or Restricted: who may see the value.' : LOCK_MESSAGES.FIELD_STANDARD}
            >
              <Controller
                control={control}
                name="sensitivity"
                render={({ field: f }) => (
                  <select
                    className="inp"
                    {...fieldAria('ff-sensitivity', errors.sensitivity?.message)}
                    ref={f.ref}
                    name={f.name}
                    value={f.value}
                    disabled={!isCustom}
                    onBlur={f.onBlur}
                    onChange={(e) => f.onChange(e.target.value)}
                  >
                    {(formOptions.sensitivities.includes(f.value) ? formOptions.sensitivities : [...formOptions.sensitivities, f.value]).map((s) => (
                      <option key={s} value={s}>{sensitivityLabel(s)}</option>
                    ))}
                  </select>
                )}
              />
            </MasterField>

            <MasterField
              id="ff-exportable"
              label="Exportable"
              error={errors.isExportable?.message}
              hint={isCustom ? 'Included in exports of the form.' : LOCK_MESSAGES.FIELD_STANDARD}
            >
              <Controller
                control={control}
                name="isExportable"
                render={({ field: f }) => (
                  <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                    <input
                      type="checkbox"
                      {...fieldAria('ff-exportable', errors.isExportable?.message)}
                      ref={f.ref}
                      checked={f.value}
                      disabled={!isCustom}
                      onBlur={f.onBlur}
                      onChange={(e) => f.onChange(e.target.checked)}
                    />
                    Include the value in exports
                  </label>
                )}
              />
            </MasterField>

            {statusSlot ?? (
              <MasterField id="ff-status" label="Status" error={errors.isActive?.message} hint="An archived custom field is kept, with its values, but no longer shown on the form.">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field: f }) => (
                    <select className="inp" id="ff-status" ref={f.ref} value={f.value ? 'true' : 'false'} onChange={(e) => f.onChange(e.target.value === 'true')}>
                      <option value="true">Active</option>
                      <option value="false">Archived</option>
                    </select>
                  )}
                />
              </MasterField>
            )}
          </div>

          <div className="f ac jb wrap gp8" style={{ margin: '14px 0 10px' }}>
            <h3 className="fs13" style={{ margin: 0 }}>Preview</h3>
            <div className="f ac gp8 fs12">
              <span aria-hidden="true">Preview in</span>
              <select className="inp sm" style={{ width: 'auto' }} aria-label="Preview language" value={previewLang} onChange={(e) => setPreviewLang(e.target.value)}>
                <option value="">Default label</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid g2">
            <FieldPreview
              idPrefix="ff-preview"
              lang={previewLang}
              fileConstraints={formOptions.fileConstraints}
              field={{
                fieldCode: values.fieldCode,
                label: collapse(values.label),
                helpText: values.helpText.trim() || null,
                translations: translationsPayload(values.translations),
                dataType: values.dataType,
                options: isCustom ? optionsPayload(values.dataType, values.options) : (field?.options ?? null),
                rules: isCustom ? rulesPayload(values.dataType, values.rules) : (field?.rules ?? {}),
                isRequired: values.isRequired,
                requiredStage: values.requiredStage,
                isSystemLocked: systemLocked,
                isCustom,
                sensitivity: values.sensitivity,
                isExportable: values.isExportable,
              }}
            />
          </div>
        </form>
      </div>
      <div className="card-f">
        <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={isDirty} backTo={backTo} />
      </div>
      {confirming ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message={confirmMessage ?? ''}
          onClose={() => setConfirming(null)}
          onConfirm={() => void save(confirming)}
        />
      ) : null}
    </div>
  );
}
