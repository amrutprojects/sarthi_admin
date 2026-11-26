import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterFormActions from '../../components/MasterFormActions';
import { LoadState, toastError, toastOk, useApiData } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { usePageTitle } from '../../useMasterQuery';
import { SCHEMES_CRUMBS, SCHEMES_TAB_PATH } from '../constants';
import { schemesService } from '../services/schemesService';
import type { ApiSchemesSection, SchemesField } from '../types/schemes.types';
import { sectionPayload, sectionToForm, serverErrors, validateSectionForm, type SectionFormValues } from '../validation/schemes.validation';

const FORM_ID = 'cms-schemes-settings-form';

/*
 * Section settings — the public heading (सारथी योजना विभाग / SARTHI Schemes by default) and subtitle
 * above the cards, the default label of each card's button, and whether the section is shown at all.
 * Kept apart from the schemes, and independent of this module's own name in the admin panel.
 */
export default function SchemesSettingsEdit() {
  usePageTitle('Section Settings — SARTHI Schemes Management');
  const can = useCan();
  const detail = useApiData(() => schemesService.getSection(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[...SCHEMES_CRUMBS, { l: 'Section settings' }]}
        title="Section Settings"
        sub="The heading and subtitle above the scheme cards on the public website, the default button label, and the section's visibility."
        back={<BackButton to={SCHEMES_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data && !can('updateScheme') ? (
        <Callout tone="warn" title="You can view this section but not change it">
          Editing the section settings needs the &ldquo;Update SARTHI Schemes Management&rdquo; permission.
        </Callout>
      ) : null}
      {detail.data && can('updateScheme') ? <SettingsForm key={detail.data.updatedAt} section={detail.data} /> : null}
    </div>
  );
}

function SettingsForm({ section }: { section: ApiSchemesSection }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SectionFormValues>(() => sectionToForm(section));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<SchemesField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateSectionForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof SectionFormValues>(key: K, value: SectionFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    flushSync(() => setSubmitted(true));
    if (!isValid(local)) return;
    setBusy(true);
    setServer({});
    try {
      /* The version this form was opened with: a 409 means someone else saved in the meantime. */
      await schemesService.updateSection(sectionPayload(values, section.updatedAt));
      setDirty(false);
      toastOk('Section settings updated');
      navigate(SCHEMES_TAB_PATH);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(err.details);
        setServer(mapped);
        if (!isValid(mapped)) return;
      }
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
            <h3>Public section</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="schemes-settings-heading"
              label="Heading"
              maxLength={120}
              value={values.heading}
              onChange={(v) => set('heading', v)}
              onBlur={(half) => touch(`heading.${half}`)}
              errorMr={show('heading.mr')}
              errorEn={show('heading.en')}
              hint="Shown above the scheme cards on the home page. This module's name in the admin panel does not change it."
            />
            <div className="mt10">
              <BilingualField
                id="schemes-settings-subtitle"
                label="Subtitle"
                maxLength={300}
                required={false}
                value={values.subtitle}
                onChange={(v) => set('subtitle', v)}
                onBlur={(half) => touch(`subtitle.${half}`)}
                errorMr={show('subtitle.mr')}
                errorEn={show('subtitle.en')}
                hint="Optional — leave both languages blank to show no subtitle."
              />
            </div>
            <div className="mt10">
              <BilingualField
                id="schemes-settings-label"
                label="Default button label"
                maxLength={60}
                value={values.buttonLabel}
                onChange={(v) => set('buttonLabel', v)}
                onBlur={(half) => touch(`buttonLabel.${half}`)}
                errorMr={show('buttonLabel.mr')}
                errorEn={show('buttonLabel.en')}
                hint="Printed on the button of every scheme that has no label of its own."
              />
            </div>
            <label className="f ac gp8 fs13 mt10">
              <input type="checkbox" checked={values.showSection} onChange={(e) => set('showSection', e.target.checked)} />
              Show this section on the public website
            </label>
            {!values.showSection ? (
              <p className="muted fs12 mt10">While hidden, the home page leaves the whole section out. The schemes are kept.</p>
            ) : null}
          </div>
        </div>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save settings" busy={busy} dirty={dirty} backTo={SCHEMES_TAB_PATH} />
    </>
  );
}
