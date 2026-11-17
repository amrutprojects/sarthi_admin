import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import BackButton from '../../components/BackButton';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { LoadState, toastOk, useApiData } from '../../shared';
import { usePageTitle } from '../../useMasterQuery';
import { useLiveForm } from '../components/useLiveForm';
import { LIVE_DASHBOARD_CRUMBS, LIVE_DASHBOARD_TAB_PATH } from '../constants';
import { liveDashboardService } from '../services/liveDashboardService';
import type { ApiLiveDashboardSettings, Bilingual } from '../types/livedashboard.types';
import { settingsPayload, settingsToForm, validateSettingsForm, type SettingsFormValues } from '../validation/livedashboard.validation';

const FORM_ID = 'cms-livedashboard-settings-form';

/*
 * Section settings — every text of the Live Dashboard that is not a card, a side figure or a district: the heading,
 * the note under the section, the map card's title, the training modes card (title, the two modes and their counts,
 * the donut's centre label), and a switch for each of the note, the map card and the modes card. Whether the whole
 * section is shown is the tab's "Show on website" switch, not part of this form.
 */
export default function LiveDashboardSettingsEdit() {
  usePageTitle('Section Settings — Live Dashboard');
  const can = useCan();
  const detail = useApiData(() => liveDashboardService.getSettings(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[...LIVE_DASHBOARD_CRUMBS, { l: 'Section settings' }]}
        title="Section Settings"
        sub="The texts of the Programme Progress – Live Dashboard section, and which of its parts the website shows."
        back={<BackButton to={LIVE_DASHBOARD_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data && !can('updateLiveDashboard') ? (
        <Callout tone="warn" title="You can view this section but not change it">
          Editing the section settings needs the &ldquo;Update Live Dashboard&rdquo; permission.
        </Callout>
      ) : null}
      {detail.data && can('updateLiveDashboard') ? <SettingsForm key={detail.data.updatedAt} settings={detail.data} /> : null}
    </div>
  );
}

type PairKey = { [K in keyof SettingsFormValues]: SettingsFormValues[K] extends Bilingual ? K : never }[keyof SettingsFormValues];

function SettingsForm({ settings }: { settings: ApiLiveDashboardSettings }) {
  const navigate = useNavigate();
  const { values, set, show, touch, submit, busy, dirty } = useLiveForm(
    FORM_ID,
    settingsToForm(settings),
    validateSettingsForm,
    async (v) => {
      /* The version this form was opened with: a 409 means someone else saved in the meantime. */
      await liveDashboardService.updateSettings(settingsPayload(v, settings.updatedAt));
      toastOk('Section settings updated');
      navigate(LIVE_DASHBOARD_TAB_PATH);
    },
  );

  const pair = (key: PairKey, label: string, max: number, opts: { required?: boolean; hint?: string } = {}) => (
    <BilingualField
      id={`ld-settings-${key}`}
      label={label}
      maxLength={max}
      required={opts.required ?? true}
      value={values[key]}
      onChange={(v) => set(key, v)}
      onBlur={(half) => touch(`${key}.${half}`)}
      errorMr={show(`${key}.mr`)}
      errorEn={show(`${key}.en`)}
      hint={opts.hint}
    />
  );

  const count = (key: 'offlineCount' | 'onlineCount', label: string, hint: string) => (
    <MasterField id={`ld-settings-${key}`} label={label} required error={show(key)} hint={hint}>
      <input
        className="inp"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        {...fieldAria(`ld-settings-${key}`, show(key))}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        onBlur={() => touch(key)}
      />
    </MasterField>
  );

  const toggle = (key: 'showDisclaimer' | 'showMap' | 'showModes', label: string) => (
    <label className="f ac gp8 fs13 mb10">
      <input type="checkbox" checked={values[key]} onChange={(e) => set(key, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Section heading</h3>
          </div>
          <div className="card-b">
            {pair('heading', 'Heading', 150, { hint: 'Shown above the KPI cards, e.g. कार्यक्रम प्रगती – थेट डॅशबोर्ड.' })}
            <div className="mt10">
              {pair('subtitle', 'Subtitle', 300, { required: false, hint: 'Optional — leave both languages blank to show no subtitle.' })}
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>District map card</h3>
          </div>
          <div className="card-b">
            {toggle('showMap', 'Show the district map card on the website')}
            {pair('mapTitle', 'Map title', 120, {
              hint: values.showMap ? 'The title of the card with the map of the districts.' : 'Kept, but not shown while the map card is switched off.',
            })}
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Training modes card</h3>
          </div>
          <div className="card-b">
            {toggle('showModes', 'Show the training modes card on the website')}
            {pair('modesTitle', 'Card title', 120, {
              hint: values.showModes ? 'The title of the card with the donut and the side figures.' : 'Kept, but not shown while the card is switched off.',
            })}
            <div className="mt10">{pair('offlineLabel', 'Offline label', 60, { hint: 'The donut’s first part, e.g. ऑफलाइन (केंद्र) / Offline (centre).' })}</div>
            <div className="mt10">{pair('onlineLabel', 'Online label', 60, { hint: 'The donut’s second part, e.g. ऑनलाइन (केंद्रीय) / Online (central).' })}</div>
            <div className="grid g2 mt10">
              {count('offlineCount', 'Offline count', 'Candidates trained offline: the size of the donut’s first part.')}
              {count('onlineCount', 'Online count', 'Candidates trained online: the size of the donut’s second part.')}
            </div>
            <div className="mt10">
              {pair('donutCenterLabel', 'Donut centre label', 40, {
                hint: 'The line under the donut’s centre figure, which is offline + online, e.g. प्रवेशित / enrolled.',
              })}
            </div>
            <p className="muted fs12 mt10">The figures listed beside the donut are edited in the tab&rsquo;s Side figures table.</p>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Note under the section</h3>
          </div>
          <div className="card-b">
            {toggle('showDisclaimer', 'Show the note on the website')}
            {pair('disclaimer', 'Note', 300, {
              required: false,
              hint: values.showDisclaimer
                ? 'Optional — e.g. a note about where the figures come from. Nothing is shown while both languages are blank.'
                : 'Kept, but not shown while the note is switched off.',
            })}
          </div>
        </div>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save settings" busy={busy} dirty={dirty} backTo={LIVE_DASHBOARD_TAB_PATH} />
    </>
  );
}
