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
import { TOPBAR_CRUMBS, TOPBAR_TAB_PATH } from '../constants';
import { topBarService } from '../services/topBarService';
import type { ApiTopBarLink, ApiTopBarSettings, TopBarField } from '../types/topbar.types';
import {
  GOVERNMENT_NAME_MAX,
  settingsPayload,
  settingsToForm,
  serverErrors,
  validateSettingsForm,
  type SettingsFormValues,
} from '../validation/topbar.validation';
import TopBarPreview from '../components/TopBarPreview';

const FORM_ID = 'cms-top-bar-settings-form';

/*
 * Top bar settings — the bold government name at the left of the strip (Government of Maharashtra by default; left
 * blank it is not shown) and whether the Marathi / English language switch is shown. Kept apart from the link
 * buttons, and independent of this module's own name in the admin panel.
 */
export default function TopBarSettingsEdit() {
  usePageTitle('Top Bar Settings — Top Bar');
  const can = useCan();
  const detail = useApiData(() => topBarService.getSettings(), []);
  /* Only for the preview: the buttons the strip shows around the name and the switch. */
  const links = useApiData(() => topBarService.list(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[...TOPBAR_CRUMBS, { l: 'Top bar settings' }]}
        title="Top Bar Settings"
        sub="The bold text at the left of the strip at the top of the public website, and whether visitors get the language switch."
        back={<BackButton to={TOPBAR_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data && !can('updateTopBar') ? (
        <Callout tone="warn" title="You can view this section but not change it">
          Editing the top bar settings needs the &ldquo;Update Top Bar&rdquo; permission.
        </Callout>
      ) : null}
      {detail.data && can('updateTopBar') ? (
        <SettingsForm key={detail.data.updatedAt} settings={detail.data} links={(links.data ?? []).filter((l) => l.isActive)} />
      ) : null}
    </div>
  );
}

function SettingsForm({ settings, links }: { settings: ApiTopBarSettings; links: ApiTopBarLink[] }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SettingsFormValues>(() => settingsToForm(settings));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<TopBarField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateSettingsForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof SettingsFormValues>(key: K, value: SettingsFormValues[K]) => {
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
      await topBarService.updateSettings(settingsPayload(values, settings.updatedAt));
      setDirty(false);
      toastOk('Top bar settings updated');
      navigate(TOPBAR_TAB_PATH);
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
            <h3>Top bar preview</h3>
            <span className="muted fs12">As the strip will read with these settings, with the buttons now shown on the website</span>
          </div>
          <div className="card-b">
            <TopBarPreview
              governmentName={values.governmentName}
              showLanguageToggle={values.showLanguageToggle}
              buttons={links.map((l) => ({ label: l.label, link: l.link }))}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Public top bar</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="top-bar-settings-government-name"
              label="Government name"
              maxLength={GOVERNMENT_NAME_MAX}
              required={false}
              value={values.governmentName}
              onChange={(v) => set('governmentName', v)}
              onBlur={(half) => touch(`governmentName.${half}`)}
              errorMr={show('governmentName.mr')}
              errorEn={show('governmentName.en')}
              hint="The bold text at the left of the strip, e.g. महाराष्ट्र शासन / Government of Maharashtra. Leave both languages blank to show no text."
            />
            <label className="f ac gp8 fs13 mt10">
              <input type="checkbox" checked={values.showLanguageToggle} onChange={(e) => set('showLanguageToggle', e.target.checked)} />
              Show the language switch
            </label>
            <p className="muted fs12 mt10">
              {values.showLanguageToggle
                ? 'Visitors get one Marathi / English switch at the right of the strip.'
                : 'While hidden, visitors cannot change the language from the strip; the website stays in the language it opened in.'}
            </p>
          </div>
        </div>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save settings" busy={busy} dirty={dirty} backTo={TOPBAR_TAB_PATH} />
    </>
  );
}
