import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { CARD_TONES } from '../constants';
import { validateCardForm, type CardFormValues } from '../validation/livedashboard.validation';
import KpiCardPreview from './KpiCardPreview';
import { useLiveForm } from './useLiveForm';

const FORM_ID = 'cms-livedashboard-card-form';

/*
 * The Add / Edit KPI card form, on its own page like every other CMS form, with a live preview of the card as the
 * website draws it.
 */
export default function CardForm({
  initial,
  submitLabel,
  backTo,
  isCreate,
  onSave,
}: {
  initial: CardFormValues;
  submitLabel: string;
  backTo: string;
  isCreate: boolean;
  onSave: (values: CardFormValues) => Promise<void>;
}) {
  const { values, set, show, touch, submit, busy, dirty } = useLiveForm(FORM_ID, initial, validateCardForm, onSave);

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Card preview</h3>
            <span className="muted fs12">As it will appear in the Live Dashboard section</span>
          </div>
          <div className="card-b">
            <KpiCardPreview label={values.label} value={values.value} detail={values.detail} tone={values.tone} />
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Card details</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="ld-card-label"
              label="Title"
              maxLength={60}
              value={values.label}
              onChange={(v) => set('label', v)}
              onBlur={(half) => touch(`label.${half}`)}
              errorMr={show('label.mr')}
              errorEn={show('label.en')}
              hint="The small line above the figure, e.g. एकूण लक्ष्य / Total target."
            />
            <div className="mt10">
              <MasterField
                id="ld-card-value"
                label="Value"
                required
                error={show('value')}
                hint="The figure exactly as it should read — e.g. 2,000 or 87%. It is shown as typed; nothing is counted automatically."
              >
                <input
                  className="inp"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={20}
                  {...fieldAria('ld-card-value', show('value'))}
                  value={values.value}
                  onChange={(e) => set('value', e.target.value)}
                  onBlur={() => touch('value')}
                  style={{ maxWidth: 220 }}
                />
              </MasterField>
            </div>
            <div className="mt10">
              <BilingualField
                id="ld-card-detail"
                label="Detail"
                required={false}
                maxLength={120}
                value={values.detail}
                onChange={(v) => set('detail', v)}
                onBlur={(half) => touch(`detail.${half}`)}
                errorMr={show('detail.mr')}
                errorEn={show('detail.en')}
                hint="Optional — the line under the figure, e.g. विद्यार्थी / students. Leave both blank for none."
              />
            </div>
          </div>
        </div>

        <div className="card mb14">
          <div className="card-h">
            <h3>Link and colour</h3>
          </div>
          <div className="card-b">
            <div className="grid g2">
              <MasterField
                id="ld-card-link"
                label="Link"
                error={show('link')}
                hint="Optional — a page of this website the card opens, e.g. /programme. Leave blank for a card that is not a link."
              >
                <input
                  className="inp mono"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={200}
                  placeholder="/programme"
                  {...fieldAria('ld-card-link', show('link'))}
                  value={values.link}
                  onChange={(e) => set('link', e.target.value)}
                  onBlur={() => touch('link')}
                />
              </MasterField>
              <MasterField id="ld-card-tone" label="Colour" required error={show('tone')} hint="The card's left edge and figure.">
                <select
                  className="inp"
                  {...fieldAria('ld-card-tone', show('tone'))}
                  value={values.tone}
                  onChange={(e) => set('tone', e.target.value as CardFormValues['tone'])}
                >
                  {CARD_TONES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </MasterField>
            </div>
          </div>
        </div>

        <OrderAndStatus
          prefix="ld-card"
          isCreate={isCreate}
          displayOrder={values.displayOrder}
          isActive={values.isActive}
          error={show('displayOrder')}
          onOrder={(v) => set('displayOrder', v)}
          onActive={(v) => set('isActive', v)}
          onBlur={() => touch('displayOrder')}
        />
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel={submitLabel} busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}

/* The "Order and visibility" card both the card and the figure forms end with. */
export function OrderAndStatus({
  prefix,
  isCreate,
  displayOrder,
  isActive,
  error,
  onOrder,
  onActive,
  onBlur,
}: {
  prefix: string;
  isCreate: boolean;
  displayOrder: string;
  isActive: boolean;
  error?: string;
  onOrder: (v: string) => void;
  onActive: (v: boolean) => void;
  onBlur: () => void;
}) {
  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>Order and visibility</h3>
      </div>
      <div className="card-b">
        <div className="grid g2">
          <MasterField
            id={`${prefix}-order`}
            label="Display order"
            error={error}
            hint={isCreate ? 'Leave blank to add it at the end.' : 'Lower numbers are shown first.'}
          >
            <input
              className="inp"
              type="number"
              inputMode="numeric"
              min={1}
              max={999}
              step={1}
              {...fieldAria(`${prefix}-order`, error)}
              value={displayOrder}
              placeholder={isCreate ? 'At the end' : undefined}
              onChange={(e) => onOrder(e.target.value)}
              onBlur={onBlur}
            />
          </MasterField>
          <MasterField id={`${prefix}-active`} label="Status" hint="Inactive rows stay here but are not shown on the website.">
            <label className="f ac gp8 fs13" style={{ minHeight: 36 }}>
              <input id={`${prefix}-active`} type="checkbox" checked={isActive} onChange={(e) => onActive(e.target.checked)} />
              Active — show on the website
            </label>
          </MasterField>
        </div>
      </div>
    </div>
  );
}
