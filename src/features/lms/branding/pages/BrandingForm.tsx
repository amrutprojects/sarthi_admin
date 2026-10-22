import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '../../../../services/api-client';
import MasterField, { fieldAria } from '../../../cms/components/MasterField';
import MasterFormActions from '../../../cms/components/MasterFormActions';
import { ConfirmModal, toastError, toastOk } from '../../../cms/shared';
import ColourField from '../components/ColourField';
import LanguageChecklist from '../components/LanguageChecklist';
import LogoManager from '../components/LogoManager';
import { BrandPreview, SettingValue } from '../components/SettingValue';
import { logoOf } from '../services/brandingOverview';
import {
  BRANDING_GROUPS, BRANDING_GROUP_LABELS, DISPLAY_NAME_MAX, SUPPORT_HOURS_MAX,
  type ApiBranding, type BrandingKey, type BrandingLanguageOptions, type BrandingSetting, type BrandingSettingType, type UpdateBrandingInput,
} from '../types/branding.types';
import {
  brandingFormContext, brandingFormFrom, brandingFormSchema, brandingPayload, brandingServerErrors, type BrandingFormValues,
} from '../validation/branding.validation';
import { contrastWarnings } from '../validation/contrast';

interface BrandingFormProps {
  branding: ApiBranding;
  /* The platform languages (To Be Confirmed, OQ-023), from GET /lms/entities/form-options. */
  languageOptions: BrandingLanguageOptions;
  /* Resolves when the settings were saved. The caller toasts and navigates; this component only reports. */
  onSave: (payload: UpdateBrandingInput) => Promise<void>;
  backTo: string;
  /* When set, the user confirms this message before the changes are saved. */
  confirmMessage?: string;
  /*
   * Whether the user may change a group's keys (L-04: branding → lms-branding.update, contact and settings →
   * lms-branding.update-settings). A group they may not change is shown read-only and never sent. Default: all.
   */
  canEdit?: (group: string) => boolean;
}

const FORM_ID = 'lms-branding-form';
const ALL_GROUPS = () => true;

/* The control this screen has for each catalogue key. A key or type it does not know is shown read-only. */
const CONTROL: Record<BrandingKey, BrandingSettingType> = {
  display_name: 'text',
  logo_storage_key: 'image',
  colours: 'colour_pair',
  support_email: 'email',
  support_phone: 'phone',
  support_hours: 'text_per_language',
  languages: 'language_list',
};

const wide = { gridColumn: '1 / -1' } as const;

/*
 * The Branding & Settings form (F-LMS-04 Table 29), generated from the catalogue the API returns: sections are
 * its groups, fields its keys in order, with the API's label, description and required flag; the control is
 * chosen by the key's type. React Hook Form + Zod with the backend's rules and messages; errors show once a
 * field is touched or on submit, and the server's field answers (400 / 422) land on the matching control.
 *
 * Only changed keys are sent (PATCH). An emptied box resets the key to its default. The logo has its own
 * endpoints and buttons (LogoManager) and is not part of Save.
 */
