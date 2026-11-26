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
import { ADVISORY_CRUMBS, ADVISORY_PATH } from '../constants';
import { advisoryService } from '../services/advisoryService';
import type { AdvisoryField, ApiAdvisorySection } from '../types/advisory.types';
import {
  MAX,
  sectionPayload,
  sectionToForm,
  serverErrors,
  validateSectionForm,
  type SectionFormValues,
} from '../validation/advisory.validation';

const FORM_ID = 'cms-advisory-settings-form';

/*
 * Section settings — the heading and subtitle above the Advisory Committee members on the website's Advisory Committee page.
 * Kept apart from the Advisory Committee members so the introduction can be edited without touching any of them.
 */
export default function AdvisorySettingsEdit() {
  usePageTitle('Advisory Committee — Section Settings');
  const can = useCan();
  const detail = useApiData(() => advisoryService.getSection(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[...ADVISORY_CRUMBS, { l: 'Section settings' }]}
        title="Section Settings"
        sub="The heading and subtitle above the Advisory Committee members on the website's Advisory Committee page, in Marathi and English."
        back={<BackButton to={ADVISORY_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data && !can('updateAdvisoryMember') ? (
        <Callout tone="warn" title="You can view this section but not change it">
          Editing the section settings needs the &ldquo;Update Advisory Committee Management&rdquo; permission.
        </Callout>
      ) : null}
      {detail.data && can('updateAdvisoryMember') ? <SettingsForm key={detail.data.updatedAt} section={detail.data} /> : null}
    </div>
  );
}

function SettingsForm({ section }: { section: ApiAdvisorySection }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SectionFormValues>(() => sectionToForm(section));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<AdvisoryField>>({});
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
      await advisoryService.updateSection(sectionPayload(values, section.updatedAt));
      setDirty(false);
      toastOk('Section settings updated');
      navigate(ADVISORY_PATH);
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
            <h3>Section introduction</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="advisory-settings-heading"
              label="Heading"
              maxLength={MAX.heading}
              value={values.heading}
              onChange={(v) => set('heading', v)}
              onBlur={(half) => touch(`heading.${half}`)}
              errorMr={show('heading.mr') ?? show('heading')}
              errorEn={show('heading.en')}
              hint="The page heading on the website, e.g. सारथी सल्लागार समिती / Sarthi Advisory Committee."
            />
            <div className="mt10">
              <BilingualField
                id="advisory-settings-subtitle"
                label="Subtitle"
                maxLength={MAX.subtitle}
                required={false}
                value={values.subtitle}
                onChange={(v) => set('subtitle', v)}
                onBlur={(half) => touch(`subtitle.${half}`)}
                errorMr={show('subtitle.mr') ?? show('subtitle')}
                errorEn={show('subtitle.en')}
                hint="Optional. The line under the heading — fill both languages or leave both blank to show no subtitle."
              />
            </div>
          </div>
        </div>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save settings" busy={busy} dirty={dirty} backTo={ADVISORY_PATH} />
    </>
  );
}
