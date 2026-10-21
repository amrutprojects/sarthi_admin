import { useState, type FormEvent } from 'react';
import { Callout } from '../../../../components/ui';
import Icon from '../../../../components/ui/Icon';
import { ApiError } from '../../../../services/api-client';
import BilingualField from '../../components/BilingualField';
import MasterField, { fieldAria } from '../../components/MasterField';
import MasterFormActions from '../../components/MasterFormActions';
import { toastError } from '../../shared';
import { isValid, type FieldErrors } from '../../validation';
import { MODULE_KINDS, MODULE_KIND_LABEL, type ModuleKind, type ModulesField } from '../types/modules.types';
import {
  emptyDomain,
  emptyModule,
  validateModulesForm,
  type DomainFormValues,
  type ModuleFormValues,
  type ModulesFormValues,
  type TimeSplitFormValues,
} from '../validation/modules.validation';

interface ModulesFormProps {
  initial: ModulesFormValues;
  onSave: (values: ModulesFormValues) => Promise<void>;
  backTo: string;
}

const FORM_ID = 'cms-modules-form';

/*
 * The Modules page editor, on its own page (no modal).
 *
 * Each module card holds everything about that module: its type, its own timetable, and its own
 * employment domains. Nothing about a module lives anywhere else, so changing one module cannot
 * quietly change another.
 *
 * The page-level cards below are the things that genuinely are page-level: the heading and the
 * learning-path split. The /programme fact sheet is edited on the Programme page (/cms/programme).
 *
 * Behaviour matches the other CMS forms: validate on submit, re-validate a field once it has been
 * touched, block a second submit while one is in flight, keep what was typed when a save fails, and
 * put the server's own field messages on the matching inputs. The whole page is one PUT.
 *
 * Two rules are arithmetic and are checked as you type, because getting them wrong produces a page
 * that contradicts itself: each module's training plus assessment must equal its total, and the two
 * learning-path shares must total 100.
 */
