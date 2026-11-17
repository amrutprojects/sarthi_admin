import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { validateStatForm, type StatFormValues } from '../validation/livedashboard.validation';
import { OrderAndStatus } from './CardForm';
import { useLiveForm } from './useLiveForm';

const FORM_ID = 'cms-livedashboard-stat-form';

/* The Add / Edit side figure form: one line of the list beside the training modes donut. */
export default function StatForm({
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
  const { values, set, show, touch, submit, busy, dirty } = useLiveForm(FORM_ID, initial, validateStatForm, onSave);

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className="card mb14">
          <div className="card-h">
            <h3>Figure details</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="ld-stat-label"
              label="Label"
              maxLength={80}
              value={values.label}
              onChange={(v) => set('label', v)}
              onBlur={(half) => touch(`label.${half}`)}
              errorMr={show('label.mr')}
              errorEn={show('label.en')}
              hint="The name on the left of the line, e.g. मंजूर केंद्रे / Approved centres."
            />
            <div className="mt10">
              <MasterField
                id="ld-stat-value"
                label="Value"
                required
                error={show('value')}
                hint="The figure on the right, exactly as it should read — e.g. 10, 78% or 21 / 36."
              >
                <input
                  className="inp"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={30}
                  {...fieldAria('ld-stat-value', show('value'))}
                  value={values.value}
                  onChange={(e) => set('value', e.target.value)}
                  onBlur={() => touch('value')}
                  style={{ maxWidth: 220 }}
                />
              </MasterField>
            </div>
          </div>
        </div>

        <OrderAndStatus
          prefix="ld-stat"
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
