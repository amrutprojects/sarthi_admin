import { useMemo, useState } from 'react';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MultiSelectList from '../../../lms/components/MultiSelectList';
import { type useDistrictOptions } from '../services/districtOptions';
import type { DistrictRef } from '../types/contact.types';
import {
  emptyCoordinator, emptyOffice, type CoordinatorFormValues, type OfficeFormValues, type SectionErrors,
} from '../validation/contact.validation';

type DistrictOption = DistrictRef & { state: string };

interface SectionProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  errors: SectionErrors;
  onBlur: (field: string) => void;
  districts: ReturnType<typeof useDistrictOptions>;
}

/* ---------------- District / cluster coordinators ---------------- */

/*
 * Coordinator cards. A district can be covered by one coordinator only, so each card's picker offers
 * the districts no other card has taken (the backend enforces the same rule).
 */
export function CoordinatorsSection({ items, onChange, errors, onBlur, districts }: SectionProps<CoordinatorFormValues>) {
  const all = (districts.data ?? []) as DistrictOption[];

  const update = (key: string, patch: Partial<CoordinatorFormValues>) =>
    onChange(items.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    onChange(next);
  };

  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>District / cluster coordinators <span className="sub">{items.length} on the page</span></h3>
        <button type="button" className="btn sm" onClick={() => onChange([...items, emptyCoordinator()])}>
          + Add coordinator
        </button>
      </div>
      <div className="card-b">
        {items.length === 0 ? (
          <div className="hint">
            No coordinators yet. While this list is empty the website keeps showing its built-in coordinator list.
          </div>
        ) : null}

        {items.map((c, index) => {
          const err = (f: string) => errors[`coord.${c.key}.${f}`];
          const takenElsewhere = new Set(items.filter((o) => o.key !== c.key).flatMap((o) => o.districts.map((d) => d.id)));
          const options = all
            .filter((d) => !takenElsewhere.has(d.id))
            .map((d) => ({ id: d.id, label: d.name, sub: d.code, group: d.state }));
          const byId = new Map(all.map((d) => [d.id, d]));

          return (
            <div className="card mb14" key={c.key} style={{ boxShadow: 'none' }}>
              <div className="card-h">
                <h3>Coordinator {index + 1}</h3>
                <div className="f ac gp8">
                  <button type="button" className="btn xs" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">↑</button>
                  <button type="button" className="btn xs" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down">↓</button>
                  <button type="button" className="btn xs tw-text-danger" onClick={() => onChange(items.filter((o) => o.key !== c.key))}>
                    Remove
                  </button>
                </div>
              </div>
              <div className="card-b">
                <div className="grid g3">
                  <MasterField id={`co-${c.key}-name`} label="Name" required error={err('name')}>
                    <input
                      className="inp"
                      {...fieldAria(`co-${c.key}-name`, err('name'))}
                      maxLength={120}
                      value={c.name}
                      onChange={(e) => update(c.key, { name: e.target.value })}
                      onBlur={() => onBlur(`coord.${c.key}.name`)}
                    />
                  </MasterField>
                  <MasterField id={`co-${c.key}-phone`} label="Phone" required error={err('phone')} hint="For example +91 98765 41201. X may mask a digit.">
                    <input
                      className="inp"
                      {...fieldAria(`co-${c.key}-phone`, err('phone'))}
                      type="tel"
                      maxLength={32}
                      value={c.phone}
                      onChange={(e) => update(c.key, { phone: e.target.value })}
                      onBlur={() => onBlur(`coord.${c.key}.phone`)}
                    />
                  </MasterField>
                  <MasterField id={`co-${c.key}-email`} label="Email" error={err('email')} hint="Optional.">
                    <input
                      className="inp"
                      {...fieldAria(`co-${c.key}-email`, err('email'))}
                      type="email"
                      maxLength={255}
                      value={c.email}
                      onChange={(e) => update(c.key, { email: e.target.value })}
                      onBlur={() => onBlur(`coord.${c.key}.email`)}
                    />
                  </MasterField>
                </div>
                <div className="mt10">
                  <MultiSelectList
                    id={`co-${c.key}-districts`}
                    label="Districts covered"
                    noun="districts"
                    options={options}
                    saved={c.districts.map((d) => ({ id: d.id, label: d.name, sub: d.code }))}
                    value={c.districts.map((d) => d.id)}
                    onChange={(ids) => {
                      /*
                       * The website lists a coordinator's districts in the saved order (lead district first), so
                       * ticking or unticking keeps the existing order and appends newly ticked districts at the end.
                       */
                      const kept = c.districts.map((d) => d.id).filter((id) => ids.includes(id));
                      const ordered = [...kept, ...ids.filter((id) => !kept.includes(id))];
                      update(c.key, {
                        districts: ordered
                          .map((id) => byId.get(id) ?? c.districts.find((d) => d.id === id))
                          .filter((d): d is DistrictRef => Boolean(d))
                          .map(({ id, name, code }) => ({ id, name, code })),
                      });
                    }}
                    loading={districts.loading}
                    error={districts.error?.message ?? null}
                    onRetry={() => void districts.reload()}
                    emptyMsg="No districts available. Add them in the District Master first."
                    hint="Districts already covered by another coordinator are not offered."
                  />
                </div>
                <VisibleSelect id={`co-${c.key}-active`} isActive={c.isActive} onChange={(isActive) => update(c.key, { isActive })} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- District offices ---------------- */

/*
 * Collectorate / District Office details, one entry per district. Every field is optional: the
 * website prints "to be supplied from official records" for whatever is left blank.
 */
export function DistrictOfficesSection({ items, onChange, errors, onBlur, districts }: SectionProps<OfficeFormValues>) {
  const [pick, setPick] = useState('');
  const all = (districts.data ?? []) as DistrictOption[];
  const used = useMemo(() => new Set(items.map((o) => o.district.id)), [items]);
  const available = all.filter((d) => !used.has(d.id));

  const update = (key: string, patch: Partial<OfficeFormValues>) =>
    onChange(items.map((o) => (o.key === key ? { ...o, ...patch } : o)));

  const add = () => {
    const d = all.find((x) => x.id === pick);
    if (!d) return;
    const next = [...items, emptyOffice({ id: d.id, name: d.name, code: d.code })];
    next.sort((a, b) => a.district.name.localeCompare(b.district.name));
    onChange(next);
    setPick('');
  };

  return (
    <div className="card mb14">
      <div className="card-h">
        <h3>District offices <span className="sub">Collectorate details shown on each district&rsquo;s page</span></h3>
      </div>
      <div className="card-b">
        <div className="f ac gp8 wrap mb14">
          <select className="inp" style={{ maxWidth: 320 }} aria-label="District to add" value={pick} onChange={(e) => setPick(e.target.value)} disabled={districts.loading}>
            <option value="">{districts.loading ? 'Loading districts…' : available.length ? 'Select a district…' : 'Every district has an entry'}</option>
            {available.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.state})</option>
            ))}
          </select>
          <button type="button" className="btn sm" disabled={!pick} onClick={add}>+ Add district office</button>
        </div>

        {items.length === 0 ? (
          <div className="hint">No district office details yet. The website shows &ldquo;to be supplied from official records&rdquo; until they are added.</div>
        ) : null}

        {items.map((o) => {
          const err = (f: string) => errors[`office.${o.key}.${f}`];
          return (
            <div className="card mb14" key={o.key} style={{ boxShadow: 'none' }}>
              <div className="card-h">
                <h3>{o.district.name} <span className="sub">{o.district.code}</span></h3>
                <button type="button" className="btn xs tw-text-danger" onClick={() => onChange(items.filter((x) => x.key !== o.key))}>
                  Remove
                </button>
              </div>
              <div className="card-b">
                <div className="grid g3">
                  <MasterField id={`of-${o.key}-collector`} label="District Collector" error={err('collectorName')}>
                    <input
                      className="inp"
                      {...fieldAria(`of-${o.key}-collector`, err('collectorName'))}
                      maxLength={150}
                      value={o.collectorName}
                      onChange={(e) => update(o.key, { collectorName: e.target.value })}
                      onBlur={() => onBlur(`office.${o.key}.collectorName`)}
                    />
                  </MasterField>
                  <MasterField id={`of-${o.key}-phone`} label="Official phone" error={err('phone')}>
                    <input
                      className="inp"
                      {...fieldAria(`of-${o.key}-phone`, err('phone'))}
                      type="tel"
                      maxLength={32}
                      value={o.phone}
                      onChange={(e) => update(o.key, { phone: e.target.value })}
                      onBlur={() => onBlur(`office.${o.key}.phone`)}
                    />
                  </MasterField>
                  <MasterField id={`of-${o.key}-email`} label="Official email" error={err('email')}>
                    <input
                      className="inp"
                      {...fieldAria(`of-${o.key}-email`, err('email'))}
                      type="email"
                      maxLength={255}
                      value={o.email}
                      onChange={(e) => update(o.key, { email: e.target.value })}
                      onBlur={() => onBlur(`office.${o.key}.email`)}
                    />
                  </MasterField>
                </div>
                <div className="mt10">
                  <BilingualField
                    id={`of-${o.key}-address`}
                    label="Office address"
                    required={false}
                    multiline
                    maxLength={500}
                    value={o.address}
                    onChange={(address) => update(o.key, { address })}
                    onBlur={(half) => onBlur(`office.${o.key}.address.${half}`)}
                    errorMr={err('address.mr')}
                    errorEn={err('address.en')}
                  />
                </div>
                <div className="mt10">
                  <BilingualField
                    id={`of-${o.key}-hours`}
                    label="Office hours"
                    required={false}
                    maxLength={120}
                    value={o.officeHours}
                    onChange={(officeHours) => update(o.key, { officeHours })}
                    onBlur={(half) => onBlur(`office.${o.key}.officeHours.${half}`)}
                    errorMr={err('officeHours.mr')}
                    errorEn={err('officeHours.en')}
                    hint="For example Mon–Fri, 10:00 – 17:45."
                  />
                </div>
                <VisibleSelect id={`of-${o.key}-active`} isActive={o.isActive} onChange={(isActive) => update(o.key, { isActive })} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisibleSelect({ id, isActive, onChange }: { id: string; isActive: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid g3 mt10">
      <MasterField id={id} label="Show on website" hint="Hidden entries are kept but not sent to the website.">
        <select className="inp" id={id} value={isActive ? 'true' : 'false'} onChange={(e) => onChange(e.target.value === 'true')}>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </select>
      </MasterField>
    </div>
  );
}
