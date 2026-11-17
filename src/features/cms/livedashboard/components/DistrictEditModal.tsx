import { Modal } from '../../../../components/ui/Overlay';
import MasterField, { fieldAria } from '../../components/MasterField';
import { toastOk } from '../../shared';
import { DISTRICT_STATUSES } from '../constants';
import { liveDashboardService } from '../services/liveDashboardService';
import type { ApiLiveDashboardDistrict, DistrictStatus } from '../types/livedashboard.types';
import {
  DISTRICT_FIGURES,
  districtChanges,
  districtFigureLabel,
  districtToForm,
  validateDistrictForm,
} from '../validation/livedashboard.validation';
import { useLiveForm } from './useLiveForm';

const FORM_ID = 'cms-livedashboard-district-form';

/*
 * Edit one district of the map, in a dialog over the tab: its status (the tile's colour) and its figures (the
 * tooltip's "<enrolled> of <target> enrolled", and the district office page's figures). Only what changed is sent,
 * with the version the dialog was opened at, so a save over someone else's newer edit is refused. The dialog stays
 * open on any failure, with what was typed.
 */
export default function DistrictEditModal({
  district,
  onClose,
  onSaved,
}: {
  district: ApiLiveDashboardDistrict;
  onClose: () => void;
  onSaved: (d: ApiLiveDashboardDistrict) => void | Promise<void>;
}) {
  const { values, set, show, touch, submit, busy } = useLiveForm(FORM_ID, districtToForm(district), validateDistrictForm, async (v) => {
    const saved = await liveDashboardService.updateDistrict(district.code, districtChanges(district, v));
    toastOk(`${district.name.en} updated`);
    await onSaved(saved);
  });

  return (
    <Modal
      title={`Edit district — ${district.name.en}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <p className="muted fs12" style={{ margin: '0 0 10px' }}>
          <span lang="mr">{district.name.mr}</span> &middot; code <span className="mono">{district.code}</span>
        </p>
        <MasterField id="ld-district-status" label="Status" required error={show('status')} hint="The tile's colour on the map, and the status in its tooltip.">
          <select
            className="inp"
            {...fieldAria('ld-district-status', show('status'))}
            value={values.status}
            onChange={(e) => set('status', e.target.value as DistrictStatus)}
          >
            {DISTRICT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.en} — {s.mr}
              </option>
            ))}
          </select>
        </MasterField>
        <div className="grid g2 mt10">
          {DISTRICT_FIGURES.map((f) => (
            <MasterField key={f} id={`ld-district-${f}`} label={districtFigureLabel(f)} required error={show(f)}>
              <input
                className="inp"
                type="number"
                inputMode="numeric"
                min={0}
                max={f === 'attendancePct' ? 100 : undefined}
                step={1}
                {...fieldAria(`ld-district-${f}`, show(f))}
                value={values[f]}
                onChange={(e) => set(f, e.target.value)}
                onBlur={() => touch(f)}
              />
            </MasterField>
          ))}
        </div>
      </form>
    </Modal>
  );
}
