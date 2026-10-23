import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterFormActions from '../../components/MasterFormActions';
import { LoadState, toastError, toastOk, useApiData } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { usePageTitle } from '../../useMasterQuery';
import { boardService } from '../services/boardService';
import type { ApiBoardSection, BoardField } from '../types/board.types';
import { sectionPayload, sectionToForm, serverErrors, validateSectionForm, type SectionFormValues } from '../validation/board.validation';
import { BOARD_CRUMBS } from '../constants';

const FORM_ID = 'cms-board-settings-form';

/*
 * Section settings — the heading and subtitle above the member cards and the notice below them.
 * Kept apart from the members so the introduction can be edited without touching any card.
 */
export default function BoardSettingsEdit() {
  usePageTitle('Board Members — Section Settings');
  const can = useCan();
  const detail = useApiData(() => boardService.getSection(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[...BOARD_CRUMBS, { l: 'Section settings' }]}
        title="Section Settings"
        sub="The heading and subtitle above the member cards, and the notice shown below them, in Marathi and English."
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data && !can('updateBoardMember') ? (
        <Callout tone="warn" title="You can view this section but not change it">
          Editing the section settings needs the &ldquo;Update Board Members Management&rdquo; permission.
        </Callout>
      ) : null}
      {detail.data && can('updateBoardMember') ? <SettingsForm key={detail.data.updatedAt} section={detail.data} /> : null}
    </div>
  );
}

function SettingsForm({ section }: { section: ApiBoardSection }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SectionFormValues>(() => sectionToForm(section));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<BoardField>>({});
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
      await boardService.updateSection(sectionPayload(values, section.updatedAt));
      setDirty(false);
      toastOk('Section settings updated');
      navigate('/cms/board-members');
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

  const pairField = (
    key: 'heading' | 'subtitle' | 'noticeTitle' | 'noticeBody',
    label: string,
    max: number,
    opts: { required?: boolean; multiline?: boolean; hint?: string } = {},
  ) => (
    <BilingualField
      id={`board-settings-${key}`}
      label={label}
      maxLength={max}
      multiline={opts.multiline}
      required={opts.required ?? false}
      value={values[key]}
      onChange={(v) => set(key, v)}
      onBlur={(half) => touch(`${key}.${half}`)}
      errorMr={show(`${key}.mr`)}
      errorEn={show(`${key}.en`)}
      hint={opts.hint}
    />
  );

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Section introduction</h3>
          </div>
          <div className="card-b">
            {pairField('heading', 'Heading', 150, { required: true })}
            <div className="mt10">
              {pairField('subtitle', 'Subtitle', 300, { hint: 'Optional — leave both languages blank to show no subtitle.' })}
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Notice below the cards</h3>
          </div>
          <div className="card-b">
            <label className="f ac gp8 fs13 mb10">
              <input type="checkbox" checked={values.showNotice} onChange={(e) => set('showNotice', e.target.checked)} />
              Show the notice on the website
            </label>
            {pairField('noticeTitle', 'Notice heading', 150, { hint: 'Optional.' })}
            <div className="mt10">
              {pairField('noticeBody', 'Notice text', 1000, {
                multiline: true,
                required: values.showNotice,
                hint: values.showNotice ? 'Required while the notice is shown.' : 'Kept, but not shown while the notice is switched off.',
              })}
            </div>
          </div>
        </div>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save settings" busy={busy} dirty={dirty} backTo="/cms/board-members" />
    </>
  );
}