export default function ModulesForm({ initial, onSave, backTo }: ModulesFormProps) {
  const [values, setValues] = useState<ModulesFormValues>(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors<ModulesField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  /*
   * Which module cards are open. Collapsed by default — see the comment on the card header.
   *
   * Indexes, not codes: a code can be blank or duplicated while someone is typing, so it is not
   * yet an identity. Reordering or removing a module shifts every index after it, which is why
   * `changeList` clears this along with the touched flags and the server errors.
   */
  const [openModules, setOpenModules] = useState<Set<number>>(new Set());
  const isOpen = (i: number) => openModules.has(i);
  const toggleModule = (i: number) =>
    setOpenModules((s) => {
      const next = new Set(s);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  const local = validateModulesForm(values);
  const show = (f: string) => (submitted || touched[f] ? local[f] : undefined) ?? serverErrors[f];
  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  /*
   * Does anything under this module have a problem?
   *
   * This is what makes collapsing safe: a validation message inside a closed card is a message
   * nobody can read, so the summary line flags it and `submit` opens every offending card.
   */
  const moduleHasErrors = (i: number): boolean => {
    const prefix = `modules.${i}.`;
    const flagged = (errors: FieldErrors<ModulesField>) =>
      Object.entries(errors).some(([key, value]) => Boolean(value) && key.startsWith(prefix));
    return (submitted && flagged(local)) || flagged(serverErrors);
  };

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
    setOpenModules(new Set());
  };

  const patchModule = (index: number, next: Partial<ModuleFormValues>, cleared: string[] = []) =>
    change({ ...values, modules: values.modules.map((x, k) => (k === index ? { ...x, ...next } : x)) }, cleared);

  /*
   * Open every module card carrying one of these errors.
   *
   * Without this a failed submit would look like nothing happened: the messages would all be
   * inside collapsed cards. Called for the local rules on submit and again for whatever the
   * server rejects.
   */
  const revealErrors = (errors: FieldErrors<ModulesField>) => {
    const guilty = new Set<number>();
    for (const [key, value] of Object.entries(errors)) {
      if (!value) continue;
      const match = /^modules\.(\d+)\./.exec(key);
      if (match) guilty.add(Number(match[1]));
    }
    if (guilty.size > 0) setOpenModules((s) => new Set([...s, ...guilty]));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (busy || !isValid(local)) {
      revealErrors(local);
      return;
    }

    setBusy(true);
    setServerErrors({});
    try {
      await onSave(values);
      setDirty(false);
    } catch (err) {
      /*
       * A 422 carries per-field paths such as "body.modules.2.timeSplit.moduleHours". Those are
       * the keys this form errors by, so dropping the "body." prefix puts each message on the
       * right input.
       */
      if (err instanceof ApiError && (err.status === 422 || err.status === 400) && err.details.length) {
        const mapped: FieldErrors<ModulesField> = {};
        for (const d of err.details) {
          if (!d.field) continue;
          mapped[d.field.replace(/^body\./, '')] = d.message;
        }
        setServerErrors(mapped);
        revealErrors(mapped);
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

  /* One module's own timetable. */
  const timeSplitRows = (moduleIndex: number, m: ModuleFormValues) => {
    const prefix = `modules.${moduleIndex}.timeSplit`;
    const set = (next: Partial<TimeSplitFormValues>, cleared: string[]) =>
      patchModule(moduleIndex, { timeSplit: { ...m.timeSplit, ...next } }, cleared);

    return (
      <div className="mt14">
        <h5 className="fs13 mb8">Hours for this module</h5>
        <p className="muted fs12 mb10">
          This module&rsquo;s own timetable — each module has its own, so changing this one leaves the others alone. Training and assessment
          must add up to the module total.
        </p>
        <div className="grid g2">
          {numberField(`${prefix}.moduleHours`, 'Total hours', m.timeSplit.moduleHours, (v) =>
            set({ moduleHours: v }, [`${prefix}.moduleHours`]),
          )}
          {numberField(`${prefix}.trainingHours`, 'Training hours', m.timeSplit.trainingHours, (v) =>
            set({ trainingHours: v }, [`${prefix}.trainingHours`, `${prefix}.moduleHours`]),
          )}
          {numberField(`${prefix}.assessmentHours`, 'Assessment hours', m.timeSplit.assessmentHours, (v) =>
            set({ assessmentHours: v }, [`${prefix}.assessmentHours`, `${prefix}.moduleHours`]),
          )}
          {numberField(`${prefix}.weeksPerModule`, 'Weeks', m.timeSplit.weeksPerModule, (v) =>
            set({ weeksPerModule: v }, [`${prefix}.weeksPerModule`]),
          )}
          {numberField(`${prefix}.daysPerWeek`, 'Training days per week', m.timeSplit.daysPerWeek, (v) =>
            set({ daysPerWeek: v }, [`${prefix}.daysPerWeek`]),
          )}
          {numberField(`${prefix}.hoursPerDay`, 'Training hours per day', m.timeSplit.hoursPerDay, (v) =>
            set({ hoursPerDay: v }, [`${prefix}.hoursPerDay`]),
          )}
          {numberField(
            `${prefix}.weeklyAssessmentHours`,
            'Assessment hours per week',
            m.timeSplit.weeklyAssessmentHours,
            (v) => set({ weeklyAssessmentHours: v }, [`${prefix}.weeklyAssessmentHours`]),
            'May be fractional, such as 3.5.',
          )}
        </div>
      </div>
    );
  };

  /*
   * One module's employment domains. Nested inside the module because each carries its own:
   * adding a domain here adds it to THIS module only.
   */
  const domainRows = (moduleIndex: number, m: ModuleFormValues) => {
    const write = (electives: DomainFormValues[]) =>
      changeList({
        ...values,
        modules: values.modules.map((x, k) => (k === moduleIndex ? { ...x, electives } : x)),
      });

    const patch = (index: number, next: Partial<DomainFormValues>) =>
      patchModule(moduleIndex, {
        electives: m.electives.map((d, j) => (j === index ? { ...d, ...next } : d)),
      });

    const prefix = `modules.${moduleIndex}.electives`;

    return (
      <div className="mt14">
        <h5 className="fs13 mb8">Employment domains for this module</h5>
        <p className="muted fs12 mb10">
          A candidate picks one of these and earns the certificate named beside it. This list belongs to {m.code.trim() || 'this module'}{' '}
          alone — every other module keeps its own.
        </p>

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
        {/* ── the page heading ─────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Page heading</h3>
          </div>
          <div className="card-b">
            <BilingualField
              id="mp-title"
              label="Page title"
              maxLength={200}
              value={values.pageTitle}
              onChange={(pageTitle) => change({ ...values, pageTitle }, ['pageTitle.mr', 'pageTitle.en'])}
              onBlur={(half) => touch(`pageTitle.${half}`)}
              errorMr={show('pageTitle.mr')}
              errorEn={show('pageTitle.en')}
              hint="The heading at the top of the public Modules page."
            />
            <div className="mt10">
              <BilingualField
                id="mp-subtitle"
                label="Page subtitle"
                maxLength={500}
                multiline
                value={values.pageSubtitle}
                onChange={(pageSubtitle) => change({ ...values, pageSubtitle }, ['pageSubtitle.mr', 'pageSubtitle.en'])}
                onBlur={(half) => touch(`pageSubtitle.${half}`)}
                errorMr={show('pageSubtitle.mr')}
                errorEn={show('pageSubtitle.en')}
                hint="Any numbers you write here are typed, not worked out — update them if you change the modules below."
              />
            </div>
          </div>
        </div>

        {/* ── the module cards ─────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Modules</h3>
          </div>
          <div className="card-b">
            <Callout tone="info" title="Each module stands on its own">
              A module carries its own type, its own hours and its own employment domains. Marking one hidden removes it from the website
              AND from the programme totals in one action — which is how you leave an elective out without deleting it.
            </Callout>

            {show('modules') ? (
              <p className="err fs12 mt10" role="alert">
                {show('modules')}
              </p>
            ) : null}

            {values.modules.map((m, i) => (
              <div className="card mt14" key={i}>
                {/*
                 * Collapsed to a summary by default: an open module is its name, description,
                 * seven hour fields and every one of its domains, so four open at once is
                 * thousands of pixels of form. The summary carries enough to find the one you
                 * want without opening it.
                 */}
                <button
                  type="button"
                  className="card-h"
                  aria-expanded={isOpen(i)}
                  aria-controls={`module-body-${i}`}
                  onClick={() => toggleModule(i)}
                >
                  <h3 className="fs14">
                    Module {i + 1}
                    {m.code.trim() ? ` — ${m.code.trim().toUpperCase()}` : ''}
                  </h3>
                  <span className="sec-sum">
                    <span>{MODULE_KIND_LABEL[m.kind]}</span>
                    <span>{m.timeSplit.moduleHours || '—'}h</span>
                    <span>
                      {m.electives.length} domain{m.electives.length === 1 ? '' : 's'}
                    </span>
                    {!m.isActive ? <span>Hidden</span> : null}
                    {moduleHasErrors(i) ? <span className="err">Needs attention</span> : null}
                  </span>
                  <Icon name="chevR" className="sec-x" />
                </button>

                <div className="card-b" id={`module-body-${i}`} hidden={!isOpen(i)}>
                  <div className="f ac gp8 wrap mb10">
                    <label className="f ac gp8 fs13">
                      <input type="checkbox" checked={m.isActive} onChange={(e) => patchModule(i, { isActive: e.target.checked })} />
                      {m.kind === 'ELECTIVE' ? 'Show on the website and count in the totals' : m.isActive ? 'Visible' : 'Hidden'}
                    </label>
                  </div>

                  <div className="grid g2">
                    {numberField(`modules.${i}.no`, 'Number shown on the card', m.no, (no) => patchModule(i, { no }, [`modules.${i}.no`]))}
                    <MasterField
                      id={`modules.${i}.kind`}
                      label="Module type"
                      required
                      hint="An elective is one where the candidate chooses an employment domain."
                    >
                      <select
                        className="inp"
                        id={`modules.${i}.kind`}
                        value={m.kind}
                        onChange={(e) => patchModule(i, { kind: e.target.value as ModuleKind })}
                      >
                        {MODULE_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {MODULE_KIND_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </MasterField>
                  </div>

                  <div className="grid g2 mt10">
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
                        onChange={(e) => patchModule(i, { code: e.target.value }, [`modules.${i}.code`])}
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
                      onChange={(name) => patchModule(i, { name })}
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
                      onChange={(description) => patchModule(i, { description })}
                      onBlur={(half) => touch(`modules.${i}.description.${half}`)}
                      errorMr={show(`modules.${i}.description.mr`)}
                      errorEn={show(`modules.${i}.description.en`)}
                    />
                  </div>

                  {timeSplitRows(i, m)}
                  {domainRows(i, m)}

                  <div className="f ac gp8 wrap mt14">
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
                      onClick={() => changeList({ ...values, modules: values.modules.filter((_, k) => k !== i) })}
                    >
                      Remove module
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt14">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  changeList({ ...values, modules: [...values.modules, emptyModule()] });
                  /* Open it — a new card that stayed collapsed would look like nothing happened. */
                  setOpenModules(new Set([values.modules.length]));
                }}
              >
                <Icon name="plus" />
                Add a module
              </button>
            </div>
          </div>
        </div>

        {/* ── learning path ────────────────────────────────────── */}
        <div className="card mb14">
          <div className="card-h">
            <h3>Learning path split</h3>
          </div>
          <div className="card-b">
            <p className="muted fs12 mb10">Drawn as a doughnut on the public Modules page, so the two shares must add up to 100.</p>
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

        {/* The /programme fact sheet (duration, validity, deposit, apply-before, partner) is edited
            on the Programme page (/cms/programme); its hours and counts are summed from the modules above. */}

        {/* The home page's "Programme at a glance" figures have their own CMS menu (/cms/home),
            because three of the four are summed from the modules above and only one is typed. */}

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
