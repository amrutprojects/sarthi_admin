import { useState, type FormEvent } from 'react';
import { Callout } from '../../../../components/ui';
import Icon from '../../../../components/ui/Icon';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import type { ModulesField } from '../types/modules.types';
import {
  emptyDomain,
  emptyModule,
  validateModulesForm,
  type DomainFormValues,
  type ModuleFormValues,
  type ModulesFormValues,
} from '../validation/modules.validation';

interface ModulesFormProps {
  initial: ModulesFormValues;
  onSave: (values: ModulesFormValues) => Promise<void>;
  backTo: string;
}

const FORM_ID = 'cms-modules-form';

/*
 * The Modules page editor, on its own page (no modal), in three sections: the module cards, the
 * hours, and the learning-path split.
 *
 * Employment domains are edited INSIDE the module that offers them, because every module carries
 * its own list — adding a domain to one does not add it to any other.
 *
 * Behaviour matches the other CMS forms: validate on submit, re-validate a field once it has been
 * touched, block a second submit while one is in flight, keep what was typed when a save fails, and
 * put the server's own field messages on the matching inputs.
 *
 * The whole page is one PUT — the backend saves it in a single transaction, so the public page is
 * never served half-updated.
 *
 * Two rules are arithmetic rather than text, and both are checked as you type because getting them
 * wrong produces a page that contradicts itself: training plus assessment must equal the module
 * total, and the two learning-path shares must total 100.
 */
