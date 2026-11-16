import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Callout, PageHead } from '../../../../components/ui';
import BackButton from '../../components/BackButton';
import { useCan } from '../../../../modules/auth/components/Can';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { LoadState, toastError, toastOk, useApiData } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { usePageTitle } from '../../useMasterQuery';
import { BRANDBAR_CRUMBS, BRANDBAR_TAB_PATH } from '../constants';
import { brandBarService } from '../services/brandBarService';
import type { ApiBrandBar, BrandBarField } from '../types/brandbar.types';
import {
  FULL_NAME_MAX,
  PARTNER_LABEL_MAX,
  PARTNER_NAME_MAX,
  TITLE_MAX,
  brandBarPayload,
  brandBarToForm,
  serverErrors,
  validateBrandBarForm,
  type BrandBarFormValues,
} from '../validation/brandbar.validation';
import BrandBarPreview from '../components/BrandBarPreview';

const FORM_ID = 'cms-brand-bar-form';

/*
 * Edit Brand Bar — the white bar under the top bar of the public website: the bold title, the academy's full name
 * in Marathi and in English (both lines shown together, each left out when blank), and the implementation partner
 * at the right (its small label in the visitor's language; no partner name, no partner block), with a switch that
 * hides the partner block while keeping its label and name.
 */
export default function BrandBarEdit() {
  usePageTitle('Edit Brand Bar — Brand Bar');
  const can = useCan();
  const detail = useApiData(() => brandBarService.get(), []);

  return (
    <div className="page">
      <PageHead
        crumbs={[...BRANDBAR_CRUMBS, { l: 'Edit' }]}
        title="Edit Brand Bar"
        sub="The title, the full name and the implementation partner in the white bar under the top bar of the public website."
        back={<BackButton to={BRANDBAR_TAB_PATH} />}
      />
      <LoadState loading={detail.loading} error={detail.error} onRetry={() => void detail.reload()} />
      {detail.data && !can('updateBrandBar') ? (
        <Callout tone="warn" title="You can view this section but not change it">
          Editing the brand bar needs the &ldquo;Update Brand Bar&rdquo; permission.
        </Callout>
      ) : null}
      {detail.data && can('updateBrandBar') ? <BrandBarForm key={detail.data.updatedAt} bar={detail.data} /> : null}
    </div>
  );
}

function BrandBarForm({ bar }: { bar: ApiBrandBar }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<BrandBarFormValues>(() => brandBarToForm(bar));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<BrandBarField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateBrandBarForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof BrandBarFormValues>(key: K, value: BrandBarFormValues[K]) => {
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
      await brandBarService.update(brandBarPayload(values, bar.updatedAt));
      setDirty(false);
      toastOk('Brand bar updated');
      navigate(BRANDBAR_TAB_PATH);
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

  const titleError = show('title');
  const partnerError = show('partnerName');

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Brand bar preview</h3>
            <span className="muted fs12">As the bar will read with these values</span>
          </div>
          <div className="card-b">
            <BrandBarPreview
              title={values.title}
              fullName={values.fullName}
              partnerLabel={values.partnerLabel}
              partnerName={values.partnerName}
              showPartner={values.showPartner}
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Title and full name</h3>
          </div>
          <div className="card-b">
            <MasterField
              id="brand-bar-title"
              label="Title"
              required
              error={titleError}
              hint="The bold text at the left of the bar, e.g. AMRUT KALASH."
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                maxLength={TITLE_MAX}
                {...fieldAria('brand-bar-title', titleError)}
                value={values.title}
                onChange={(e) => set('title', e.target.value)}
                onBlur={() => touch('title')}
              />
            </MasterField>
            <BilingualField
              id="brand-bar-full-name"
              label="Full name"
              maxLength={FULL_NAME_MAX}
              required={false}
              value={values.fullName}
              onChange={(v) => set('fullName', v)}
              onBlur={(half) => touch(`fullName.${half}`)}
              errorMr={show('fullName.mr')}
              errorEn={show('fullName.en')}
              hint="The two lines under the title. The website shows both together, whatever the visitor's language; a blank line is not shown."
            />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Implementation partner</h3>
          </div>
          <div className="card-b">
            <label className="f ac gp8 fs13">
              <input
                type="checkbox"
                aria-describedby="brand-bar-show-partner-hint"
                checked={values.showPartner}
                onChange={(e) => set('showPartner', e.target.checked)}
              />
              Show the implementation partner box on the website
            </label>
            <p id="brand-bar-show-partner-hint" className="muted fs12 mt4 mb14">
              When off, the website shows the logo only; the partner&rsquo;s label and name are kept for later.
            </p>
            <MasterField
              id="brand-bar-partner-name"
              label="Partner name"
              error={partnerError}
              hint="The bold name at the right of the bar, e.g. SUMAGO INFOTECH PVT LTD. Leave blank to show no partner."
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                maxLength={PARTNER_NAME_MAX}
                {...fieldAria('brand-bar-partner-name', partnerError)}
                value={values.partnerName}
                onChange={(e) => set('partnerName', e.target.value)}
                onBlur={() => touch('partnerName')}
              />
            </MasterField>
            <BilingualField
              id="brand-bar-partner-label"
              label="Partner label"
              maxLength={PARTNER_LABEL_MAX}
              required={false}
              value={values.partnerLabel}
              onChange={(v) => set('partnerLabel', v)}
              onBlur={(half) => touch(`partnerLabel.${half}`)}
              errorMr={show('partnerLabel.mr')}
              errorEn={show('partnerLabel.en')}
              hint="The small text above the partner name, in the visitor's language, e.g. अंमलबजावणी भागीदार / Implementation Partner. Leave both languages blank to show no label."
            />
          </div>
        </div>
      </form>
      <MasterFormActions formId={FORM_ID} submitLabel="Save changes" busy={busy} dirty={dirty} backTo={BRANDBAR_TAB_PATH} />
    </>
  );
}
