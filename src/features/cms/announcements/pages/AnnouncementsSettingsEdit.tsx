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
import { ANNOUNCEMENTS_CRUMBS, ANNOUNCEMENTS_TAB_PATH } from '../constants';
import { announcementsService } from '../services/announcementsService';
import type { AnnouncementsField, ApiAnnouncementsSection } from '../types/announcements.types';
import {
  sectionPayload,
  sectionToForm,
  serverErrors,
  validateSectionForm,
  type SectionFormValues,
} from '../validation/announcements.validation';

const FORM_ID = 'cms-announcements-settings-form';

/*
 * Ticker settings — the label in the pill at the start of the ticker (सूचना / Announcements by default) and
 * whether the ticker is shown on the website at all. Kept apart from the announcements, and independent of this
 * module's own name in the admin panel.
 */
export default function AnnouncementsSettingsEdit() {
  usePageTitle('Ticker Settings — Announcements');
  const can = useCan();
  const detail = useApiData(() => announcementsService.getSection(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[...ANNOUNCEMENTS_CRUMBS, { l: 'Ticker settings' }]}
        title="Ticker Settings"
        sub="The label at the start of the announcements ticker on the public website, and whether the ticker is shown."
        back={<BackButton to={ANNOUNCEMENTS_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data && !can('updateAnnouncement') ? (
        <Callout tone="warn" title="You can view this section but not change it">
          Editing the ticker settings needs the &ldquo;Update Announcements&rdquo; permission.
        </Callout>
      ) : null}
      {detail.data && can('updateAnnouncement') ? <SettingsForm key={detail.data.updatedAt} section={detail.data} /> : null}
    </div>
  );
}

function SettingsForm({ section }: { section: ApiAnnouncementsSection }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SectionFormValues>(() => sectionToForm(section));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<AnnouncementsField>>({});
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
      await announcementsService.updateSection(sectionPayload(values, section.updatedAt));
      setDirty(false);
      toastOk('Ticker settings updated');
      navigate(ANNOUNCEMENTS_TAB_PATH);
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
            <h3>Public ticker</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="announcements-settings-label"
              label="Label"
              maxLength={60}
              value={values.label}
              onChange={(v) => set('label', v)}
              onBlur={(half) => touch(`label.${half}`)}
              errorMr={show('label.mr')}
              errorEn={show('label.en')}
              hint="Shown in the small pill at the start of the ticker, e.g. सूचना / Announcements. This module's name in the admin panel does not change it."
            />
            <label className="f ac gp8 fs13 mt10">
              <input type="checkbox" checked={values.showSection} onChange={(e) => set('showSection', e.target.checked)} />
              Show the ticker on the public website
            </label>
            {!values.showSection ? (
              <p className="muted fs12 mt10">While hidden, the website leaves the whole strip out. The announcements are kept.</p>
            ) : null}
          </div>
        </div>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save settings" busy={busy} dirty={dirty} backTo={ANNOUNCEMENTS_TAB_PATH} />
    </>
  );
}