export default function BrandingForm({ branding, languageOptions, onSave, backTo, confirmMessage, canEdit = ALL_GROUPS }: BrandingFormProps) {
  const platform = languageOptions.languages;
  const platformCodes = useMemo(() => platform.map((l) => l.code), [platform]);
  /* The values and rules as loaded; the form keeps its own state from here on. */
  const [initial] = useState(() => brandingFormFrom(branding, platformCodes));
  const [schema] = useState(() => brandingFormSchema(brandingFormContext(branding, platform)));

  const {
    register, control, handleSubmit, watch, setError, reset, getValues,
    formState: { errors, isDirty },
  } = useForm<BrandingFormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: 'onTouched' });

  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<UpdateBrandingInput | null>(null);
  const [logoPending, setLogoPending] = useState(false);

  const live = watch();
  const entity = branding.entity;
  const missing = new Set(branding.missingRequired);

  async function save(payload: UpdateBrandingInput) {
    setPending(null);
    setBusy(true);
    try {
      await onSave(payload);
      reset(getValues());
    } catch (err) {
      /* Field-level answers (422 validation, 400 default-language rule) go next to the field. */
      if (err instanceof ApiError && [400, 409, 422].includes(err.status) && err.details.length) {
        const { fields, other } = brandingServerErrors(err.details, getValues());
        for (const f of fields) setError(f.path, { type: 'server', message: f.message }, { shouldFocus: f === fields[0] });
        if (fields.length && !other.length) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const submit = handleSubmit(async (values) => {
    if (busy) return;
    const payload = brandingPayload(values, initial, platformCodes);
    if (!Object.keys(payload).length) {
      toastOk('No changes to save.');
      return;
    }
    if (confirmMessage) {
      setPending(payload);
      return;
    }
    await save(payload);
  });

  const required = (s: BrandingSetting) => s.required && s.fallback === 'none';

  function field(s: BrandingSetting): ReactNode {
    /* Not registered, so the form keeps the loaded value and brandingPayload never sends the key. */
    if (!canEdit(s.group)) {
      return (
        <div className="fld" key={s.key} style={wide}>
          <label>{s.label}</label>
          <div className="fs13">
            <SettingValue setting={s} languages={platform} />
          </div>
        </div>
      );
    }
    if (s.sensitive || CONTROL[s.key] !== s.type) {
      return (
        <div className="fld" key={s.key} style={wide}>
          <label>{s.label}</label>
          <div className="muted fs12">{s.description} This setting cannot be changed on this screen yet.</div>
        </div>
      );
    }
    const id = `lb-${s.key}`;
    switch (s.key) {
      case 'display_name':
        return (
          <MasterField key={s.key} id={id} label={s.label} required={required(s)} error={errors.display_name?.message} hint={`${s.description} Leave empty to use “${entity.name}”.`}>
            <input
              className="inp"
              {...fieldAria(id, errors.display_name?.message)}
              {...register('display_name')}
              maxLength={DISPLAY_NAME_MAX + 20}
              placeholder={entity.name}
              autoComplete="off"
            />
          </MasterField>
        );
      case 'logo_storage_key':
        return (
          <LogoManager key={s.key} entityId={entity.id} entityName={entity.name} setting={s} logo={logoOf(branding)} rules={branding.logoRules} onPendingChange={setLogoPending} />
        );
      case 'colours': {
        const warnings = contrastWarnings(live.colours.primary, live.colours.accent);
        return (
          <div key={s.key} style={wide}>
            <div className="fs12" style={{ fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div className="grid g2">
              <Controller
                control={control}
                name="colours.primary"
                render={({ field: f, fieldState }) => (
                  <ColourField id="lb-colours-primary" label="Primary colour" value={f.value} onChange={f.onChange} onBlur={f.onBlur} error={fieldState.error?.message} hint="#RRGGBB. Empty = the platform default." />
                )}
              />
              <Controller
                control={control}
                name="colours.accent"
                render={({ field: f, fieldState }) => (
                  <ColourField id="lb-colours-accent" label="Accent colour" value={f.value} onChange={f.onChange} onBlur={f.onBlur} error={fieldState.error?.message} hint="#RRGGBB. Empty = the platform default." />
                )}
              />
            </div>
            <div className="hint" style={{ marginTop: -4, marginBottom: 8 }}>{s.description}</div>
            {warnings.length ? (
              <div className="callout c-warn mb14" role="status">
                <div>
                  <b>Contrast warning (does not stop saving). </b>
                  {warnings.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              </div>
            ) : null}
            <BrandPreview
              displayName={live.display_name.trim() || entity.name}
              primary={/^#[0-9A-F]{6}$/i.test(live.colours.primary) ? live.colours.primary : null}
              accent={/^#[0-9A-F]{6}$/i.test(live.colours.accent) ? live.colours.accent : null}
            />
          </div>
        );
      }
      case 'support_email':
        return (
          <MasterField
            key={s.key}
            id={id}
            label={s.label}
            required={required(s)}
            error={errors.support_email?.message}
            hint={missing.has('support_email') ? `${s.description} Not set yet: learners see no support contact until it is.` : s.description}
          >
            <input className="inp" type="email" {...fieldAria(id, errors.support_email?.message)} {...register('support_email')} maxLength={254} autoComplete="off" placeholder="support@example.org" />
          </MasterField>
        );
      case 'support_phone':
        return (
          <MasterField key={s.key} id={id} label={s.label} required={required(s)} error={errors.support_phone?.message} hint={`${s.description} Empty = not shown.`}>
            <input className="inp" type="tel" {...fieldAria(id, errors.support_phone?.message)} {...register('support_phone')} maxLength={24} autoComplete="off" placeholder="+919876543210" />
          </MasterField>
        );
      case 'support_hours':
        return (
          <div key={s.key} style={wide}>
            <div className="fs12" style={{ fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div className="grid g2">
              {Object.keys(initial.support_hours).map((code) => {
                const lang = platform.find((l) => l.code === code);
                const hid = `lb-hours-${code}`;
                const err = errors.support_hours?.[code]?.message;
                const enabled = live.languages.includes(code) || code === entity.defaultLanguage;
                return (
                  <MasterField
                    key={code}
                    id={hid}
                    label={`${s.label} — ${lang ? `${lang.label} (${code})` : `${code} (not in the platform list)`}`}
                    error={err}
                    hint={`${enabled ? '' : 'This language is not enabled for learners. '}At most ${SUPPORT_HOURS_MAX} characters; empty = not shown.`}
                  >
                    <input className="inp" {...fieldAria(hid, err)} {...register(`support_hours.${code}`)} maxLength={SUPPORT_HOURS_MAX + 20} autoComplete="off" placeholder="Mon–Sat, 10:00–18:00" />
                  </MasterField>
                );
              })}
            </div>
            <div className="hint" style={{ marginTop: -4 }}>{s.description}</div>
          </div>
        );
      case 'languages':
        return (
          <div key={s.key} style={wide}>
            <Controller
              control={control}
              name="languages"
              render={({ field: f, fieldState }) => (
                <LanguageChecklist
                  id={id}
                  label={s.label}
                  languages={platform}
                  value={f.value}
                  onChange={f.onChange}
                  onBlur={f.onBlur}
                  defaultLanguage={entity.defaultLanguage}
                  required={required(s)}
                  error={fieldState.error?.message}
                  hint={
                    languageOptions.languagesConfirmed
                      ? s.description
                      : `${s.description} The platform language list is To Be Confirmed (OQ-023).`
                  }
                />
              )}
            />
          </div>
        );
      default:
        return null;
    }
  }

  const known = new Set<string>(BRANDING_GROUPS);
  const sections = [
    ...BRANDING_GROUPS.map((g) => ({ key: g, title: BRANDING_GROUP_LABELS[g], settings: branding.settings.filter((s) => s.group === g) })),
    { key: 'other', title: 'Other', settings: branding.settings.filter((s) => !known.has(s.group)) },
  ].filter((x) => x.settings.length);

  return (
    <div className="card">
      <div className="card-b">
        <form id={FORM_ID} onSubmit={(e) => void submit(e)} noValidate>
          {sections.map((sec, i) => (
            <section key={sec.key} aria-labelledby={`lb-sec-${sec.key}`}>
              <h3 id={`lb-sec-${sec.key}`} className="fs13" style={{ margin: i ? '14px 0 10px' : '0 0 10px' }}>
                {sec.title}
                {canEdit(sec.key) ? null : <span className="muted fs12" style={{ fontWeight: 400 }}> · read only for your role</span>}
              </h3>
              <div className="grid g2">{sec.settings.map(field)}</div>
            </section>
          ))}
        </form>
      </div>
      <div className="card-f">
        <MasterFormActions formId={FORM_ID} submitLabel="Save changes" busy={busy} dirty={isDirty || logoPending} backTo={backTo} />
      </div>
      {pending ? (
        <ConfirmModal
          title="Save changes"
          busy={busy}
          confirmLabel="Yes, save"
          message={confirmMessage ?? ''}
          onClose={() => setPending(null)}
          onConfirm={() => void save(pending)}
        />
      ) : null}
    </div>
  );
}