export default function ModulesForm({ initial, onSave, backTo }: ModulesFormProps) {
  const [values, setValues] = useState<ModulesFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<ModulesField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const local = validateModulesForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  const change = (next: ModulesFormValues, cleared: string[] = []) => {
    setValues(next);
    setDirty(true);
    if (cleared.length) {
      setServerErrors((e) => {
        const copy = { ...e };
        for (const f of cleared) delete copy[f];
        return copy;
      });
    }
  };

  /*
   * Adding or removing a row shifts the indexes of everything after it, so errors and touched flags
   * keyed by those indexes would then point at the wrong inputs. Clearing both is the honest
   * response: local errors are re-derived immediately, and the server's were about an arrangement
   * that no longer exists.
   */
  const changeList = (next: ModulesFormValues) => {
    setValues(next);
    setDirty(true);
    setTouched({});
    setServerErrors({});
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy || !isValid(local)) return;

    setBusy(true);
    setServerErrors({});
    try {
      await onSave(values);
      setDirty(false);
    } catch (err) {
      /*
       * A 422 carries per-field paths such as "body.modules.2.name.mr". Those are the keys this
       * form errors by, so dropping the "body." prefix puts each message on the right input.
       */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped: FieldErrors<ModulesField> = {};
        for (const d of err.details) {
          if (!d.field) continue;
          mapped[d.field.replace(/^body\./, '')] = d.message;
        }
        setServerErrors(mapped);
        if (!isValid(mapped)) return;
      }
      toastError(err);
    } finally {
      setBusy(false);
    }
  }

  const numberField = (key: string, label: string, value: string, write: (v: string) => void, hint?: string) => (
    <MasterField id={key} label={label} required error={show(key)} hint={hint}>
      <input
        className="inp"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        {...fieldAria(key, show(key))}
        value={value}
        onChange={(e) => write(e.target.value)}
        onBlur={() => touch(key)}
      />
    </MasterField>
  );

  const moveIn = <T,>(list: T[], index: number, by: number): T[] | null => {
    const to = index + by;
    if (to < 0 || to >= list.length) return null;
    const next = [...list];
    const [row] = next.splice(index, 1);
    next.splice(to, 0, row!);
    return next;
  };

  /*
   * One elective module's employment domains.
   *
   * Nested inside the module rather than kept as one page-wide list, because each elective module
   * offers its own: adding a domain here adds it to THIS module only.
   */
  const domainRows = (moduleIndex: number, m: ModuleFormValues) => {
    const write = (electives: DomainFormValues[]) =>
      changeList({
        ...values,
        modules: values.modules.map((x, k) => (k === moduleIndex ? { ...x, electives } : x)),
      });

    const patch = (index: number, next: Partial<DomainFormValues>) =>
      change({
        ...values,
        modules: values.modules.map((x, k) =>
          k === moduleIndex ? { ...x, electives: x.electives.map((d, j) => (j === index ? { ...d, ...next } : d)) } : x,
        ),
      });

    const prefix = `modules.${moduleIndex}.electives`;

    return (
      <div className="mt14">
        <h5 className="fs13 mb8">Employment domains for this module</h5>
        <p className="muted fs12 mb10">
          A candidate picks one of these and earns the certificate named beside it. This list belongs to {m.code.trim() || 'this module'}{' '}
          alone — every other module keeps its own.
        </p>

        {show(prefix) ? (
          <p className="err fs12 mb10" role="alert">
            {show(prefix)}
          </p>
        ) : null}

        {m.electives.map((d, k) => (
          <div className="card mb10" key={k}>
            <div className="card-b">
              <div className="f ac gp8 wrap mb10">
                <b className="fs13">Domain {k + 1}</b>
                <span className="flex1" />
                <label className="f ac gp8 fs13">
                  <input type="checkbox" checked={d.isActive} onChange={(e) => patch(k, { isActive: e.target.checked })} />
                  {d.isActive ? 'Visible' : 'Hidden'}
                </label>
                <button
                  type="button"
                  className="btn sm"
                  disabled={k === 0}
                  onClick={() => {
                    const next = moveIn<DomainFormValues>(m.electives, k, -1);
                    if (next) write(next);
                  }}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="btn sm"
                  disabled={k === m.electives.length - 1}
                  onClick={() => {
                    const next = moveIn<DomainFormValues>(m.electives, k, 1);
                    if (next) write(next);
                  }}
                >
                  Move down
                </button>
                <button type="button" className="btn sm danger" onClick={() => write(m.electives.filter((_, j) => j !== k))}>
                  Remove
                </button>
              </div>

              <div className="grid g2">
                {numberField(`${prefix}.${k}.no`, 'Number in the table', d.no, (no) => patch(k, { no }))}
                <MasterField
                  id={`${prefix}.${k}.certificate`}
                  label="Certificate awarded"
                  required
                  error={show(`${prefix}.${k}.certificate`)}
                  hint="What this module awards in this domain. Published in English."
                >
                  <input
                    className="inp"
                    type="text"
                    autoComplete="off"
                    maxLength={300}
                    {...fieldAria(`${prefix}.${k}.certificate`, show(`${prefix}.${k}.certificate`))}
                    value={d.certificate}
                    onChange={(e) => patch(k, { certificate: e.target.value })}
                    onBlur={() => touch(`${prefix}.${k}.certificate`)}
                  />
                </MasterField>
              </div>

              <div className="mt10">
                <BilingualField
                  id={`mod-${moduleIndex}-dom-${k}`}
                  label="Employment domain"
                  maxLength={200}
                  value={d.domain}
                  onChange={(domain) => patch(k, { domain })}
                  onBlur={(half) => touch(`${prefix}.${k}.domain.${half}`)}
                  errorMr={show(`${prefix}.${k}.domain.mr`)}
                  errorEn={show(`${prefix}.${k}.domain.en`)}
                />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="btn sm" onClick={() => write([...m.electives, emptyDomain()])}>
          <Icon name="plus" />
          Add a domain
        </button>
      </div>
    );
  };

  return (
    <>
      <form id={FORM_ID} onSubmit={submit} noValidate>
        {/* ── the module cards ─────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Modules</h3>
          </div>
          <div className="card-b">
            <Callout tone="info" title="Core and elective modules">
              Modules marked elective are the ones where a candidate chooses one of the employment domains below. On the public site those
              cards open the domain list; the others open their own hours. The module code identifies a module across the programme, so
              changing it creates a new module rather than renaming one.
            </Callout>

            {show('modules') ? (
              <p className="err fs12 mt10" role="alert">
                {show('modules')}
              </p>
            ) : null}

            {values.modules.map((m, i) => (
              <div className="card mt14" key={i}>
                <div className="card-b">
                  <div className="f ac gp8 wrap mb10">
                    <h4 className="fs14">Module {i + 1}</h4>
                    <span className="flex1" />
                    <label className="f ac gp8 fs13">
                      <input
                        type="checkbox"
                        checked={m.elective}
                        onChange={(e) =>
                          change({
                            ...values,
                            modules: values.modules.map((x, k) => (k === i ? { ...x, elective: e.target.checked } : x)),
                          })
                        }
                      />
                      Elective
                    </label>
                    <label className="f ac gp8 fs13">
                      <input
                        type="checkbox"
                        checked={m.isActive}
                        onChange={(e) =>
                          change({
                            ...values,
                            modules: values.modules.map((x, k) => (k === i ? { ...x, isActive: e.target.checked } : x)),
                          })
                        }
                      />
                      {m.isActive ? 'Visible' : 'Hidden'}
                    </label>
                  </div>

                  <div className="grid g2">
                    {numberField(`modules.${i}.no`, 'Number shown on the card', m.no, (no) =>
                      change(
                        {
                          ...values,
                          modules: values.modules.map((x, k) => (k === i ? { ...x, no } : x)),
                        },
                        [`modules.${i}.no`],
                      ),
                    )}
                    <MasterField
                      id={`modules.${i}.code`}
                      label="Module code"
                      required
                      error={show(`modules.${i}.code`)}
                      hint="Such as ECS or DS-BDS. Stored in capitals."
                    >
                      <input
                        className="inp"
                        type="text"
                        autoComplete="off"
                        maxLength={32}
                        {...fieldAria(`modules.${i}.code`, show(`modules.${i}.code`))}
                        value={m.code}
                        onChange={(e) =>
                          change(
                            {
                              ...values,
                              modules: values.modules.map((x, k) => (k === i ? { ...x, code: e.target.value } : x)),
                            },
                            [`modules.${i}.code`],
                          )
                        }
                        onBlur={() => touch(`modules.${i}.code`)}
                      />
                    </MasterField>
                  </div>

                  <div className="mt10">
                    <BilingualField
                      id={`mod-${i}-name`}
                      label="Certificate name"
                      maxLength={300}
                      value={m.name}
                      onChange={(name) =>
                        change({
                          ...values,
                          modules: values.modules.map((x, k) => (k === i ? { ...x, name } : x)),
                        })
                      }
                      onBlur={(half) => touch(`modules.${i}.name.${half}`)}
                      errorMr={show(`modules.${i}.name.mr`)}
                      errorEn={show(`modules.${i}.name.en`)}
                    />
                  </div>

                  <div className="mt10">
                    <BilingualField
                      id={`mod-${i}-desc`}
                      label="Description"
                      maxLength={600}
                      multiline
                      value={m.description}
                      onChange={(description) =>
                        change({
                          ...values,
                          modules: values.modules.map((x, k) => (k === i ? { ...x, description } : x)),
                        })
                      }
                      onBlur={(half) => touch(`modules.${i}.description.${half}`)}
                      errorMr={show(`modules.${i}.description.mr`)}
                      errorEn={show(`modules.${i}.description.en`)}
                    />
                  </div>

                  {/* Every module carries its own list, elective or not. */}
                  {domainRows(i, m)}

                  <div className="f ac gp8 wrap mt10">
                    <button
                      type="button"
                      className="btn sm"
                      disabled={i === 0}
                      onClick={() => {
                        const next = moveIn<ModuleFormValues>(values.modules, i, -1);
                        if (next) changeList({ ...values, modules: next });
                      }}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      disabled={i === values.modules.length - 1}
                      onClick={() => {
                        const next = moveIn<ModuleFormValues>(values.modules, i, 1);
                        if (next) changeList({ ...values, modules: next });
                      }}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      className="btn sm danger"
                      onClick={() =>
                        changeList({
                          ...values,
                          modules: values.modules.filter((_, k) => k !== i),
                        })
                      }
                    >
                      Remove module
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt14">
              <button type="button" className="btn" onClick={() => changeList({ ...values, modules: [...values.modules, emptyModule()] })}>
                <Icon name="plus" />
                Add a module
              </button>
            </div>
          </div>
        </div>

        {/* ── hours ────────────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Hours per module</h3>
          </div>
          <div className="card-b">
            <p className="muted fs12 mb10">
              The same split applies to every module. Training and assessment must add up to the module total.
            </p>
            <div className="grid g2">
              {numberField('timeSplit.moduleHours', 'Total hours per module', values.timeSplit.moduleHours, (moduleHours) =>
                change({ ...values, timeSplit: { ...values.timeSplit, moduleHours } }, ['timeSplit.moduleHours']),
              )}
              {numberField('timeSplit.trainingHours', 'Training hours', values.timeSplit.trainingHours, (trainingHours) =>
                change({ ...values, timeSplit: { ...values.timeSplit, trainingHours } }, [
                  'timeSplit.trainingHours',
                  'timeSplit.moduleHours',
                ]),
              )}
              {numberField('timeSplit.assessmentHours', 'Assessment hours', values.timeSplit.assessmentHours, (assessmentHours) =>
                change({ ...values, timeSplit: { ...values.timeSplit, assessmentHours } }, [
                  'timeSplit.assessmentHours',
                  'timeSplit.moduleHours',
                ]),
              )}
              {numberField('timeSplit.weeksPerModule', 'Weeks per module', values.timeSplit.weeksPerModule, (weeksPerModule) =>
                change({ ...values, timeSplit: { ...values.timeSplit, weeksPerModule } }, ['timeSplit.weeksPerModule']),
              )}
              {numberField('timeSplit.daysPerWeek', 'Training days per week', values.timeSplit.daysPerWeek, (daysPerWeek) =>
                change({ ...values, timeSplit: { ...values.timeSplit, daysPerWeek } }, ['timeSplit.daysPerWeek']),
              )}
              {numberField('timeSplit.hoursPerDay', 'Training hours per day', values.timeSplit.hoursPerDay, (hoursPerDay) =>
                change({ ...values, timeSplit: { ...values.timeSplit, hoursPerDay } }, ['timeSplit.hoursPerDay']),
              )}
              {numberField(
                'timeSplit.weeklyAssessmentHours',
                'Assessment hours per week',
                values.timeSplit.weeklyAssessmentHours,
                (weeklyAssessmentHours) =>
                  change({ ...values, timeSplit: { ...values.timeSplit, weeklyAssessmentHours } }, ['timeSplit.weeklyAssessmentHours']),
                'May be fractional, such as 3.5.',
              )}
            </div>
          </div>
        </div>

        {/* ── learning path ────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Learning path split</h3>
          </div>
          <div className="card-b">
            <p className="muted fs12 mb10">Drawn as a doughnut on the public page, so the two shares must add up to 100.</p>
            <div className="grid g2">
              {numberField('learningPath.fixedPathPct', 'Fixed-path share (%)', values.learningPath.fixedPathPct, (fixedPathPct) =>
                change({ ...values, learningPath: { ...values.learningPath, fixedPathPct } }, ['learningPath.fixedPathPct']),
              )}
              {numberField('learningPath.selfPathPct', 'Self-path share (%)', values.learningPath.selfPathPct, (selfPathPct) =>
                change({ ...values, learningPath: { ...values.learningPath, selfPathPct } }, [
                  'learningPath.selfPathPct',
                  'learningPath.fixedPathPct',
                ]),
              )}
            </div>

            <div className="mt10">
              <BilingualField
                id="lp-length"
                label="Session length"
                maxLength={40}
                value={values.learningPath.sessionLength}
                onChange={(sessionLength) => change({ ...values, learningPath: { ...values.learningPath, sessionLength } })}
                onBlur={(half) => touch(`learningPath.sessionLength.${half}`)}
                errorMr={show('learningPath.sessionLength.mr')}
                errorEn={show('learningPath.sessionLength.en')}
                hint="Shown in the middle of the doughnut, such as 1 hr."
              />
            </div>

            <div className="mt10">
              <BilingualField
                id="lp-label"
                label="Session label"
                maxLength={80}
                value={values.learningPath.sessionLabel}
                onChange={(sessionLabel) => change({ ...values, learningPath: { ...values.learningPath, sessionLabel } })}
                onBlur={(half) => touch(`learningPath.sessionLabel.${half}`)}
                errorMr={show('learningPath.sessionLabel.mr')}
                errorEn={show('learningPath.sessionLabel.en')}
              />
            </div>
          </div>
        </div>

        {/* ── visibility ───────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Visibility</h3>
          </div>
          <div className="card-b">
            <label className="f ac gp8 fs13">
              <input type="checkbox" checked={values.isPublished} onChange={(e) => change({ ...values, isPublished: e.target.checked })} />
              Publish this content on the public website
            </label>
            {!values.isPublished ? (
              <p className="muted fs12 mt10">
                While unpublished the website shows its own built-in Modules page, so visitors still see a complete page.
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <MasterFormActions formId={FORM_ID} submitLabel="Save Modules page" busy={busy} dirty={dirty} backTo={backTo} />
    </>
  );
}
