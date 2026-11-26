import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import type { ImpactField } from '../types/impact.types';
import { serverErrors, validateStatForm, type StatFormValues } from '../validation/impact.validation';
import ImpactStatPreview from './ImpactStatPreview';

const FORM_ID = 'cms-impact-form';

/*
 * The Add / Edit statistic form, on its own page like every other CMS form, with a live preview of
 * the card as the website will draw it.
 *
 * Entered values survive a failed save; field messages the server returned are shown on the fields.
 */
export default function ImpactStatForm({
  initial,
  submitLabel,
  backTo,
  isCreate,
  onSave,
}: {
  initial: StatFormValues;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  onSave: (values: StatFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<StatFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [server, setServer] = useState<FieldErrors<ImpactField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateStatForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? server[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));
  const set = <K extends keyof StatFormValues>(key: K, value: StatFormValues[K]) => {
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
    if (!isValid(local)) {
      revealFirstError();
      return;
    }
    setBusy(true);
    setServer({});
    try {
      await onSave(values);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.details.length) {
        const mapped = serverErrors(err.details);
        flushSync(() => setServer(mapped));
        if (!isValid(mapped)) {
          revealFirstError();
          return;
        }
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const valueError = show('value');

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Card preview</h3>
            <span className="muted fs12">As it will appear in the SARTHI&rsquo;s Impact section</span>
          </div>
          <div className="card-b">
            <ImpactStatPreview value={values.value} label={values.label} />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Statistic details</h3>
          </div>
          <div className="card-b">
            <MasterField
              id="impact-value"
              label="Value"
              required
              error={valueError}
              hint="The figure in large type, exactly as it should read — e.g. 6+, 1,000+ or 36. It is shown as typed; nothing is counted automatically."
            >
              <input
                className="inp"
                type="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={20}
                {...fieldAria('impact-value', valueError)}
                value={values.value}
                onChange={(e) => set('value', e.target.value)}
                onBlur={() => touch('value')}
                style={{ maxWidth: 220 }}
              />
            </MasterField>
            <div className="mt10">
              <BilingualField
                id="impact-label"
                label="Label"
                maxLength={80}
                value={values.label}
                onChange={(v) => set('label', v)}
                onBlur={(half) => touch(`label.${half}`)}
                errorMr={show('label.mr')}
                errorEn={show('label.en')}
                hint="The line under the figure, e.g. योजना सुरू / Schemes running."
              />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Order and visibility</h3>
          </div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField
                id="impact-order"
                label="Display order"
                error={show('displayOrder')}
                hint={isCreate ? 'Leave blank to add the card at the end of the row.' : 'Lower numbers are shown first.'}
              >
                <input
                  className="inp"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={999}
                  step={1}
                  {...fieldAria('impact-order', show('displayOrder'))}
                  value={values.displayOrder}
                  placeholder={isCreate ? 'End of the row' : undefined}
                  onChange={(e) => set('displayOrder', e.target.value)}
                  onBlur={() => touch('displayOrder')}
                />
              </MasterField>
              <MasterField id="impact-active" label="Status" hint="Inactive cards stay here but are not shown on the website.">
                <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
                  <input id="impact-active" type="checkbox" checked={values.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                  Active — show on the website
                </label>
              </MasterField>
            </div>
          </div>
        </div>
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}
